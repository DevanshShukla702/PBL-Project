import osmnx as ox
import networkx as nx
import numpy as np
import threading
from datetime import datetime
from functools import lru_cache
from copy import deepcopy

from src.common.features import build_features
from src.models.multi_horizon_xgb import load_models
from src.routing.graph_loader import load_graph

# ---------------------------------------------------
# Global Cache
# ---------------------------------------------------
GRAPH = None
MODELS = None
_engine_ready = False
_engine_lock = threading.Lock()
_init_error = None

# ---------------------------------------------------
# Initialize Engine
# ---------------------------------------------------
def initialize_engine():
    global GRAPH, MODELS, _engine_ready, _init_error
    with _engine_lock:
        if _engine_ready:
            return
        try:
            print("[CGEE] Loading OSMnx road graph...")
            GRAPH = load_graph()
            print(f"[CGEE] Graph loaded: {len(GRAPH.nodes)} nodes, "
                  f"{len(GRAPH.edges)} edges")

            print("[CGEE] Loading XGBoost models...")
            MODELS = load_models()
            print(f"[CGEE] Models loaded: {list(MODELS.keys())}")

            _engine_ready = True
            _init_error = None
            print("[CGEE] Engine ready.")

        except FileNotFoundError as e:
            _init_error = f"Missing file: {str(e)}"
            print(f"[CGEE ERROR] {_init_error}")
            raise RuntimeError(_init_error)

        except Exception as e:
            _init_error = f"Engine init failed: {str(e)}"
            print(f"[CGEE ERROR] {_init_error}")
            raise RuntimeError(_init_error)

def is_engine_ready():
    return _engine_ready

# ---------------------------------------------------
# Cached Shortest Path Lookup
# ---------------------------------------------------
@lru_cache(maxsize=200)
def get_shortest_path(orig, dest):
    if not _engine_ready:
        raise RuntimeError("Engine not initialized. Call initialize_engine() first.")
    return ox.shortest_path(GRAPH, orig, dest, weight="length")

# ---------------------------------------------------
# Road Type → Free-Flow Speed Mapping
# ---------------------------------------------------
FREE_FLOW = {
    "motorway": 80, "motorway_link": 65,
    "trunk": 70, "trunk_link": 55,
    "primary": 60, "primary_link": 50,
    "secondary": 45, "secondary_link": 40,
    "tertiary": 40, "tertiary_link": 35,
    "residential": 30, "unclassified": 35,
    "service": 20, "living_street": 15,
}

ROUTE_LABELS = ["Fastest Route", "Alternate Route", "Scenic Route"]
ROUTE_COLORS = ["#3B82F6", "#A855F7", "#14B8A6"]

# ---------------------------------------------------
# BUG FIX 1: Horizon-Specific Feature Modulation
# ---------------------------------------------------
HORIZON_CONFIG = {
    "1_hour": {"speed_decay": 1.00, "hour_offset": 1},
    "2_hour": {"speed_decay": 0.88, "hour_offset": 2},
    "4_hour": {"speed_decay": 0.74, "hour_offset": 4},
}

# ---------------------------------------------------
# BUG FIX 2: Per-Segment Probabilistic Incident Model
# ---------------------------------------------------
BASE_INCIDENT_PROB = {
    "motorway": 0.02,
    "primary": 0.05,
    "secondary": 0.08,
    "residential": 0.12,
}


def get_incident_probability(road_type: str, hour: int) -> float:
    """
    Return per-segment incident probability based on road class and time.
    Aligns with training data distribution from traffic_generator.py
    (~12% daily incident rate per segment, time-varying).
    """
    base = BASE_INCIDENT_PROB.get(road_type, 0.07)
    if 7 <= hour <= 10 or 17 <= hour <= 21:
        return min(base * 2.5, 0.35)    # peak multiplier
    elif 23 <= hour or hour <= 5:
        return base * 0.4               # night suppressor
    return base


# ---------------------------------------------------
# BUG FIX 3: Road-Type-Aware Load Factors
# ---------------------------------------------------
LOAD_FACTORS = {
    #                   off_peak  peak
    "motorway":         (0.25,    0.50),
    "motorway_link":    (0.25,    0.50),
    "trunk":            (0.30,    0.55),
    "trunk_link":       (0.30,    0.55),
    "primary":          (0.38,    0.65),
    "primary_link":     (0.38,    0.65),
    "secondary":        (0.48,    0.72),
    "secondary_link":   (0.48,    0.72),
    "tertiary":         (0.50,    0.72),
    "tertiary_link":    (0.50,    0.72),
    "residential":      (0.55,    0.78),
    "unclassified":     (0.45,    0.68),
    "service":          (0.55,    0.78),
    "living_street":    (0.55,    0.78),
}


# ---------------------------------------------------
# K-Shortest Paths via Edge Penalty Method
# ---------------------------------------------------
def find_k_routes(orig, dest, k=3, penalty=5.0):
    """
    Generate up to k distinct routes using iterative edge penalty.
    Maintains a dictionary of edge penalties to dynamically calculate
    weights without copying the graph (which causes OOM crashes).
    """
    if not _engine_ready:
        raise RuntimeError("Engine not initialized. Call initialize_engine() first.")
    routes = []
    edge_penalties = {}

    def dynamic_weight(u, v, d):
        base_length = d.get("length", 100)
        # Apply accumulated penalty for this specific edge
        mult = edge_penalties.get((u, v), 1.0)
        return float(base_length) * float(mult)

    for i in range(k):
        try:
            path = nx.shortest_path(GRAPH, orig, dest, weight=dynamic_weight)
            if not path:
                break

            # Skip if this path is identical to an existing one
            if any(path == existing for existing in routes):
                break

            routes.append(path)

            # Penalize edges in this path to force genuinely different alternatives
            for u, v in zip(path[:-1], path[1:]):
                current_mult = edge_penalties.get((u, v), 1.0)
                edge_penalties[(u, v)] = current_mult * penalty
                
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            break

    return routes


# ---------------------------------------------------
# Extract route info from a node list
# ---------------------------------------------------
def extract_route_info(route_nodes):
    route_geometry = []
    for node in route_nodes:
        route_geometry.append({
            "lat": GRAPH.nodes[node]["y"],
            "lon": GRAPH.nodes[node]["x"]
        })

    segments = []
    road_types = []

    for u, v in zip(route_nodes[:-1], route_nodes[1:]):
        edge_dict = GRAPH.get_edge_data(u, v)
        if not edge_dict:
            continue

        edge_data = list(edge_dict.values())[0]
        length_km = edge_data.get("length", 0) / 1000.0
        segments.append(length_km)

        road_type = edge_data.get("highway", "residential")
        if isinstance(road_type, list):
            road_type = road_type[0]
        road_types.append(road_type)

    return route_geometry, segments, road_types


# ---------------------------------------------------
# Per-Segment Probabilistic Incident Model (BUG FIX 2)
# ---------------------------------------------------
def simulate_incidents(num_segments, road_types, hour, route_geometry):
    """
    Generate per-segment incident data using probabilistic model
    aligned with traffic_generator.py training distribution.
    Each segment is evaluated independently based on road type and time.
    Severity sampled from Beta(2,5) — mean ~0.28, right-skewed (mostly mild).
    """
    incident_flags = []
    raw_severities = []

    # Phase 1: Independent per-segment incident determination
    for idx in range(num_segments):
        road_type = road_types[idx] if idx < len(road_types) else "residential"
        p = get_incident_probability(road_type, hour)
        has_incident = 1 if np.random.rand() < p else 0
        incident_flags.append(has_incident)

        if has_incident:
            # Beta(2,5) — mean ~0.28, right-skewed (mostly mild incidents)
            severity = float(np.random.beta(2, 5))
        else:
            severity = 0.0
        raw_severities.append(severity)

    # Phase 2: Spatial propagation (adds severity from neighboring incidents)
    segment_severities = []
    incident_indices = set()
    total_severity = 0.0
    count = 0

    for idx in range(num_segments):
        severity = raw_severities[idx]

        # Spatial propagation from neighbors
        if idx > 0 and incident_flags[idx - 1] == 1:
            severity += 0.15
        if idx < num_segments - 1 and incident_flags[idx + 1] == 1:
            severity += 0.15

        severity = min(severity, 0.90)

        if incident_flags[idx] == 1:
            incident_indices.add(idx)
            total_severity += severity
            count += 1

        segment_severities.append(severity)

    avg_severity = total_severity / count if count > 0 else 0.0

    incident_coords = []
    for idx in incident_indices:
        if idx < len(route_geometry):
            incident_coords.append(route_geometry[idx])

    return {
        "segment_severities": segment_severities,
        "incident_indices": incident_indices,
        "incident_count": count,
        "avg_severity": avg_severity,
        "incident_coordinates": incident_coords,
    }


# ---------------------------------------------------
# Predict ETAs for a single route
# (BUG FIX 1 + BUG FIX 3 + Patent Contextual Adjustment)
# ---------------------------------------------------
def predict_route_etas(segments, road_types, hour, is_peak, incident_data):
    etas = {}
    confidence_scores = {}
    total_distance = sum(segments)
    num_segments = len(segments)

    for horizon, model in MODELS.items():
        eta_minutes = 0.0
        cfg = HORIZON_CONFIG[horizon]

        for idx, seg_len in enumerate(segments):
            road_type = road_types[idx]
            free_flow_speed = FREE_FLOW.get(road_type, 40)

            # --- BUG FIX 3: Road-type-aware load factors ---
            off_peak_factor, peak_factor = LOAD_FACTORS.get(
                road_type, (0.45, 0.68)
            )
            load_factor = peak_factor if is_peak else off_peak_factor
            base_speed = free_flow_speed * (1.0 - load_factor)
            # Per-segment stochastic noise (realistic variation)
            base_speed += np.random.normal(0, 2.5)
            base_speed = max(base_speed, 5.0)

            # --- BUG FIX 1: Horizon-specific feature modulation ---
            projected_hour = (hour + cfg["hour_offset"]) % 24
            projected_peak = 1 if (7 <= projected_hour <= 10 or
                                   17 <= projected_hour <= 21) else 0
            adjusted_speed_lag = base_speed * cfg["speed_decay"]

            severity = incident_data["segment_severities"][idx]

            features = build_features(
                speed_lag_1=adjusted_speed_lag,
                hour=projected_hour,
                is_peak=projected_peak,
                incident_flag=int(severity > 0),
                incident_severity=float(severity)
            )

            raw_speed = float(model.predict(features)[0])

            # --- Patent Module 4: Contextual Adjustment Mechanism ---
            # Post-prediction speed modulation based on incident severity.
            # This makes the Contextual Adjustment a visible, auditable step
            # faithful to the patent's architectural claim.
            if severity > 0:
                contextual_factor = 1.0 - (severity * 0.6)
                adjusted_speed = raw_speed * contextual_factor
            else:
                adjusted_speed = raw_speed

            pred_speed = max(adjusted_speed, 5.0)

            # Patent formula: ETA_segment = (distance_km / speed_kmh) * 60
            segment_eta = (seg_len / pred_speed) * 60.0
            eta_minutes += segment_eta

        # Uncertainty bands
        distance_factor = total_distance * 0.03
        incident_factor = (
            incident_data["avg_severity"] * 8
            if incident_data["incident_count"] > 0 else 0
        )
        horizon_factor = {"1_hour": 1.0, "2_hour": 1.15, "4_hour": 1.35}[horizon]
        margin = (distance_factor + incident_factor) * horizon_factor

        etas[horizon] = {
            "estimate": round(eta_minutes, 2),
            "lower_bound": round(max(0, eta_minutes - margin), 2),
            "upper_bound": round(eta_minutes + margin, 2),
        }

        # Confidence score
        confidence = 0.95 - (incident_data["avg_severity"] * 0.4)
        confidence -= {"1_hour": 0, "2_hour": 0.05, "4_hour": 0.12}[horizon]
        confidence -= min(0.1, num_segments * 0.0005)
        confidence = max(0.5, min(confidence, 0.98))
        confidence_scores[horizon] = round(confidence, 2)

    return etas, confidence_scores


# ---------------------------------------------------
# MAIN: Multi-Route ETA Computation
# ---------------------------------------------------
def compute_route_eta(source: dict, destination: dict, departure_time=None):
    if not _engine_ready:
        raise RuntimeError("Engine is still initializing. Please retry in a moment.")
    try:

        # Parse departure time
        try:
            if departure_time:
                now = datetime.fromisoformat(departure_time)
            else:
                now = datetime.now()
        except Exception:
            now = datetime.now()

        hour = now.hour
        is_peak = int(7 <= hour <= 10 or 17 <= hour <= 21)

        # Find nearest graph nodes
        orig = ox.distance.nearest_nodes(GRAPH, source["lon"], source["lat"])
        dest = ox.distance.nearest_nodes(GRAPH, destination["lon"], destination["lat"])

        # Generate up to 3 distinct routes
        all_routes = find_k_routes(orig, dest, k=3)

        if not all_routes:
            return {
                "error": "No path found between selected locations.",
                "details": "Could not compute any route."
            }

        # Process each route
        results = []
        for i, route_nodes in enumerate(all_routes):
            route_geometry, segments, road_types = extract_route_info(route_nodes)

            if len(segments) == 0:
                continue

            total_distance = sum(segments)

            # Per-segment probabilistic incident simulation (BUG FIX 2)
            incident_data = simulate_incidents(
                len(segments), road_types, hour, route_geometry
            )

            # Multi-horizon ETA prediction
            etas, confidence_scores = predict_route_etas(
                segments, road_types, hour, is_peak, incident_data
            )

            results.append({
                "route_id": i + 1,
                "label": ROUTE_LABELS[i] if i < len(ROUTE_LABELS) else f"Route {i+1}",
                "color": ROUTE_COLORS[i] if i < len(ROUTE_COLORS) else "#6B7280",
                "eta_minutes": etas,
                "confidence": confidence_scores,
                "meta": {
                    "distance_km": round(total_distance, 2),
                    "segments": len(segments),
                    "incident": incident_data["incident_count"] > 0,
                    "incident_segments": incident_data["incident_count"],
                    "avg_incident_severity": round(incident_data["avg_severity"], 2),
                    "route_geometry": route_geometry,
                    "incident_coordinates": incident_data["incident_coordinates"],
                }
            })

        if not results:
            return {
                "error": "Route contains zero segments.",
                "details": "Graph edge extraction failed for all routes."
            }

        return {"routes": results}

    except Exception as e:
        print("CRITICAL ERROR:", str(e))
        import traceback
        traceback.print_exc()
        return {"error": "Computation failed", "details": str(e)}
