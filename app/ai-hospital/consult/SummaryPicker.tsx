"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type SavedSummary, loadPassport } from "../../lib/storage";

// Lets the patient pick a summary saved in their Health Passport and show it
// to the doctor in large text. Only works if they turned on saving.
export default function SummaryPicker() {
  const [summaries, setSummaries] = useState<SavedSummary[] | null>(null);
  const [show, setShow] = useState<SavedSummary | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the person's own saved data after mount
    setSummaries(loadPassport()?.summaries ?? []);
  }, []);

  if (summaries === null) return null;

  return (
    <div className="space-y-3">
      {summaries.length === 0 ? (
        <p className="text-lg text-slate-700">
          No saved summary on this phone. Make one in 2 minutes with the{" "}
          <Link href="/ai-hospital/reception" className="font-semibold text-blue-700 underline">Reception</Link> or{" "}
          <Link href="/ai-hospital/prepare" className="font-semibold text-blue-700 underline">Visit Preparation</Link>, then tap
          “Save to my Health Passport”.
        </p>
      ) : (
        <ul className="space-y-2">
          {summaries.slice(0, 5).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-slate-200 px-4 py-3 text-lg">
              <span>Summary from {new Date(s.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
              <button type="button" onClick={() => setShow(s)} className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white">Show to doctor</button>
            </li>
          ))}
        </ul>
      )}
      {show && (
        <div role="dialog" aria-modal="true" aria-label="Summary for the doctor" className="fixed inset-0 z-[90] overflow-y-auto bg-white p-5">
          <div className="mx-auto max-w-2xl">
            <pre className="whitespace-pre-wrap font-sans text-xl leading-relaxed text-slate-900">{show.text}</pre>
            <button type="button" onClick={() => setShow(null)} className="mt-6 w-full rounded-xl border-2 border-slate-300 py-4 text-lg font-semibold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
