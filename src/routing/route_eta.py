import osmnx as ox
import os
import joblib
import numpy as np
from datetime import datetime
from functools import lru_cache

from src.common.features import build_features
from src.models.multi_horizon_xgb import load_models
from src.routing.graph_loader import load_graph

# ---------------------------------------------------
# Load graph & models once (startup caching)
# ---------------------------------------------------
GRAPH = None
MODELS = None

# ---------------------------------------------------
# Route caching
# ---------------------------------------------------
@lru_cache(maxsize=200)
def get_shortest_path(orig, dest):
    return ox.shortest_path(GRAPH, orig, dest, weight="length")

def initialize_engine():
    global GRAPH, MODELS
    if GRAPH is None:
        GRAPH = load_graph()
    if MODELS is None:
        MODELS = load_models()

# ---------------------------------------------------
# MAIN ETA FUNCTION
# ---------------------------------------------------
def compute_route_eta(source: dict, destination: dict):
    initialize_engine()

    # ---------------------------------------------------
    # 1️⃣ Graph Routing
    # ---------------------------------------------------
    orig = ox.distance.nearest_nodes(GRAPH, source["lon"], source["lat"])
    dest = ox.distance.nearest_nodes(GRAPH, destination["lon"], destination["lat"])

    route_nodes = get_shortest_path(orig, dest)

    segments = []
    road_types = []

    for u, v in zip(route_nodes[:-1], route_nodes[1:]):
        edge_data = list(GRAPH.get_edge_data(u, v).values())[0]

        length_km = edge_data["length"] / 1000.0
        segments.append(length_km)

        road_type = edge_data.get("highway", "residential")
        if isinstance(road_type, list):
            road_type = road_type[0]
        road_types.append(road_type)

    total_distance = sum(segments)
    num_segments = len(segments)

    # ---------------------------------------------------
    # 2️⃣ Temporal Context
    # ---------------------------------------------------
    now = datetime.now()
    hour = now.hour
    is_peak = int(7 <= hour <= 10 or 17 <= hour <= 21)

    # ---------------------------------------------------
    # 3️⃣ Road-Type Free Flow Speeds
    # ---------------------------------------------------
    FREE_FLOW = {
        "motorway": 80,
        "primary": 60,
        "secondary": 45,
        "residential": 30
    }

    # ---------------------------------------------------
    # 4️⃣ Route-Level Incident Probability
    # ---------------------------------------------------
    route_has_incident = np.random.rand() < 0.35  # 35% chance

    if route_has_incident and num_segments > 0:
        incident_segments = set(
            np.random.choice(
                range(num_segments),
                size=max(1, num_segments // 15),
                replace=False
            )
        )
    else:
        incident_segments = set()

    propagation_bonus = 0.15

    total_incident_severity = 0.0
    incident_count = 0

    etas = {}
    confidence_scores = {}

    # ---------------------------------------------------
    # 5️⃣ Multi-Horizon ETA Computation
    # ---------------------------------------------------
    for horizon, model in MODELS.items():

        eta_minutes = 0.0

        for idx, seg_len in enumerate(segments):

            road_type = road_types[idx]
            free_flow_speed = FREE_FLOW.get(road_type, 40)

            load_factor = 0.75 if is_peak else 0.55
            base_speed = free_flow_speed * (1 - load_factor)

            # ---------------------------------------------------
            # Incident Modeling
            # ---------------------------------------------------
            incident_flag = idx in incident_segments

            if incident_flag:
                incident_severity = np.random.uniform(0.3, 0.8)
            else:
                incident_severity = 0.0

            if idx - 1 in incident_segments:
                incident_severity += propagation_bonus
            if idx + 1 in incident_segments:
                incident_severity += propagation_bonus

            incident_severity = min(incident_severity, 0.9)

            if incident_flag:
                total_incident_severity += incident_severity
                incident_count += 1

            # ---------------------------------------------------
            # Feature Construction
            # ---------------------------------------------------
            features = build_features(
                speed_lag_1=base_speed,
                hour=hour,
                is_peak=is_peak,
                incident_flag=int(incident_severity > 0),
                incident_severity=float(incident_severity)
            )

            # ---------------------------------------------------
            # ML Prediction
            # ---------------------------------------------------
            pred_speed = float(model.predict(features)[0])
            pred_speed = max(pred_speed, 5.0)

            segment_eta = (seg_len / pred_speed) * 60.0
            eta_minutes += segment_eta

        # ---------------------------------------------------
        # ETA Uncertainty Bands
        # ---------------------------------------------------
        avg_severity = (
            total_incident_severity / incident_count
            if incident_count > 0 else 0.0
        )

        distance_factor = total_distance * 0.03
        incident_factor = avg_severity * 8 if incident_count > 0 else 0

        horizon_factor = {
            "1_hour": 1.0,
            "2_hour": 1.15,
            "4_hour": 1.35
        }[horizon]

        uncertainty_margin = (
            (distance_factor + incident_factor) * horizon_factor
        )

        lower_bound = max(0, eta_minutes - uncertainty_margin)
        upper_bound = eta_minutes + uncertainty_margin

        etas[horizon] = {
            "estimate": round(eta_minutes, 2),
            "lower_bound": round(lower_bound, 2),
            "upper_bound": round(upper_bound, 2)
        }

        # ---------------------------------------------------
        # Confidence Score
        # ---------------------------------------------------
        base_confidence = 0.95
        incident_penalty = avg_severity * 0.4

        horizon_penalty = {
            "1_hour": 0.0,
            "2_hour": 0.05,
            "4_hour": 0.12
        }[horizon]

        segment_penalty = min(0.1, num_segments * 0.0005)

        confidence = (
            base_confidence
            - incident_penalty
            - horizon_penalty
            - segment_penalty
        )

        confidence = max(0.5, min(confidence, 0.98))
        confidence_scores[horizon] = round(confidence, 2)

    # ---------------------------------------------------
    # 6️⃣ Incident Metadata Summary
    # ---------------------------------------------------
    any_incident = incident_count > 0
    avg_severity = (
        total_incident_severity / incident_count
        if incident_count > 0 else 0.0
    )

    return {
        "eta_minutes": etas,
        "confidence": confidence_scores,
        "meta": {
            "distance_km": round(total_distance, 2),
            "segments": num_segments,
            "incident": any_incident,
            "incident_segments": incident_count,
            "avg_incident_severity": round(avg_severity, 2)
        }
    }
