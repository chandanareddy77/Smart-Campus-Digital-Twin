import { useState } from "react";
import { AlertTriangle, Sparkles, Zap } from "lucide-react";
import { getOverview, predict } from "../api";
import { useApi } from "../useApi";
import FeatureForm from "../components/FeatureForm";
import { Async, ErrorBox, PageHeader, fmt } from "../components/ui";
import { UNIT, defaultsFromStats, validate } from "../features";

function PredictionForm({ stats }) {
  const [values, setValues] = useState(() => defaultsFromStats(stats));
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState({ data: null, error: null, loading: false });

  const submit = async () => {
    const { payload, errors: errs } = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setResult({ data: null, error: null, loading: true });
    try {
      setResult({ data: await predict(payload), error: null, loading: false });
    } catch (error) {
      setResult({ data: null, error, loading: false });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="card xl:col-span-2">
        <FeatureForm values={values} errors={errors} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
        <div className="mt-7">
          <button className="btn" onClick={submit} disabled={result.loading}>
            <Sparkles size={16} /> {result.loading ? "Calculating…" : "Estimate usage"}
          </button>
        </div>
      </div>
      <div className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <ErrorBox error={result.error} />
        {result.data ? (
          <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-blue-600 p-6 text-white shadow-lg">
            <div className="text-xs font-medium text-teal-100">Estimated electricity consumption</div>
            <div className="mt-2 text-4xl font-bold tracking-tight">{fmt(result.data.prediction)}
              <span className="ml-2 text-lg font-medium text-teal-100">{UNIT}</span></div>
            <p className="mt-3 text-xs text-teal-100">This is an estimate, not a meter reading.</p>
            {result.data.warnings.length > 0 && (
              <ul className="mt-4 space-y-1 rounded-xl bg-white/15 p-3 text-xs">
                {result.data.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {w}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          !result.error && (
            <div className="card flex flex-col items-center py-12 text-center text-sm text-slate-500">
              <div className="mb-3 rounded-full bg-teal-50 p-3 text-teal-600"><Zap size={22} /></div>
              Your estimate will appear here.
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function Prediction() {
  const state = useApi(getOverview, "overview");
  return (
    <div className="page-enter">
      <PageHeader title="Predict Usage" subtitle="Enter the conditions of a building to estimate its electricity consumption." />
      <Async state={state}>{(d) => <PredictionForm stats={d.feature_stats} />}</Async>
    </div>
  );
}
