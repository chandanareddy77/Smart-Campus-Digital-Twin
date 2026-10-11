"""Dataset-derived statistics. Every number returned here is computed from the CSV."""
from __future__ import annotations

import pandas as pd

from . import config
from .errors import ServiceError
from .features import BUILDING_TYPES, NUMERIC_FEATURES, TARGET

REQUIRED_COLUMNS = ["Building_ID", "Building_Type", "Date", TARGET] + [
    c for c in NUMERIC_FEATURES if c not in ("Year", "Month", "Day")
]
_cache: dict = {"key": None, "df": None}


def reset_cache() -> None:
    _cache.update(key=None, df=None)


def load_dataframe() -> pd.DataFrame:
    path = config.DATA_PATH
    if not path.exists():
        raise ServiceError("dataset_missing", f"Dataset not found: {path.name}. Place it in the data/ folder.", 503)
    key = (str(path), path.stat().st_mtime)
    if _cache["key"] == key:
        return _cache["df"]
    try:
        df = pd.read_csv(path)
    except Exception as exc:
        raise ServiceError("dataset_unreadable", f"Dataset could not be read: {exc}", 503)
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ServiceError("dataset_invalid", f"Dataset is missing required columns: {missing}", 503)
    if df.empty:
        raise ServiceError("dataset_empty", "Dataset contains no records.", 503)
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    if df["Date"].isna().any():
        raise ServiceError("dataset_invalid", "Dataset contains unparseable dates.", 503)
    _cache.update(key=key, df=df)
    return df


def _r(x, n: int = 2) -> float:
    return round(float(x), n)


def feature_stats() -> list[dict]:
    df = load_dataframe()
    cols = [c for c in NUMERIC_FEATURES if c not in ("Year", "Month", "Day")]
    return [{"feature": c, "min": _r(df[c].min()), "max": _r(df[c].max()), "mean": _r(df[c].mean())} for c in cols]


def _type_comparison(df: pd.DataFrame) -> list[dict]:
    g = df.groupby("Building_Type")[TARGET].agg(["count", "mean"])
    return [{"building_type": t, "record_count": int(g.loc[t, "count"]), "avg_electricity": _r(g.loc[t, "mean"])}
            for t in BUILDING_TYPES if t in g.index]


def overview(best_model: dict | None) -> dict:
    df = load_dataframe()
    monthly = df.groupby(df["Date"].dt.to_period("M"))[TARGET].agg(["mean", "count"])
    return {
        "data_source": config.DATA_SOURCE,
        "record_count": int(len(df)),
        "building_type_count": int(df["Building_Type"].nunique()),
        "avg_electricity": _r(df[TARGET].mean()),
        "electricity_unit": config.ELECTRICITY_UNIT,
        "date_range": {"start": df["Date"].min().strftime("%Y-%m-%d"), "end": df["Date"].max().strftime("%Y-%m-%d")},
        "best_model": best_model,
        "monthly_trend": [{"month": str(p), "avg_electricity": _r(r["mean"]), "record_count": int(r["count"])}
                          for p, r in monthly.iterrows()],
        "building_type_comparison": _type_comparison(df),
        "feature_stats": feature_stats(),
    }


def trends(building_type: str | None = None, hour_from: int | None = None, hour_to: int | None = None) -> dict:
    df = load_dataframe()
    if hour_from is not None and hour_to is not None and hour_from > hour_to:
        raise ServiceError("invalid_range", "hour_from must not be greater than hour_to.", 422)
    if building_type is not None:
        if building_type not in BUILDING_TYPES:
            raise ServiceError("invalid_filter", f"Unknown building_type '{building_type}'.", 422)
        df = df[df["Building_Type"] == building_type]
    if hour_from is not None:
        df = df[df["Hour"] >= hour_from]
    if hour_to is not None:
        df = df[df["Hour"] <= hour_to]
    g = df.groupby("Hour")[TARGET].agg(["mean", "count"])
    return {
        "data_source": config.DATA_SOURCE,
        "count": int(len(g)),
        "unit": config.ELECTRICITY_UNIT,
        "filters": {"building_type": building_type, "hour_from": hour_from, "hour_to": hour_to},
        "trends": [{"hour": f"{int(h):02d}:00", "hour_number": int(h), "electricity": _r(r["mean"]),
                    "record_count": int(r["count"])} for h, r in g.iterrows()],
    }


def buildings() -> dict:
    df = load_dataframe()
    out = []
    for t in BUILDING_TYPES:
        s = df[df["Building_Type"] == t]
        if s.empty:
            continue
        e = s[TARGET]
        out.append({
            "building_type": t, "record_count": int(len(s)),
            "avg_electricity": _r(e.mean()), "min_electricity": _r(e.min()),
            "max_electricity": _r(e.max()), "std_electricity": _r(e.std()),
            "avg_occupancy": _r(s["Occupancy"].mean()), "avg_temperature": _r(s["Temperature"].mean()),
            "avg_humidity": _r(s["Humidity"].mean()), "avg_lighting_usage": _r(s["Lighting_Usage"].mean()),
            "avg_ac_usage": _r(s["AC_Usage"].mean()), "avg_computer_usage": _r(s["Computer_Usage"].mean()),
            "avg_water_consumption": _r(s["Water_Consumption"].mean()),
            "avg_waste_generated": _r(s["Waste_Generated"].mean()),
            "building_ids": s["Building_ID"].tolist(),
        })
    return {"data_source": config.DATA_SOURCE, "count": len(out), "unit": config.ELECTRICITY_UNIT, "buildings": out}


def building_record(building_id: str) -> dict:
    df = load_dataframe()
    s = df[df["Building_ID"] == building_id]
    if s.empty:
        raise ServiceError("record_not_found", f"No record with Building_ID '{building_id}'.", 404)
    r = s.iloc[0]
    return {
        "data_source": config.DATA_SOURCE, "unit": config.ELECTRICITY_UNIT,
        "building_id": str(r["Building_ID"]), "building_type": str(r["Building_Type"]),
        "date": r["Date"].strftime("%Y-%m-%d"), "hour": int(r["Hour"]), "occupancy": _r(r["Occupancy"]),
        "temperature": _r(r["Temperature"]), "humidity": _r(r["Humidity"]),
        "lighting_usage": _r(r["Lighting_Usage"]), "ac_usage": _r(r["AC_Usage"]),
        "computer_usage": _r(r["Computer_Usage"]), "water_consumption": _r(r["Water_Consumption"]),
        "waste_generated": _r(r["Waste_Generated"]), "electricity_observed": _r(r[TARGET]),
    }
