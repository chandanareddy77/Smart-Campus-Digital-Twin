import { AlertTriangle, Inbox } from "lucide-react";
import { UNIT } from "../features";

export const fmt = (n, d = 2) =>
  typeof n === "number" && Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "–";
export const kwh = (n, d = 2) => (typeof n === "number" && Number.isFinite(n) ? `${fmt(n, d)} ${UNIT}` : "–");

export function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

const TONES = {
  teal: "bg-teal-50 text-teal-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
};

export function Stat({ icon: Icon, label, value, hint, tone = "teal" }) {
  return (
    <div className="card flex items-start gap-4">
      {Icon && (
        <div className={`rounded-xl p-3 ${TONES[tone] || TONES.teal}`}>
          <Icon size={22} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
      </div>
    </div>
  );
}

export const Skeleton = ({ className = "" }) => <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;

export function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold">Something went wrong</div>
        <div>{error.message}</div>
        {error.details?.length > 0 && (
          <ul className="mt-1 list-disc pl-5">
            {error.details.map((d, i) => <li key={i}>{d.field}: {d.message}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

export function Empty({ text = "No data to display." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <Inbox size={22} /> {text}
    </div>
  );
}

// Renders loading / error / content for a useApi() state.
export function Async({ state, children }) {
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorBox error={state.error} />;
  return children(state.data);
}

export const Note = ({ children }) => (
  <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">{children}</p>
);

// Big number tile used for results.
export function Tile({ label, value, sub, tone = "default" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "text-slate-900";
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tracking-tight ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

// Number input with a unit shown inside the right edge.
export function UnitInput({ id, unit, error, className = "", ...props }) {
  const pad = !unit ? "" : unit.length > 6 ? "pr-24" : unit.length > 3 ? "pr-16" : "pr-12";
  return (
    <div className="relative">
      <input id={id} type="number" inputMode="decimal" className={`input ${pad} ${error ? "border-red-400" : ""} ${className}`} {...props} />
      {unit && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">{unit}</span>
      )}
    </div>
  );
}
