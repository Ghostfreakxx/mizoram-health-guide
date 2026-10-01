import type { Metadata } from "next";
import Link from "next/link";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import { getSource } from "../../lib/sources";
import { publicFacts, teleconsultServices } from "../data/teleconsult";

export const metadata: Metadata = {
  title: `Talk to a Real Doctor — ${AI_HOSPITAL.name}`,
  description: "How to prepare for a consultation with a real doctor, online or in person.",
};

const haveReady = [
  "Your doctor summary from AI Hospital",
  "Previous prescriptions",
  "Test reports",
  "A list of medicines you take now",
  "Any allergies",
  "When the symptoms started and how they have changed",
];

export default function DoctorPage() {
  const telemedicineSource = getSource("telemedicine-guidelines-2020");
  return (
    <main className="flex-1">
      <PageHeader
        title="Talk to a real doctor"
        icon="👩‍⚕️"
        intro="AI Hospital helps you get ready. Diagnosis and treatment always come from a qualified doctor — online or in person."
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 text-lg text-red-950">
          <strong>Emergencies need in-person care.</strong> Chest pain, stroke signs, severe breathing difficulty, heavy bleeding,
          fits, pregnancy danger signs, or a very sick baby — call <a href="tel:108" className="font-bold underline">108</a> or{" "}
          <a href="tel:112" className="font-bold underline">112</a>, or go to the nearest emergency now.
        </div>

        {/* Step 1: prepare */}
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-blue-950">Step 1 — Get your summary ready</h2>
          <p className="mt-2 text-lg text-slate-700">A short summary means you do not have to explain everything from the start, and nothing important is forgotten.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href="/ai-hospital/triage" className="rounded-xl bg-blue-900 px-5 py-4 text-center text-lg font-bold text-white hover:bg-blue-800">
              🩺 Check urgency + make summary
            </Link>
            <Link href="/ai-hospital/prepare" className="rounded-xl border-2 border-blue-900 px-5 py-4 text-center text-lg font-bold text-blue-900 hover:bg-blue-50">
              📋 Make a summary only
            </Link>
          </div>
          <h3 className="mt-6 text-lg font-bold text-blue-950">Have these ready</h3>
          <ul className="mt-2 grid gap-2 text-lg text-slate-700 sm:grid-cols-2">
            {haveReady.map((h) => <li key={h}>☐ {h}</li>)}
          </ul>
        </section>

        {/* Step 2: choose */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-blue-950">Step 2 — Choose how to see a doctor</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-blue-950">🏥 In person</h3>
              <p className="mt-2 text-lg text-slate-700">Best when you need an examination, tests, or urgent care.</p>
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/ai-hospital/departments" className="font-semibold text-blue-700 underline">Find the right department →</Link>
                <Link href="/ai-hospital/hospitals" className="font-semibold text-blue-700 underline">Find a hospital →</Link>
              </div>
            </div>

            {teleconsultServices.map((s) => {
              const facts = publicFacts(s);
              return (
                <div key={s.id} className="rounded-2xl border-2 border-slate-200 bg-white p-6">
                  <h3 className="text-xl font-bold text-blue-950">💻 Online: {s.name}</h3>
                  <p className="mt-1 text-slate-600">A government online consultation service run by the {s.operator}.</p>
                  {facts.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-lg text-slate-700">{facts.map((f) => <li key={f.text}>• {f.text}</li>)}</ul>
                  ) : (
                    <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-amber-950">
                      <strong>Details being verified.</strong> We are confirming how to access this service from the official
                      source. Until then, please follow the instructions on the official website or ask your nearest health
                      centre.
                    </p>
                  )}
                  <a href={s.officialUrl.value} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-xl bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-800">
                    Open official website ↗<span className="sr-only"> (opens external website in a new tab)</span>
                  </a>
                  {!s.officialUrl.verified && <p className="mt-2 text-xs text-slate-600">Website address awaiting verification.</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
          <h2 className="text-lg font-bold text-blue-950">Online consultation may suit</h2>
          <ul className="mt-2 space-y-1">
            <li>• Mild problems that are not getting worse</li>
            <li>• Follow-up of a long-term condition such as diabetes or blood pressure</li>
            <li>• Questions about your existing treatment</li>
            <li>• Deciding whether you need to travel to a hospital</li>
          </ul>
          <p className="mt-4 text-sm text-slate-600">
            Only registered medical practitioners can give telemedicine consultations and prescriptions in India
            {telemedicineSource ? ` (${telemedicineSource.title}, ${telemedicineSource.published?.slice(0, 4)})` : ""}.
          </p>
        </section>

        <p className="text-sm text-slate-600">
          {AI_HOSPITAL.name} is an independent health-navigation tool. It is not affiliated with, endorsed by, or partnered with
          eSanjeevani or any government service.
        </p>
      </div>
    </main>
  );
}
