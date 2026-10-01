import type { Metadata } from "next";
import PageHeader from "../components/PageHeader";

export const metadata: Metadata = { title: "Hospital & Help Directory" };

const hospitals = [
  ["🏥", "Civil Hospital Aizawl", "Main public hospital resource for Aizawl."],
  ["🎗️", "State Cancer Institute", "Cancer screening, treatment and awareness support."],
  ["📍", "District Hospitals", "District-level government hospital support."],
];

export default function HospitalsPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Hospital & Help Directory"
        intro="Useful hospital and public health contact information for citizens in Mizoram."
      />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-red-900">In an emergency</h2>
            <p className="mt-1 text-red-900/80">
              For chest pain, breathing difficulty, severe bleeding, or fainting,
              call for help immediately.
            </p>
          </div>
          <div className="flex gap-3">
            <a href="tel:108" className="rounded-lg bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-800">
              Call 108
            </a>
            <a href="tel:112" className="rounded-lg border border-red-300 bg-white px-5 py-3 font-bold text-red-800 hover:bg-red-100">
              Call 112
            </a>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {hospitals.map(([icon, title, text]) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div aria-hidden className="text-3xl">{icon}</div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">{title}</h2>
              <p className="mt-2 text-slate-600">{text}</p>
              <p className="mt-5 text-sm text-slate-500">Address and contact details coming soon.</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
