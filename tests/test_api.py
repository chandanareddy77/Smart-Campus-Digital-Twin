"""HTTP-level tests (need: pip install -r backend/requirements.txt). Run from project root: pytest tests -v"""
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from main import app  # noqa: E402
from services import config, data_service  # noqa: E402

client = TestClient(app)
VALID = dict(building_type="Library", hour=10, occupancy=60, temperature=28, humidity=60, lighting_usage=50,
             ac_usage=40, computer_usage=35, water_consumption=170, waste_generated=11)


def test_root():
    r = client.get("/")
    assert r.status_code == 200 and r.json()["docs_url"] == "/docs"


def test_health_ok():
    r = client.get("/health")
    body = r.json()
    assert r.status_code == 200 and body["status"] == "ok"
    assert body["dataset_rows"] == 500 and body["model_available"] and body["metrics_available"]


def test_overview():
    r = client.get("/overview")
    b = r.json()
    assert r.status_code == 200 and b["record_count"] == 500 and b["building_type_count"] == 5
    assert b["best_model"]["name"] and len(b["monthly_trend"]) > 0


def test_trends_shape():
    b = client.get("/trends").json()
    assert set(b) == {"data_source", "count", "unit", "filters", "trends"}
    assert b["count"] == len(b["trends"]) > 0
    assert set(b["trends"][0]) == {"hour", "hour_number", "electricity", "record_count"}


def test_trends_filter_and_invalid():
    ok = client.get("/trends", params={"building_type": "Hostel", "hour_from": 8, "hour_to": 12})
    assert ok.status_code == 200 and all(8 <= p["hour_number"] <= 12 for p in ok.json()["trends"])
    assert client.get("/trends", params={"building_type": "Garage"}).status_code == 422
    assert client.get("/trends", params={"hour_from": 12, "hour_to": 8}).status_code == 422


def test_buildings_shape():
    b = client.get("/buildings").json()
    assert b["count"] == 5 and "building_ids" in b["buildings"][0]
    rid = b["buildings"][0]["building_ids"][0]
    assert client.get(f"/buildings/record/{rid}").status_code == 200
    assert client.get("/buildings/record/NOPE").status_code == 404


def test_predict_success():
    r = client.post("/predict", json=VALID)
    b = r.json()
    assert r.status_code == 200 and isinstance(b["prediction"], float)
    assert b["label"].startswith("ML prediction") and b["inputs_used"]["building_type"] == "Library"


@pytest.mark.parametrize("patch", [
    {"hour": 99}, {"occupancy": -1}, {"humidity": 150}, {"building_type": "Garage"},
    {"hour": "abc"}, {"date": "2026-01-01"},
])
def test_predict_invalid(patch):
    r = client.post("/predict", json={**VALID, **patch})
    assert r.status_code == 422 and r.json()["error"] == "validation_error"


def test_predict_missing_field():
    bad = dict(VALID)
    del bad["temperature"]
    assert client.post("/predict", json=bad).status_code == 422


def test_model_metrics():
    b = client.get("/model-metrics").json()
    assert len(b["models"]) == 4 and b["best_model"] in {m["model"] for m in b["models"]}


def test_empty_dataset_returns_503(tmp_path, monkeypatch):
    p = tmp_path / "empty.csv"
    p.write_text("Building_ID,Building_Type,Date,Hour,Occupancy,Temperature,Humidity,Lighting_Usage,AC_Usage,"
                 "Computer_Usage,Water_Consumption,Electricity_Consumption,Waste_Generated\n")
    monkeypatch.setattr(config, "DATA_PATH", p)
    data_service.reset_cache()
    for path in ("/overview", "/trends", "/buildings"):
        r = client.get(path)
        assert r.status_code == 503 and r.json()["error"] == "dataset_empty"
    assert client.get("/health").status_code == 503
    monkeypatch.undo()
    data_service.reset_cache()
