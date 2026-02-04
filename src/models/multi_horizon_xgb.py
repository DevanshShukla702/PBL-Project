import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from pathlib import Path


# ============================================================
# CONFIG
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "data" / "processed" / "training_dataset.csv"

BASE_FEATURES = [
    "hour",
    "hour_sin",
    "hour_cos",
    "is_peak"
]

TARGETS = {
    "1_hour": "y_1h",
    "2_hour": "y_2h",
    "4_hour": "y_4h"
}

HORIZON_LAGS = {
    "1_hour": ["speed_lag_1"],
    "2_hour": ["speed_lag_1", "speed_lag_2"],
    "4_hour": ["speed_lag_1", "speed_lag_2", "speed_lag_4"]
}


# ============================================================
# TRAINING FUNCTION
# ============================================================

def train_xgb_for_horizon(df, horizon_name, target_col):
    print(f"\nTraining XGBoost for horizon: {horizon_name}")

    feature_cols = HORIZON_LAGS[horizon_name] + BASE_FEATURES
    data = df.dropna(subset=feature_cols + [target_col])

    X = data[feature_cols]
    y = data[target_col]

    # -------- Time-aware split (NO leakage) --------
    split_idx = int(len(data) * 0.8)

    X_train = X.iloc[:split_idx]
    X_test  = X.iloc[split_idx:]
    y_train = y.iloc[:split_idx]
    y_test  = y.iloc[split_idx:]

    model = XGBRegressor(
        n_estimators=250,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    preds = model.predict(X_test)

    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))

    print(f"MAE  : {mae:.2f} km/h")
    print(f"RMSE : {rmse:.2f} km/h")

    return mae, rmse


# ============================================================
# MAIN
# ============================================================

def main():
    print("Loading training dataset...")
    df = pd.read_csv(DATA_PATH)

    results = {}

    for horizon, target_col in TARGETS.items():
        mae, rmse = train_xgb_for_horizon(df, horizon, target_col)
        results[horizon] = {"MAE": mae, "RMSE": rmse}

    print("\n==== XGBOOST MULTI-HORIZON RESULTS (HOURLY) ====")
    for h, metrics in results.items():
        print(f"{h}: MAE={metrics['MAE']:.2f}, RMSE={metrics['RMSE']:.2f}")


if __name__ == "__main__":
    main()
