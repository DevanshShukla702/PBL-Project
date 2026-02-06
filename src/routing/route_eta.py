import os
import joblib
import osmnx as ox
import networkx as nx
import numpy as np

# -----------------------------
# Paths
# -----------------------------
GRAPH_PATH = "data/raw/osm/bengaluru_road_network.graphml"
MODEL_DIR = "models"

HORIZONS = {
    "1_hour": "xgb_1_hour.pkl",
    "2_hour": "xgb_2_hour.pkl",
    "4_hour": "xgb_4_hour.pkl"
}

# -----------------------------
# Load graph (cached)
# -----------------------------
_graph = None


def load_graph():
    global _graph
    if _graph is None:
        if not os.path.exists(GRAPH_PATH):
            raise FileNotFoundError(f"Graph not found at {GRAPH_PATH}")
        _graph = ox.load_graphml(GRAPH_PATH)
    return _graph


# -----------------------------
# Load ML models
# -----------------------------
def load_models():
    models = {}
    for horizon, fname in HORIZONS.items():
        path = os.path.join(MODEL_DIR, fname)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model missing: {path}")
        models[horizon] = joblib.load(path)
    return models


# -----------------------------
# Shortest path
# -----------------------------
def get_shortest_path(G, source, destination):
    orig = ox.nearest_nodes(G, source[1], source[0])
    dest = ox.nearest_nodes(G, destination[1], destination[0])

    return nx.shortest_path(G, orig, dest, weight="length")


# -----------------------------
# Route ETA computation
# -----------------------------
def compute_route_eta(source, destination):
    """
    source, destination: (lat, lon)
    returns: dict of horizon -> ETA in minutes (python float)
    """
    G = load_graph()
    models = load_models()

    try:
        route = get_shortest_path(G, source, destination)
    except nx.NetworkXNoPath:
        return {"error": "No route found"}

    # Compute total route length safely
    total_length_m = 0.0
    for u, v in zip(route[:-1], route[1:]):
        edge_data = G.get_edge_data(u, v)
        if edge_data:
            first_edge = list(edge_data.values())[0]
            total_length_m += first_edge.get("length", 100)

    total_km = total_length_m / 1000.0

    # Base features (simple but stable)
    hour = 12
    hour_sin = np.sin(2 * np.pi * hour / 24)
    hour_cos = np.cos(2 * np.pi * hour / 24)
    is_peak = 0
    speed_lag_1 = 30.0  # reasonable default

    features = np.array([[speed_lag_1, hour, hour_sin, hour_cos, is_peak]])

    etas = {}
    for horizon, model in models.items():
        pred_speed = float(model.predict(features)[0])  # convert NumPy → float
        eta_minutes = (total_km / max(pred_speed, 5)) * 60
        etas[horizon] = float(round(eta_minutes, 2))

    return etas
