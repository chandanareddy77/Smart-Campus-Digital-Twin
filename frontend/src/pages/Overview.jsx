import { Building2, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getOverview } from "../api";
import { useApi } from "../useApi";
import { Async, Empty, PageHeader, Stat, kwh } from "../components/ui";
import { C, ChartTooltip, Gradient, axis } from "../components/Charts";

const pretty = (t) => t.replace("_", " ");

export default function Overview() {
  const state = useApi(getOverview, "overview");
  return (
    <div className="page-enter">
      <PageHeader title="Overview" subtitle="A quick look at electricity use across the campus." />
      <Async state={state}>
        {(d) => {
          const types = d.building_type_comparison;
          const high = types.length ? types.reduce((a, b) => (b.avg_electricity > a.avg_electricity ? b : a)) : null;
          const low = types.length ? types.reduce((a, b) => (b.avg_electricity < a.avg_electricity ? b : a)) : null;
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat icon={Zap} tone="teal" label="Average usage" value={kwh(d.avg_electricity)} />
                <Stat icon={Building2} tone="blue" label="Building types" value={d.building_type_count} />
                <Stat icon={TrendingUp} tone="rose" label="Highest usage" value={high ? pretty(high.building_type) : "–"}
                      hint={high ? `Average ${kwh(high.avg_electricity)}` : ""} />
                <Stat icon={TrendingDown} tone="emerald" label="Lowest usage" value={low ? pretty(low.building_type) : "–"}
                      hint={low ? `Average ${kwh(low.avg_electricity)}` : ""} />
              </div>
              <div>
                <div className="card">
                  <h2 className="card-title">Average usage by month (kWh)</h2>
                  {d.monthly_trend.length === 0 ? <Empty /> : (
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={d.monthly_trend} margin={{ left: 0, right: 8, top: 8 }}>
                        <Gradient id="g-month" color={C.teal} />
                        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                        <XAxis dataKey="month" {...axis} />
                        <YAxis {...axis} width={44} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="avg_electricity" stroke={C.teal} strokeWidth={2.5} fill="url(#g-month)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      </Async>
    </div>
  );
}
