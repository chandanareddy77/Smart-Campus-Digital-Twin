import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Play, RotateCcw } from "lucide-react";
import { getOverview, predict } from "../api";
import { useApi } from "../useApi";
import FeatureForm, { NumberField } from "../components/FeatureForm";
import { C, ChartTooltip, axis } from "../components/Charts";
import { Async, ErrorBox, PageHeader, Tile, fmt, kwh } from "../components/ui";
import { BUILDING_TYPES, FIELDS, defaultsFromStats, validate } from "../features";

function Simulator({ stats }) {
  const [base, setBase] = useState(() => defaultsFromStats(stats));
  const [changes, setChanges] = useState({}); // only the inputs the user modified
  const [errors, setErrors] = useState({});
  const [scErrors, setScErrors] = useState({});
  const [res, setRes] = useState({ data: null, error: null, loading: false });
  const scenario = { ...base, ...changes };

  const run = async () => {
    const b = validate(base);
    const s = validate(scenario);
    setErrors(b.errors);
    setScErrors(s.errors);
    if (Object.keys(b.errors).length || Object.keys(s.errors).length) return;
    setRes({ data: null, error: null, loading: true });
    try {
      const [baseline, modified] = await Promise.all([predict(b.payload), predict(s.payload)]);
      setRes({ data: { baseline, modified }, error: null, loading: false });
    } catch (error) {
      setRes({ data: null, error, loading: false });
    }
  };

  const d = res.data;
  const diff = d ? d.modified.prediction - d.baseline.prediction : null;
  const pct = d && d.baseline.prediction !== 0 ? (diff / Math.abs(d.baseline.prediction)) * 100 : null;
  const tone = diff > 0 ? "bad" : diff < 0 ? "good" : "default";
  const chart = d ? [{ name: "Current", value: d.baseline.prediction }, { name: "New", value: d.modified.prediction }] : [];
  const warnings = d ? [...new Set([...d.baseline.warnings, ...d.modified.warnings])] : [];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="card-title">1. Current conditions</h2>
        <FeatureForm values={base} errors={errors} onChange={(k, v) => setBase((s) => ({ ...s, [k]: v }))} />
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">2. What if… (change anything below)</h2>
          <button className="btn-secondary" onClick={() => setChanges({})}><RotateCcw size={14} /> Reset</button>
        </div>
        <div className="mb-5 max-w-xs">
          <label className="label" htmlFor="sc-type">Building type{"building_type" in changes && <span className="ml-1 text-teal-600">(changed)</span>}</label>
          <select id="sc-type" className="input" value={scenario.building_type}
                  onChange={(e) => setChanges((c) => ({ ...c, building_type: e.target.value }))}>
            {BUILDING_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {FIELDS.map((f) => (
            <NumberField key={f.key} field={f} value={scenario[f.key]} error={scErrors[f.key]}
                         changed={f.key in changes} onChange={(v) => setChanges((c) => ({ ...c, [f.key]: v }))} />
          ))}
        </div>
        <div className="mt-7">
          <button className="btn" onClick={run} disabled={res.loading}>
            <Play size={16} /> {res.loading ? "Calculating…" : "Compare estimates"}
          </button>
        </div>
      </div>

      <ErrorBox error={res.error} />
      {d && (
        <div className="card">
          <h2 className="card-title">Result</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label="Current estimate" value={kwh(d.baseline.prediction)} />
            <Tile label="New estimate" value={kwh(d.modified.prediction)} />
            <Tile label="Difference" value={`${diff > 0 ? "+" : ""}${kwh(diff)}`} tone={tone} />
            <Tile label="Change" value={pct === null ? "n/a" : `${pct > 0 ? "+" : ""}${fmt(pct, 1)}%`} tone={tone} />
          </div>
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="name" {...axis} />
                <YAxis {...axis} width={44} />
                <Tooltip content={<ChartTooltip name="Estimated usage" />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={80}>
                  <Cell fill="#94a3b8" /><Cell fill={C.teal} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {warnings.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              {warnings.map((w, i) => (
                <li key={i} className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> {w}</li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-500">Estimates are based on past usage patterns.</p>
        </div>
      )}
    </div>
  );
}

export default function WhatIf() {
  const state = useApi(getOverview, "overview");
  return (
    <div className="page-enter">
      <PageHeader title="What-if Simulation" subtitle="Change a few conditions and see how the estimated usage changes." />
      <Async state={state}>{(d) => <Simulator stats={d.feature_stats} />}</Async>
    </div>
  );
}
