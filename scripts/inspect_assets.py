"""Phase 1: inspect the dataset and the saved model WITHOUT modifying anything.

Run from the project root:
    python scripts/inspect_assets.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "07_smart_campus_digital_twin.csv"
MODEL_PATH = ROOT / "models" / "best_model.pkl"
PREPROCESSOR_PATH = ROOT / "models" / "preprocessor.pkl"

EXPECTED_COLUMNS = [
    "Building_ID", "Building_Type", "Date", "Hour", "Occupancy", "Temperature",
    "Humidity", "Lighting_Usage", "AC_Usage", "Computer_Usage",
    "Water_Consumption", "Electricity_Consumption", "Waste_Generated",
]
TARGET = "Electricity_Consumption"
EXPECTED_BUILDING_TYPES = {"Library", "Administrative", "Classroom_Block", "Hostel", "Laboratory"}


def section(title: str) -> None:
    print(f"\n=== {title} ===")


def inspect_dataset() -> bool:
    section("Dataset")
    if not DATA_PATH.exists():
        print(f"MISSING: {DATA_PATH}")
        print("Fix: copy 07_smart_campus_digital_twin.csv into the data/ folder.")
        return False
    import pandas as pd

    df = pd.read_csv(DATA_PATH)
    print(f"Path: {DATA_PATH}\nShape: {df.shape}")
    missing_cols = [c for c in EXPECTED_COLUMNS if c not in df.columns]
    extra_cols = [c for c in df.columns if c not in EXPECTED_COLUMNS]
    print(f"Missing expected columns: {missing_cols or 'none'}")
    print(f"Unexpected extra columns: {extra_cols or 'none'}")
    if TARGET not in df.columns:
        print(f"ERROR: target column '{TARGET}' not found.")
        return False
    print("\nDtypes:\n" + df.dtypes.to_string())
    print("\nMissing values per column:\n" + df.isna().sum().to_string())
    print(f"\nDuplicate rows: {int(df.duplicated().sum())}")
    if "Building_Type" in df.columns:
        found = set(df["Building_Type"].dropna().unique())
        print(f"Building types found: {sorted(found)}")
        print(f"Differs from expected set: {sorted(found ^ EXPECTED_BUILDING_TYPES) or 'no'}")
    if "Date" in df.columns:
        parsed = pd.to_datetime(df["Date"], errors="coerce")
        print(f"Unparseable dates: {int(parsed.isna().sum())}; range {parsed.min()} -> {parsed.max()}")
    if "Hour" in df.columns:
        print(f"Hour range: {df['Hour'].min()} -> {df['Hour'].max()}")
    print("\nNumeric summary:\n" + df.describe().T.to_string())
    return True


def inspect_model() -> bool:
    section("Saved model")
    if not MODEL_PATH.exists():
        print(f"MISSING: {MODEL_PATH}")
        print("Fix: copy your old best_model.pkl into models/, or run scripts/train_model.py (Phase 2) to create a new one.")
        return False
    import joblib
    import sklearn
    from sklearn.pipeline import Pipeline

    print(f"Installed scikit-learn: {sklearn.__version__}")
    try:
        model = joblib.load(MODEL_PATH)
    except Exception as exc:  # version mismatch, corrupt file, etc.
        print(f"FAILED to load model: {type(exc).__name__}: {exc}")
        print("Fix: install the scikit-learn version used to save it, or retrain in Phase 2.")
        return False
    print(f"Loaded type: {type(model).__name__}")
    if isinstance(model, Pipeline):
        print("Pipeline steps:", [name for name, _ in model.steps])
    else:
        print("WARNING: not a Pipeline; preprocessing may live in preprocessor.pkl.")
    cols = getattr(model, "feature_names_in_", None)
    print("Raw input columns expected:", list(cols) if cols is not None else "not recorded")
    if PREPROCESSOR_PATH.exists():
        print(f"NOTE: {PREPROCESSOR_PATH.name} exists. Do NOT apply it before the full pipeline.")
    return True


def main() -> int:
    print(f"Project root: {ROOT}")
    ok_data = inspect_dataset()
    ok_model = inspect_model()
    section("Result")
    print(f"Dataset ready: {ok_data} | Saved model usable: {ok_model}")
    return 0 if ok_data else 1


if __name__ == "__main__":
    sys.exit(main())
