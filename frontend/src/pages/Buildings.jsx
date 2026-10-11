import { useState } from "react";
import { getBuildings } from "../api";
import { useApi } from "../useApi";
import { Async, PageHeader, Tile, kwh } from "../components/ui";
import { TYPE_COLORS } from "../components/Charts";

const CONDITIONS = [
  ["Occupancy", "avg_occupancy", "%"], ["Temperature", "avg_temperature", "°C"], ["Humidity", "avg_humidity", "%"],
  ["Lighting usage", "avg_lighting_usage", "%"], ["AC usage", "avg_ac_usage", "%"], ["Computer usage", "avg_computer_usage", "%"],
  ["Water consumption", "avg_water_consumption", "L"], ["Waste generated", "avg_waste_generated", "kg"],
];
const pretty = (t) => t.replace("_", " ");

export default function Buildings() {
  const state = useApi(getBuildings, "buildings");
  const [type, setType] = useState("");

  return (
    <div className="page-enter">
      <PageHeader title="Buildings" subtitle="Choose a building type to see its typical electricity use and conditions." />
      <Async state={state}>
        {(d) => {
          const sel = d.buildings.find((b) => b.building_type === (type || d.buildings[0]?.building_type));
          const maxAvg = Math.max(...d.buildings.map((b) => b.avg_electricity), 1);
          return (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {d.buildings.map((b) => (
                  <button key={b.building_type} className={sel?.building_type === b.building_type ? "pill-active" : "pill"}
                          onClick={() => setType(b.building_type)}>{pretty(b.building_type)}</button>
                ))}
              </div>
              {sel && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                  <div className="space-y-6 xl:col-span-2">
                    <div className="card">
                      <h2 className="card-title">{pretty(sel.building_type)} — electricity usage</h2>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Tile label="Average" value={kwh(sel.avg_electricity)} />
                        <Tile label="Lowest" value={kwh(sel.min_electricity)} />
                        <Tile label="Highest" value={kwh(sel.max_electricity)} />
                      </div>
                    </div>
                    <div className="card">
                      <h2 className="card-title">Typical conditions</h2>
                      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {CONDITIONS.map(([label, key, unit]) => (
                          <div key={key} className="rounded-xl bg-slate-50 p-3">
                            <dt className="text-xs text-slate-500">{label}</dt>
                            <dd className="mt-1 text-lg font-semibold text-slate-900">{sel[key].toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-sm font-medium text-slate-500">{unit}</span></dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                  <div className="card">
                    <h2 className="card-title">How it compares (average usage)</h2>
                    <ul className="space-y-4">
                      {d.buildings.map((b) => (
                        <li key={b.building_type}>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className={b.building_type === sel.building_type ? "font-semibold text-slate-900" : "text-slate-600"}>{pretty(b.building_type)}</span>
                            <span className="text-slate-500">{b.avg_electricity.toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full"
                                 style={{ width: `${(b.avg_electricity / maxAvg) * 100}%`, backgroundColor: TYPE_COLORS[b.building_type],
                                          opacity: b.building_type === sel.building_type ? 1 : 0.45 }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        }}
      </Async>
    </div>
  );
}
