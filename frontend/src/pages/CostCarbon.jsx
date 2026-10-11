import { useState } from "react";
import { Calculator, Coins, Gauge, Leaf, Zap } from "lucide-react";
import { getOverview, predict } from "../api";
import { useApi } from "../useApi";
import FeatureForm from "../components/FeatureForm";
import { Async, ErrorBox, PageHeader, Stat, Tile, UnitInput, fmt, kwh } from "../components/ui";
import { defaultsFromStats, validate } from "../features";

const CURRENCIES = ["₹", "$", "€", "£"];
// Starting values only: the user is expected to edit them (price, emission factor, usage hours).
const DEFAULT_SETTINGS = { currency: "₹", price: "8", factor: "0.7", hours: "12", days: "30" };
const DEFAULT_CUTS = { ac: "20", lighting: "20" };

function parseSettings(s) {
  const e = {};
  const num = (k, min, max, msg) => {
    const n = Number(s[k]);
    if (String(s[k]).trim() === "" || !Number.isFinite(n) || n < min || n > max) e[k] = msg;
    return n;
  };
  const price = num("price", 0, 100000, "Enter a price of 0 or more.");
  const factor = num("factor", 0, 10, "Enter a value between 0 and 10.");
  const hours = num("hours", 0.1, 24, "Enter hours between 0.1 and 24.");
  const days = num("days", 1, 31, "Enter days between 1 and 31.");
  return { e, price, factor, hours, days };
}

function Calculator_({ stats }) {
  const [values, setValues] = useState(() => defaultsFromStats(stats));
  const [errors, setErrors] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [cuts, setCuts] = useState(DEFAULT_CUTS);
  const [setErrs, setSetErrs] = useState({});
  const [res, setRes] = useState({ data: null, error: null, loading: false });
  const setS = (k) => (e) => setSettings((s) => ({ ...s, [k]: e.target.value }));

  const run = async () => {
    const v = validate(values);
    const st = parseSettings(settings);
    setErrors(v.errors);
    setSetErrs(st.e);
    const acCut = Math.min(Math.max(Number(cuts.ac) || 0, 0), 100);
    const lightCut = Math.min(Math.max(Number(cuts.lighting) || 0, 0), 100);
    if (Object.keys(v.errors).length || Object.keys(st.e).length) return;
    setRes({ data: null, error: null, loading: true });
    try {
      const saved = { ...v.payload, ac_usage: v.payload.ac_usage * (1 - acCut / 100), lighting_usage: v.payload.lighting_usage * (1 - lightCut / 100) };
      const [base, alt] = await Promise.all([predict(v.payload), predict(saved)]);
      setRes({ data: { base: base.prediction, alt: alt.prediction, warnings: [...new Set([...base.warnings, ...alt.warnings])],
                       st, currency: settings.currency, acCut, lightCut }, error: null, loading: false });
    } catch (error) {
      setRes({ data: null, error, loading: false });
    }
  };

  const d = res.data;
  let m = null;
  if (d) {
    const factorK = d.st.hours * d.st.days;
    const monthlyBase = d.base * factorK;
    const monthlyAlt = d.alt * factorK;
    m = {
      perHour: d.base, monthly: monthlyBase, cost: monthlyBase * d.st.price, co2: monthlyBase * d.st.factor,
      savedKwh: monthlyBase - monthlyAlt, savedCost: (monthlyBase - monthlyAlt) * d.st.price, savedCo2: (monthlyBase - monthlyAlt) * d.st.factor,
    };
  }
  const money = (n) => `${d.currency}${fmt(n, 0)}`;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="card-title">1. Building conditions</h2>
        <FeatureForm values={values} errors={errors} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
      </div>

      <div className="card">
        <h2 className="card-title">2. Your cost and usage settings</h2>
        <p className="-mt-2 mb-4 text-xs text-slate-500">Starting values are shown. Edit them to match your electricity bill and how the building is used.</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="label" htmlFor="cur">Currency</label>
            <select id="cur" className="input" value={settings.currency} onChange={setS("currency")}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {[["price", "Price per kWh", `${settings.currency}/kWh`], ["factor", "CO₂ emission factor", "kg/kWh"],
            ["hours", "Hours used per day", "h/day"], ["days", "Days used per month", "days"]].map(([k, label, unit]) => (
            <div key={k}>
              <label className="label" htmlFor={`s-${k}`}>{label}</label>
              <UnitInput id={`s-${k}`} unit={unit} step="any" error={setErrs[k]} value={settings[k]} onChange={setS(k)} />
              {setErrs[k] && <p className="mt-1 text-xs text-red-600">{setErrs[k]}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">3. Try a saving</h2>
        <p className="-mt-2 mb-4 text-xs text-slate-500">How much could you save by using less AC and lighting?</p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[["ac", "Reduce AC usage by"], ["lighting", "Reduce lighting usage by"]].map(([k, label]) => (
            <div key={k}>
              <label className="label" htmlFor={`c-${k}`}>{label}</label>
              <select id={`c-${k}`} className="input" value={cuts[k]} onChange={(e) => setCuts((c) => ({ ...c, [k]: e.target.value }))}>
                {[0, 10, 20, 30, 40, 50].map((n) => <option key={n} value={String(n)}>{n}%</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="mt-7">
          <button className="btn" onClick={run} disabled={res.loading}><Calculator size={16} /> {res.loading ? "Calculating…" : "Calculate"}</button>
        </div>
      </div>

      <ErrorBox error={res.error} />
      {d && m && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={Gauge} tone="blue" label="Usage per hour" value={kwh(m.perHour)} />
            <Stat icon={Zap} tone="teal" label="Monthly usage" value={kwh(m.monthly, 0)} />
            <Stat icon={Coins} tone="amber" label="Monthly cost" value={money(m.cost)} />
            <Stat icon={Leaf} tone="emerald" label="Monthly CO₂" value={`${fmt(m.co2, 0)} kg`} />
          </div>
          <div className="card">
            <h2 className="card-title">Estimated monthly savings ({d.acCut}% less AC, {d.lightCut}% less lighting)</h2>
            {m.savedKwh > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Tile tone="good" label="Energy saved" value={kwh(m.savedKwh, 0)} />
                <Tile tone="good" label="Money saved" value={money(m.savedCost)} />
                <Tile tone="good" label="CO₂ avoided" value={`${fmt(m.savedCo2, 0)} kg`} />
              </div>
            ) : (
              <p className="text-sm text-slate-600">No saving is estimated for these changes. Try a larger reduction.</p>
            )}
            {d.warnings.length > 0 && (
              <ul className="mt-4 list-disc space-y-1 rounded-xl bg-amber-50 p-3 pl-6 text-sm text-amber-900">
                {d.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
            <p className="mt-4 text-xs text-slate-500">
              Estimates assume these conditions apply for {d.st.hours} hours a day, {d.st.days} days a month, and that each estimate covers one hour of use.
              Actual cost and emissions depend on your tariff and electricity source.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function CostCarbon() {
  const state = useApi(getOverview, "overview");
  return (
    <div className="page-enter">
      <PageHeader title="Cost & Carbon" subtitle="Turn the estimated usage into a monthly cost and carbon footprint, and see what savings could look like." />
      <Async state={state}>{(d) => <Calculator_ stats={d.feature_stats} />}</Async>
    </div>
  );
}
