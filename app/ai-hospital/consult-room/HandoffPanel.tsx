import Link from "next/link";
import type { Level } from "../../lib/safety/triage";

// The real-doctor handoff: where to take the summary next. Ordered by the
// urgency the triage engine decided. AI Hospital never replaces a clinician.

type Step = { href: string; icon: string; title: string; text: string; tel?: boolean };

const HOSPITAL: Step = { href: "/ai-hospital/hospitals", icon: "🏥", title: "Go to a hospital or health centre", text: "Find the nearest facility and take your summary with you." };
const LIVE: Step = { href: "/ai-hospital/consult", icon: "👩‍⚕️", title: "Talk to a doctor live", text: "A video consultation with a registered doctor, when available." };
const ESANJ: Step = { href: "/ai-hospital/doctor", icon: "💻", title: "eSanjeevani online consultation", text: "The national telemedicine service (details awaiting verification)." };
const FOLLOW: Step = { href: "/ai-hospital/follow-up", icon: "🔔", title: "Set a follow-up reminder", text: "Appointment, test or medicine reminders on your phone." };

export default function HandoffPanel({ level }: { level: Level }) {
  const steps: Step[] =
    level === "ORANGE" ? [HOSPITAL, LIVE, FOLLOW] : level === "YELLOW" ? [LIVE, ESANJ, HOSPITAL, FOLLOW] : [FOLLOW, LIVE, ESANJ, HOSPITAL];
  return (
    <section aria-labelledby="handoff" className="rounded-2xl border-2 border-blue-200 bg-white p-5">
      <h2 id="handoff" className="text-xl font-bold text-blue-950">Next: a real healthcare professional</h2>
      <p className="mt-1 text-slate-700">The final decision about your care is always made by a doctor or health worker.</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.href}>
            <Link href={s.href} className="flex h-full gap-3 rounded-xl border-2 border-slate-200 p-4 hover:border-blue-400 hover:bg-blue-50">
              <span aria-hidden className="text-3xl">{s.icon}</span>
              <span>
                <span className="block font-bold text-slate-900">{i + 1}. {s.title}</span>
                <span className="block text-sm text-slate-600">{s.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-slate-700">If things get worse at any time, call <a href="tel:108" className="font-bold underline">108</a> or <a href="tel:112" className="font-bold underline">112</a>.</p>
    </section>
  );
}
