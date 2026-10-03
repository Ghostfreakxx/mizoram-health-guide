import type { Chart, ChartRow } from "../../lib/consultation";

// The live visit record. Patient-reported information and system routing
// information are always shown separately. No diagnosis is ever written here.

function Rows({ rows }: { rows: ChartRow[] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(0,40%)_1fr] gap-2 py-1.5 text-sm">
          <dt className="font-semibold text-slate-600">{r.label}</dt>
          <dd className={r.provided ? "text-slate-900" : "italic text-slate-500"}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function PatientChart({ chart }: { chart: Chart }) {
  const provided = [...chart.reported, ...chart.safety].filter((r) => r.provided).length;
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold tracking-wide text-blue-950">CURRENT VISIT</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Not a diagnosis</span>
      </div>
      <section aria-labelledby="chart-reported">
        <h3 id="chart-reported" className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-600">Reported by patient</h3>
        <Rows rows={chart.reported} />
      </section>
      <section aria-labelledby="chart-safety">
        <h3 id="chart-safety" className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-600">Important safety answers</h3>
        <Rows rows={chart.safety} />
      </section>
      <section aria-labelledby="chart-routing" className="rounded-xl bg-blue-50 p-3">
        <h3 id="chart-routing" className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-900">System routing information</h3>
        {chart.routing ? <Rows rows={chart.routing} /> : <p className="text-sm text-slate-600">Shown when the questions are complete.</p>}
      </section>
      <p className="sr-only" aria-live="polite">{provided} items recorded.</p>
    </div>
  );
}
