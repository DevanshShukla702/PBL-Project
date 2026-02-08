# src/routing/route_eta.py

import os
import joblib
import numpy as np
import osmnx as ox
from datetime import datetime

from src.common.features import build_features

MODEL_DIR = "models"
GRAPH_PATH = "data/raw/osm/bengaluru_road_network.graphml"

HORIZONS = {
    "1_hour": "xgb_1_hour.pkl",
    "2_hour": "xgb_2_hour.pkl",
    "4_hour": "xgb_4_hour.pkl"
}


def load_models():
    models = {}
    for h, f in HORIZONS.items():
        models[h] = joblib.load(os.path.join(MODEL_DIR, f))
    return models


MODELS = load_models()
GRAPH = ox.load_graphml(GRAPH_PATH)


def compute_route_eta(source: dict, destination: dict):
    """
    Compute ETA using graph-based shortest path + segment-wise ML speed prediction
    """

    # --- graph routing ---
    orig = ox.distance.nearest_nodes(GRAPH, source["lon"], source["lat"])
    dest = ox.distance.nearest_nodes(GRAPH, destination["lon"], destination["lat"])

    route_nodes = ox.shortest_path(GRAPH, orig, dest, weight="length")

    # --- extract segments ---
    segments = []
    for u, v in zip(route_nodes[:-1], route_nodes[1:]):
        edge = list(GRAPH.get_edge_data(u, v).values())[0]
        segments.append(edge["length"] / 1000)  # km

    # --- context ---
    now = datetime.now()
    hour = now.hour
    is_peak = int(7 <= hour <= 10 or 17 <= hour <= 21)

    # incident simulation
    incident_flag = np.random.choice([0, 1], p=[0.9, 0.1])
    incident_severity = float(np.random.uniform(0.3, 0.8)) if incident_flag else 0.0

    base_speed = 22.0 if is_peak else 28.0

    etas = {}

    for horizon, model in MODELS.items():
        eta_minutes = 0.0

        for seg_len in segments:
            features = build_features(
                speed_lag_1=base_speed,
                hour=hour,
                is_peak=is_peak,
                incident_flag=incident_flag,
                incident_severity=incident_severity
            )

            pred_speed = float(model.predict(features)[0])
            pred_speed = max(pred_speed, 5)

            eta_minutes += (seg_len / pred_speed) * 60

        # corridor realism
        corridor_penalty = 1 + 0.035 * np.log1p(len(segments))
        eta_minutes *= corridor_penalty

        # horizon uncertainty
        horizon_uncertainty = {
            "1_hour": 1.0,
            "2_hour": 1.15,
            "4_hour": 1.35
        }
        eta_minutes *= horizon_uncertainty[horizon]

        etas[horizon] = round(eta_minutes, 2)

    return {
        "eta_minutes": etas,
        "meta": {
            "distance_km": round(sum(segments), 2),
            "incident": bool(incident_flag),
            "incident_severity": round(incident_severity, 2)
        }
    }
