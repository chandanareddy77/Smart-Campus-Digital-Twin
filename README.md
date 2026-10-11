# Smart Campus Digital Twin

A full-stack project that predicts campus building electricity consumption with machine learning and presents the results in an interactive dashboard (React + FastAPI + scikit-learn).

> **Important:** this project uses **historical, synthetic dataset records** and **model-based predictions**. It is **not** live IoT monitoring, and the dataset does not document a unit for electricity. **The unit is assumed to be kWh** (state this assumption in your report).

## 1. Problem statement
Campus administrators need to understand what drives electricity use in different building types and estimate how consumption changes under different conditions (occupancy, temperature, AC and lighting use, ...). This project builds a data-driven "digital twin": a model of campus consumption fitted to historical records, which can be explored and queried.

## 2. Objectives
- Analyse electricity consumption patterns from the dataset.
- Train and compare four regression models and select the best by measured test performance.
- Serve predictions through a FastAPI backend.
- Provide a dashboard with analytics, a building explorer, a prediction form, a what-if simulator and model evaluation.

## 3. Features
The dashboard is designed for everyday users and shows only what they need: **Overview**, **Usage Trends** (hour and building-type filters, colour-coded building-type chart), **Buildings** (typical usage and conditions), **Predict Usage**, **What-if Simulation** (current vs new estimate, difference and % change) and **Cost & Carbon** (monthly cost and CO₂ from the estimate, plus a savings calculator for lower AC and lighting use). Dataset and model details are kept out of the main UI. A **Model Evaluation** page (MAE / RMSE / R² for all four models) exists for project reviewers and is opened by adding `#evaluation` to the address: http://localhost:5173/#evaluation (reload the page after changing the address).

## 4. Architecture
```
data/*.csv ──► scripts/train_model.py ──► models/best_model.pkl (full sklearn Pipeline)
     │                      └──────────► reports/model_metrics.json
     ▼
backend/ (FastAPI)  ◄── services/data_service.py  (CSV statistics)
     │              ◄── services/model_service.py (loads Pipeline, predicts)
     ▼  JSON (schemas in backend/schemas.py)
frontend/ (React + Vite + Tailwind + Recharts)  ── all calls via src/api.js
```
Shared feature conventions live in `backend/services/features.py` and are used by both training and inference, so the model always receives identical columns in identical order.

## 5. Dataset (synthetic)
`data/07_smart_campus_digital_twin.csv`: 500 records, 13 columns, **synthetic**. Building types: Administrative, Classroom_Block, Hostel, Laboratory, Library. Hours 6-22. Dates 2026-02-01 to 2027-06-15. No missing values, no duplicate rows. `Building_ID` is unique per row (it identifies an observation, not a physical building). Target: `Electricity_Consumption` (kWh, assumed).

### Units used in the dashboard (assumed)
The CSV documents no units, so the dashboard shows these general units. State them as assumptions in your report.

| Quantity | Unit shown |
|---|---|
| Electricity consumption | kWh |
| Hour | h (24-hour clock) |
| Occupancy, humidity, lighting / AC / computer usage | % |
| Temperature | °C |
| Water consumption | L (litres) |
| Waste generated | kg |
| Cost, CO₂ | currency chosen on the page, kg CO₂ |

## 6. EDA and preprocessing
`python scripts\eda.py` prints statistics and saves charts + `eda_summary.json` in `reports/eda/`. Findings: consumption correlates most with Occupancy (0.85), Lighting (0.80), Water (0.79), Computer (0.75) and AC usage (0.72); Temperature is weaker (0.31); Hour and Humidity show essentially no linear correlation.

Preprocessing (inside the saved Pipeline, fitted on training data only): `Date` becomes Year / Month / Day; `Building_Type` is one-hot encoded (5 columns); numeric features are standardised (12 columns) giving **17 model features**. `Building_ID` and `Date` are not model inputs.

## 7. Models and evaluation method
Linear Regression, Decision Tree, Random Forest (200 trees) and Gradient Boosting, all inside the same `ColumnTransformer + Pipeline`. 80/20 split (400/100) with `random_state=42`; every model is scored on the same test set (MAE, RMSE, R²). Train R² and 5-fold CV R² (training data only) are reported to check overfitting. The best model is the one with the highest test R².

## 8. Measured results
Measured by `scripts/train_model.py` on the project owner's machine (Python 3.14.3, scikit-learn 1.9.1, seed 42, 400 train / 100 test):

| Model | MAE | RMSE | Test R² | Train R² | CV R² (mean ± sd) |
|---|---:|---:|---:|---:|---:|
| Linear Regression | 39.2200 | 49.5065 | 0.9120 | 0.9264 | 0.917 ± 0.014 |
| Random Forest | 42.7157 | 54.0060 | 0.8952 | 0.9840 | 0.878 ± 0.025 |
| Gradient Boosting | 42.6869 | 54.2768 | 0.8942 | 0.9752 | 0.880 ± 0.023 |
| Decision Tree | 65.2920 | 81.2814 | 0.7627 | 1.0000 | 0.750 ± 0.046 |

**Selected model: Linear Regression.** Tree-based models fit the training data almost perfectly but score lower on the test set (overfitting on 400 rows), while Linear Regression's train and test scores are close. Tree-based results can shift slightly between scikit-learn versions; Linear Regression's results were identical across the versions tried. Always quote the numbers from your own `reports/model_metrics.json`.

## 9. API endpoints (interactive docs at http://localhost:8000/docs)
Errors always look like `{"error": "<code>", "message": "...", "details": [...]}` with a correct HTTP status (404, 422, 503).

| Method & path | Purpose | Key response fields |
|---|---|---|
| `GET /` | Service status | `status, service, version, docs_url` |
| `GET /health` | Dataset + model availability (503 if degraded) | `status, dataset_rows, model_type, problems[]` |
| `GET /overview` | Dataset summary + best model | `record_count, building_type_count, avg_electricity, best_model{name,r2,mae,rmse}, monthly_trend[], building_type_comparison[], feature_stats[]` |
| `GET /trends?building_type=&hour_from=&hour_to=` | Hourly average consumption | `{data_source, count, unit, filters, trends:[{hour, hour_number, electricity, record_count}]}` |
| `GET /buildings` | Per-building-type statistics | `{data_source, count, unit, buildings:[{building_type, record_count, avg_electricity, ..., building_ids[]}]}` |
| `GET /buildings/record/{building_id}` | One observed record | observed values + `electricity_observed` |
| `POST /predict` | ML prediction | body: `building_type, hour, occupancy, temperature, humidity, lighting_usage, ac_usage, computer_usage, water_consumption, waste_generated` -> `prediction, unit, model_name, label, warnings[]` |
| `GET /model-metrics` | Verified metrics | `best_model, selection_reason, models:[{model, mae, rmse, r2, train_r2, cv_r2_mean, cv_r2_std}]` |

`/predict` uses an internal default date (the dataset's median date); the date is not a user input. Inputs outside the dataset's observed range are accepted within hard limits but come back with a warning that the prediction extrapolates.

## 10. Setup on Windows (PowerShell)
Prerequisites: Python 3.10+ and Node.js 18+ (this was developed with Python 3.12 and Node 22).

**Backend** (from the project root `Smart-Campus-Digital-Twin\`):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
python scripts\train_model.py     # recommended on YOUR machine so the saved model matches your scikit-learn version
python scripts\eda.py             # optional: EDA charts
cd backend
uvicorn main:app --reload --port 8000
```
(If script activation is blocked: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.) Open http://localhost:8000/docs to try each endpoint.

**Frontend** (second terminal, from `Smart-Campus-Digital-Twin\frontend\`):
```powershell
npm install
copy .env.example .env      # optional; default backend URL is http://localhost:8000
npm run dev
```
Open http://localhost:5173.

**Tests** (from the project root, venv active):
```powershell
python tests\run_service_tests.py    # service-layer tests, no web framework needed
pytest tests -v                       # all tests including HTTP-level API tests
```

## 11. Verification status
Confirmed by running locally on Windows: `train_model.py`, `eda.py`, `pytest tests -v` (30 tests passed: service-layer and HTTP API tests covering health, trends/buildings shapes, validation errors, predictions, metrics and empty-dataset handling), `npm install`, and the dashboard working in the browser.

Manual checklist before a demo:
1. `GET /health` returns `ok`; `/docs` shows all endpoints.
2. All dashboard pages load without error messages and the browser console is clean.
3. Predict Usage returns a number; What-if Simulation shows current vs new estimate.
4. Stop the backend and reload: the dashboard shows a clear "can't connect to the server" message.

## 12. Troubleshooting
- **Model fails to load / version warning:** run `python scripts\train_model.py` to rebuild the model with your installed scikit-learn.
- **Dashboard shows "Cannot reach the backend":** start uvicorn from `backend\` on port 8000, or set `VITE_API_URL` in `frontend\.env` and restart `npm run dev`.
- **CORS error:** the backend allows `http://localhost:5173` and `http://127.0.0.1:5173`; for another origin set the `CORS_ORIGINS` environment variable (comma-separated).
- **`ModuleNotFoundError: services`:** run uvicorn from the `backend\` folder.
- **Port in use:** `uvicorn main:app --port 8001` and update `VITE_API_URL`.

### Cost & Carbon page
Monthly figures are simple arithmetic on the model's estimate: estimate (kWh) x hours used per day x days used per month, then x price per kWh for cost and x emission factor (kg CO₂ per kWh) for carbon. The price (8), emission factor (0.7), hours (12) and days (30) are **starting values only**; users should edit them to match their own tariff, grid and building use. The savings section re-runs the model with AC and lighting usage reduced by the chosen percentage and reports the difference. It assumes each estimate covers one hour of use.

## 13. Limitations and future scope
Limitations: synthetic data; 500 records; electricity unit assumed (kWh) rather than documented; cost and carbon use user-editable assumptions; hour shows almost no relationship with consumption in this data; predictions extrapolate poorly outside observed ranges; what-if results are model behaviour, not causal evidence; Building_ID does not identify persistent buildings.
Future scope: real metered data and documented units, live meter integration, time-series models, per-building history, prediction intervals, deployment.

## 14. Presentation guidance
Suggested 8-10 minute demo: (1) problem and synthetic-data disclosure; (2) architecture slide; (3) Overview and Analytics; (4) Buildings page; (5) Predict Usage; (6) What-if: raise Occupancy and AC usage and explain that it is model-based; (7) open `/#evaluation` to show model comparison and why Linear Regression won (high test R², small train/test gap, simple); (8) limitations.

Likely questions: *Why did Linear Regression beat Random Forest?* Consumption is close to a linear function of occupancy and equipment usage in this synthetic data, and 400 rows favour simple models. *How did you avoid data leakage?* The preprocessing lives inside the Pipeline and is fitted on training data only; the target is never a feature. *Is this real-time?* No: historical dataset + model predictions.
