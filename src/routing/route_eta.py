# src/routing/route_eta.py

import os
import joblib
import numpy as np
import random
from datetime import datetime

from src.common.features import build_features

MODEL_DIR = "models"

HORIZONS = {
    "1_hour": "xgb_1_hour.pkl",
    "2_hour": "xgb_2_hour.pkl",
    "4_hour": "xgb_4_hour.pkl"
}


def load_models():
    models = {}
    for horizon, fname in HORIZONS.items():
        path = os.path.join(MODEL_DIR, fname)
        models[horizon] = joblib.load(path)
    return models


MODELS = load_models()


def compute_route_eta(source, destination):
    """
    Compute route ETA for all horizons.
    """

    # --- MOCK route stats (will be graph-based later) ---
    route_length_km = random.uniform(6, 14)
    avg_speed_lag = random.uniform(18, 32)

    now = datetime.now()
    hour = now.hour
    is_peak = int(7 <= hour <= 10 or 17 <= hour <= 21)

    # Incident simulation (Phase B)
    incident_flag = np.random.choice([0, 1], p=[0.9, 0.1])
    incident_severity = random.uniform(0.3, 0.8) if incident_flag else 0.0

    etas = {}

    for horizon, model in MODELS.items():
        features = build_features(
            speed_lag_1=avg_speed_lag,
            hour=hour,
            is_peak=is_peak,
            incident_flag=incident_flag,
            incident_severity=incident_severity
        )

        pred_speed = float(model.predict(features)[0])
        eta_minutes = (route_length_km / max(pred_speed, 5)) * 60

        # Horizon penalty (realistic divergence)
        if horizon == "2_hour":
            eta_minutes *= 1.12
        elif horizon == "4_hour":
            eta_minutes *= 1.28

        etas[horizon] = round(eta_minutes, 2)

    return {
        "eta_minutes": etas,
        "meta": {
            "distance_km": round(route_length_km, 2),
            "incident": bool(incident_flag),
            "incident_severity": round(incident_severity, 2)
        }
    }
