// Where the patient is in the visit. Shared by every department.

export const JOURNEY = ["Reception", "Consultation", "Questions", "Triage", "Visit summary", "Real doctor", "Follow-up"] as const;
export type JourneyStep = (typeof JOURNEY)[number];

export default function JourneyBar({ current }: { current: JourneyStep }) {
  const at = JOURNEY.indexOf(current);
  return (
    <nav aria-label="Your visit">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {JOURNEY.map((s, i) => (
          <li key={s} className="flex items-center gap-1">
            <span
              aria-current={i === at ? "step" : undefined}
              className={`rounded-full px-3 py-1 font-semibold ${i === at ? "bg-blue-900 text-white" : i < at ? "bg-blue-100 text-blue-900" : "bg-slate-100 text-slate-600"}`}
            >
              {i < at ? "✓ " : ""}
              {s}
            </span>
            {i < JOURNEY.length - 1 && <span aria-hidden className="text-slate-400">›</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
