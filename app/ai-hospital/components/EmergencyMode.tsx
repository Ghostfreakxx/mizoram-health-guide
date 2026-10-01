"use client";

import { useEffect, useRef, useState } from "react";
import { type RedFlagId, getRedFlag, redFlags } from "../../lib/safety/redFlags";

// Full-screen emergency interface. It covers the whole page so nothing else
// distracts. Nothing entered here is saved or sent anywhere.
export default function EmergencyMode({
  flags = [],
  onExit,
  exitLabel = "This is not an emergency — go back",
}: {
  flags?: RedFlagId[];
  onExit: () => void;
  exitLabel?: string;
}) {
  const [selected, setSelected] = useState<RedFlagId[]>(flags);
  const [showNote, setShowNote] = useState(false);
  const [noteTime, setNoteTime] = useState<string | null>(null);
  const [what, setWhat] = useState("");
  const [meds, setMeds] = useState("");
  const [allergies, setAllergies] = useState("");
  const [showLarge, setShowLarge] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const crisis = selected.some((id) => getRedFlag(id).crisis);
  const active = selected.map(getRedFlag);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-heading"
      className="fixed inset-0 z-[100] overflow-y-auto bg-white text-slate-950"
    >
      <div className="bg-red-700 px-4 py-5 text-white">
        <div className="mx-auto max-w-2xl">
          <h1 id="emergency-heading" ref={headingRef} tabIndex={-1} className="text-3xl font-black outline-none sm:text-4xl">
            {crisis ? "Help is available now" : "Emergency — act now"}
          </h1>
          {active.length > 0 && (
            <p className="mt-1 text-lg font-semibold text-red-50">{active.map((f) => f.title).join(" · ")}</p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Immediate action */}
        <div className="grid gap-3">
          {crisis && (
            <a href="tel:14416" className="flex items-center justify-between rounded-2xl bg-violet-800 px-6 py-5 text-white">
              <span>
                <span className="block text-sm font-semibold uppercase tracking-wide">Talk to someone now — free, 24 hours</span>
                <span className="block text-2xl font-bold">Tele-MANAS 14416</span>
              </span>
              <span aria-hidden className="text-4xl">📞</span>
            </a>
          )}
          <a href="tel:108" className="flex items-center justify-between rounded-2xl bg-red-700 px-6 py-5 text-white">
            <span>
              <span className="block text-sm font-semibold uppercase tracking-wide">Ambulance</span>
              <span className="block text-4xl font-black">Call 108</span>
            </span>
            <span aria-hidden className="text-4xl">🚑</span>
          </a>
          <a href="tel:112" className="flex items-center justify-between rounded-2xl border-4 border-red-700 px-6 py-4 text-red-800">
            <span>
              <span className="block text-sm font-semibold uppercase tracking-wide">National emergency number</span>
              <span className="block text-3xl font-black">Call 112</span>
            </span>
            <span aria-hidden className="text-3xl">📞</span>
          </a>
        </div>

        <p className="rounded-xl bg-amber-100 p-4 text-lg font-semibold text-amber-950">
          👥 Ask someone nearby to help you. If you cannot call, ask them to call. Or go to the nearest hospital emergency now.
        </p>

        {/* Short guidance for the selected situation */}
        {active.length > 0 ? (
          active.map((f) => (
            <section key={f.id} className="rounded-xl border-2 border-slate-200 p-5">
              <h2 className="text-xl font-bold">While waiting for help</h2>
              <ul className="mt-3 space-y-2 text-lg">
                {f.guidance.map((g) => (
                  <li key={g} className="flex gap-3">
                    <span aria-hidden className="font-bold text-red-700">›</span>
                    {g}
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <section>
            <h2 className="text-xl font-bold">What is happening? (optional)</h2>
            <p className="mt-1 text-slate-600">Tap one to see what to do while waiting for help.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {redFlags.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelected([f.id])}
                  className="rounded-xl border-2 border-slate-200 px-4 py-3 text-left text-lg font-semibold hover:border-red-400"
                >
                  {f.title}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Information for responders */}
        <section className="rounded-xl border-2 border-slate-200 p-5">
          {!showNote ? (
            <button type="button" onClick={() => setShowNote(true)} className="w-full text-left text-lg font-semibold text-blue-800">
              📝 Prepare information for the ambulance or doctor (optional)
            </button>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Information for responders</h2>
              <p className="text-sm text-slate-600">This stays on this screen only. It is not saved or sent.</p>
              <button
                type="button"
                onClick={() =>
                  setNoteTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }))
                }
                className="rounded-lg bg-slate-900 px-5 py-3 text-lg font-semibold text-white"
              >
                🕒 {noteTime ? `Time noted: ${noteTime}` : "Note the time it started (now)"}
              </button>
              <label className="block text-lg font-semibold">
                What happened
                <textarea value={what} onChange={(e) => setWhat(e.target.value)} rows={2} maxLength={500} className="mt-1 w-full rounded-lg border-2 border-slate-300 p-3 text-lg font-normal" />
              </label>
              <label className="block text-lg font-semibold">
                Medicines they take
                <input value={meds} onChange={(e) => setMeds(e.target.value)} maxLength={300} className="mt-1 w-full rounded-lg border-2 border-slate-300 p-3 text-lg font-normal" />
              </label>
              <label className="block text-lg font-semibold">
                Allergies
                <input value={allergies} onChange={(e) => setAllergies(e.target.value)} maxLength={200} className="mt-1 w-full rounded-lg border-2 border-slate-300 p-3 text-lg font-normal" />
              </label>
              <button type="button" onClick={() => setShowLarge(true)} className="rounded-lg bg-blue-900 px-5 py-3 text-lg font-semibold text-white">
                Show this to the responders
              </button>
            </div>
          )}
        </section>

        <button type="button" onClick={onExit} className="w-full py-3 text-center text-slate-600 underline">
          {exitLabel}
        </button>
      </div>

      {showLarge && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-white p-6">
          <div className="mx-auto max-w-2xl space-y-5 text-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">Information from the patient or helper</p>
            {active.length > 0 && <p><strong>Situation:</strong> {active.map((f) => f.title).join(", ")}</p>}
            {noteTime && <p><strong>Started at:</strong> {noteTime}</p>}
            {what && <p><strong>What happened:</strong> {what}</p>}
            {meds && <p><strong>Medicines:</strong> {meds}</p>}
            {allergies && <p><strong>Allergies:</strong> {allergies}</p>}
            <button type="button" onClick={() => setShowLarge(false)} className="rounded-lg border-2 border-slate-300 px-5 py-3 text-lg">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
