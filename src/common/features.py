# src/common/features.py

import numpy as np
from datetime import datetime

def build_features(
    speed_lag_1: float,
    hour: int,
    is_peak: int,
    incident_flag: int,
    incident_severity: float
):
    """
    Build ML feature vector in EXACT order used during training.
    """

    hour_sin = np.sin(2 * np.pi * hour / 24)
    hour_cos = np.cos(2 * np.pi * hour / 24)

    return np.array([[
        speed_lag_1,
        hour,
        hour_sin,
        hour_cos,
        is_peak,
        incident_flag,
        incident_severity
    ]])
