import { Building2, CloudSun, Plug } from "lucide-react";
import { BUILDING_TYPES, FIELD_BY_KEY } from "../features";
import { UnitInput } from "./ui";

// Number box (with its unit) for one input.
export function NumberField({ field, value, onChange, error, changed = false }) {
  return (
    <div>
      <label className="label" htmlFor={`f-${field.key}`}>
        {field.label}{changed && <span className="ml-1 text-teal-600">(changed)</span>}
      </label>
      <UnitInput id={`f-${field.key}`} unit={field.unit} step={field.step} value={value} error={error}
                 onChange={(e) => onChange(e.target.value)} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const GROUPS = [
  { title: "Building", icon: Building2, keys: ["hour"], withType: true },
  { title: "Occupancy & weather", icon: CloudSun, keys: ["occupancy", "temperature", "humidity"] },
  { title: "Equipment & resources", icon: Plug, keys: ["lighting_usage", "ac_usage", "computer_usage", "water_consumption", "waste_generated"] },
];

export default function FeatureForm({ values, onChange, errors = {} }) {
  return (
    <div className="space-y-7">
      {GROUPS.map(({ title, icon: Icon, keys, withType }) => (
        <section key={title}>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="rounded-lg bg-teal-50 p-1.5 text-teal-600"><Icon size={16} /></span> {title}
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {withType && (
              <div>
                <label className="label" htmlFor="building_type">Building type</label>
                <select id="building_type" className="input" value={values.building_type}
                        onChange={(e) => onChange("building_type", e.target.value)}>
                  {BUILDING_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                </select>
                {errors.building_type && <p className="mt-1 text-xs text-red-600">{errors.building_type}</p>}
              </div>
            )}
            {keys.map((k) => (
              <NumberField key={k} field={FIELD_BY_KEY[k]} value={values[k]} error={errors[k]} onChange={(v) => onChange(k, v)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
