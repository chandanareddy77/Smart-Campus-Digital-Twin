"""Central file locations, resolved relative to the project root (no hardcoded paths)."""
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "data" / "07_smart_campus_digital_twin.csv"
MODEL_PATH = PROJECT_ROOT / "models" / "best_model.pkl"
METRICS_PATH = PROJECT_ROOT / "reports" / "model_metrics.json"

DATA_SOURCE = "CSV dataset observations (synthetic data)"
ELECTRICITY_UNIT = "kWh"  # assumed by the project owner; not documented in the CSV
