import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib


def load_training_data(path="data/processed/training_dataset.csv", sample_size=200000):
    print("Loading training data...")
    df = pd.read_csv(path)

    if len(df) > sample_size:
        df = df.sample(sample_size, random_state=42)

    print(f"Using {len(df)} rows for training")
    return df


def prepare_features(df):
    feature_cols = [
        "hour",
        "is_peak",
        "hour_sin",
        "hour_cos",
        "speed_lag_1"
    ]

    X = df[feature_cols]
    y = df["y_30m"]

    return X, y


def train_model(X_train, y_train):
    print("Training Random Forest model...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    return model


def evaluate_model(model, X_test, y_test):
    preds = model.predict(X_test)

    mae = mean_absolute_error(y_test, preds)
    mse = mean_squared_error(y_test, preds)
    rmse = mse ** 0.5

    print(f"MAE  : {mae:.2f} km/h")
    print(f"RMSE : {rmse:.2f} km/h")


def main():
    df = load_training_data()

    X, y = prepare_features(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = train_model(X_train, y_train)

    evaluate_model(model, X_test, y_test)

    joblib.dump(model, "models/baseline_rf_model.pkl")
    print("Baseline model saved to models/baseline_rf_model.pkl")


if __name__ == "__main__":
    main()
