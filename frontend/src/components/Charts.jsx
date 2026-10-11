import { UNIT } from "../features";

export const C = { teal: "#0d9488", blue: "#2563eb", grid: "#e2e8f0" };
export const axis = { tick: { fontSize: 12, fill: "#64748b" }, axisLine: false, tickLine: false };

export function Gradient({ id, color, top = 0.3 }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={color} stopOpacity={top} />
        <stop offset="95%" stopColor={color} stopOpacity={0.02} />
      </linearGradient>
    </defs>
  );
}

// Used as <Tooltip content={<ChartTooltip name="Average usage" />} />
export function ChartTooltip({ active, payload, label, name = "Average usage", unit = UNIT }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-slate-900">{payload[0].payload.name || label}</div>
      <div className="mt-0.5 text-slate-600">
        {name}: <span className="font-semibold text-slate-900">{typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v} {unit}</span>
      </div>
    </div>
  );
}

// One colour per building type, used consistently across charts and bars.
export const TYPE_COLORS = {
  Administrative: "#2563eb",
  Classroom_Block: "#0d9488",
  Hostel: "#f59e0b",
  Laboratory: "#8b5cf6",
  Library: "#ec4899",
};
