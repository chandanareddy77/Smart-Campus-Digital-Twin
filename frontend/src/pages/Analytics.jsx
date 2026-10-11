import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getBuildings, getTrends } from "../api";
import { useApi } from "../useApi";
import { Async, Empty, PageHeader } from "../components/ui";
import { C, ChartTooltip, Gradient, TYPE_COLORS, axis } from "../components/Charts";
import { BUILDING_TYPES } from "../features";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const hourLabel = (h) => `${String(h).padStart(2, "0")}:00`;

export default function Analytics() {
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params = { building_type: type, hour_from: from, hour_to: to };
  const invalid = from !== "" && to !== "" && Number(from) > Number(to);
  const trends = useApi(() => getTrends(params), JSON.stringify(params));
  const buildings = useApi(getBuildings, "buildings");

  return (
    <div className="page-enter">
      <PageHeader title="Usage Trends" subtitle="See how electricity use changes through the day and between building types." />
      <div className="card mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="f-type">Building type</label>
          <select id="f-type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {BUILDING_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-from">From</label>
          <select id="f-from" className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Any hour</option>
            {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-to">To</label>
          <select id="f-to" className="input" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Any hour</option>
            {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
          </select>
        </div>
        {invalid && <p className="text-sm text-red-600 sm:col-span-3">The start hour can't be later than the end hour.</p>}
      </div>

      <div className="space-y-6">
        <div className="card">
          <h2 className="card-title">Average usage by hour of day (kWh)</h2>
          {invalid ? <Empty text="Adjust the hours to see the chart." /> : (
            <Async state={trends}>
              {(d) => d.trends.length === 0 ? <Empty text="No data for these filters." /> : (
                <ResponsiveContainer width="100%" height={310}>
                  <AreaChart data={d.trends} margin={{ left: 0, right: 8, top: 8 }}>
                    <Gradient id="g-hour" color={C.teal} />
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="hour" {...axis} />
                    <YAxis {...axis} width={44} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="electricity" stroke={C.teal} strokeWidth={2.5} fill="url(#g-hour)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Async>
          )}
        </div>
        <div className="card">
          <h2 className="card-title">Average usage by building type (kWh)</h2>
          <Async state={buildings}>
            {(d) => d.buildings.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={330}>
                <BarChart data={d.buildings.map((b) => ({ ...b, name: b.building_type.replace("_", " ") }))} margin={{ left: 0, right: 8, top: 28 }}>
                  <defs>
                    {BUILDING_TYPES.map((t) => (
                      <linearGradient key={t} id={`bt-${t}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={TYPE_COLORS[t]} stopOpacity={1} />
                        <stop offset="100%" stopColor={TYPE_COLORS[t]} stopOpacity={0.55} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="name" {...axis} />
                  <YAxis {...axis} width={44} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="avg_electricity" radius={[10, 10, 0, 0]} maxBarSize={72}>
                    {d.buildings.map((b) => <Cell key={b.building_type} fill={`url(#bt-${b.building_type})`} />)}
                    <LabelList dataKey="avg_electricity" position="top" formatter={(v) => Math.round(v)}
                               style={{ fontSize: 12, fontWeight: 600, fill: "#334155" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Async>
        </div>
      </div>
    </div>
  );
}
