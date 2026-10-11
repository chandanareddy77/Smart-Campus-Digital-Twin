"""Single source of truth for feature conventions (used by training AND inference)."""
from __future__ import annotations

import pandas as pd

TARGET = "Electricity_Consumption"
CATEGORICAL_FEATURES = ["Building_Type"]
NUMERIC_FEATURES = [
    "Hour", "Occupancy", "Temperature", "Humidity", "Lighting_Usage",
    "AC_Usage", "Computer_Usage", "Water_Consumption", "Waste_Generated",
    "Year", "Month", "Day",
]
# Exact raw column order the pipeline is trained on (Building_ID and Date are NOT model inputs).
MODEL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
BUILDING_TYPES = ["Administrative", "Classroom_Block", "Hostel", "Laboratory", "Library"]


def add_date_features(df: pd.DataFrame, date_col: str = "Date") -> pd.DataFrame:
    """Expand Date into Year, Month, Day (same logic at training and inference)."""
    out = df.copy()
    parsed = pd.to_datetime(out[date_col], errors="raise")
    out["Year"], out["Month"], out["Day"] = parsed.dt.year, parsed.dt.month, parsed.dt.day
    return out


def to_model_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Return exactly MODEL_FEATURES in the trained order; fail loudly if any is missing."""
    missing = [c for c in MODEL_FEATURES if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required model features: {missing}")
    return df[MODEL_FEATURES]
