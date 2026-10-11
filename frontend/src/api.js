// Centralized API client. Every call goes through request(); response shapes mirror backend/schemas.py.
const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    console.error(`Cannot reach the backend at ${BASE_URL}. Start it with: uvicorn main:app --port 8000`);
    throw new ApiError("Can't connect to the server right now. Please check that it is running and try again.");
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    if (res.ok) throw new ApiError("The server returned invalid JSON.", res.status);
  }
  if (!res.ok) {
    const message = body?.message || (body?.problems ? body.problems.join(" ") : `Request failed (${res.status}).`);
    throw new ApiError(message, res.status, body?.details || null);
  }
  return body;
}

function qs(params = {}) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const getHealth = () => request("/health");
export const getOverview = () => request("/overview");
export const getTrends = (params) => request(`/trends${qs(params)}`);
export const getBuildings = () => request("/buildings");
export const getBuildingRecord = (id) => request(`/buildings/record/${encodeURIComponent(id)}`);
export const getModelMetrics = () => request("/model-metrics");
export const predict = (inputs) => request("/predict", { method: "POST", body: JSON.stringify(inputs) });
