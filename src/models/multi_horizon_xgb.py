import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from pathlib import Path
import joblib

# ============================================================
# CONFIG
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "data" / "processed" / "training_dataset.csv"
MODEL_DIR = PROJECT_ROOT / "models"
MODEL_DIR.mkdir(exist_ok=True)

# 🔒 LOCKED FEATURE CONTRACT (TRAINING == INFERENCE)
FEATURE_COLS = [
    "speed_lag_1",
    "hour",
    "hour_sin",
    "hour_cos",
    "is_peak",
    "incident_flag",
    "incident_severity"
]

TARGETS = {
    "1_hour": "y_1h",
    "2_hour": "y_2h",
    "4_hour": "y_4h"
}

# ============================================================
# TRAINING FUNCTION
# ============================================================

def train_xgb_for_horizon(df, horizon_name, target_col):
    print(f"\nTraining XGBoost for horizon: {horizon_name}")

    # Drop rows with missing required data
    data = df.dropna(subset=FEATURE_COLS + [target_col])

    X = data[FEATURE_COLS]
    y = data[target_col]

    # Time-aware split (NO SHUFFLE)
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

    return model, mae, rmse


# ============================================================
# MAIN
# ============================================================

def main():
    print("Loading training dataset...")
    df = pd.read_csv(DATA_PATH)

    results = {}

    for horizon, target_col in TARGETS.items():
        model, mae, rmse = train_xgb_for_horizon(df, horizon, target_col)

        model_path = MODEL_DIR / f"xgb_{horizon}.pkl"
        joblib.dump(model, model_path)

        print(f"Model saved to: {model_path}")

        results[horizon] = {"MAE": mae, "RMSE": rmse}

    print("\n==== XGBOOST MULTI-HORIZON RESULTS (HOURLY) ====")
    for h, m in results.items():
        print(f"{h}: MAE={m['MAE']:.2f}, RMSE={m['RMSE']:.2f}")


if __name__ == "__main__":
    main()
