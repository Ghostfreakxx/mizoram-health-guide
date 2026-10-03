import type { Metadata } from "next";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import { sources } from "../../lib/sources";

export const metadata: Metadata = {
  title: `Sources and verification — ${AI_HOSPITAL.name}`,
  description: "Every health source AI Hospital relies on, what it supports, and whether it has been checked against the official source.",
};

export default function SourcesPage() {
  const verified = sources.filter((s) => s.status === "verified").length;
  const orgs = [...new Set(sources.map((s) => s.organisation))].sort();
  return (
    <main className="flex-1">
      <PageHeader
        title="Sources and verification"
        icon="📚"
        intro="Every rule and piece of health guidance in AI Hospital points to one of these sources. A source is marked verified only when a person has checked it against the live official page."
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <div role="note" className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-amber-950">
          <p className="text-lg font-bold">
            {verified} of {sources.length} sources verified
          </p>
          <p className="mt-1">
            These records were compiled from authoritative publications but have not yet been checked against the live official
            pages (the development environment could not reach them). Until a clinician or Health Department reviewer checks each
            one and records the date, every source is shown as <strong>awaiting verification</strong>.
          </p>
        </div>

        <section aria-labelledby="by-org">
          <h2 id="by-org" className="text-2xl font-bold text-blue-950">Organisations</h2>
          <p className="mt-1 text-slate-700">{orgs.join(" · ")}</p>
        </section>

        <section aria-labelledby="all" className="space-y-3">
          <h2 id="all" className="text-2xl font-bold text-blue-950">All sources ({sources.length})</h2>
          <ul className="space-y-3">
            {sources.map((s) => (
              <li key={s.id} id={s.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{s.title}</p>
                    <p className="text-slate-700">
                      {s.organisation}
                      {s.published ? ` · ${s.published}` : ""}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${s.status === "verified" ? "bg-green-100 text-green-900" : "bg-amber-100 text-amber-950"}`}>
                    {s.status === "verified" ? `Verified ${s.checked}` : "Awaiting verification"}
                  </span>
                </div>
                {s.url && (
                  <p className="mt-2 break-all text-sm">
                    <a href={s.url} className="text-blue-800 underline" rel="noopener noreferrer" target="_blank">{s.url}</a>
                  </p>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-700">What it supports ({s.supports.length})</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-slate-800">
                    {s.supports.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
