import pandas as pd
import numpy as np


# --------------------------------------------------
# 1. LOAD & CLEAN RAW SYNTHETIC DATA
# --------------------------------------------------

def load_data(path="data/raw/synthetic_traffic_v2.csv"):
    df = pd.read_csv(path)

    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        format="mixed",
        errors="coerce"
    )

    df = df.dropna(subset=["timestamp"])
    df = df.drop_duplicates(subset=["segment_id", "timestamp"])
    df = df.sort_values(["segment_id", "timestamp"])

    return df


# --------------------------------------------------
# 2. TIME FEATURES
# --------------------------------------------------

def add_time_features(df):
    df["hour"] = df["timestamp"].dt.hour

    df["is_peak"] = df["hour"].apply(
        lambda h: 1 if (7 <= h <= 10 or 17 <= h <= 21) else 0
    )

    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)

    return df


# --------------------------------------------------
# 3. LAG FEATURES (HOURLY DATA)
# --------------------------------------------------

def add_lag_features(df):
    g = df.groupby("segment_id")

    df["speed_lag_1"] = g["speed_kmph"].shift(1)
    df["incident_flag"] = df["incident_flag"].astype(int)
    df["incident_severity"] = df["incident_severity"].astype(float)


    return df


# --------------------------------------------------
# 4. HOURLY FORECAST TARGETS (CORRECT)
# --------------------------------------------------

def add_prediction_targets(df):
    g = df.groupby("segment_id")

    # Correct, non-overlapping horizons
    df["y_1h"] = g["speed_kmph"].shift(-1)
    df["y_2h"] = g["speed_kmph"].shift(-2)
    df["y_4h"] = g["speed_kmph"].shift(-4)

    return df


# --------------------------------------------------
# 5. BUILD DATASET
# --------------------------------------------------

def build_training_dataset():
    df = load_data()
    df = add_time_features(df)
    df = add_lag_features(df)
    df = add_prediction_targets(df)

    required_cols = [
    "speed_lag_1",
    "incident_flag",
    "incident_severity",
    "y_1h",
    "y_2h",
    "y_4h"
]


    df = df.dropna(subset=required_cols)

    print("Final training rows:", len(df))
    return df


# --------------------------------------------------
# 6. ENTRY POINT
# --------------------------------------------------

if __name__ == "__main__":
    dataset = build_training_dataset()

    output_path = "data/processed/training_dataset.csv"
    dataset.to_csv(output_path, index=False)

    print(f"Training dataset saved to {output_path}")

