import pandas as pd
import numpy as np


# --------------------------------------------------
# 1. LOAD & CLEAN RAW SYNTHETIC DATA
# --------------------------------------------------

def load_data(path="data/processed/synthetic_traffic_timeseries.csv"):
    """
    Load synthetic traffic data and perform strict cleaning
    to ensure valid time-series per road segment.
    """
    df = pd.read_csv(path)

    # Robust timestamp parsing
    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        format="mixed",
        errors="coerce"
    )

    # Drop invalid timestamps
    df = df.dropna(subset=["timestamp"])

    # Remove duplicated (segment_id, timestamp) pairs
    df = df.drop_duplicates(subset=["segment_id", "timestamp"])

    # Ensure correct temporal ordering
    df = df.sort_values(["segment_id", "timestamp"])

    return df


# --------------------------------------------------
# 2. TIME-BASED FEATURES
# --------------------------------------------------

def add_time_features(df):
    """
    Add temporal context features.
    """
    df["hour"] = df["timestamp"].dt.hour

    # Indian urban peak-hour indicator
    df["is_peak"] = df["hour"].apply(
        lambda h: 1 if (7 <= h <= 10 or 17 <= h <= 21) else 0
    )

    # Cyclic encoding of hour
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)

    return df


# --------------------------------------------------
# 3. LAG FEATURES
# --------------------------------------------------

def add_lag_features(df):
    """
    Add historical traffic state features.
    """
    df["speed_lag_1"] = (
        df.groupby("segment_id")["speed_kmph"].shift(1)
    )
    return df


# --------------------------------------------------
# 4. MULTI-HORIZON PREDICTION TARGETS
# --------------------------------------------------

def add_prediction_targets(df):
    """
    Add multi-horizon prediction targets.

    NOTE:
    Data is hourly. Short horizons are approximated
    using the next available timestep.
    """
    df["y_15m"] = (
        df.groupby("segment_id")["speed_kmph"].shift(-1)
    )
    df["y_30m"] = (
        df.groupby("segment_id")["speed_kmph"].shift(-1)
    )
    df["y_60m"] = (
        df.groupby("segment_id")["speed_kmph"].shift(-2)
    )
    df["y_120m"] = (
        df.groupby("segment_id")["speed_kmph"].shift(-4)
    )

    return df


# --------------------------------------------------
# 5. BUILD FINAL TRAINING DATASET
# --------------------------------------------------

def build_training_dataset():
    """
    Construct the final ML-ready dataset.
    """
    df = load_data()

    df = add_time_features(df)
    df = add_lag_features(df)
    df = add_prediction_targets(df)

    # Only enforce columns strictly required for learning
    required_cols = [
        "speed_lag_1",
        "y_15m",
        "y_30m",
        "y_60m",
        "y_120m"
    ]

    df = df.dropna(subset=required_cols)

    print("Final training rows:", len(df))
    return df


# --------------------------------------------------
# 6. SCRIPT ENTRY POINT
# --------------------------------------------------

if __name__ == "__main__":
    dataset = build_training_dataset()

    output_path = "data/processed/training_dataset.csv"
    dataset.to_csv(output_path, index=False)

    print(f"Training dataset saved to {output_path}")
