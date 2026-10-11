// Prediction input definitions. Bounds mirror backend/schemas.py PredictRequest.
// Units are assumed (the CSV does not document them): electricity kWh, usage/occupancy/humidity %, temperature °C, water L, waste kg.
export const UNIT = "kWh";
export const BUILDING_TYPES = ["Administrative", "Classroom_Block", "Hostel", "Laboratory", "Library"];

export const FIELDS = [
  { key: "hour", label: "Hour of day (0–23)", stat: "Hour", min: 0, max: 23, step: 1, int: true, unit: "h" },
  { key: "occupancy", label: "Occupancy", stat: "Occupancy", min: 0, max: 100, step: 1, unit: "%" },
  { key: "temperature", label: "Temperature", stat: "Temperature", min: -10, max: 60, step: 0.1, unit: "°C" },
  { key: "humidity", label: "Humidity", stat: "Humidity", min: 0, max: 100, step: 0.1, unit: "%" },
  { key: "lighting_usage", label: "Lighting usage", stat: "Lighting_Usage", min: 0, max: 1000, step: 0.1, unit: "%" },
  { key: "ac_usage", label: "AC usage", stat: "AC_Usage", min: 0, max: 1000, step: 0.1, unit: "%" },
  { key: "computer_usage", label: "Computer usage", stat: "Computer_Usage", min: 0, max: 1000, step: 0.1, unit: "%" },
  { key: "water_consumption", label: "Water consumption", stat: "Water_Consumption", min: 0, max: 10000, step: 0.1, unit: "L" },
  { key: "waste_generated", label: "Waste generated", stat: "Waste_Generated", min: 0, max: 1000, step: 0.1, unit: "kg" },
];

export const FIELD_BY_KEY = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

// Initial form values come from the data's average values (/overview feature_stats).
export function defaultsFromStats(stats) {
  const byName = Object.fromEntries(stats.map((s) => [s.feature, s]));
  const v = { building_type: BUILDING_TYPES[0] };
  FIELDS.forEach((f) => {
    const m = byName[f.stat]?.mean ?? 0;
    v[f.key] = String(f.int ? Math.round(m) : Math.round(m * 10) / 10);
  });
  return v;
}

// Returns { payload, errors } where payload holds numbers ready for POST /predict.
export function validate(values) {
  const errors = {};
  const payload = { building_type: values.building_type };
  if (!BUILDING_TYPES.includes(values.building_type)) errors.building_type = "Choose a building type.";
  FIELDS.forEach((f) => {
    const raw = String(values[f.key] ?? "").trim();
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n)) errors[f.key] = "Enter a number.";
    else if (f.int && !Number.isInteger(n)) errors[f.key] = "Must be a whole number.";
    else if (n < f.min || n > f.max) errors[f.key] = `Must be between ${f.min} and ${f.max}.`;
    else payload[f.key] = n;
  });
  return { payload, errors };
}
