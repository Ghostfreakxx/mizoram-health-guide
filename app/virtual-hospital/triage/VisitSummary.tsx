"use client";

import { useState } from "react";
import { departmentBySlug } from "../departments";
import { type Answers, LEVELS, type Result, ageGroups, durations, severities } from "../triage";

const baseQuestions = [
  "What do you think is causing this?",
  "Do I need any tests?",
  "What warning signs mean I should come back quickly?",
  "When should I come back for a follow-up?",
];

export default function VisitSummary({
  answers,
  result,
}: {
  answers: Answers;
  result: Result;
}) {
  const [name, setName] = useState("");
  const [medicines, setMedicines] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [extra, setExtra] = useState("");

  const dept = departmentBySlug(result.complaint.department);
  const symptoms = [
    ...result.complaint.flags.filter((f) => answers.flags.includes(f.id)).map((f) => f.text),
  ];
  const age = ageGroups.find((g) => g.id === answers.age)?.label ?? "";
  const duration = durations.find((d) => d.id === answers.duration)?.label ?? "";
  const severity = severities.find((s) => s.id === answers.severity)?.label ?? "";
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const lines = [
    "VISIT SUMMARY — Mizoram Health Guide Virtual Hospital",
    `Date: ${today}`,
    name && `Patient: ${name}`,
    `Age group: ${age}${answers.pregnant ? " · Pregnant" : ""}`,
    `Main problem: ${result.complaint.label}`,
    symptoms.length ? `Also: ${symptoms.join("; ")}` : "",
    `How long: ${duration} · How bad: ${severity}`,
    `Urgency from triage: ${LEVELS[result.level].title}`,
    dept ? `Suggested department: ${dept.name}` : "",
    medicines && `Medicines taken: ${medicines}`,
    allergies && `Allergies: ${allergies}`,
    conditions && `Other health conditions: ${conditions}`,
    extra && `Notes: ${extra}`,
  ].filter(Boolean);

  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; printing still works.
    }
  }

  function share() {
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
  }

  const field = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-700";

  return (
    <section aria-labelledby="summary-heading">
      <div className="no-print rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 id="summary-heading" className="text-lg font-bold text-blue-950">📋 Prepare your visit</h3>
        <p className="mt-1 text-sm text-slate-600">
          Add these details (optional) to make a summary to show the doctor. Nothing is saved or sent anywhere.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Patient name
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Allergies
            <input className={field} value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. none, penicillin" maxLength={200} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Medicines you take now
            <input className={field} value={medicines} onChange={(e) => setMedicines(e.target.value)} maxLength={300} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Other health conditions
            <input className={field} value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="e.g. diabetes, high BP" maxLength={300} />
          </label>
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Anything else the doctor should know
            <textarea className={field} rows={2} value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={500} />
          </label>
        </div>
      </div>

      {/* The printable sheet */}
      <div className="print-area mt-6 rounded-xl border-2 border-dashed border-slate-300 bg-white p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <p className="text-lg font-bold text-blue-950">Visit Summary</p>
            <p className="text-sm text-slate-500">Mizoram Health Guide · Virtual Hospital</p>
          </div>
          <p className="text-sm text-slate-500">{today}</p>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
          {name && <Row label="Patient" value={name} />}
          <Row label="Age group" value={`${age}${answers.pregnant ? " · Pregnant" : ""}`} />
          <Row label="Main problem" value={result.complaint.label} />
          <Row label="How long / how bad" value={`${duration} · ${severity}`} />
          {symptoms.length > 0 && <Row label="Also has" value={symptoms.join("; ")} wide />}
          <Row label="Urgency (triage)" value={LEVELS[result.level].title} />
          {dept && <Row label="Suggested department" value={dept.name} />}
          {medicines && <Row label="Medicines taken" value={medicines} />}
          {allergies && <Row label="Allergies" value={allergies} />}
          {conditions && <Row label="Other conditions" value={conditions} />}
          {extra && <Row label="Notes" value={extra} wide />}
        </dl>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 text-sm">
          <div>
            <p className="font-bold text-slate-900">Questions to ask the doctor</p>
            <ul className="mt-1 space-y-1 text-slate-700">
              {baseQuestions.map((q) => <li key={q}>☐ {q}</li>)}
            </ul>
          </div>
          <div>
            <p className="font-bold text-slate-900">What to bring</p>
            <ul className="mt-1 space-y-1 text-slate-700">
              {(dept?.bring ?? ["ID card", "List of medicines"]).map((b) => <li key={b}>☐ {b}</li>)}
            </ul>
          </div>
        </div>

        <p className="mt-5 border-t border-slate-200 pt-3 text-xs text-slate-500">
          This summary was made from the patient&apos;s own answers. It is not a diagnosis.
        </p>
      </div>

      <div className="no-print mt-4 flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800">
          🖨️ Print / save as PDF
        </button>
        <button type="button" onClick={share} className="rounded-lg bg-[#1a7f45] px-5 py-3 font-semibold text-white hover:bg-[#146636]">
          Send on WhatsApp
        </button>
        <button type="button" onClick={copy} className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
          {copied ? "✓ Copied" : "Copy text"}
        </button>
      </div>
    </section>
  );
}

function Row({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
