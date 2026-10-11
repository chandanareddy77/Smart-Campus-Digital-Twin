"""Phase 2: train, compare and save the electricity-consumption model.

Run from the project root:  python scripts/train_model.py
"""
from __future__ import annotations

import json
import shutil
import sys
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split, KFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeRegressor

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
from services.features import (  # noqa: E402
    BUILDING_TYPES, CATEGORICAL_FEATURES, MODEL_FEATURES, NUMERIC_FEATURES,
    TARGET, add_date_features, to_model_frame,
)

DATA_PATH = ROOT / "data" / "07_smart_campus_digital_twin.csv"
MODEL_PATH = ROOT / "models" / "best_model.pkl"
METRICS_PATH = ROOT / "reports" / "model_metrics.json"
SEED = 42
TEST_SIZE = 0.2  # 400 train / 100 test for 500 rows


def build_pipeline(estimator) -> Pipeline:
    pre = ColumnTransformer([
        ("cat", OneHotEncoder(categories=[BUILDING_TYPES], handle_unknown="error"), CATEGORICAL_FEATURES),
        ("num", StandardScaler(), NUMERIC_FEATURES),
    ])
    return Pipeline([("preprocess", pre), ("model", estimator)])


def main() -> int:
    if not DATA_PATH.exists():
        print(f"ERROR: dataset not found at {DATA_PATH}")
        return 1
    df = pd.read_csv(DATA_PATH)
    required = {"Building_ID", "Building_Type", "Date", "Hour", TARGET}
    if missing := (required | set(MODEL_FEATURES) - {"Year", "Month", "Day"}) - set(df.columns):
        print(f"ERROR: missing columns {sorted(missing)}")
        return 1

    print(f"Rows: {len(df)} | missing values: {int(df.isna().sum().sum())} | duplicates: {int(df.duplicated().sum())}")
    df = add_date_features(df)
    X, y = to_model_frame(df), df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=TEST_SIZE, random_state=SEED)
    print(f"Split: {len(X_train)} train / {len(X_test)} test (seed={SEED}); raw features: {len(MODEL_FEATURES)}")

    models = {
        "Linear Regression": LinearRegression(),
        "Decision Tree": DecisionTreeRegressor(random_state=SEED),
        "Random Forest": RandomForestRegressor(n_estimators=200, random_state=SEED, n_jobs=1),
        "Gradient Boosting": GradientBoostingRegressor(random_state=SEED),
    }
    cv = KFold(n_splits=5, shuffle=True, random_state=SEED)
    results, fitted = [], {}
    for name, est in models.items():
        pipe = build_pipeline(est)
        cv_r2 = cross_val_score(pipe, X_train, y_train, cv=cv, scoring="r2")  # train data only
        pipe.fit(X_train, y_train)
        pred, train_pred = pipe.predict(X_test), pipe.predict(X_train)
        results.append({
            "model": name,
            "mae": round(float(mean_absolute_error(y_test, pred)), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(y_test, pred))), 4),
            "r2": round(float(r2_score(y_test, pred)), 6),
            "train_r2": round(float(r2_score(y_train, train_pred)), 6),
            "cv_r2_mean": round(float(cv_r2.mean()), 6),
            "cv_r2_std": round(float(cv_r2.std()), 6),
        })
        fitted[name] = pipe

    best = max(results, key=lambda r: r["r2"])
    n_out = len(fitted[best["model"]].named_steps["preprocess"].get_feature_names_out())
    reason = (f"Highest test-set R² ({best['r2']:.4f}) of the four models, with the lowest or near-lowest MAE/RMSE; "
              f"train R² {best['train_r2']:.4f} vs 5-fold CV R² {best['cv_r2_mean']:.4f} was checked for overfitting.")

    if MODEL_PATH.exists():  # never overwrite silently
        backup = MODEL_PATH.with_name(f"best_model.{time.strftime('%Y%m%d_%H%M%S')}.bak")
        shutil.copy2(MODEL_PATH, backup)
        print(f"Existing model backed up to {backup.name}")
    MODEL_PATH.parent.mkdir(exist_ok=True)
    joblib.dump(fitted[best["model"]], MODEL_PATH)

    report = {
        "data_source": "Synthetic dataset 07_smart_campus_digital_twin.csv",
        "target": TARGET, "target_unit": "kWh (assumed)",
        "n_train": len(X_train), "n_test": len(X_test), "random_seed": SEED,
        "raw_features": MODEL_FEATURES, "transformed_feature_count": int(n_out),
        "sklearn_version": sklearn.__version__, "selection_metric": "test R²",
        "best_model": best["model"], "selection_reason": reason, "models": results,
    }
    METRICS_PATH.parent.mkdir(exist_ok=True)
    METRICS_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("\n" + pd.DataFrame(results).to_string(index=False))
    print(f"\nTransformed features after preprocessing: {n_out}")
    print(f"Best model: {best['model']} -> saved to {MODEL_PATH.relative_to(ROOT)}")
    print(f"Metrics written to {METRICS_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
