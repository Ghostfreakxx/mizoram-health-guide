import type { Metadata } from "next";
import PageHeader from "../components/PageHeader";
import { helplines } from "../site";

export const metadata: Metadata = { title: "Helplines" };

export default function HelplinesPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Helplines"
        intro="Free phone numbers for emergencies and health support. Tap a number to call."
      />
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {helplines.map((h) => (
          <a
            key={h.tel}
            href={`tel:${h.tel}`}
            className={`rounded-lg border-2 bg-white p-6 shadow-sm transition hover:shadow-md ${
              h.urgent ? "border-red-300 hover:border-red-500" : "border-blue-200 hover:border-blue-500"
            }`}
          >
            <span className={`block text-sm font-semibold uppercase tracking-wide ${h.urgent ? "text-red-700" : "text-blue-700"}`}>
              {h.label}
            </span>
            <span className={`mt-1 block text-4xl font-bold ${h.urgent ? "text-red-700" : "text-blue-950"}`}>
              {h.number}
            </span>
            <span className="mt-2 block text-slate-600">{h.text}</span>
            <span className="mt-4 inline-block rounded bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              📞 Tap to call
            </span>
          </a>
        ))}
      </section>
    </main>
  );
}
