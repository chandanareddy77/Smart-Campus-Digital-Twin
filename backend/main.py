"""Smart Campus Digital Twin API.  Run from the backend/ folder:  uvicorn main:app --reload --port 8000"""
from __future__ import annotations

import os
from typing import Optional

from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .schemas import (BuildingRecordResponse, BuildingsResponse, BuildingType, ErrorResponse, HealthResponse,
                     ModelMetricsResponse, OverviewResponse, PredictRequest, PredictResponse, RootResponse,
                     TrendsResponse)
from .services import data_service, model_service
from .services.errors import ServiceError

VERSION = "1.0.0"
ERRORS = {503: {"model": ErrorResponse}, 422: {"model": ErrorResponse}, 404: {"model": ErrorResponse}}

app = FastAPI(title="Smart Campus Digital Twin API", version=VERSION,
              description="Dataset analytics and ML electricity predictions (historical synthetic data, not live IoT).")

origins = ["https://smart-campus-digital-twin-7r62h0spu-chandanareddy77.vercel.app",]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=[""], allow_headers=[""],)


@app.exception_handler(ServiceError)
async def service_error_handler(_: Request, exc: ServiceError):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.code, "message": exc.message})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError):
    details = [{"field": ".".join(str(p) for p in e["loc"] if p not in ("body", "query")), "message": e["msg"]}
               for e in exc.errors()]
    return JSONResponse(status_code=422, content={"error": "validation_error",
                                                  "message": "Invalid input.", "details": details})


@app.get("/", response_model=RootResponse)
def root():
    return {"status": "running", "service": "Smart Campus Digital Twin API", "version": VERSION, "docs_url": "/docs"}


@app.get("/health", response_model=HealthResponse, responses={503: {"model": HealthResponse}})
def health():
    problems, rows, model_type = [], None, None
    try:
        rows = int(len(data_service.load_dataframe()))
    except ServiceError as e:
        problems.append(e.message)
    try:
        model_type = type(model_service.load_model().named_steps["model"]).__name__
    except ServiceError as e:
        problems.append(e.message)
    try:
        model_service.load_metrics()
        metrics_ok = True
    except ServiceError as e:
        metrics_ok = False
        problems.append(e.message)
    body = HealthResponse(status="degraded" if problems else "ok", api=True, dataset_available=rows is not None,
                          dataset_rows=rows, model_available=model_type is not None, model_type=model_type,
                          metrics_available=metrics_ok, problems=problems)
    return JSONResponse(status_code=503 if problems else 200, content=body.model_dump())


@app.get("/overview", response_model=OverviewResponse, responses=ERRORS)
def overview():
    return data_service.overview(model_service.best_model_summary())


@app.get("/trends", response_model=TrendsResponse, responses=ERRORS)
def trends(building_type: Optional[BuildingType] = None,
           hour_from: Optional[int] = Query(None, ge=0, le=23),
           hour_to: Optional[int] = Query(None, ge=0, le=23)):
    return data_service.trends(building_type, hour_from, hour_to)


@app.get("/buildings", response_model=BuildingsResponse, responses=ERRORS)
def buildings():
    return data_service.buildings()


@app.get("/buildings/record/{building_id}", response_model=BuildingRecordResponse, responses=ERRORS)
def building_record(building_id: str):
    return data_service.building_record(building_id)


@app.post("/predict", response_model=PredictResponse, responses=ERRORS)
def predict(req: PredictRequest):
    return model_service.predict(req.model_dump())


@app.get("/model-metrics", response_model=ModelMetricsResponse, responses=ERRORS)
def model_metrics():
    return model_service.load_metrics()
