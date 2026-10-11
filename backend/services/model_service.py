"""Loads the saved scikit-learn Pipeline and runs predictions.

The saved file is a COMPLETE Pipeline (preprocessing + regressor), so raw features go
straight in. The standalone preprocessor.pkl (if present) is intentionally never used.
"""
from __future__ import annotations

import json

import joblib
import pandas as pd
from sklearn.pipeline import Pipeline

from . import config, data_service
from .errors import ServiceError
from .features import MODEL_FEATURES, add_date_features, to_model_frame

# API field name -> dataset column name
FIELD_TO_COLUMN = {
    "building_type": "Building_Type", "hour": "Hour", "occupancy": "Occupancy",
    "temperature": "Temperature", "humidity": "Humidity", "lighting_usage": "Lighting_Usage",
    "ac_usage": "AC_Usage", "computer_usage": "Computer_Usage",
    "water_consumption": "Water_Consumption", "waste_generated": "Waste_Generated",
}
_cache: dict = {"key": None, "model": None}


def load_model() -> Pipeline:
    path = config.MODEL_PATH
    if not path.exists():
        raise ServiceError("model_missing", f"Model file not found: {path.name}. Run scripts/train_model.py.", 503)
    key = (str(path), path.stat().st_mtime)
    if _cache["key"] == key:
        return _cache["model"]
    try:
        model = joblib.load(path)
    except Exception as exc:
        raise ServiceError("model_load_failed", f"Model could not be loaded ({type(exc).__name__}). "
                           "Retrain with scripts/train_model.py using the installed scikit-learn.", 503)
    if not isinstance(model, Pipeline):
        raise ServiceError("model_schema_mismatch", "Saved model is not a scikit-learn Pipeline.", 503)
    cols = getattr(model, "feature_names_in_", None)
    if cols is None or list(cols) != MODEL_FEATURES:
        raise ServiceError("model_schema_mismatch", "Saved model's input columns do not match the expected "
                           f"features {MODEL_FEATURES}. Retrain with scripts/train_model.py.", 503)
    _cache.update(key=key, model=model)
    return model


def load_metrics() -> dict:
    path = config.METRICS_PATH
    if not path.exists():
        raise ServiceError("metrics_missing", f"{path.name} not found. Run scripts/train_model.py.", 503)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        data["models"], data["best_model"]  # noqa: B018 - presence check
    except Exception as exc:
        raise ServiceError("metrics_invalid", f"Metrics file is invalid: {exc}", 503)
    return data


def best_model_summary() -> dict | None:
    """Best-model entry for /overview; None if metrics are unavailable (never invented)."""
    try:
        m = load_metrics()
    except ServiceError:
        return None
    best = next((x for x in m["models"] if x["model"] == m["best_model"]), None)
    return None if best is None else {"name": best["model"], "r2": best["r2"], "mae": best["mae"], "rmse": best["rmse"]}


def default_date() -> pd.Timestamp:
    """Internal date used for predictions (the date is not a user input): the dataset's median date."""
    dates = data_service.load_dataframe()["Date"].sort_values().reset_index(drop=True)
    return dates.iloc[len(dates) // 2]


def _range_warnings(row: dict) -> list[str]:
    warnings = []
    for s in data_service.feature_stats():
        v = row.get(s["feature"])
        if v is not None and not (s["min"] <= v <= s["max"]):
            warnings.append(f"{s['feature'].replace('_', ' ')} of {v} is outside the usual range ({s['min']} to {s['max']}), "
                            "so this estimate may be less reliable.")
    return warnings


def predict(inputs: dict) -> dict:
    model = load_model()
    row = {FIELD_TO_COLUMN[k]: v for k, v in inputs.items() if k in FIELD_TO_COLUMN}
    missing = [c for c in FIELD_TO_COLUMN.values() if c not in row]
    if missing:
        raise ServiceError("missing_features", f"Missing required inputs: {missing}", 422)
    frame = add_date_features(pd.DataFrame([{**row, "Date": default_date()}]))
    X = to_model_frame(frame)  # exact trained column order; no Date / Building_ID
    value = float(model.predict(X)[0])
    warnings = _range_warnings(row)
    if value < 0:
        warnings.append("These conditions gave a negative estimate, which is not realistic; please adjust the values.")
    return {
        "prediction": round(value, 2),
        "unit": config.ELECTRICITY_UNIT,
        "model_name": (best_model_summary() or {}).get("name") or type(model.named_steps["model"]).__name__,
        "label": "ML prediction (not an actual meter reading)",
        "inputs_used": {**inputs},
        "date_used_internally": default_date().strftime("%Y-%m-%d"),
        "warnings": warnings,
    }
