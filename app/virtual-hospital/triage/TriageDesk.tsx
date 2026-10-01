"use client";

import Link from "next/link";
import { useState } from "react";
import { departmentBySlug } from "../departments";
import {
  type AgeGroup,
  type Answers,
  type Level,
  type Result,
  LEVELS,
  ageGroups,
  complaints,
  durations,
  emergencyFlags,
  severities,
  triage,
} from "../triage";
import VisitSummary from "./VisitSummary";

const STEPS = ["Emergency check", "About the patient", "Main problem", "More details", "How long & how bad", "Your result"];

const levelStyles: Record<Level, { card: string; badge: string; bar: string }> = {
  0: { card: "border-red-300 bg-red-50 text-red-950", badge: "bg-red-700 text-white", bar: "bg-red-600" },
  1: { card: "border-orange-300 bg-orange-50 text-orange-950", badge: "bg-orange-600 text-white", bar: "bg-orange-500" },
  2: { card: "border-amber-300 bg-amber-50 text-amber-950", badge: "bg-amber-400 text-amber-950", bar: "bg-amber-400" },
  3: { card: "border-emerald-300 bg-emerald-50 text-emerald-950", badge: "bg-emerald-700 text-white", bar: "bg-emerald-600" },
};

const initial: Answers = {
  emergency: [],
  who: "self",
  age: "adult",
  pregnant: false,
  complaint: "",
  flags: [],
  duration: "today",
  severity: "mild",
};

function Choice({
  selected,
  onClick,
  children,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-lg border-2 px-4 py-3 text-left transition ${
        selected ? "border-blue-700 bg-blue-50 text-blue-950" : "border-slate-200 bg-white text-slate-800 hover:border-blue-300"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function CheckList({
  items,
  selected,
  onToggle,
}: {
  items: { id: string; text: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((f) => {
        const on = selected.includes(f.id);
        return (
          <label
            key={f.id}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 px-4 py-3 transition ${
              on ? "border-blue-700 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
            }`}
          >
            <input type="checkbox" checked={on} onChange={() => onToggle(f.id)} className="mt-1 h-5 w-5 shrink-0 accent-blue-800" />
            <span className="text-slate-800">{f.text}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function TriageDesk() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(initial);

  const set = (patch: Partial<Answers>) => setA((prev) => ({ ...prev, ...patch }));
  const toggle = (key: "emergency" | "flags", id: string) =>
    setA((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((x) => x !== id) : [...prev[key], id],
    }));

  const go = (s: number) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const restart = () => {
    setA(initial);
    go(0);
  };

  const complaint = complaints.find((c) => c.id === a.complaint);
  const result = step === 5 ? triage(a) : null;
  const canBePregnant = a.age === "teen" || a.age === "adult";
  const you = a.who === "self" ? "you" : "the patient";

  return (
    <div>
      {/* Progress */}
      <div className="no-print mb-6">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span className="font-semibold text-blue-900">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </span>
          {step > 0 && (
            <button type="button" onClick={restart} className="text-blue-700 underline">
              Start again
            </button>
          )}
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-200" aria-hidden>
          <div className="h-2 rounded-full bg-blue-800 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {/* Step 0: emergency check */}
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-bold text-red-800">First, is this an emergency?</h2>
            <p className="mt-2 text-slate-600">Tick anything that is happening now.</p>
            <div className="mt-5">
              <CheckList items={emergencyFlags} selected={a.emergency} onToggle={(id) => toggle("emergency", id)} />
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {a.emergency.length > 0 ? (
                <button type="button" onClick={() => go(5)} className="rounded-lg bg-red-700 px-6 py-3 font-bold text-white hover:bg-red-800">
                  Show me what to do now →
                </button>
              ) : (
                <button type="button" onClick={() => go(1)} className="rounded-lg bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800">
                  None of these — continue →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 1: patient */}
        {step === 1 && (
          <div className="space-y-7">
            <div>
              <h2 className="text-2xl font-bold text-blue-950">Who is this for?</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Choice selected={a.who === "self"} onClick={() => set({ who: "self" })}>🙋 Myself</Choice>
                <Choice selected={a.who === "other"} onClick={() => set({ who: "other" })}>👪 Someone else</Choice>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-950">How old is the patient?</h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ageGroups.map((g) => (
                  <Choice
                    key={g.id}
                    selected={a.age === g.id}
                    onClick={() => set({ age: g.id as AgeGroup, pregnant: g.id === "teen" || g.id === "adult" ? a.pregnant : false })}
                  >
                    {g.label}
                  </Choice>
                ))}
              </div>
            </div>
            {canBePregnant && (
              <div>
                <h3 className="text-lg font-bold text-blue-950">Is the patient pregnant?</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Choice selected={!a.pregnant} onClick={() => set({ pregnant: false })}>No / not applicable</Choice>
                  <Choice selected={a.pregnant} onClick={() => set({ pregnant: true })}>Yes</Choice>
                </div>
              </div>
            )}
            <Nav onBack={() => go(0)} onNext={() => go(2)} />
          </div>
        )}

        {/* Step 2: complaint */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-blue-950">What is the main problem?</h2>
            <p className="mt-2 text-slate-600">Choose the one that bothers {you} most.</p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {complaints.map((c) => (
                <Choice
                  key={c.id}
                  selected={a.complaint === c.id}
                  onClick={() => {
                    set({ complaint: c.id, flags: [] });
                    go(c.flags.length ? 3 : 4);
                  }}
                  className="flex items-center gap-3"
                >
                  <span aria-hidden className="text-2xl">{c.icon}</span>
                  <span className="font-medium">{c.label}</span>
                </Choice>
              ))}
            </div>
            <div className="mt-6">
              <button type="button" onClick={() => go(1)} className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: complaint flags */}
        {step === 3 && complaint && (
          <div>
            <h2 className="text-2xl font-bold text-blue-950">
              <span aria-hidden>{complaint.icon}</span> {complaint.label}
            </h2>
            <p className="mt-2 text-slate-600">Does {you} have any of these? Tick all that apply. If you are not sure, tick it.</p>
            <div className="mt-5">
              <CheckList items={complaint.flags} selected={a.flags} onToggle={(id) => toggle("flags", id)} />
            </div>
            <Nav onBack={() => go(2)} onNext={() => go(4)} nextLabel={a.flags.length ? "Continue →" : "None of these — continue →"} />
          </div>
        )}

        {/* Step 4: duration + severity */}
        {step === 4 && (
          <div className="space-y-7">
            <div>
              <h2 className="text-2xl font-bold text-blue-950">How long has this been going on?</h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {durations.map((d) => (
                  <Choice key={d.id} selected={a.duration === d.id} onClick={() => set({ duration: d.id })}>
                    {d.label}
                  </Choice>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-950">How bad is it?</h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {severities.map((s) => (
                  <Choice key={s.id} selected={a.severity === s.id} onClick={() => set({ severity: s.id })}>
                    <span className="block font-semibold">{s.label}</span>
                    <span className="block text-sm text-slate-500">{s.hint}</span>
                  </Choice>
                ))}
              </div>
            </div>
            <Nav onBack={() => go(complaint?.flags.length ? 3 : 2)} onNext={() => go(5)} nextLabel="See my result →" />
          </div>
        )}

        {/* Step 5: result */}
        {step === 5 && result && (
          <ResultView answers={a} result={result} onRestart={restart} />
        )}
      </div>
    </div>
  );
}

function Nav({ onBack, onNext, nextLabel = "Continue →" }: { onBack: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
      <button type="button" onClick={onBack} className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
        ← Back
      </button>
      <button type="button" onClick={onNext} className="rounded-lg bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800">
        {nextLabel}
      </button>
    </div>
  );
}

function ResultView({
  answers,
  result,
  onRestart,
}: {
  answers: Answers;
  result: Result;
  onRestart: () => void;
}) {
  const { level, reasons, complaint, crisis } = result;
  const info = LEVELS[level];
  const style = levelStyles[level];
  const isEmergencyOnly = answers.complaint === "";
  const dept = departmentBySlug(level === 0 ? "emergency" : complaint.department);

  return (
    <div className="space-y-8">
      <div className="no-print">
        <div className={`rounded-xl border-2 p-6 ${style.card}`} aria-live="polite">
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide ${style.badge}`}>
            {info.icon} {info.title}
          </span>
          <p className="mt-4 text-2xl font-bold leading-snug">{info.action}</p>
          <p className="mt-2">
            <strong>Where:</strong> {info.where}
          </p>
          {level === 0 && (
            <a href="tel:108" className="mt-5 inline-block rounded-lg bg-red-700 px-8 py-4 text-xl font-bold text-white hover:bg-red-800">
              📞 Call 108 now
            </a>
          )}
          {level === 1 && (
            <p className="mt-3 text-sm">If it gets worse before you get there, call 108.</p>
          )}
        </div>

        {crisis && (
          <div className="mt-4 rounded-xl border-2 border-violet-300 bg-violet-50 p-6 text-violet-950">
            <p className="text-lg font-bold">You are not alone. Please talk to someone right now.</p>
            <p className="mt-2">Trained counsellors are available free, 24 hours a day.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href="tel:14416" className="rounded-lg bg-violet-800 px-5 py-3 font-bold text-white">📞 Tele-MANAS 14416</a>
              <a href="tel:112" className="rounded-lg border-2 border-violet-800 px-5 py-3 font-bold text-violet-900">📞 Emergency 112</a>
            </div>
          </div>
        )}
      </div>

      {reasons.length > 0 && (
        <section className="no-print">
          <h3 className="text-lg font-bold text-blue-950">Why this advice</h3>
          <ul className="mt-3 space-y-1 text-slate-700">
            {reasons.map((r) => (
              <li key={r} className="flex gap-2"><span aria-hidden>•</span>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Next steps */}
      <section className="no-print">
        <h3 className="text-lg font-bold text-blue-950">What to do next</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {level === 0 && (
            <div className="rounded-lg border border-slate-200 p-5">
              <p className="font-bold text-slate-900">While you wait for help</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                <li>• Stay with the person and keep them calm.</li>
                <li>• Do not give food or drink if they are drowsy or unconscious.</li>
                <li>• If they are unconscious but breathing, turn them on their side.</li>
              </ul>
            </div>
          )}

          {dept && !isEmergencyOnly && (
            <Link href={`/virtual-hospital/departments/${dept.slug}`} className="rounded-lg border border-slate-200 p-5 hover:border-blue-400 hover:bg-blue-50">
              <span className="text-sm font-semibold text-slate-500">Department</span>
              <span className="mt-1 flex items-center gap-2 text-lg font-bold text-blue-900">
                <span aria-hidden className="text-2xl">{dept.icon}</span> {dept.name}
              </span>
              <span className="mt-1 block text-sm text-slate-600">What to expect and what to bring →</span>
            </Link>
          )}

          {level >= 2 && (
            <Link href="/virtual-hospital/doctor" className="rounded-lg border border-slate-200 p-5 hover:border-blue-400 hover:bg-blue-50">
              <span className="text-sm font-semibold text-slate-500">Talk to a real doctor — free</span>
              <span className="mt-1 flex items-center gap-2 text-lg font-bold text-blue-900">
                <span aria-hidden className="text-2xl">💻</span> eSanjeevani online consultation
              </span>
              <span className="mt-1 block text-sm text-slate-600">Save travel time and cost. See how it works →</span>
            </Link>
          )}

          {complaint.topic && !isEmergencyOnly && (
            <Link href={complaint.topic} className="rounded-lg border border-slate-200 p-5 hover:border-blue-400 hover:bg-blue-50">
              <span className="text-sm font-semibold text-slate-500">Learn more</span>
              <span className="mt-1 block text-lg font-bold text-blue-900">Read the health guide →</span>
            </Link>
          )}
        </div>

        {level === 3 && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            {complaint.homeCare.length > 0 && (
              <>
                <p className="font-bold">Looking after yourself at home</p>
                <ul className="mt-2 space-y-1">
                  {complaint.homeCare.map((t) => <li key={t}>• {t}</li>)}
                </ul>
              </>
            )}
            <p className="mt-4 font-bold">See a doctor if:</p>
            <ul className="mt-2 space-y-1">
              {complaint.flags.map((f) => <li key={f.id}>• {f.text}</li>)}
              <li>• You are not getting better after 3 days, or you get worse</li>
            </ul>
          </div>
        )}
      </section>

      {/* Money and time savers */}
      {(complaint.freeTips.length > 0 || level >= 2) && !isEmergencyOnly && (
        <section className="no-print rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h3 className="font-bold text-blue-950">💰 Save money and time</h3>
          <ul className="mt-2 space-y-1 text-blue-950/90">
            {complaint.freeTips.map((t) => <li key={t}>• {t}</li>)}
            {level >= 2 && <li>• A free eSanjeevani video consultation can save a trip to the hospital.</li>}
            <li>• Bring your visit summary below — it saves time at the counter and with the doctor.</li>
          </ul>
        </section>
      )}

      {level > 0 && <VisitSummary answers={answers} result={result} />}

      <div className="no-print flex flex-col sm:flex-row gap-3 border-t border-slate-200 pt-6">
        <button type="button" onClick={onRestart} className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
          ↺ Check another problem
        </button>
        <Link href="/virtual-hospital" className="rounded-lg border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50">
          Back to the Virtual Hospital
        </Link>
      </div>

      <p className="no-print text-sm text-slate-500">
        This result is guidance on how urgently to get care. It is not a diagnosis. If you are worried, or things get worse, get medical help — call 108 in an emergency.
      </p>
    </div>
  );
}
