// Virtual consultation: a conversation on top of the deterministic triage
// engine. This module decides only WHAT TO ASK NEXT and how the virtual guide
// phrases it. It never decides urgency: every answer goes into the same
// `Answers` object the Triage Desk uses, and `triage()` alone gives the result.
//
// Safety rules (enforced by tests):
// - Red flags from free text, the danger-sign check, or any question stop the
//   conversation at once and switch to Emergency Mode.
// - A RED result also switches to Emergency Mode.
// - Every line the guide says passes the language policy (no diagnosis, no
//   doses, never "you don't need a doctor").
// - Panel information is only what the person supplied.

import { detectRedFlags } from "./safety/detect";
import { receive } from "./safety/reception";
import { type RedFlagId, getRedFlag, redFlags } from "./safety/redFlags";
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
  triage,
} from "./safety/triage";

export type Mood = "warm" | "attentive" | "focused" | "serious";
export type Sex = "female" | "male" | "unspecified";

export type Option = { id: string; label: string; tone?: "danger" };

export type Input =
  | { kind: "text"; placeholder: string; optional: boolean; maxLength: number }
  | { kind: "single"; options: Option[] }
  | { kind: "multi"; options: (Option & { hint?: string })[]; doneLabel: string; noneLabel: string }
  | { kind: "result" }
  | { kind: "emergency"; flags: RedFlagId[] };

export type Turn = { step: string; say: string; hint?: string; input: Input; mood: Mood };

export type EmergencyState = { flags: RedFlagId[]; clear: { kind: "answer"; id: string } | { kind: "check" } | { kind: "text" } };

export type ConsultState = {
  department: string; // display name, e.g. "General Medicine"
  concernText?: string;
  pendingFlags: RedFlagId[]; // mentioned in free text; need a yes/no
  dismissedFlags: RedFlagId[];
  checkDone: boolean;
  who?: "self" | "other";
  relation?: string;
  age?: AgeGroup;
  sex?: Sex;
  special: Special[];
  specialDone: boolean;
  suggested: string[]; // complaint ids suggested from the person's words
  complaint?: string;
  answers: Record<string, Answer>;
  prefilled: string[];
  choices: Record<string, string>;
  duration?: Answers["duration"];
  progression?: Answers["progression"];
  severity?: Answers["severity"];
  medicines?: string;
  medicinesDone: boolean;
  allergies?: string;
  allergiesDone: boolean;
  emergency: EmergencyState | null;
};

export const MAX_TEXT = 300;

export function startConsultation(department: string): ConsultState {
  return {
    department,
    pendingFlags: [],
    dismissedFlags: [],
    checkDone: false,
    special: [],
    specialDone: false,
    suggested: [],
    answers: {},
    prefilled: [],
    choices: {},
    medicinesDone: false,
    allergiesDone: false,
    emergency: null,
  };
}

const canBePregnant = (age?: AgeGroup, sex?: Sex) => (age === "child" || age === "adult") && sex !== "male";
const asksSex = (age?: AgeGroup) => age === "child" || age === "adult" || age === "older";

export function contextOf(s: ConsultState): Context {
  return {
    who: s.who ?? "self",
    age: s.age ?? "adult",
    sex: s.sex === "unspecified" ? undefined : s.sex,
    special: s.special,
    complaint: s.complaint ?? "other",
  };
}

export function toAnswers(s: ConsultState): Answers {
  return {
    context: contextOf(s),
    emergencyChecklist: [],
    answers: s.answers,
    choices: s.choices,
    duration: s.duration,
    progression: s.progression,
    severity: s.severity,
  };
}

const patient = (s: ConsultState) => (s.who === "other" ? "the patient" : "you");
const YES_NO: Option[] = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "unsure", label: "Not sure" },
];

export const EMERGENCY_LINE =
  "Some of the information you provided may require urgent medical attention. Please seek emergency medical help now.";

// The next thing the virtual guide says, and what kind of answer it needs.
export function nextTurn(s: ConsultState): Turn {
  if (s.emergency) {
    return { step: "emergency", say: EMERGENCY_LINE, input: { kind: "emergency", flags: s.emergency.flags }, mood: "serious" };
  }
  if (s.concernText === undefined) {
    return {
      step: "concern",
      say: `Hello. I'm the virtual guide for ${s.department}. Tell me what is troubling you today.`,
      hint: "Type in your own words, for example: “fever and headache since yesterday”. I am not a doctor — I help you find the safest next step.",
      input: { kind: "text", placeholder: "What is troubling you?", optional: false, maxLength: MAX_TEXT },
      mood: "warm",
    };
  }
  const pending = s.pendingFlags[0];
  if (pending) {
    return {
      step: `confirm:${pending}`,
      say: `You mentioned something that can be serious. To be safe, is this happening now: ${getRedFlag(pending).label.toLowerCase()}?`,
      input: { kind: "single", options: YES_NO },
      mood: "focused",
    };
  }
  if (!s.checkDone) {
    return {
      step: "check",
      say: "Thank you. Before we go on, is any of these happening right now?",
      hint: "Tap anything that is happening now.",
      input: {
        kind: "single",
        options: [
          ...redFlags.filter((f) => f.inChecklist).map((f) => ({ id: f.id, label: f.label, tone: "danger" as const })),
          { id: "none", label: "None of these — continue" },
        ],
      },
      mood: "focused",
    };
  }
  if (!s.who) {
    return {
      step: "who",
      say: "Is this for you, or for someone else?",
      input: { kind: "single", options: [{ id: "self", label: "Myself" }, { id: "other", label: s.relation ? `Someone else (${s.relation})` : "Someone else" }] },
      mood: "attentive",
    };
  }
  if (!s.age) {
    return {
      step: "age",
      say: s.who === "self" ? "How old are you?" : "How old is the patient?",
      input: { kind: "single", options: AGE_GROUPS.map((g) => ({ id: g.id, label: g.label })) },
      mood: "attentive",
    };
  }
  if (asksSex(s.age) && !s.sex) {
    return {
      step: "sex",
      say: s.who === "self" ? "Are you female or male? This helps me ask the right questions." : "Is the patient female or male? This helps me ask the right questions.",
      input: { kind: "single", options: [{ id: "female", label: "Female" }, { id: "male", label: "Male" }, { id: "unspecified", label: "Prefer not to say" }] },
      mood: "attentive",
    };
  }
  if (asksSex(s.age) && !s.specialDone) {
    const options = SPECIALS.filter((x) => x.id === "immunocompromised" || canBePregnant(s.age, s.sex)).map((x) => ({ id: x.id, label: x.label, hint: x.hint || undefined }));
    return {
      step: "special",
      say: `Do any of these apply to ${patient(s)}?`,
      hint: "Tap all that apply.",
      input: { kind: "multi", options, doneLabel: "Continue", noneLabel: "None of these — continue" },
      mood: "attentive",
    };
  }
  if (!s.complaint) {
    const suggested = s.suggested.map(getComplaint).filter((c): c is NonNullable<typeof c> => !!c);
    const rest = complaints.filter((c) => !s.suggested.includes(c.id));
    return {
      step: "complaint",
      say: suggested.length
        ? `From what you told me, this sounds closest to: ${suggested[0].label.toLowerCase()}. Which of these fits best?`
        : "Which of these is closest to the main problem?",
      input: { kind: "single", options: [...suggested, ...rest].map((c) => ({ id: c.id, label: `${c.icon} ${c.label}` })) },
      mood: "attentive",
    };
  }
  const ctx = contextOf(s);
  const q = questionsFor(ctx).find((x) => !(x.id in s.answers));
  if (q) return { step: `q:${q.id}`, say: q.text, hint: q.help, input: { kind: "single", options: YES_NO }, mood: "attentive" };
  const c = choicesFor(ctx).find((x) => !(x.id in s.choices));
  if (c) return { step: `c:${c.id}`, say: c.text, input: { kind: "single", options: c.options }, mood: "attentive" };
  if (!s.duration) {
    return { step: "duration", say: "When did this begin?", input: { kind: "single", options: DURATIONS.map((d) => ({ id: d.id, label: d.label })) }, mood: "attentive" };
  }
  if (!s.progression) {
    return { step: "progression", say: "Has it become better, worse, or stayed the same?", input: { kind: "single", options: PROGRESSIONS.map((d) => ({ id: d.id, label: d.label })) }, mood: "attentive" };
  }
  if (!s.severity) {
    return { step: "severity", say: "How bad is it right now?", input: { kind: "single", options: SEVERITIES.map((d) => ({ id: d.id, label: `${d.label} — ${d.hint}` })) }, mood: "attentive" };
  }
  if (!s.medicinesDone) {
    return {
      step: "medicines",
      say: `${s.who === "other" ? "Is the patient" : "Are you"} taking any medicines at the moment? You can skip this.`,
      hint: "Write the names as they appear on the packet. This only goes into your summary for the doctor.",
      input: { kind: "text", placeholder: "For example: Metformin, Amlodipine", optional: true, maxLength: MAX_TEXT },
      mood: "attentive",
    };
  }
  if (!s.allergiesDone) {
    return {
      step: "allergies",
      say: "Any allergies to medicines or anything else? You can skip this.",
      input: { kind: "text", placeholder: "For example: penicillin", optional: true, maxLength: MAX_TEXT },
      mood: "attentive",
    };
  }
  // Every question answered. The triage engine decides; RED always means Emergency Mode.
  const result = triage(toAnswers(s));
  if (result.level === "RED") {
    return { step: "emergency", say: EMERGENCY_LINE, input: { kind: "emergency", flags: result.emergency }, mood: "serious" };
  }
  return {
    step: "result",
    say: "Thank you. Based on the information you provided, here is the safest next step.",
    input: { kind: "result" },
    mood: result.level === "ORANGE" ? "serious" : "focused",
  };
}

const clip = (t: string) => t.trim().slice(0, MAX_TEXT);

// Free text anywhere can raise an emergency.
function withTextFlags(s: ConsultState, text: string): ConsultState {
  const d = detectRedFlags(text);
  const confirmed = d.confirmed.filter((f) => !s.dismissedFlags.includes(f));
  if (confirmed.length) return { ...s, emergency: { flags: confirmed, clear: { kind: "text" } } };
  const pending = d.needsConfirmation.filter((f) => !s.dismissedFlags.includes(f) && !s.pendingFlags.includes(f));
  return pending.length ? { ...s, pendingFlags: [...s.pendingFlags, ...pending] } : s;
}

// Applies the person's answer to the current step. Unknown values are ignored.
export function respond(s: ConsultState, step: string, value: string | string[]): ConsultState {
  const v = Array.isArray(value) ? value : [value];
  const one = v[0] ?? "";

  if (step === "emergency") {
    // "This is not an emergency": go back to where the person was.
    const e = s.emergency;
    if (!e || one !== "exit") return s;
    if (e.clear.kind === "answer") {
      const answers = { ...s.answers };
      delete answers[e.clear.id];
      return { ...s, answers, emergency: null };
    }
    if (e.clear.kind === "check") return { ...s, checkDone: false, emergency: null };
    return { ...s, dismissedFlags: [...s.dismissedFlags, ...e.flags], emergency: null };
  }

  if (step === "concern") {
    const text = clip(one);
    if (!text) return s;
    const r = receive(text);
    let next: ConsultState = {
      ...s,
      concernText: text,
      relation: r.relation,
      special: [...new Set([...s.special, ...r.special])],
      suggested: r.complaintIds,
      duration: r.duration,
      answers: { ...r.prefill, ...s.answers },
      prefilled: Object.keys(r.prefill),
    };
    next = withTextFlags(next, text);
    return next;
  }

  if (step.startsWith("confirm:")) {
    const flag = step.slice(8) as RedFlagId;
    if (!s.pendingFlags.includes(flag) || !["yes", "no", "unsure"].includes(one)) return s;
    const pendingFlags = s.pendingFlags.filter((f) => f !== flag);
    if (one === "no") return { ...s, pendingFlags, dismissedFlags: [...s.dismissedFlags, flag] };
    return { ...s, pendingFlags, emergency: { flags: [flag], clear: { kind: "text" } } };
  }

  if (step === "check") {
    if (one === "none") return { ...s, checkDone: true };
    const f = redFlags.find((x) => x.id === one && x.inChecklist);
    return f ? { ...s, emergency: { flags: [f.id], clear: { kind: "check" } } } : s;
  }

  if (step === "who") return one === "self" || one === "other" ? { ...s, who: one } : s;

  if (step === "age") {
    if (!AGE_GROUPS.some((g) => g.id === one)) return s;
    const age = one as AgeGroup;
    return { ...s, age, special: canBePregnant(age, s.sex) ? s.special : s.special.filter((x) => x === "immunocompromised") };
  }

  if (step === "sex") {
    if (!["female", "male", "unspecified"].includes(one)) return s;
    const sex = one as Sex;
    return { ...s, sex, special: canBePregnant(s.age, sex) ? s.special : s.special.filter((x) => x === "immunocompromised") };
  }

  if (step === "special") {
    const allowed = SPECIALS.filter((x) => x.id === "immunocompromised" || canBePregnant(s.age, s.sex)).map((x) => x.id);
    const chosen = v.filter((x): x is Special => (allowed as string[]).includes(x));
    return { ...s, special: chosen, specialDone: true };
  }

  if (step === "complaint") {
    if (!getComplaint(one)) return s;
    const special = one === "pregnancy" && !s.special.includes("pregnant") ? [...s.special, "pregnant" as const] : s.special;
    // Pre-filled answers only apply to the complaint they were made for.
    const keep = one === s.suggested[0];
    const answers = keep ? s.answers : Object.fromEntries(Object.entries(s.answers).filter(([k]) => !s.prefilled.includes(k)));
    return { ...s, complaint: one, special, answers, prefilled: keep ? s.prefilled : [] };
  }

  if (step.startsWith("q:")) {
    const id = step.slice(2);
    const q = questionsFor(contextOf(s)).find((x) => x.id === id);
    if (!q || !["yes", "no", "unsure"].includes(one)) return s;
    const a = one as Answer;
    const next = { ...s, answers: { ...s.answers, [id]: a } };
    const flag = emergencyFrom(q, a);
    return flag ? { ...next, emergency: { flags: [flag], clear: { kind: "answer", id } } } : next;
  }

  if (step.startsWith("c:")) {
    const id = step.slice(2);
    const c = choicesFor(contextOf(s)).find((x) => x.id === id);
    return c && c.options.some((o) => o.id === one) ? { ...s, choices: { ...s.choices, [id]: one } } : s;
  }

  if (step === "duration") return DURATIONS.some((d) => d.id === one) ? { ...s, duration: one as Answers["duration"] } : s;
  if (step === "progression") return PROGRESSIONS.some((d) => d.id === one) ? { ...s, progression: one as Answers["progression"] } : s;
  if (step === "severity") return SEVERITIES.some((d) => d.id === one) ? { ...s, severity: one as Answers["severity"] } : s;

  if (step === "medicines" || step === "allergies") {
    const text = clip(one);
    const next = step === "medicines" ? { ...s, medicines: text || undefined, medicinesDone: true } : { ...s, allergies: text || undefined, allergiesDone: true };
    return text ? withTextFlags(next, text) : next;
  }

  return s;
}

export type PanelItem = { label: string; value: string };

// What the person has told the guide so far — nothing guessed, no diagnosis.
export function panelItems(s: ConsultState): PanelItem[] {
  const items: PanelItem[] = [];
  const add = (label: string, value?: string) => {
    if (value && value.trim()) items.push({ label, value: value.trim() });
  };
  add("Main concern", s.concernText);
  if (s.complaint) add("Closest problem (your choice)", getComplaint(s.complaint)?.label);
  if (s.who) add("For", s.who === "self" ? "Myself" : `Someone else${s.relation ? ` (${s.relation})` : ""}`);
  add("Age group", AGE_GROUPS.find((g) => g.id === s.age)?.label);
  if (s.special.length && s.specialDone) add("Also applies", s.special.map((x) => SPECIALS.find((y) => y.id === x)?.label).join(", "));
  add("Started", DURATIONS.find((d) => d.id === s.duration)?.label);
  add("Change", PROGRESSIONS.find((d) => d.id === s.progression)?.label);
  add("How bad", SEVERITIES.find((d) => d.id === s.severity)?.label);
  if (s.complaint) {
    const qs = questionsFor(contextOf(s));
    const said = (a: Answer) => qs.filter((q) => s.answers[q.id] === a && !s.prefilled.includes(q.id));
    add("Important symptoms you reported", said("yes").map((q) => q.positive).join("; "));
    add("You said these are not present", said("no").map((q) => q.negative).join("; "));
    add("You were not sure about", said("unsure").map((q) => q.positive).join("; "));
    for (const c of choicesFor(contextOf(s))) {
      add(c.summaryLabel, c.options.find((o) => o.id === s.choices[c.id])?.label);
    }
  }
  add("Current medicines", s.medicines);
  add("Known allergies", s.allergies);
  return items;
}

// Every fixed line the guide can say, for the language-policy test.
export const FIXED_LINES = [EMERGENCY_LINE, "Thank you. Based on the information you provided, here is the safest next step."];
