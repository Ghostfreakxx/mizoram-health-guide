"use client";

import { useState } from "react";
import type { RedFlagId } from "../../lib/safety/redFlags";
import { redFlags } from "../../lib/safety/redFlags";
import {
  AGE_GROUPS,
  type AgeGroup,
  type Answer,
  type Answers,
  type Context,
  DURATIONS,
  PROGRESSIONS,
  SEVERITIES,
  SPECIALS,
  type Special,
  choicesFor,
  complaints,
  emergencyFrom,
  getComplaint,
  questionsFor,
} from "../../lib/safety/triage";
import EmergencyMode from "./EmergencyMode";
import ResultView from "./ResultView";
import { BigChoice, StepTitle } from "./ui";

export type TriageStart = {
  who?: "self" | "other";
  relation?: string;
  age?: AgeGroup;
  special?: Special[];
  complaint?: string;
  prefill?: Record<string, Answer>;
  duration?: Answers["duration"];
  concernText?: string;
};

type Sex = "female" | "male" | "unspecified";

const canBePregnant = (age?: AgeGroup, sex?: Sex) => (age === "child" || age === "adult") && sex !== "male";
const asksSex = (age?: AgeGroup) => age === "child" || age === "adult" || age === "older";
const asksSpecial = (age?: AgeGroup) => age === "child" || age === "adult" || age === "older";

export default function TriageFlow({ start = {} }: { start?: TriageStart }) {
  const [history, setHistory] = useState<string[]>(["check"]);
  const [who, setWho] = useState<"self" | "other" | undefined>(start.who);
  const [age, setAge] = useState<AgeGroup | undefined>(start.age);
  const [sex, setSex] = useState<Sex | undefined>();
  const [special, setSpecial] = useState<Special[]>(start.special ?? []);
  const [specialAnswered, setSpecialAnswered] = useState(false);
  const [complaint, setComplaint] = useState<string | undefined>(start.complaint);
  const [ans, setAns] = useState<Record<string, Answer>>(start.prefill ?? {});
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState<Answers["duration"]>(start.duration);
  const [progression, setProgression] = useState<Answers["progression"]>();
  const [severity, setSeverity] = useState<Answers["severity"]>();
  const [emergency, setEmergency] = useState<{ flags: RedFlagId[]; clearKey?: string } | null>(null);

  const current = history[history.length - 1];
  const context: Context = {
    who: who ?? "self",
    age: age ?? "adult",
    sex: sex === "unspecified" ? undefined : sex,
    special,
    complaint: complaint ?? "other",
  };

  // The full ordered list of steps, recomputed from what we know so far.
  const prefilled = new Set(Object.keys(start.prefill ?? {}));
  const steps: string[] = [
    "check",
    "who",
    "age",
    ...(asksSex(age) ? ["sex"] : []),
    ...(asksSpecial(age) ? ["special"] : []),
    "complaint",
    ...(complaint ? questionsFor(context).filter((q) => !prefilled.has(q.id)).map((q) => `q:${q.id}`) : []),
    ...(complaint ? choicesFor(context).map((c) => `c:${c.id}`) : []),
    "duration",
    "progression",
    "severity",
    "result",
  ];
  const index = Math.max(0, steps.indexOf(current));
  const progress = Math.round(((index + 1) / steps.length) * 100);

  const go = (key: string) => {
    setHistory((h) => [...h, key]);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  const next = () => go(steps[index + 1] ?? "result");
  const back = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  const restart = () => {
    setHistory(["check"]);
    setWho(undefined);
    setAge(undefined);
    setSex(undefined);
    setSpecial([]);
    setSpecialAnswered(false);
    setComplaint(undefined);
    setAns({});
    setChoices({});
    setDuration(undefined);
    setProgression(undefined);
    setSeverity(undefined);
  };

  if (emergency) {
    return (
      <EmergencyMode
        flags={emergency.flags}
        onExit={() => {
          if (emergency.clearKey) setAns((a) => {
            const copy = { ...a };
            delete copy[emergency.clearKey!];
            return copy;
          });
          setEmergency(null);
        }}
      />
    );
  }

  const answers: Answers = {
    context,
    emergencyChecklist: [],
    answers: ans,
    choices,
    duration,
    progression,
    severity,
  };

  let body: React.ReactNode = null;

  if (current === "check") {
    body = (
      <div className="space-y-5">
        <StepTitle hint="Tap anything that is happening now.">First — is this an emergency?</StepTitle>
        <div className="grid gap-3">
          {redFlags
            .filter((f) => f.inChecklist)
            .map((f) => (
              <BigChoice key={f.id} tone="danger" onClick={() => setEmergency({ flags: [f.id] })}>
                {f.label}
              </BigChoice>
            ))}
        </div>
        <button type="button" onClick={next} className="w-full rounded-xl bg-blue-900 px-6 py-5 text-xl font-bold text-white hover:bg-blue-800">
          None of these — continue →
        </button>
      </div>
    );
  } else if (current === "who") {
    body = (
      <div className="space-y-5">
        <StepTitle>Who is this for?</StepTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <BigChoice selected={who === "self"} onClick={() => { setWho("self"); next(); }}>🙋 Myself</BigChoice>
          <BigChoice selected={who === "other"} onClick={() => { setWho("other"); next(); }}>
            👪 Someone else{start.relation ? ` (${start.relation})` : ""}
          </BigChoice>
        </div>
      </div>
    );
  } else if (current === "age") {
    body = (
      <div className="space-y-5">
        <StepTitle>How old is the patient?</StepTitle>
        <div className="grid gap-3">
          {AGE_GROUPS.map((g) => (
            <BigChoice
              key={g.id}
              selected={age === g.id}
              onClick={() => {
                setAge(g.id);
                if (!canBePregnant(g.id, sex)) setSpecial((s) => s.filter((x) => x === "immunocompromised"));
                go(asksSex(g.id) ? "sex" : "complaint");
              }}
            >
              {g.label}
            </BigChoice>
          ))}
        </div>
      </div>
    );
  } else if (current === "sex") {
    body = (
      <div className="space-y-5">
        <StepTitle hint="This helps us ask the right questions.">Is the patient female or male?</StepTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["female", "Female"],
              ["male", "Male"],
              ["unspecified", "Prefer not to say"],
            ] as [Sex, string][]
          ).map(([id, label]) => (
            <BigChoice
              key={id}
              selected={sex === id}
              onClick={() => {
                setSex(id);
                if (id === "male") setSpecial((s) => s.filter((x) => x === "immunocompromised"));
                next();
              }}
            >
              {label}
            </BigChoice>
          ))}
        </div>
      </div>
    );
  } else if (current === "special") {
    const options = SPECIALS.filter((s) => s.id === "immunocompromised" || canBePregnant(age, sex));
    body = (
      <div className="space-y-5">
        <StepTitle hint="Tap all that apply.">Does any of these apply to the patient?</StepTitle>
        <div className="grid gap-3">
          {options.map((o) => (
            <BigChoice
              key={o.id}
              selected={special.includes(o.id)}
              onClick={() => setSpecial((s) => (s.includes(o.id) ? s.filter((x) => x !== o.id) : [...s, o.id]))}
            >
              <span className="block">{o.label}</span>
              {o.hint && <span className="mt-1 block text-base font-normal text-slate-600">{o.hint}</span>}
            </BigChoice>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setSpecialAnswered(true); next(); }}
          className="w-full rounded-xl bg-blue-900 px-6 py-5 text-xl font-bold text-white hover:bg-blue-800"
        >
          {special.length ? "Continue →" : "None of these — continue →"}
        </button>
      </div>
    );
  } else if (current === "complaint") {
    body = (
      <div className="space-y-5">
        <StepTitle hint="Choose the one that bothers the patient most.">What is the main problem?</StepTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {complaints.map((c) => (
            <BigChoice
              key={c.id}
              selected={complaint === c.id}
              onClick={() => {
                setComplaint(c.id);
                if (c.id === "pregnancy" && !special.includes("pregnant")) setSpecial((s) => [...s, "pregnant"]);
                const ctx = { ...context, complaint: c.id, special: c.id === "pregnancy" ? [...new Set([...special, "pregnant" as const])] : special };
                const first = questionsFor(ctx).find((q) => !prefilled.has(q.id));
                const firstChoice = choicesFor(ctx)[0];
                go(first ? `q:${first.id}` : firstChoice ? `c:${firstChoice.id}` : "duration");
              }}
              className="flex items-center gap-3"
            >
              <span aria-hidden className="text-3xl">{c.icon}</span>
              <span>{c.label}</span>
            </BigChoice>
          ))}
        </div>
      </div>
    );
  } else if (current.startsWith("q:")) {
    const q = questionsFor(context).find((x) => `q:${x.id}` === current);
    if (q) {
      const answer = (a: Answer) => {
        setAns((prev) => ({ ...prev, [q.id]: a }));
        const flag = emergencyFrom(q, a);
        if (flag) {
          setEmergency({ flags: [flag], clearKey: q.id });
          return;
        }
        next();
      };
      body = (
        <div className="space-y-5">
          <p className="text-base font-semibold text-blue-800">
            {getComplaint(context.complaint)?.icon} {getComplaint(context.complaint)?.label}
          </p>
          <StepTitle hint={q.help}>{q.text}</StepTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <BigChoice selected={ans[q.id] === "yes"} onClick={() => answer("yes")} className="text-center">Yes</BigChoice>
            <BigChoice selected={ans[q.id] === "no"} onClick={() => answer("no")} className="text-center">No</BigChoice>
            <BigChoice selected={ans[q.id] === "unsure"} onClick={() => answer("unsure")} className="text-center">Not sure</BigChoice>
          </div>
        </div>
      );
    } else {
      body = <SkipAhead onSkip={next} />;
    }
  } else if (current.startsWith("c:")) {
    const c = choicesFor(context).find((x) => `c:${x.id}` === current);
    body = c ? (
      <div className="space-y-5">
        <StepTitle>{c.text}</StepTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {c.options.map((o) => (
            <BigChoice key={o.id} selected={choices[c.id] === o.id} onClick={() => { setChoices((p) => ({ ...p, [c.id]: o.id })); next(); }}>
              {o.label}
            </BigChoice>
          ))}
        </div>
      </div>
    ) : (
      <SkipAhead onSkip={next} />
    );
  } else if (current === "duration") {
    body = (
      <div className="space-y-5">
        <StepTitle>When did it start?</StepTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {DURATIONS.map((d) => (
            <BigChoice key={d.id} selected={duration === d.id} onClick={() => { setDuration(d.id); next(); }}>{d.label}</BigChoice>
          ))}
        </div>
      </div>
    );
  } else if (current === "progression") {
    body = (
      <div className="space-y-5">
        <StepTitle>Is it getting better or worse?</StepTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {PROGRESSIONS.map((p) => (
            <BigChoice key={p.id} selected={progression === p.id} onClick={() => { setProgression(p.id); next(); }}>{p.label}</BigChoice>
          ))}
        </div>
      </div>
    );
  } else if (current === "severity") {
    body = (
      <div className="space-y-5">
        <StepTitle>How bad is it?</StepTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {SEVERITIES.map((s) => (
            <BigChoice key={s.id} selected={severity === s.id} onClick={() => { setSeverity(s.id); next(); }}>
              <span className="block">{s.label}</span>
              <span className="block text-base font-normal text-slate-600">{s.hint}</span>
            </BigChoice>
          ))}
        </div>
      </div>
    );
  } else if (current === "result") {
    body = (
      <ResultView
        answers={answers}
        meta={{ relation: start.relation, sex, specialAsked: specialAnswered || special.length > 0, concernText: start.concernText }}
        onRestart={restart}
        onEmergency={(flags) => setEmergency({ flags })}
      />
    );
  }

  return (
    <div>
      {current !== "result" && (
        <div className="no-print mb-5">
          <div className="flex items-center justify-between gap-3">
            {history.length > 1 ? (
              <button type="button" onClick={back} className="rounded-lg border-2 border-slate-300 px-4 py-2 text-lg font-semibold text-slate-700 hover:bg-slate-50">
                ← Back
              </button>
            ) : (
              <span />
            )}
            <span className="text-sm text-slate-600">{progress}% done</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-200" aria-hidden>
            <div className="h-2 rounded-full bg-blue-800 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">{body}</div>
    </div>
  );
}

function SkipAhead({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-lg text-slate-700">This question no longer applies.</p>
      <button type="button" onClick={onSkip} className="rounded-xl bg-blue-900 px-6 py-4 text-lg font-bold text-white">
        Continue →
      </button>
    </div>
  );
}
