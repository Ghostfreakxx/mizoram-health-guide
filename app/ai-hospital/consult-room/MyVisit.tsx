import type { Chart, ChartRow } from "../../lib/consultation";

// "My Visit": what the patient has told the doctor so far, in plain groups.
// Only patient-provided information is listed — nothing internal, never a
// diagnosis. Routing information is shown separately, only at the end.
// Each entry can be tapped to change it (the doctor then asks again, and the
// safety checks run again on the new answer).

const GROUPS: { title: string; labels: string[] }[] = [
  { title: "Today's concern", labels: ["Main concern", "Main problem", "For", "Age group", "Pregnancy status"] },
  { title: "About it", labels: ["Where", "How it feels", "Pain", "Pattern", "Better or worse with", "Duration", "Change", "How bad", "Temperature", "Fever"] },
  { title: "Other things you told me", labels: ["Symptoms mentioned", "Symptoms reported", "Not sure about", "Other problems mentioned (not assessed)"] },
  { title: "Things you don't have", labels: ["Relevant negatives"] },
  { title: "Medicines and health", labels: ["Current medicines", "Known allergies", "Existing conditions"] },
];

const SHORT: Record<string, string> = {
  "Main concern": "In your words",
  "Main problem": "Problem",
  "Duration": "Started",
  "Change": "Since then",
  "How bad": "How bad",
  "Symptoms reported": "You have",
  "Symptoms mentioned": "You mentioned",
  "Relevant negatives": "You don't have",
  "Not sure about": "Not sure about",
  "Other problems mentioned (not assessed)": "Also mentioned",
};

// Editable labels map to the step that asks for them.
export const EDIT_STEP: Record<string, string> = {
  Where: "body",
  Duration: "duration",
  Change: "progression",
  "How bad": "severity",
  "Age group": "age",
  For: "who",
  "Current medicines": "medicines",
  "Known allergies": "allergies",
  "Existing conditions": "conditions",
};

function Row({ r, onEdit }: { r: ChartRow; onEdit?: (label: string) => void }) {
  const tag = r.status === "from-words" ? "from your words" : r.status === "uncertain" ? "not sure" : null;
  const value = r.value.replace(/ \(from what you said\)| \(patient's words\)/g, "");
  const list = /; /.test(value) ? value.split("; ") : null;
  return (
    <div className="group py-2">
      <dt className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{SHORT[r.label] ?? r.label}</span>
        {onEdit && EDIT_STEP[r.label] && (
          <button
            type="button"
            onClick={() => onEdit(r.label)}
            className="rounded-md px-2 py-0.5 text-xs font-semibold normal-case tracking-normal text-blue-800 hover:bg-blue-50 focus-visible:bg-blue-50"
            aria-label={`Change: ${SHORT[r.label] ?? r.label}`}
          >
            Change
          </button>
        )}
      </dt>
      <dd className="mt-0.5 text-[15px] leading-snug text-slate-900">
        {list ? (
          <ul className="space-y-0.5">
            {list.map((x) => (
              <li key={x} className="flex gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                {x}
              </li>
            ))}
          </ul>
        ) : (
          value
        )}
        {tag && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{tag}</span>}
      </dd>
    </div>
  );
}

export default function MyVisit({ chart, onEdit, compact }: { chart: Chart; onEdit?: (label: string) => void; compact?: boolean }) {
  const provided = new Map(chart.reported.filter((r) => r.provided).map((r) => [r.label, r]));
  const safety = chart.safety.filter((r) => r.provided && r.label !== "Danger signs at the start");
  const checkDone = chart.safety.some((r) => r.label === "Danger signs at the start" && r.provided);
  const count = provided.size + safety.length;
  const groups = GROUPS.map((g) => ({ ...g, rows: g.labels.map((l) => provided.get(l)).filter((r): r is ChartRow => !!r) })).filter((g) => g.rows.length);
  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">My Visit</h2>
          <span className="text-xs font-semibold text-slate-500">{count ? `${count} noted` : "Nothing yet"}</span>
        </div>
      )}
      {!count && <p className="text-sm leading-relaxed text-slate-600">What you tell the doctor appears here, so you can check it. Tap “Change” to correct anything.</p>}
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h3 className="text-[13px] font-bold text-blue-900">{g.title}</h3>
          <dl className="divide-y divide-slate-100">
            {g.rows.map((r) => (
              <Row key={r.label} r={r} onEdit={onEdit} />
            ))}
          </dl>
        </section>
      ))}
      {(checkDone || safety.length > 0) && (
        <section aria-label="Safety answers">
          <h3 className="text-[13px] font-bold text-blue-900">Safety answers</h3>
          <ul className="mt-1 space-y-1 text-[15px] text-slate-800">
            {checkDone && <li>No danger signs at the start</li>}
            {safety.map((r) => (
              <li key={r.label}>
                {r.label}: <span className="font-semibold">{r.value}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {chart.routing && (
        <section aria-label="Routing" className="rounded-xl bg-blue-50 p-3">
          <h3 className="text-[13px] font-bold text-blue-900">System routing information · where to go next</h3>
          <dl className="mt-1 space-y-1 text-[15px]">
            {chart.routing.map((r) => (
              <div key={r.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{r.label}</dt>
                <dd className="text-slate-900">{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <p className="text-xs leading-relaxed text-slate-500">Only what you said · not a diagnosis · kept on this device.</p>
      <p className="sr-only" aria-live="polite">{count} items recorded.</p>
    </div>
  );
}
