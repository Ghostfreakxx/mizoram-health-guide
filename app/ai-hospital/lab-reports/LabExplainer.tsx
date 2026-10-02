"use client";

import { useState } from "react";
import { getSource } from "../../lib/sources";
import { type LabEntry, RANGE_EXPLANATION, labTests, preserveEntry } from "../data/labTests";

export default function LabExplainer() {
  const [id, setId] = useState<string>("");
  const [entry, setEntry] = useState<LabEntry>({ value: "", unit: "", range: "" });
  const test = labTests.find((t) => t.id === id);
  const shown = preserveEntry(entry);
  const field = "mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none focus:border-blue-700";

  return (
    <div className="space-y-6">
      <p className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-lg text-amber-950">
        <strong>This explains what a test is — it does not explain your result.</strong> Only your doctor can say what your
        result means for you. Always take the full original report to your doctor.
      </p>

      <label className="block text-xl font-bold text-blue-950">
        Which test is on your report?
        <select className={field} value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Choose a test</option>
          {labTests.map((t) => <option key={t.id} value={t.id}>{t.name}{t.also ? ` (${t.also})` : ""}</option>)}
        </select>
      </label>

      {test && (
        <article className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 text-lg">
          <h2 className="text-2xl font-bold text-blue-950">{test.name}</h2>
          <div><h3 className="font-bold text-slate-900">What it measures</h3><p className="text-slate-800">{test.measures}</p></div>
          <div><h3 className="font-bold text-slate-900">Why it is done</h3><p className="text-slate-800">{test.whyDone}</p></div>
          {test.notes.length > 0 && <ul className="space-y-1 text-slate-800">{test.notes.map((n) => <li key={n}>• {n}</li>)}</ul>}

          <section className="rounded-xl bg-slate-50 p-5">
            <h3 className="font-bold text-slate-900">Copy your result to show your doctor (optional)</h3>
            <p className="text-base text-slate-600">Type it exactly as printed. We do not change, compare, or judge it. Nothing is saved.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block font-semibold">Result<input className={field} value={entry.value} onChange={(e) => setEntry({ ...entry, value: e.target.value })} maxLength={30} /></label>
              <label className="block font-semibold">Unit<input className={field} value={entry.unit} onChange={(e) => setEntry({ ...entry, unit: e.target.value })} maxLength={20} /></label>
              <label className="block font-semibold">Reference range (as printed)<input className={field} value={entry.range} onChange={(e) => setEntry({ ...entry, range: e.target.value })} maxLength={40} /></label>
            </div>
            {(shown.value || shown.range) && (
              <dl className="mt-4 grid gap-2 rounded-xl border-2 border-slate-300 bg-white p-4 sm:grid-cols-3">
                <div><dt className="text-sm text-slate-600">Your result (as printed)</dt><dd className="text-xl font-bold">{shown.value || "—"} {shown.unit}</dd></div>
                <div className="sm:col-span-2"><dt className="text-sm text-slate-600">Laboratory&apos;s reference range (as printed)</dt><dd className="text-xl font-bold">{shown.range || "—"} {shown.range && shown.unit}</dd></div>
              </dl>
            )}
          </section>

          <div className="rounded-xl bg-blue-50 p-5 text-blue-950">
            <h3 className="font-bold">What the reference range means</h3>
            <p className="mt-1">{RANGE_EXPLANATION}</p>
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Questions to ask your doctor</h3>
            <ul className="mt-1 space-y-1 text-slate-800">{test.questions.map((q) => <li key={q}>☐ {q}</li>)}</ul>
          </div>
          <p className="text-sm text-slate-600">Source: {[...new Set(test.sourceIds.map((s) => getSource(s)?.organisation))].join("; ")}</p>
        </article>
      )}
    </div>
  );
}
