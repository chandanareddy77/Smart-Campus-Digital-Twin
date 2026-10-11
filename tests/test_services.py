"""Service-layer tests. No web framework needed: plain asserts, runnable with pytest or `python tests/run_service_tests.py`."""
import sys
import tempfile
from pathlib import Path

import joblib
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from services import config, data_service, model_service  # noqa: E402
from services.errors import ServiceError  # noqa: E402
from services.features import BUILDING_TYPES, MODEL_FEATURES, add_date_features, to_model_frame  # noqa: E402

VALID = dict(building_type="Library", hour=10, occupancy=60, temperature=28, humidity=60, lighting_usage=50,
             ac_usage=40, computer_usage=35, water_consumption=170, waste_generated=11)


def _raises(code, fn, *a, **k):
    try:
        fn(*a, **k)
    except ServiceError as e:
        assert e.code == code, f"expected {code}, got {e.code}"
        return
    raise AssertionError(f"expected ServiceError {code}")


def test_dataset_loads():
    df = data_service.load_dataframe()
    assert len(df) == 500 and df["Building_Type"].nunique() == 5


def test_overview_matches_csv():
    raw = pd.read_csv(config.DATA_PATH)
    ov = data_service.overview(model_service.best_model_summary())
    assert ov["record_count"] == len(raw)
    assert ov["avg_electricity"] == round(float(raw["Electricity_Consumption"].mean()), 2)
    assert ov["best_model"]["name"] == model_service.load_metrics()["best_model"]
    assert len(ov["monthly_trend"]) > 0 and len(ov["building_type_comparison"]) == 5


def test_trends_shape_and_values():
    t = data_service.trends()
    assert set(t) == {"data_source", "count", "unit", "filters", "trends"}
    assert t["count"] == len(t["trends"]) > 0
    assert set(t["trends"][0]) == {"hour", "hour_number", "electricity", "record_count"}
    raw = pd.read_csv(config.DATA_PATH)
    h = t["trends"][0]["hour_number"]
    assert t["trends"][0]["electricity"] == round(float(raw[raw.Hour == h].Electricity_Consumption.mean()), 2)
    assert t["trends"][0]["hour"] == f"{h:02d}:00"


def test_trends_filters():
    t = data_service.trends("Hostel", 8, 12)
    assert all(8 <= p["hour_number"] <= 12 for p in t["trends"])
    _raises("invalid_filter", data_service.trends, "Garage")
    _raises("invalid_range", data_service.trends, None, 12, 8)


def test_buildings_shape():
    b = data_service.buildings()
    assert b["count"] == 5 and sum(x["record_count"] for x in b["buildings"]) == 500
    assert all(len(x["building_ids"]) == x["record_count"] for x in b["buildings"])
    rec = data_service.building_record(b["buildings"][0]["building_ids"][0])
    assert rec["building_type"] == b["buildings"][0]["building_type"]
    _raises("record_not_found", data_service.building_record, "NOPE")


def test_model_expects_trained_feature_order():
    model = model_service.load_model()
    assert list(model.feature_names_in_) == MODEL_FEATURES
    assert "Date" not in MODEL_FEATURES and "Building_ID" not in MODEL_FEATURES
    assert len(model.named_steps["preprocess"].get_feature_names_out()) == 17


def test_predict_numeric_and_matches_pipeline():
    out = model_service.predict(dict(VALID))
    assert isinstance(out["prediction"], float)
    row = {model_service.FIELD_TO_COLUMN[k]: v for k, v in VALID.items()}
    X = to_model_frame(add_date_features(pd.DataFrame([{**row, "Date": model_service.default_date()}])))
    assert out["prediction"] == round(float(model_service.load_model().predict(X)[0]), 2)  # no double preprocessing
    assert out["label"].startswith("ML prediction") and out["warnings"] == []


def test_predict_warns_out_of_range_and_responds_to_occupancy():
    low = model_service.predict({**VALID, "occupancy": 20})["prediction"]
    high = model_service.predict({**VALID, "occupancy": 90})["prediction"]
    assert high > low
    out = model_service.predict({**VALID, "temperature": 55})
    assert any("Temperature" in w for w in out["warnings"])


def test_predict_missing_input():
    bad = dict(VALID)
    del bad["hour"]
    _raises("missing_features", model_service.predict, bad)


def test_all_building_types_predict():
    for t in BUILDING_TYPES:
        assert isinstance(model_service.predict({**VALID, "building_type": t})["prediction"], float)


def test_metrics_file():
    m = model_service.load_metrics()
    assert {x["model"] for x in m["models"]} == {"Linear Regression", "Decision Tree", "Random Forest", "Gradient Boosting"}
    assert m["best_model"] == max(m["models"], key=lambda x: x["r2"])["model"]


def test_empty_dataset_error():
    old = config.DATA_PATH
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "empty.csv"
        p.write_text(",".join(["Building_ID", "Building_Type", "Date", "Hour", "Occupancy", "Temperature", "Humidity",
                               "Lighting_Usage", "AC_Usage", "Computer_Usage", "Water_Consumption",
                               "Electricity_Consumption", "Waste_Generated"]) + "\n")
        config.DATA_PATH = p
        try:
            _raises("dataset_empty", data_service.load_dataframe)
        finally:
            config.DATA_PATH = old
    data_service.reset_cache()


def test_missing_dataset_and_model_errors():
    old_d, old_m = config.DATA_PATH, config.MODEL_PATH
    try:
        config.DATA_PATH, config.MODEL_PATH = Path("/nonexistent/x.csv"), Path("/nonexistent/m.pkl")
        _raises("dataset_missing", data_service.load_dataframe)
        _raises("model_missing", model_service.load_model)
    finally:
        config.DATA_PATH, config.MODEL_PATH = old_d, old_m


def test_wrong_schema_model_rejected():
    from sklearn.linear_model import LinearRegression
    old = config.MODEL_PATH
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "bad.pkl"
        joblib.dump(LinearRegression(), p)
        config.MODEL_PATH = p
        try:
            _raises("model_schema_mismatch", model_service.load_model)
        finally:
            config.MODEL_PATH = old
