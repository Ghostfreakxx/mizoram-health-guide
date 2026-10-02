"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getDepartment } from "../data/departments";
import { FAILSAFE_MESSAGE, LEVEL_TEXT, SAFETY_NET } from "../../lib/safety/language";
import type { RedFlagId } from "../../lib/safety/redFlags";
import { AGE_GROUPS, type Answers, DURATIONS, PROGRESSIONS, SEVERITIES, choicesFor, triage } from "../../lib/safety/triage";
import { getService } from "../../lib/services";
import { getSource } from "../../lib/sources";
import type { SummaryData } from "../../lib/summary";
import DoctorSummary from "./DoctorSummary";
import ReadAloud from "../../components/ReadAloud";

const LEVEL_STYLE = {
  RED: { card: "border-red-400 bg-red-50 text-red-950", badge: "bg-red-700 text-white" },
  ORANGE: { card: "border-orange-400 bg-orange-50 text-orange-950", badge: "bg-orange-600 text-white" },
  YELLOW: { card: "border-amber-400 bg-amber-50 text-amber-950", badge: "bg-amber-400 text-amber-950" },
  GREEN: { card: "border-emerald-400 bg-emerald-50 text-emerald-950", badge: "bg-emerald-700 text-white" },
} as const;

export default function ResultView({
  answers,
  meta,
  onRestart,
  onEmergency,
}: {
  answers: Answers;
  meta: { relation?: string; sex?: string; specialAsked: boolean; concernText?: string };
  onRestart: () => void;
  onEmergency: (flags: RedFlagId[]) => void;
}) {
  const result = triage(answers);

  // Emergency override: a RED result always switches to Emergency Mode.
  useEffect(() => {
    if (result.level === "RED") onEmergency(result.emergency);
  }, [result.level, result.emergency, onEmergency]);

  if (result.failsafe) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border-2 border-orange-400 bg-orange-50 p-6 text-orange-950">
          <p className="text-2xl font-bold">Please get help from a health professional</p>
          <p className="mt-3 text-lg">{FAILSAFE_MESSAGE}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="tel:108" className="rounded-xl bg-red-700 px-6 py-3 text-lg font-bold text-white">📞 108</a>
            <a href="tel:112" className="rounded-xl border-2 border-red-700 px-6 py-3 text-lg font-bold text-red-800">📞 112</a>
          </div>
        </div>
        <button type="button" onClick={onRestart} className="rounded-xl border-2 border-slate-300 px-5 py-3 text-lg font-semibold">↺ Start again</button>
      </div>
    );
  }

  if (result.level === "RED") return null;

  const text = LEVEL_TEXT[result.level];
  const style = LEVEL_STYLE[result.level];
  const departments = result.departments.map(getDepartment).filter((d): d is NonNullable<typeof d> => !!d);
  const services = result.services.map(getService).filter((s): s is NonNullable<typeof s> => !!s);
  const ctx = answers.context;

  const label = <T extends { id: string; label: string }>(list: readonly T[], id?: string) => list.find((x) => x.id === id)?.label;
  const temp = choicesFor(ctx).map((c) => ({ label: c.summaryLabel, value: c.options.find((o) => o.id === answers.choices[c.id])?.label ?? "" }));

  const pregnancyLine = ctx.special.includes("pregnant")
    ? "Pregnant"
    : ctx.special.includes("postpartum")
      ? "Gave birth in the last 6 weeks"
      : meta.specialAsked && (ctx.age === "child" || ctx.age === "adult") && meta.sex !== "male"
        ? "Not pregnant (as reported)"
        : undefined;

  const summary: SummaryData = {
    generatedAt: new Date(),
    forWhom: ctx.who === "self" ? "Self" : `Someone else${meta.relation ? ` (${meta.relation})` : ""}`,
    age: label(AGE_GROUPS, ctx.age),
    sex: meta.sex === "female" ? "Female" : meta.sex === "male" ? "Male" : undefined,
    pregnancy: pregnancyLine,
    mainConcern: [result.complaint.label, meta.concernText ? `In their words: "${meta.concernText}"` : ""].filter(Boolean).join(". "),
    started: label(DURATIONS, answers.duration),
    progression: label(PROGRESSIONS, answers.progression),
    severity: label(SEVERITIES, answers.severity),
    relevant: result.positives,
    negatives: result.negatives,
    unsure: result.unsure,
    measurements: temp,
    conditions: ctx.special.includes("immunocompromised") ? "Weak immune system (as reported)" : "",
    triage: {
      level: text.label,
      recommendation: result.now && text.nowMessage ? text.nowMessage : text.message,
      departments: departments.map((d) => d.plainName),
    },
  };

  return (
    <div className="space-y-8">
      <div className={`no-print rounded-2xl border-2 p-6 ${style.card}`} aria-live="polite">
        <span className={`inline-block rounded-full px-4 py-1 text-base font-bold ${style.badge}`}>
          {text.icon} {text.label}
        </span>
        <p className="mt-4 text-2xl font-bold leading-snug">{text.title}</p>
        <p className="mt-2 text-lg leading-relaxed">{result.now && text.nowMessage ? text.nowMessage : text.message}</p>
        <ReadAloud text={`${text.title}. ${result.now && text.nowMessage ? text.nowMessage : text.message}`} className="mt-3" />
        {result.level === "ORANGE" && (
          <p className="mt-3 text-base">If things get worse before you get there, call <a href="tel:108" className="font-bold underline">108</a> or <a href="tel:112" className="font-bold underline">112</a>.</p>
        )}
      </div>

      {result.reasons.length > 0 && (
        <section className="no-print">
          <h3 className="text-xl font-bold text-blue-950">Why this advice</h3>
          <ul className="mt-3 space-y-2">
            {result.reasons.map((r) => (
              <li key={r.text} className="rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-lg text-slate-800">{r.text}</span>
                <span className="mt-1 block text-xs text-slate-600">
                  Source: {r.sourceIds.map((id) => getSource(id)?.organisation).filter(Boolean).join("; ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.level === "GREEN" && (
        <section className="no-print rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 text-emerald-950">
          {result.complaint.selfCare.length > 0 && (
            <>
              <h3 className="text-xl font-bold">Looking after yourself at home</h3>
              <ul className="mt-2 space-y-1 text-lg">
                {result.complaint.selfCare.map((s) => <li key={s.text}>• {s.text}</li>)}
              </ul>
            </>
          )}
          <h3 className="mt-5 text-xl font-bold">See a doctor if:</h3>
          <ul className="mt-2 space-y-1 text-lg">
            {result.complaint.questions.map((q) => <li key={q.id}>• {q.positive}</li>)}
            {SAFETY_NET.map((s) => <li key={s}>• {s}</li>)}
          </ul>
        </section>
      )}

      {/* Next steps */}
      <section className="no-print space-y-3">
        <h3 className="text-xl font-bold text-blue-950">Your next steps</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {departments.slice(0, 2).map((d) => (
            <Link key={d.slug} href={`/ai-hospital/departments/${d.slug}`} className="rounded-xl border-2 border-slate-200 p-5 hover:border-blue-400 hover:bg-blue-50">
              <span className="text-sm font-semibold text-slate-600">Go to</span>
              <span className="mt-1 flex items-center gap-2 text-xl font-bold text-blue-900">
                <span aria-hidden className="text-2xl">{d.icon}</span> {d.plainName}
              </span>
              <span className="mt-1 block text-slate-600">What to expect and what to bring →</span>
            </Link>
          ))}
          {result.teleconsultSuitable && (
            <Link href="/ai-hospital/consult" className="rounded-xl border-2 border-slate-200 p-5 hover:border-blue-400 hover:bg-blue-50">
              <span className="text-sm font-semibold text-slate-600">Talk to a real doctor</span>
              <span className="mt-1 flex items-center gap-2 text-xl font-bold text-blue-900">
                <span aria-hidden className="text-2xl">💻</span> Online consultation
              </span>
              <span className="mt-1 block text-slate-600">May save a trip. See how →</span>
            </Link>
          )}
          <Link href="/ai-hospital/hospitals" className="rounded-xl border-2 border-slate-200 p-5 hover:border-blue-400 hover:bg-blue-50">
            <span className="text-sm font-semibold text-slate-600">Where to go</span>
            <span className="mt-1 flex items-center gap-2 text-xl font-bold text-blue-900">
              <span aria-hidden className="text-2xl">🏥</span> Find a hospital
            </span>
          </Link>
          {result.complaint.topic && (
            <Link href={result.complaint.topic} className="rounded-xl border-2 border-slate-200 p-5 hover:border-blue-400 hover:bg-blue-50">
              <span className="text-sm font-semibold text-slate-600">Learn more</span>
              <span className="mt-1 block text-xl font-bold text-blue-900">📚 Read the health guide</span>
            </Link>
          )}
        </div>
      </section>

      {services.length > 0 && (
        <section className="no-print rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="text-xl font-bold text-blue-950">💰 Government services that may help</h3>
          <ul className="mt-3 space-y-2">
            {services.map((s) => (
              <li key={s.id} className="text-lg text-blue-950">
                <strong>{s.name}</strong> — {s.description}
                {s.phone && (
                  <>
                    {" "}
                    <a href={`tel:${s.phone.tel}`} className="font-bold underline">{s.phone.display}</a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <DoctorSummary base={summary} />

      <div className="no-print flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
        <button type="button" onClick={onRestart} className="rounded-xl border-2 border-slate-300 px-5 py-4 text-lg font-semibold text-slate-800 hover:bg-slate-50">
          ↺ Check another problem
        </button>
        <Link href="/ai-hospital" className="rounded-xl border-2 border-slate-300 px-5 py-4 text-center text-lg font-semibold text-slate-800 hover:bg-slate-50">
          Back to AI Hospital lobby
        </Link>
      </div>
    </div>
  );
}
