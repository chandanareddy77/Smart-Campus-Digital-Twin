import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getModelMetrics } from "../api";
import { useApi } from "../useApi";
import { Async, Note, PageHeader } from "../components/ui";

export default function ModelEval() {
  const state = useApi(getModelMetrics, "metrics");
  return (
    <>
      <PageHeader title="Model Evaluation" subtitle="All models were evaluated on the same held-out test set." />
      <Async state={state}>
        {(d) => (
          <div className="space-y-6">
            <div className="card border-teal-200">
              <div className="label">Selected model</div>
              <div className="text-xl font-semibold">{d.best_model}</div>
              <p className="mt-1 text-sm text-slate-600">{d.selection_reason}</p>
              <p className="mt-2 text-xs text-slate-500">
                {d.n_train} training / {d.n_test} test records · seed {d.random_seed} · {d.transformed_feature_count} transformed features · scikit-learn {d.sklearn_version}
              </p>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr><th className="py-2">Model</th><th>MAE</th><th>RMSE</th><th>Test R²</th><th>Train R²</th><th>CV R² (mean ± sd)</th></tr>
                </thead>
                <tbody>
                  {d.models.map((m) => (
                    <tr key={m.model} className={`border-t border-slate-100 ${m.model === d.best_model ? "bg-teal-50 font-medium" : ""}`}>
                      <td className="py-2">{m.model}</td><td>{m.mae.toFixed(4)}</td><td>{m.rmse.toFixed(4)}</td>
                      <td>{m.r2.toFixed(4)}</td><td>{m.train_r2.toFixed(4)}</td><td>{m.cv_r2_mean.toFixed(3)} ± {m.cv_r2_std.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="card">
                <h2 className="mb-3 text-sm font-semibold">Test R² (higher is better)</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={d.models}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="model" tick={{ fontSize: 11 }} /><YAxis domain={[0, 1]} /><Tooltip />
                    <Bar dataKey="r2" name="Test R²" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h2 className="mb-3 text-sm font-semibold">Error metrics (lower is better; unit {d.target_unit})</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={d.models}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="model" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Legend />
                    <Bar dataKey="mae" name="MAE" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rmse" name="RMSE" fill="#64748b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <Note>{d.data_source}. Metrics are measured values from scripts/train_model.py, saved in reports/model_metrics.json.</Note>
          </div>
        )}
      </Async>
    </>
  );
}
