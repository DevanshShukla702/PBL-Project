import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split


FEATURES = ["hour", "is_peak", "hour_sin", "hour_cos", "speed_lag_1"]

TARGETS = {
    "15_min": "y_15m",
    "30_min": "y_30m",
    "60_min": "y_60m",
    "120_min": "y_120m"
}


def load_data(path="data/processed/training_dataset.csv", sample_size=200000):
    df = pd.read_csv(path)
    if len(df) > sample_size:
        df = df.sample(sample_size, random_state=42)
    return df


def train_and_get_importance(X, y):
    X_train, _, y_train, _ = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    return model.feature_importances_


def main():
    df = load_data()
    X = df[FEATURES]

    print("\nFeature Importance Across Horizons\n")

    for horizon, target in TARGETS.items():
        y = df[target]
        importances = train_and_get_importance(X, y)

        importance_df = (
            pd.DataFrame({
                "feature": FEATURES,
                "importance": importances
            })
            .sort_values("importance", ascending=False)
        )

        print(f"\nHorizon: {horizon}")
        print(importance_df.to_string(index=False))


if __name__ == "__main__":
    main()
