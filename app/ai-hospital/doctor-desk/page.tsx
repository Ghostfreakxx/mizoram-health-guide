import type { Metadata } from "next";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import { DOCTOR_CHECKLIST, readConfig } from "../../lib/consult";
import DoctorDesk from "./DoctorDesk";

export const metadata: Metadata = {
  title: `Doctor's Desk — ${AI_HOSPITAL.name}`,
  robots: { index: false, follow: false },
};

export default function DoctorDeskPage() {
  const { enabled } = readConfig();
  return (
    <main className="flex-1">
      <PageHeader title="Doctor's Desk" icon="👩‍⚕️" intro="Start a live video consultation with a patient." crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]} />
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px]">
        {enabled ? (
          <DoctorDesk />
        ) : (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-lg text-amber-950">
            <p className="text-xl font-bold">Not set up yet</p>
            <p className="mt-2">Live consultations start once the Health Department&apos;s video server is configured. See docs/LIVE_CONSULTATION.md.</p>
          </div>
        )}
        <aside className="rounded-2xl border-2 border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-blue-950">Consultation checklist</h2>
          <p className="mt-1 text-sm text-slate-600">Based on the Telemedicine Practice Guidelines (2020).</p>
          <ol className="mt-3 space-y-2 text-slate-800">
            {DOCTOR_CHECKLIST.map((c, i) => <li key={c}>{i + 1}. {c}</li>)}
          </ol>
        </aside>
      </div>
    </main>
  );
}
