import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error
from pathlib import Path

# Resolve project root
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "data" / "processed" / "training_dataset.csv"

TARGETS = {
    "1_hour": "y_1h",
    "2_hour": "y_2h",
    "4_hour": "y_4h"
}

def main():
    print("Loading dataset for naive baseline...")
    df = pd.read_csv(DATA_PATH)

    df = df.dropna(subset=["speed_lag_1"] + list(TARGETS.values()))

    for horizon, target in TARGETS.items():
        y_true = df[target]
        y_pred = df["speed_lag_1"]

        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))

        print(f"\nNaive Baseline – Horizon {horizon}")
        print(f"MAE  : {mae:.2f} km/h")
        print(f"RMSE : {rmse:.2f} km/h")

if __name__ == "__main__":
    main()
