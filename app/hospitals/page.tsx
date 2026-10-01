import type { Metadata } from "next";
import PageHeader from "../components/PageHeader";
import HospitalNavigator from "../ai-hospital/components/HospitalNavigator";

export const metadata: Metadata = { title: "Hospital & Help Directory" };

export default function HospitalsPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Hospital & Help Directory"
        intro="Hospitals in Mizoram by district. We only show details that have been confirmed from an official source."
      />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-red-900">In an emergency</h2>
            <p className="mt-1 text-red-900/80">
              For chest pain, breathing difficulty, severe bleeding, or fainting, call for help immediately.
            </p>
          </div>
          <div className="flex gap-3">
            <a href="tel:108" className="rounded-lg bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-800">Call 108</a>
            <a href="tel:112" className="rounded-lg border border-red-300 bg-white px-5 py-3 font-bold text-red-800 hover:bg-red-100">Call 112</a>
          </div>
        </div>
        <HospitalNavigator />
      </section>
    </main>
  );
}
