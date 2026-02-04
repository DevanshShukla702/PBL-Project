import os          # <-- ADD THIS
import osmnx as ox
import networkx as nx
import pandas as pd
import numpy as np
import joblib
from datetime import datetime



# --------------------------------------------------
# CONFIG
# --------------------------------------------------

GRAPH_PATH = "data/raw/osm/bengaluru_road_network.graphml"
MODEL_DIR = "models"

HORIZON_MODELS = {
    "1_hour": "xgb_1_hour.pkl",
    "2_hour": "xgb_2_hour.pkl",
    "4_hour": "xgb_4_hour.pkl"
}

FEATURE_COLS = [
    "speed_lag_1",
    "hour",
    "hour_sin",
    "hour_cos",
    "is_peak"
]


# --------------------------------------------------
# LOADERS
# --------------------------------------------------

def load_graph():
    return ox.load_graphml(GRAPH_PATH)


def load_models():
    models = {}
    for horizon, fname in HORIZON_MODELS.items():
        models[horizon] = joblib.load(os.path.join(MODEL_DIR, fname))
    return models


# --------------------------------------------------
# ROUTE EXTRACTION
# --------------------------------------------------

def get_route_segments(G, src_lat, src_lon, dst_lat, dst_lon):
    src_node = ox.nearest_nodes(G, src_lon, src_lat)
    dst_node = ox.nearest_nodes(G, dst_lon, dst_lat)

    path = nx.shortest_path(G, src_node, dst_node, weight="length")

    segments = []
    for u, v in zip(path[:-1], path[1:]):
        edge_data = G.get_edge_data(u, v)[0]

        segment_id = f"{u}_{v}_0"
        length = edge_data.get("length", 100)
        road_type = edge_data.get("highway", "residential")

        segments.append({
            "segment_id": segment_id,
            "length_m": length,
            "road_type": road_type
        })

    return segments


# --------------------------------------------------
# FEATURE CONSTRUCTION (INFERENCE)
# --------------------------------------------------

def build_features(speed_lag, timestamp):
    hour = timestamp.hour
    return pd.DataFrame([{
        "speed_lag_1": speed_lag,
        "hour": hour,
        "hour_sin": np.sin(2 * np.pi * hour / 24),
        "hour_cos": np.cos(2 * np.pi * hour / 24),
        "is_peak": 1 if (7 <= hour <= 10 or 17 <= hour <= 21) else 0
    }])


# --------------------------------------------------
# ETA COMPUTATION
# --------------------------------------------------

def compute_route_eta(route_segments, models, base_speed=35.0):
    etas = {}

    now = datetime.now()

    for horizon, model in models.items():
        total_time_sec = 0

        for seg in route_segments:
            features = build_features(base_speed, now)
            pred_speed = model.predict(features)[0]

            pred_speed = max(pred_speed, 5.0)  # safety
            time_sec = seg["length_m"] / (pred_speed * 1000 / 3600)

            total_time_sec += time_sec

        etas[horizon] = total_time_sec / 60  # minutes

    return etas


# --------------------------------------------------
# PUBLIC API
# --------------------------------------------------

def predict_route_eta(src_lat, src_lon, dst_lat, dst_lon):
    G = load_graph()
    models = load_models()

    route = get_route_segments(G, src_lat, src_lon, dst_lat, dst_lon)
    etas = compute_route_eta(route, models)

    return etas
