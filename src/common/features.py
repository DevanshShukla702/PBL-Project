# src/common/features.py

import numpy as np
import pandas as pd


def build_features(
    speed_lag_1: float,
    hour: int,
    is_peak: int,
    incident_flag: int,
    incident_severity: float
):
    """
    Build ML feature vector in EXACT order used during training
    """
    return pd.DataFrame([{
        "speed_lag_1": speed_lag_1,
        "hour": hour,
        "hour_sin": np.sin(2 * np.pi * hour / 24),
        "hour_cos": np.cos(2 * np.pi * hour / 24),
        "is_peak": is_peak,
        "incident_flag": incident_flag,
        "incident_severity": incident_severity
    }])
