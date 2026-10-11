import { useState } from "react";
import { BarChart3, Building2, Cpu, FlaskConical, Leaf, LayoutDashboard, Menu, Sparkles, X, Zap } from "lucide-react";
import { getHealth } from "./api";
import { useApi } from "./useApi";
import { ErrorBox } from "./components/ui";
import Overview from "./pages/Overview";
import Analytics from "./pages/Analytics";
import Buildings from "./pages/Buildings";
import Prediction from "./pages/Prediction";
import WhatIf from "./pages/WhatIf";
import CostCarbon from "./pages/CostCarbon";
import ModelEval from "./pages/ModelEval";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, page: Overview },
  { id: "analytics", label: "Usage Trends", icon: BarChart3, page: Analytics },
  { id: "buildings", label: "Buildings", icon: Building2, page: Buildings },
  { id: "prediction", label: "Predict Usage", icon: Sparkles, page: Prediction },
  { id: "whatif", label: "What-if Simulation", icon: FlaskConical, page: WhatIf },
  { id: "cost", label: "Cost & Carbon", icon: Leaf, page: CostCarbon },
  { id: "models", label: "Model Evaluation", icon: Cpu, page: ModelEval, hidden: true }, // only via #evaluation
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 p-2 text-white shadow-lg shadow-teal-900/30">
        <Zap size={18} />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-bold text-white">Smart Campus</div>
        <div className="text-[11px] text-slate-400">Digital Twin</div>
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState(window.location.hash === "#evaluation" ? "models" : "overview");
  const [open, setOpen] = useState(false);
  const health = useApi(getHealth, "health");
  const Page = NAV.find((n) => n.id === active).page;

  const go = (id) => { setActive(id); setOpen(false); window.scrollTo({ top: 0 }); };

  return (
    <div className="min-h-screen lg:flex">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-navy-900 px-4 py-3 lg:hidden">
        <Logo />
        <button className="text-white" aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </header>
      <aside className={`${open ? "block" : "hidden"} z-10 bg-navy-900 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:shrink-0`}>
        <div className="hidden px-6 py-7 lg:block"><Logo /></div>
        <nav className="space-y-1 px-3 pb-4 pt-2 lg:pt-0">
          {NAV.filter((n) => !n.hidden).map(({ id, label, icon: Icon }) => {
            const on = active === id;
            return (
              <button key={id} onClick={() => go(id)}
                      className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                        on ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
                {on && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-teal-400" />}
                <Icon size={18} className={on ? "text-teal-400" : ""} /> {label}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl">
          {health.error && <div className="mb-6"><ErrorBox error={health.error} /></div>}
          <Page key={active} />
        </div>
      </main>
    </div>
  );
}
