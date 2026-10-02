import type { Metadata } from "next";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import { MIN_COUNT } from "../../lib/metrics";
import Dashboard from "./Dashboard";

export const metadata: Metadata = {
  title: `Health Department Dashboard — ${AI_HOSPITAL.name}`,
  robots: { index: false, follow: false },
};

const COUNTED = [
  "The urgency level the Triage Desk gave (Emergency now, Urgent, Soon, Self-care)",
  "The main reason chosen from the fixed list (for example “Fever”)",
  "Age group (for example “18 to 59 years”), never date of birth",
  "District, only if the person chooses to share it",
  "Which danger sign opened Emergency Mode",
  "Which department guide was opened",
  "The day (not the time)",
];

const NEVER = [
  "Names, phone numbers, addresses, or ID numbers",
  "Anything a person types (symptoms, messages, Health Passport details)",
  "Answers to individual triage questions",
  "Location below district level, or GPS",
  "IP address, device ID, cookies, or any way to link one visit to another",
  "Exact times",
  "Live consultation audio, video, or notes",
];

export default function AdminPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Health Department Dashboard"
        icon="📊"
        intro="Anonymous, aggregate counts to help plan services. It cannot identify or follow any person."
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div role="note" className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 text-amber-950">
          <p className="text-lg font-bold">Demonstration data — not real</p>
          <p className="mt-1">
            Every number on this page is made up to show how the dashboard works. AI Hospital does not collect or send any usage
            counts yet. Turning this on needs a decision by the Health Department on where counts are kept and who may see them,
            and a privacy review under the Digital Personal Data Protection Act, 2023.
          </p>
        </div>

        <section aria-labelledby="at-a-glance" className="space-y-4">
          <h2 id="at-a-glance" className="text-2xl font-bold text-blue-950">Service use at a glance</h2>
          <Dashboard />
        </section>

        <section aria-labelledby="privacy-design" className="grid gap-6 rounded-2xl border-2 border-slate-200 bg-white p-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <h2 id="privacy-design" className="text-2xl font-bold text-blue-950">Privacy by design</h2>
            <p className="mt-1 text-slate-700">
              This dashboard is for planning services, not for watching people. Each count is a set of category codes; a check
              rejects anything else. Any number below {MIN_COUNT} is hidden so that small groups cannot be singled out, and when one
              number is hidden another is hidden with it so it cannot be worked out by subtraction.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">What would be counted</h3>
            <ul className="mt-2 space-y-1.5 text-slate-800">
              {COUNTED.map((c) => (
                <li key={c} className="flex gap-2"><span aria-hidden className="text-green-700">✓</span>{c}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">What is never collected</h3>
            <ul className="mt-2 space-y-1.5 text-slate-800">
              {NEVER.map((c) => (
                <li key={c} className="flex gap-2"><span aria-hidden className="text-red-700">✕</span>{c}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
