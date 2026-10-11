"""Pydantic request/response models. The React app (frontend/src/api.js) consumes exactly these shapes."""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

BuildingType = Literal["Administrative", "Classroom_Block", "Hostel", "Laboratory", "Library"]


# ---------- errors ----------
class ErrorDetail(BaseModel):
    field: str
    message: str


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[List[ErrorDetail]] = None


# ---------- GET / and /health ----------
class RootResponse(BaseModel):
    status: str
    service: str
    version: str
    docs_url: str


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    api: bool
    dataset_available: bool
    dataset_rows: Optional[int] = None
    model_available: bool
    model_type: Optional[str] = None
    metrics_available: bool
    problems: List[str] = []


# ---------- GET /overview ----------
class BestModel(BaseModel):
    name: str
    r2: float
    mae: float
    rmse: float


class DateRange(BaseModel):
    start: str
    end: str


class MonthlyTrendPoint(BaseModel):
    month: str
    avg_electricity: float
    record_count: int


class BuildingTypeComparison(BaseModel):
    building_type: str
    record_count: int
    avg_electricity: float


class FeatureStat(BaseModel):
    feature: str
    min: float
    max: float
    mean: float


class OverviewResponse(BaseModel):
    data_source: str
    record_count: int
    building_type_count: int
    avg_electricity: float
    electricity_unit: str
    date_range: DateRange
    best_model: Optional[BestModel] = None
    monthly_trend: List[MonthlyTrendPoint]
    building_type_comparison: List[BuildingTypeComparison]
    feature_stats: List[FeatureStat]


# ---------- GET /trends ----------
class TrendFilters(BaseModel):
    building_type: Optional[str] = None
    hour_from: Optional[int] = None
    hour_to: Optional[int] = None


class TrendPoint(BaseModel):
    hour: str
    hour_number: int
    electricity: float
    record_count: int


class TrendsResponse(BaseModel):
    data_source: str
    count: int
    unit: str
    filters: TrendFilters
    trends: List[TrendPoint]


# ---------- GET /buildings and /buildings/record/{id} ----------
class BuildingTypeStats(BaseModel):
    building_type: str
    record_count: int
    avg_electricity: float
    min_electricity: float
    max_electricity: float
    std_electricity: float
    avg_occupancy: float
    avg_temperature: float
    avg_humidity: float
    avg_lighting_usage: float
    avg_ac_usage: float
    avg_computer_usage: float
    avg_water_consumption: float
    avg_waste_generated: float
    building_ids: List[str]


class BuildingsResponse(BaseModel):
    data_source: str
    count: int
    unit: str
    buildings: List[BuildingTypeStats]


class BuildingRecordResponse(BaseModel):
    data_source: str
    unit: str
    building_id: str
    building_type: str
    date: str
    hour: int
    occupancy: float
    temperature: float
    humidity: float
    lighting_usage: float
    ac_usage: float
    computer_usage: float
    water_consumption: float
    waste_generated: float
    electricity_observed: float


# ---------- POST /predict ----------
class PredictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")  # unknown fields (e.g. a stray date) are rejected

    building_type: BuildingType
    hour: int = Field(ge=0, le=23)
    occupancy: float = Field(ge=0, le=100)
    temperature: float = Field(ge=-10, le=60)
    humidity: float = Field(ge=0, le=100)
    lighting_usage: float = Field(ge=0, le=1000)
    ac_usage: float = Field(ge=0, le=1000)
    computer_usage: float = Field(ge=0, le=1000)
    water_consumption: float = Field(ge=0, le=10000)
    waste_generated: float = Field(ge=0, le=1000)


class PredictResponse(BaseModel):
    prediction: float
    unit: str
    model_name: str
    label: str
    inputs_used: PredictRequest
    date_used_internally: str
    warnings: List[str]


# ---------- GET /model-metrics ----------
class ModelMetric(BaseModel):
    model: str
    mae: float
    rmse: float
    r2: float
    train_r2: float
    cv_r2_mean: float
    cv_r2_std: float


class ModelMetricsResponse(BaseModel):
    data_source: str
    target: str
    target_unit: str
    n_train: int
    n_test: int
    random_seed: int
    raw_features: List[str]
    transformed_feature_count: int
    sklearn_version: str
    selection_metric: str
    best_model: str
    selection_reason: str
    models: List[ModelMetric]
