"use client";

import { useState } from "react";
import { getSource } from "../../lib/sources";
import { generalSafety, labelSourceIds, labelTerms, medicines } from "../data/medicines";

export default function MedicineGuide() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const list = medicines.filter((m) => `${m.name} ${m.also ?? ""} ${m.usedFor}`.toLowerCase().includes(q.toLowerCase().trim()));
  const orgs = (ids: string[]) => [...new Set(ids.map((id) => getSource(id)?.organisation).filter(Boolean))].join("; ");

  return (
    <div className="space-y-8">
      <p className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-lg text-amber-950">
        <strong>General information only.</strong> This does not tell you whether a medicine is right for you or how much to take.
        Always follow your prescription, and ask your doctor or pharmacist if you are unsure.
      </p>

      <section aria-labelledby="label-h" className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 id="label-h" className="text-2xl font-bold text-blue-950">📝 Understanding your prescription</h2>
        <p className="mt-1 text-lg text-slate-700">Common short forms doctors write:</p>
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          {labelTerms.map((t) => (
            <div key={t.term} className="flex gap-3 rounded-xl bg-slate-50 px-4 py-3 text-lg">
              <dt className="w-28 shrink-0 font-bold text-blue-900">{t.term}</dt>
              <dd className="text-slate-800">{t.meaning}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-slate-600">If your prescription uses a word or short form you do not understand, ask your pharmacist to explain. Source: {orgs(labelSourceIds)}.</p>
      </section>

      <section aria-labelledby="meds-h" className="space-y-4">
        <h2 id="meds-h" className="text-2xl font-bold text-blue-950">💊 Common medicines</h2>
        <label className="block text-lg font-semibold text-slate-800">
          Search
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. paracetamol, inhaler, TB" className="mt-1 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-lg outline-none focus:border-blue-700" maxLength={60} />
        </label>
        <ul className="space-y-3">
          {list.map((m) => (
            <li key={m.id} className="rounded-2xl border-2 border-slate-200 bg-white">
              <button type="button" aria-expanded={open === m.id} onClick={() => setOpen(open === m.id ? null : m.id)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
                <span>
                  <span className="block text-xl font-bold text-blue-950">{m.name}</span>
                  {m.also && <span className="block text-sm text-slate-600">{m.also}</span>}
                  <span className="mt-1 block text-lg text-slate-700">{m.usedFor}</span>
                </span>
                <span aria-hidden className="text-2xl text-blue-800">{open === m.id ? "−" : "+"}</span>
              </button>
              {open === m.id && (
                <div className="space-y-4 border-t border-slate-200 px-5 py-4 text-lg">
                  <div>
                    <h3 className="font-bold text-slate-900">Good to know</h3>
                    <ul className="mt-1 space-y-1 text-slate-800">{m.keyPoints.map((k) => <li key={k}>• {k}</li>)}</ul>
                  </div>
                  <div className="rounded-xl bg-red-50 p-4 text-red-950">
                    <h3 className="font-bold">Get help if</h3>
                    <ul className="mt-1 space-y-1">{m.getHelp.map((k) => <li key={k}>• {k}</li>)}</ul>
                  </div>
                  <p className="text-sm text-slate-600">Source: {orgs(m.sourceIds)}</p>
                </div>
              )}
            </li>
          ))}
          {list.length === 0 && <li className="text-lg text-slate-600">No match. Ask your pharmacist about this medicine.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-bold text-blue-950">🛡️ Using medicines safely</h2>
        <ul className="mt-3 space-y-2 text-lg text-slate-800">{generalSafety.points.map((p) => <li key={p}>• {p}</li>)}</ul>
        <p className="mt-3 text-sm text-slate-600">Source: {orgs(generalSafety.sourceIds)}</p>
      </section>
    </div>
  );
}
