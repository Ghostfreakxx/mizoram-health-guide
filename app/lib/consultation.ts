// Virtual consultation: a guided conversation on top of the deterministic
// triage engine. This module decides only WHAT TO ASK NEXT and how the
// virtual guide phrases it. It never decides urgency: every answer goes into
// the same `Answers` object the Triage Desk uses, and `triage()` alone gives
// the result.
//
// Safety rules (enforced by tests):
// - Every answer is checked for red flags BEFORE the next question. Red flags
//   in free text, the danger-sign check, any answer, or a RED result switch
//   to Emergency Mode at once, and later answers cannot undo it.
// - Every line the guide says passes the language policy (no diagnosis, no
//   doses, never "you don't need a doctor").
// - The chart shows only what the person supplied, plus clearly separated
//   routing information from the engine. Missing items say "Not provided".

import { getDepartment } from "../ai-hospital/data/departments";
import { LEVEL_TEXT } from "./safety/language";
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
  type Level,
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
  | { kind: "single"; options: Option[]; optional?: boolean }
  | { kind: "multi"; options: (Option & { hint?: string })[]; doneLabel: string; noneLabel: string }
  | { kind: "body"; options: Option[] }
  | { kind: "result"; level: Level }
  | { kind: "emergency"; flags: RedFlagId[] };

export type Turn = {
  step: string;
  say: string;
  hint?: string;
  input: Input;
  mood: Mood;
  // Said after `say` at the end of a consultation (the handoff line).
  then?: string;
};

export type EmergencyState = { flags: RedFlagId[]; clear: { kind: "answer"; id: string } | { kind: "check" } | { kind: "text" } };

export type ConsultState = {
  department: string; // display name, e.g. "General Medicine"
  intro: string;
  focus: string[]; // complaint ids this department shows first
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
  bodyArea?: string;
  bodyDone: boolean;
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
  conditions?: string;
  conditionsDone: boolean;
  emergency: EmergencyState | null;
  remembered: string[]; // fields taken from the patient's own words ("who", "age", "sex")
};

export const MAX_TEXT = 300;

export const EMERGENCY_LINE = "These symptoms may need emergency medical attention. Please seek emergency care now.";
export const HANDOFF_LINE =
  "I've prepared a summary of what you told me. You can take this with you when you speak with a healthcare professional.";
export const UNCLEAR_LINE = "Sorry, I didn't quite catch that. Could you choose one of the answers below, or say it another way?";

export function defaultIntro(department: string) {
  return `Hello. I'm your virtual health guide for this ${department} consultation. I'll ask a few questions to help determine what kind of care may be appropriate. If anything you tell me suggests an emergency, I'll tell you immediately. What brought you here today?`;
}

export function startConsultation(department: string, intro = defaultIntro(department), focus: string[] = []): ConsultState {
  return {
    department,
    intro,
    focus,
    pendingFlags: [],
    dismissedFlags: [],
    checkDone: false,
    special: [],
    specialDone: false,
    suggested: [],
    bodyDone: false,
    answers: {},
    prefilled: [],
    choices: {},
    medicinesDone: false,
    allergiesDone: false,
    conditionsDone: false,
    emergency: null,
    remembered: [],
  };
}

// Where the problem is. Structured input for the summary only — it never
// changes urgency and is never presented as a diagnosis.
export const BODY_AREAS: Option[] = [
  { id: "head", label: "Head" },
  { id: "face", label: "Face, eyes, ears or mouth" },
  { id: "neck", label: "Neck or throat" },
  { id: "chest", label: "Chest" },
  { id: "upper-abdomen", label: "Upper tummy" },
  { id: "lower-abdomen", label: "Lower tummy" },
  { id: "back", label: "Back" },
  { id: "arms", label: "Arms or hands" },
  { id: "legs", label: "Legs or feet" },
  { id: "pelvis", label: "Private parts" },
  { id: "all-over", label: "All over, or many places" },
];
const ASKS_BODY = new Set(["stomach", "bones", "skin", "injury", "cancer", "other"]);

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

const YES_NO: Option[] = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "unsure", label: "Not sure" },
];

const isOther = (s: ConsultState) => s.who === "other";

// The next thing the virtual guide says, and what kind of answer it needs.
export function nextTurn(s: ConsultState): Turn {
  if (s.emergency) {
    return { step: "emergency", say: EMERGENCY_LINE, input: { kind: "emergency", flags: s.emergency.flags }, mood: "serious" };
  }
  if (s.concernText === undefined) {
    return {
      step: "concern",
      say: s.intro,
      hint: "Type in your own words — for example, “I've been coughing for three weeks”. I am not a doctor; I help you find the safest next step.",
      input: { kind: "text", placeholder: "What brings you here today?", optional: false, maxLength: MAX_TEXT },
      mood: "warm",
    };
  }
  const pending = s.pendingFlags[0];
  if (pending) {
    return {
      step: `confirm:${pending}`,
      say: `You mentioned something that can be serious. To be safe — is this happening now: ${getRedFlag(pending).label.toLowerCase()}?`,
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
      say: isOther(s) ? "How old is the patient?" : "How old are you?",
      input: { kind: "single", options: AGE_GROUPS.map((g) => ({ id: g.id, label: g.label })) },
      mood: "attentive",
    };
  }
  if (asksSex(s.age) && !s.sex) {
    return {
      step: "sex",
      say: isOther(s) ? "Is the patient female or male? It helps me ask the right questions." : "Are you female or male? It helps me ask the right questions.",
      input: { kind: "single", options: [{ id: "female", label: "Female" }, { id: "male", label: "Male" }, { id: "unspecified", label: "Prefer not to say" }] },
      mood: "attentive",
    };
  }
  if (asksSex(s.age) && !s.specialDone) {
    const options = SPECIALS.filter((x) => x.id === "immunocompromised" || canBePregnant(s.age, s.sex)).map((x) => ({ id: x.id, label: x.label, hint: x.hint || undefined }));
    return {
      step: "special",
      say: `Do any of these apply to ${isOther(s) ? "the patient" : "you"}?`,
      hint: "Tap all that apply.",
      input: { kind: "multi", options, doneLabel: "Continue", noneLabel: "None of these — continue" },
      mood: "attentive",
    };
  }
  if (!s.complaint) {
    const suggested = s.suggested.map(getComplaint).filter((c): c is NonNullable<typeof c> => !!c);
    const focused = s.focus.filter((id) => !s.suggested.includes(id)).map(getComplaint).filter((c): c is NonNullable<typeof c> => !!c);
    const shown = new Set([...suggested, ...focused].map((c) => c.id));
    const rest = complaints.filter((c) => !shown.has(c.id));
    return {
      step: "complaint",
      say: suggested.length
        ? `From what you told me, this sounds closest to: ${suggested[0].label.toLowerCase()}. Which of these fits best?`
        : "Which of these is closest to the main problem?",
      input: { kind: "single", options: [...suggested, ...focused, ...rest].map((c) => ({ id: c.id, label: `${c.icon} ${c.label}` })) },
      mood: "attentive",
    };
  }
  if (ASKS_BODY.has(s.complaint) && !s.bodyDone) {
    return {
      step: "body",
      say: "Where are you experiencing the problem?",
      hint: "Tap the area on the body, or choose from the list. You can skip this.",
      input: { kind: "body", options: BODY_AREAS },
      mood: "attentive",
    };
  }
  // Asked early, because later questions depend on how long it has been.
  if (!s.duration) {
    return { step: "duration", say: "When did this begin?", input: { kind: "single", options: DURATIONS.map((d) => ({ id: d.id, label: d.label })) }, mood: "attentive" };
  }
  const ctx = contextOf(s);
  const q = questionsFor(ctx).find((x) => !(x.id in s.answers));
  if (q) return { step: `q:${q.id}`, say: q.text, hint: q.help, input: { kind: "single", options: YES_NO }, mood: "attentive" };
  const c = choicesFor(ctx).find((x) => !(x.id in s.choices));
  if (c) return { step: `c:${c.id}`, say: c.text, input: { kind: "single", options: c.options }, mood: "attentive" };
  if (!s.progression) {
    return { step: "progression", say: "Has it become better, worse, or stayed the same?", input: { kind: "single", options: PROGRESSIONS.map((d) => ({ id: d.id, label: d.label })) }, mood: "attentive" };
  }
  if (!s.severity) {
    return { step: "severity", say: "How bad is it right now?", input: { kind: "single", options: SEVERITIES.map((d) => ({ id: d.id, label: `${d.label} — ${d.hint}` })) }, mood: "attentive" };
  }
  if (!s.medicinesDone) {
    return {
      step: "medicines",
      say: `${isOther(s) ? "Is the patient" : "Are you"} taking any medicines at the moment? You can skip this.`,
      hint: "Write the names as they appear on the packet. This only goes into the summary for the doctor.",
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
  if (!s.conditionsDone) {
    return {
      step: "conditions",
      say: `${isOther(s) ? "Does the patient" : "Do you"} have any long-term health conditions, such as diabetes or high blood pressure? You can skip this.`,
      input: { kind: "text", placeholder: "For example: diabetes, asthma", optional: true, maxLength: MAX_TEXT },
      mood: "attentive",
    };
  }
  // Every question answered. The triage engine decides; RED always means Emergency Mode.
  const result = triage(toAnswers(s));
  if (result.level === "RED") {
    return { step: "emergency", say: EMERGENCY_LINE, input: { kind: "emergency", flags: result.emergency }, mood: "serious" };
  }
  const text = LEVEL_TEXT[result.level];
  return {
    step: "result",
    say: result.now && text.nowMessage ? text.nowMessage : text.message,
    then: HANDOFF_LINE,
    input: { kind: "result", level: result.level },
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

// Applies the person's answer to the current step. Unknown values are ignored
// (the same state object is returned).
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
  // While in an emergency, nothing else can change the outcome.
  if (s.emergency) return s;

  if (step === "concern") {
    const text = clip(one);
    if (!text) return s;
    const r = receive(text);
    const mem = rememberFromWords(text, r.who, r.relation, r.ageHint);
    const next: ConsultState = {
      ...s,
      ...mem.fields,
      remembered: mem.remembered,
      concernText: text,
      relation: r.relation,
      special: [...new Set([...s.special, ...r.special])],
      suggested: r.complaintIds,
      duration: r.duration,
      answers: { ...r.prefill, ...s.answers },
      prefilled: Object.keys(r.prefill),
    };
    return withTextFlags(next, text);
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

  if (step === "body") {
    if (one === "skip") return { ...s, bodyDone: true, bodyArea: undefined };
    return BODY_AREAS.some((b) => b.id === one) ? { ...s, bodyDone: true, bodyArea: one } : s;
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

  if (step === "medicines" || step === "allergies" || step === "conditions") {
    const text = clip(one) || undefined;
    const next =
      step === "medicines"
        ? { ...s, medicines: text, medicinesDone: true }
        : step === "allergies"
          ? { ...s, allergies: text, allergiesDone: true }
          : { ...s, conditions: text, conditionsDone: true };
    return text ? withTextFlags(next, text) : next;
  }

  return s;
}

// ---------------- Remembering what the patient said ----------------

const FEMALE = /\b(mother|mom|mum|mummy|daughter|wife|sister|grandmother|grandma|granny|aunt|niece|she|her|girl|woman|lady)\b/;
const MALE = /\b(father|dad|daddy|papa|son|husband|brother|grandfather|grandpa|uncle|nephew|he|him|boy|man)\b/;

export function ageGroupFromYears(years: number): AgeGroup {
  const months = years * 12;
  if (months < 2) return "young-infant";
  if (months < 60) return "child-under-5";
  if (years < 18) return "child";
  if (years < 60) return "adult";
  return "older";
}

// Only clear, explicit facts are remembered; anything uncertain is still asked.
export function rememberFromWords(text: string, who?: "self" | "other", relation?: string, ageHint?: AgeGroup) {
  const t = text.toLowerCase();
  const fields: Partial<ConsultState> = {};
  const remembered: string[] = [];
  if (who) {
    fields.who = who;
    remembered.push("who");
  }
  const self = t.match(/\b(?:i am|i'm|im|aged?)\s+(\d{1,3})\b(?!\s*(?:days?|weeks?|months?|kg|cm))/);
  if (self && who !== "other") {
    fields.age = ageGroupFromYears(parseInt(self[1], 10));
    remembered.push("age");
  } else if (ageHint) {
    fields.age = ageHint;
    remembered.push("age");
  }
  if (who === "other" && relation) {
    if (FEMALE.test(relation)) fields.sex = "female";
    else if (MALE.test(relation)) fields.sex = "male";
    if (fields.sex) remembered.push("sex");
  }
  return { fields, remembered };
}

// ---------------- Understanding typed or spoken answers ----------------

const YES = /^(yes|yeah|yep|yup|haan|ha|aw|correct|right|i do|i have|i am|it is|it does|there is|sure|ok yes)\b/;
const NO = /^(no|nope|nah|not really|never|none|nothing|i don'?t|i do not|i haven'?t|i have not|it isn'?t|it is not|there isn'?t|not at all)\b/;
const UNSURE = /\b(not sure|unsure|don'?t know|do not know|maybe|perhaps|i think so|possibly|no idea|can'?t say)\b/;

const clean = (t: string) => t.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

const NEGATION = /\b(no|not|never|none|nothing|nope|nah)\b|n't\b/;

function yesNo(t: string): string | null {
  if (UNSURE.test(t)) return "unsure";
  if (NO.test(t)) return "no";
  if (YES.test(t) && NEGATION.test(t)) return /^(yes|yeah|yep|yup|haan|ha|aw|sure)\b/.test(t) ? null : "no"; // "yes but not much" → ask; "I have no fever" → no
  if (YES.test(t)) return "yes";
  if (NEGATION.test(t)) return "no"; // "I have no fever"
  return null;
}

// Maps free text to one of the current question's answers, or null if it
// cannot be understood confidently. Never guesses.
export function interpretText(turn: Turn, text: string): string | string[] | null {
  const t = clean(text);
  if (!t) return null;
  const inp = turn.input;
  if (inp.kind === "text") return text;
  const step = turn.step;
  if (step.startsWith("q:") || step.startsWith("confirm:")) return yesNo(t);
  if (step === "check") return NO.test(t) || /\b(none|nothing|no)\b/.test(t) ? "none" : null;
  if (step === "who") {
    if (/\b(me|myself|i am|i'm|for me|self|mine)\b/.test(t) && !FEMALE.test(t) && !MALE.test(t)) return "self";
    if (/\b(someone|somebody|other|my \w+|for my|for him|for her)\b/.test(t) || FEMALE.test(t) || MALE.test(t)) return "other";
    return null;
  }
  if (step === "age") {
    const n = t.match(/\b(\d{1,3})\s*(days?|weeks?|months?|years?|yrs?)?\b/);
    if (n) {
      const v = parseInt(n[1], 10);
      const unit = n[2] ?? "years";
      const years = unit.startsWith("day") ? v / 365 : unit.startsWith("week") ? v / 52 : unit.startsWith("month") ? v / 12 : v;
      return ageGroupFromYears(years);
    }
    if (/\b(newborn|new born)\b/.test(t)) return "young-infant";
    return null;
  }
  if (step === "sex") {
    if (/\b(prefer not|rather not|don'?t want)\b/.test(t)) return "unspecified";
    if (/\b(female|woman|girl|lady|f)\b/.test(t)) return "female";
    if (/\b(male|man|boy|m)\b/.test(t)) return "male";
    return null;
  }
  if (step === "special") {
    if (NO.test(t) || /\b(none|nothing)\b/.test(t)) return [];
    const out: string[] = [];
    if (/\bpregnan/.test(t)) out.push("pregnant");
    if (/\b(gave birth|delivered|just had a baby|after delivery)\b/.test(t)) out.push("postpartum");
    if (/\b(immune|hiv|chemo|cancer treatment|steroid|transplant)\b/.test(t)) out.push("immunocompromised");
    return out.length ? out : null;
  }
  if (step === "complaint") {
    const ids = receive(text).complaintIds;
    return ids[0] ?? null;
  }
  if (step === "duration") {
    if (/\b(today|this morning|tonight|few hours|hours)\b/.test(t)) return "today";
    if (/\b(yesterday|last night)\b/.test(t)) return "1-3-days";
    const d = receive(`for ${text}`).duration ?? receive(text).duration;
    return d ?? null;
  }
  if (step === "progression") {
    if (/\b(better|improv\w*|less)\b/.test(t)) return "better";
    if (/\b(worse|worsen\w*|more|increas\w*)\b/.test(t)) return "worse";
    if (/\b(same|no change|unchanged|similar|not changed)\b/.test(t)) return "same";
    return null;
  }
  if (step === "severity") {
    if (/\b(severe|very bad|terrible|unbearable|can'?t do anything|cannot do anything|worst)\b/.test(t)) return "severe";
    if (/\b(moderate|quite bad|fairly bad|hard to)\b/.test(t)) return "moderate";
    if (/\b(mild|slight|a little|not bad|manageable|okay|ok)\b/.test(t)) return "mild";
    return null;
  }
  if (inp.kind === "single" || inp.kind === "body") {
    if (inp.kind === "body" && /\b(skip|not sure|don'?t know)\b/.test(t)) return "skip";
    const hits = inp.options.filter((o) => {
      const label = clean(o.label.replace(/^[^a-z0-9]+/i, ""));
      return label && (t === label || t.includes(label) || label.split(" ").filter((w) => w.length > 3).some((w) => t.includes(w)));
    });
    return hits.length === 1 ? hits[0].id : null;
  }
  return null;
}

export type TextResult = { state: ConsultState; understood: boolean };

// A typed or spoken answer. The safety check ALWAYS runs first: red flags in
// the words open Emergency Mode even if the words also answer the question.
export function respondText(s: ConsultState, turn: Turn, text: string): TextResult {
  if (s.emergency) return { state: s, understood: true };
  const words = clip(text);
  if (!words) return { state: s, understood: false };
  if (turn.step === "concern") return { state: respond(s, "concern", words), understood: true };
  const flagged = withTextFlags(s, words);
  if (flagged.emergency) return { state: flagged, understood: true };
  const value = interpretText(turn, words);
  if (value === null) return { state: flagged, understood: flagged !== s };
  const next = respond(flagged, turn.step, value);
  return { state: next, understood: next !== flagged };
}

// ---------------- The live patient chart ----------------

export const NOT_PROVIDED = "Not provided";

export type ChartRow = { label: string; value: string; provided: boolean };
export type Chart = {
  reported: ChartRow[]; // REPORTED BY PATIENT
  safety: ChartRow[]; // answers to safety (danger-sign) questions
  routing: ChartRow[] | null; // SYSTEM ROUTING INFORMATION (only once known)
};

const label = <T extends { id: string; label: string }>(list: readonly T[], id?: string) => list.find((x) => x.id === id)?.label;

export function chartOf(s: ConsultState): Chart {
  const row = (l: string, v?: string): ChartRow => (v && v.trim() ? { label: l, value: v.trim(), provided: true } : { label: l, value: NOT_PROVIDED, provided: false });
  const ctx = contextOf(s);
  const qs = s.complaint ? questionsFor(ctx) : [];
  const said = (a: Answer, emergencyOnly: boolean) =>
    qs.filter((q) => s.answers[q.id] === a && !s.prefilled.includes(q.id) && ("emergency" in q.yes) === emergencyOnly);
  // Answers taken from the patient's own opening words (only ever "yes").
  const fromWords = qs.filter((q) => s.prefilled.includes(q.id) && s.answers[q.id] === "yes").map((q) => `${q.positive} (from what you said)`);

  const reported: ChartRow[] = [
    row("Main concern", s.concernText),
    row("Closest problem (chosen)", s.complaint ? getComplaint(s.complaint)?.label : undefined),
    row("For", s.who ? (s.who === "self" ? "Self" : `Someone else${s.relation ? ` (${s.relation})` : ""}`) : undefined),
    row("Age group", label(AGE_GROUPS, s.age) && `${label(AGE_GROUPS, s.age)}${s.remembered.includes("age") ? " (from what you said)" : ""}`),
  ];
  if (s.specialDone && canBePregnant(s.age, s.sex)) {
    reported.push(
      row(
        "Pregnancy status",
        s.special.includes("pregnant") ? "Pregnant" : s.special.includes("postpartum") ? "Gave birth in the last 6 weeks" : "Not pregnant (as reported)",
      ),
    );
  }
  if (s.complaint && ASKS_BODY.has(s.complaint)) reported.push(row("Where", label(BODY_AREAS, s.bodyArea)));
  reported.push(
    row("Duration", label(DURATIONS, s.duration)),
    row("Change", label(PROGRESSIONS, s.progression)),
    row("How bad", label(SEVERITIES, s.severity)),
    row("Symptoms reported", [...fromWords, ...said("yes", false).map((q) => q.positive)].join("; ")),
    row("Relevant negatives", said("no", false).map((q) => q.negative).join("; ")),
  );
  const unsure = qs.filter((q) => s.answers[q.id] === "unsure" && !s.prefilled.includes(q.id));
  if (unsure.length) reported.push(row("Not sure about", unsure.map((q) => q.positive).join("; ")));
  for (const c of s.complaint ? choicesFor(ctx) : []) {
    const v = label(c.options, s.choices[c.id]);
    if (v) reported.push(row(c.summaryLabel, v));
  }
  reported.push(
    row("Current medicines", s.medicines),
    row("Known allergies", s.allergies),
    row("Existing conditions", [s.conditions, s.special.includes("immunocompromised") ? "Weak immune system" : ""].filter(Boolean).join("; ")),
  );

  const safety: ChartRow[] = [row("Danger signs at the start", s.checkDone ? "None reported" : undefined)];
  for (const q of said("no", true)) safety.push(row(q.negative, "No"));
  for (const q of said("unsure", true)) safety.push(row(q.positive, "Not sure"));

  let routing: ChartRow[] | null = null;
  const t = nextTurn(s);
  if (t.input.kind === "result" || t.input.kind === "emergency") {
    const r = triage(toAnswers(s));
    const level = t.input.kind === "emergency" ? "RED" : r.level;
    routing = [
      row("Navigation urgency", LEVEL_TEXT[level].label),
      row(
        "Suggested service",
        level === "RED"
          ? "Emergency care (108 / 112)"
          : r.departments.map((d) => getDepartment(d)?.plainName ?? d).join(", "),
      ),
    ];
  }
  return { reported, safety, routing };
}

// Flat list of everything the person has supplied (no routing information).
export type PanelItem = { label: string; value: string };
export function panelItems(s: ConsultState): PanelItem[] {
  const c = chartOf(s);
  return [...c.reported, ...c.safety].filter((r) => r.provided).map(({ label: l, value }) => ({ label: l, value }));
}

// Fixed lines the guide can say, for the language-policy test.
export const FIXED_LINES = [EMERGENCY_LINE, HANDOFF_LINE, ...Object.values(LEVEL_TEXT).flatMap((t) => [t.message, t.nowMessage ?? ""])];
