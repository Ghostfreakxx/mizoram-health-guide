"use client";

import { useState } from "react";
import { SUMMARY_LABEL, type SummaryData, formatGenerated, summarySections, summaryText } from "../../lib/summary";

const DEFAULT_QUESTIONS = [
  "What could be causing this?",
  "Do I need any tests?",
  "Which warning signs mean I should come back quickly?",
  "When should I come back for a follow-up?",
];

// The flagship doctor handoff summary. Starts from what the patient told
// the Triage Desk (if anything) and lets them add more. Nothing is stored.
export default function DoctorSummary({ base, editable = true }: { base: SummaryData; editable?: boolean }) {
  const [conditions, setConditions] = useState(base.conditions ?? "");
  const [medicines, setMedicines] = useState(base.medicines ?? "");
  const [allergies, setAllergies] = useState(base.allergies ?? "");
  const [reports, setReports] = useState(base.reports ?? "");
  const [progressNote, setProgressNote] = useState("");
  const [chosenQs, setChosenQs] = useState<string[]>(DEFAULT_QUESTIONS.slice(0, 3));
  const [ownQ, setOwnQ] = useState("");
  const [preview, setPreview] = useState(false);
  const [large, setLarge] = useState(false);
  const [copied, setCopied] = useState(false);

  const data: SummaryData = {
    ...base,
    progression: [base.progression, progressNote].filter((s) => s && s.trim()).join(". "),
    conditions,
    medicines,
    allergies,
    reports,
    questions: [...chosenQs, ...(ownQ.trim() ? [ownQ.trim()] : [])],
  };
  const sections = summarySections(data);
  const text = summaryText(data);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setPreview(true); // Clipboard blocked: show the text so it can be copied by hand.
    }
  }

  async function shareNow() {
    setPreview(false);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Patient-prepared health summary", text });
        return;
      }
    } catch {
      return; // Cancelled by the user.
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  const input = "mt-1 w-full rounded-lg border-2 border-slate-300 px-3 py-3 text-base text-slate-900 outline-none focus:border-blue-700";
  const toggleQ = (q: string) => setChosenQs((qs) => (qs.includes(q) ? qs.filter((x) => x !== q) : [...qs, q]));

  return (
    <section aria-labelledby="summary-heading" className="space-y-5">
      {editable && (
        <div className="no-print rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 id="summary-heading" className="text-xl font-bold text-blue-950">📋 Your doctor summary</h3>
          <p className="mt-1 text-slate-600">
            Add anything the doctor should know. Every box is optional. Nothing is saved — it disappears when you close this page.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block font-semibold text-slate-800">
              Existing health conditions
              <input className={input} value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="e.g. diabetes, high BP" maxLength={300} />
            </label>
            <label className="block font-semibold text-slate-800">
              Medicines taken now
              <input className={input} value={medicines} onChange={(e) => setMedicines(e.target.value)} placeholder="Names, as written on the packet" maxLength={300} />
            </label>
            <label className="block font-semibold text-slate-800">
              Known allergies
              <input className={input} value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. none, penicillin" maxLength={200} />
            </label>
            <label className="block font-semibold text-slate-800">
              Reports or tests you will bring
              <input className={input} value={reports} onChange={(e) => setReports(e.target.value)} placeholder="e.g. blood test from last month" maxLength={300} />
            </label>
            <label className="block font-semibold text-slate-800 sm:col-span-2">
              How has it changed? (optional)
              <input className={input} value={progressNote} onChange={(e) => setProgressNote(e.target.value)} placeholder="e.g. worse at night, started after a fall" maxLength={300} />
            </label>
          </div>
          <fieldset className="mt-5">
            <legend className="font-semibold text-slate-800">Questions to ask the doctor</legend>
            <div className="mt-2 grid gap-2">
              {DEFAULT_QUESTIONS.map((q) => (
                <label key={q} className="flex items-center gap-3 rounded-lg border-2 border-slate-200 bg-white px-4 py-3">
                  <input type="checkbox" checked={chosenQs.includes(q)} onChange={() => toggleQ(q)} className="h-5 w-5 accent-blue-800" />
                  {q}
                </label>
              ))}
              <input className={input} value={ownQ} onChange={(e) => setOwnQ(e.target.value)} placeholder="Add your own question" maxLength={200} aria-label="Your own question" />
            </div>
          </fieldset>
        </div>
      )}

      {/* The one-page summary */}
      <article className="print-area rounded-xl border-2 border-slate-300 bg-white p-6 text-slate-900">
        <header className="border-b-2 border-slate-200 pb-3">
          <p className="text-xl font-bold">Patient-prepared health summary</p>
          <p className="mt-1 inline-block rounded bg-amber-100 px-2 py-1 text-sm font-bold text-amber-950">{SUMMARY_LABEL}</p>
          <p className="mt-1 text-sm text-slate-600">Generated: {formatGenerated(base.generatedAt)}</p>
        </header>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {sections.map((s) => (
            <div key={s.heading} className={s.lines.length > 2 || s.heading.startsWith("AI Hospital") ? "sm:col-span-2" : ""}>
              <h4 className="text-sm font-bold uppercase tracking-wide text-slate-600">{s.heading}</h4>
              <ul className="mt-1 space-y-0.5">
                {s.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-5 border-t border-slate-200 pt-3 text-xs text-slate-600">
          Prepared with AI Hospital (Mizoram Health Guide) from the patient&apos;s own answers.
        </p>
      </article>

      <div className="no-print grid gap-3 sm:grid-cols-4">
        <button type="button" onClick={() => window.print()} className="rounded-xl bg-blue-900 px-4 py-4 text-lg font-semibold text-white hover:bg-blue-800">
          🖨️ Print / PDF
        </button>
        <button type="button" onClick={() => setLarge(true)} className="rounded-xl bg-slate-800 px-4 py-4 text-lg font-semibold text-white hover:bg-slate-700">
          📱 Show on phone
        </button>
        <button type="button" onClick={copy} className="rounded-xl border-2 border-slate-300 px-4 py-4 text-lg font-semibold text-slate-800 hover:bg-slate-50">
          {copied ? "✓ Copied" : "📄 Copy"}
        </button>
        <button type="button" onClick={() => setPreview(true)} className="rounded-xl bg-[#1a7f45] px-4 py-4 text-lg font-semibold text-white hover:bg-[#146636]">
          ↗ Share
        </button>
      </div>

      {preview && (
        <div role="dialog" aria-modal="true" aria-labelledby="share-heading" className="no-print fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
            <h3 id="share-heading" className="text-xl font-bold text-blue-950">Check before sharing</h3>
            <p className="mt-1 text-slate-600">This is exactly what will be shared. It contains your health information — only share it with people you trust, such as your doctor or family.</p>
            <pre className="mt-4 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-4 text-sm text-slate-900">{text}</pre>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPreview(false)} className="rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold">
                Cancel
              </button>
              <button type="button" onClick={shareNow} className="rounded-xl bg-[#1a7f45] px-4 py-3 font-semibold text-white">
                Share now
              </button>
            </div>
          </div>
        </div>
      )}

      {large && (
        <div role="dialog" aria-modal="true" aria-label="Summary for the doctor" className="no-print fixed inset-0 z-[90] overflow-y-auto bg-white p-5">
          <div className="mx-auto max-w-2xl text-xl leading-relaxed">
            <p className="font-bold">Patient-prepared health summary</p>
            <p className="mt-1 rounded bg-amber-100 px-2 py-1 text-base font-bold text-amber-950">{SUMMARY_LABEL}</p>
            {sections.map((s) => (
              <div key={s.heading} className="mt-5">
                <p className="text-base font-bold uppercase tracking-wide text-slate-600">{s.heading}</p>
                {s.lines.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </div>
            ))}
            <button type="button" onClick={() => setLarge(false)} className="mt-8 w-full rounded-xl border-2 border-slate-300 py-4 text-lg font-semibold">
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
