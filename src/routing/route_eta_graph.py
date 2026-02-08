import random
import numpy as np
from datetime import datetime

from .graph_loader import load_graph
from .path_finder import get_shortest_path
from src.common.features import build_features
from src.common.incidents import sample_incident
from src.models.model_loader import load_models

def compute_graph_route_eta(
    source_lat,
    source_lon,
    dest_lat,
    dest_lon
):
    G = load_graph()
    path = get_shortest_path(G, source_lat, source_lon, dest_lat, dest_lon)
    models = load_models()

    now = datetime.now()
    total_distance_km = 0.0
    total_time_minutes = {k: 0.0 for k in models}

    incident = sample_incident()

    for u, v in zip(path[:-1], path[1:]):
        edge = list(G[u][v].values())[0]
        length_km = edge.get("length", 100) / 1000
        total_distance_km += length_km

        road_type = edge.get("highway", "residential")
        if isinstance(road_type, list):
            road_type = road_type[0]

        features = build_features(
            speed_lag_1=random.uniform(20, 45),
            hour=now.hour,
            incident_flag=incident["flag"],
            incident_severity=incident["severity"],
            road_type=road_type
        )

        for horizon, model in models.items():
            speed = float(model.predict(features)[0])
            speed = max(speed, 5)
            edge_time = (length_km / speed) * 60
            total_time_minutes[horizon] += edge_time

    return {
        "eta_minutes": total_time_minutes,
        "meta": {
            "distance_km": round(total_distance_km, 2),
            "incident": incident["flag"],
            "incident_severity": incident["severity"]
        }
    }
