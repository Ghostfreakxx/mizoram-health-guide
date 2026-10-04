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
import { DESCRIBE_OPTIONS, type Uncertain, feelingWord, isVagueConcern, metaIntent, normalizeWords, plainMeanings, plainTerms, soundsDistressed, uncertainty } from "./consultHelp";
import { type EducationAnswer, findEducation, isGeneralQuestion, isQuestion } from "./education";
import { askedTerm } from "./knowledge/glossary";
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
  // The question on its own, without acknowledgements or memory lines (for
  // Repeat, the chart and tests).
  question?: string;
  // Valid "I'm not sure" style answers the patient can give at this step.
  unsure?: boolean;
  // An extra way to answer: a 0–10 pain scale, or a measured temperature.
  entry?: "pain" | "temperature";
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
  remembered: string[]; // fields taken from the patient's own words ("who", "age", "sex", "duration")
  concernMore: boolean; // asked to say more after a vague first answer
  description?: string; // how it feels, in the patient's words
  describeDone: boolean;
  bodyWords?: string; // where, in the patient's words, when not on the map
  unknown: Record<string, Uncertain>; // valid "not sure / forgot" answers
  painScore?: number; // 0–10, patient-rated
  temperature?: string; // as measured by the patient
  skipped: string[]; // optional questions left out to keep it short
  notes: string[]; // things the doctor will mention once ("You mentioned…")
  style: { explained: number; short: number; distressed: boolean };
  turns: number;
  mentioned: string[]; // memory lines already said ("duration")
  // Where, structured: region and side are separate, and side is only stored
  // once the patient has confirmed it.
  bodySide?: Side;
  sideHint?: "left" | "right"; // "on the right" — not yet confirmed
  whereFirst: boolean; // "it hurts here": ask where before anything else
  helpDescribe: boolean; // "Help me describe it" mode
  simplePain?: Answer; // "Let's make it easier. Are you having pain?"
  pattern?: "constant" | "comes-and-goes";
  modifiers?: string; // what makes it better or worse, in their words
  modifiersDone: boolean;
  unclear: { step: string; count: number }; // consecutive misunderstandings
  corrections: string[]; // what the patient corrected (for the summary)
  said: string[]; // everything the patient typed or said, in order (this visit only)
  explainedTerms: string[]; // words already explained (not offered again)
};

export type Side = "left" | "right" | "both" | "middle";
export const SIDES: Option[] = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "both", label: "Both sides" },
  { id: "middle", label: "Middle" },
];
// Regions where the side matters.
const LATERAL = new Set(["head", "chest", "upper-abdomen", "lower-abdomen", "back", "arms", "legs"]);
// One clear problem group for a body region (others are offered as a list).
const REGION_COMPLAINT: Record<string, string> = {
  head: "headache",
  neck: "ent",
  chest: "heart",
  "upper-abdomen": "stomach",
  "lower-abdomen": "stomach",
  back: "bones",
  arms: "bones",
  legs: "bones",
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
    concernMore: false,
    describeDone: false,
    unknown: {},
    skipped: [],
    notes: [],
    style: { explained: 0, short: 0, distressed: false },
    turns: 0,
    mentioned: [],
    whereFirst: false,
    helpDescribe: false,
    modifiersDone: false,
    unclear: { step: "", count: 0 },
    corrections: [],
    said: [],
    explainedTerms: [],
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

// Complaints where "Where exactly?" is useful, and where how it feels matters.
const PAINFUL = new Set(["stomach", "headache", "bones", "injury", "heart", "mouth", "ent", "eye", "urine"]);
const DESCRIBES = new Set(["heart", "stomach", "headache", "other"]);
const REGION: Record<string, string> = { heart: "chest", stomach: "stomach", headache: "head" };
const VAGUE_FEELING = /\b(strange|weird|funny|odd|not right|uncomfortable|off|different|heavy feeling|something wrong|doing something|something (is )?(happening|going on)|acting up)\b/i;
const QUALITY = /\b(pain|pains|painful|hurt\w*|ache\w*|pressure|tight\w*|burn\w*|heavy|sharp|dull|stabbing|squeez\w*|crushing|cramp\w*)\b/i;

export const DURATION_WORDS: Record<string, string> = {
  today: "today",
  "1-3-days": "one to three days ago",
  "4-14-days": "between four days and two weeks ago",
  "over-2-weeks": "more than two weeks ago",
};

const ACKS = ["Okay.", "Thank you.", "I see.", "Alright.", "Thanks."];

const NOUN: Record<string, string> = { cough: "the cough", fever: "the fever", heart: "the chest discomfort", stomach: "the stomach problem", headache: "the headache", bones: "the pain", skin: "the skin problem", eye: "the eye problem", urine: "the urine problem" };

// Showing that the doctor remembers — once, and only where it helps: when a
// question is skipped because the patient already answered it in their words.
function memoryLine(s: ConsultState, step: string): { key: string; line: string } | null {
  if (
    s.remembered.includes("duration") &&
    s.duration &&
    s.complaint &&
    !s.mentioned.includes("duration") &&
    !["concern", "concern-more", "check", "complaint", "describe", "body"].includes(step) &&
    !step.startsWith("confirm:")
  ) {
    return { key: "duration", line: `You mentioned that ${NOUN[s.complaint] ?? "this"} started ${DURATION_WORDS[s.duration]}.` };
  }
  return null;
}

// Turn text = [memory line] [short acknowledgement] question [plain meaning].
function compose(s: ConsultState, t: Turn, opts: { ack?: boolean; simple?: string } = {}): Turn {
  const parts: string[] = [];
  const note = s.notes[0] ?? memoryLine(s, t.step)?.line;
  if (note) parts.push(note);
  else if (opts.ack && s.turns > 0 && s.turns % 2 === 1) parts.push(ACKS[Math.floor(s.turns / 2) % ACKS.length]);
  parts.push(t.say);
  // After the patient needed an explanation, keep using plain words.
  if (opts.simple && s.style.explained > 0) {
    const m = plainTerms(opts.simple)[0];
    if (m) parts.push(`By “${m.term}”, I mean ${m.meaning}.`);
  }
  // Short answers → short questions: drop the extra hint line.
  const brief = s.style.short >= 2;
  return { ...t, question: t.say, say: parts.join(" "), hint: brief ? undefined : t.hint };
}

const you = (s: ConsultState, a: string, b: string) => (isOther(s) ? b : a);

const SIDE_WORD: Record<string, string> = { left: "left", right: "right", both: "both sides", middle: "middle" };

// Where in the body. With "on the right" (not yet a body part), the options
// are right-side areas; the side is stored only once the patient picks one.
function bodyTurn(s: ConsultState): Turn {
  const side = s.sideHint;
  if (side) {
    const S = side === "right" ? "Right" : "Left";
    return compose(s, {
      step: "body",
      say: `When you say “on the ${side}”, which part of your body do you mean?`,
      input: {
        kind: "body",
        options: [
          { id: `chest|${side}`, label: `${S} side of chest` },
          { id: `upper-abdomen|${side}`, label: `${S} upper stomach` },
          { id: `lower-abdomen|${side}`, label: `${S} lower stomach` },
          { id: `back|${side}`, label: `${S} side of back` },
          { id: `arms|${side}`, label: `${S} arm` },
          { id: `legs|${side}`, label: `${S} leg` },
          { id: `head|${side}`, label: `${S} side of head` },
          { id: "other-place", label: "Somewhere else" },
        ],
      },
      mood: "attentive",
      unsure: true,
    });
  }
  const say = s.helpDescribe
    ? "That's okay. I'll help you describe it. First, where in your body do you notice the problem?"
    : s.whereFirst
      ? "I'm not completely sure what you mean yet. Where do you feel it? You can show me on the picture."
      : PAINFUL.has(s.complaint ?? "")
        ? "Where exactly does it hurt?"
        : "Where on the body is the problem?";
  return compose(s, {
    step: "body",
    say,
    hint: "Tap the area on the body (front or back), or say it in words.",
    input: { kind: "body", options: BODY_AREAS },
    mood: "attentive",
    unsure: true,
  }, { ack: !s.helpDescribe && !s.whereFirst });
}

function sideTurn(s: ConsultState): Turn {
  const area = label(BODY_AREAS, s.bodyArea)?.toLowerCase() ?? "there";
  return compose(s, {
    step: "side",
    say: s.bodyArea === "upper-abdomen" || s.bodyArea === "lower-abdomen" ? "Thank you. Which area — the left, the right, the middle, or both sides?" : `Thank you. Which side of the ${area.replace(/ or .*/, "")}?`,
    input: { kind: "single", options: SIDES },
    mood: "attentive",
    unsure: true,
  });
}

// What it feels like — options that fit the part of the body.
const FEELINGS: Record<string, Option[]> = {
  chest: [
    { id: "words:pressure", label: "Pressure" },
    { id: "words:sharp pain", label: "Sharp pain" },
    { id: "words:burning", label: "Burning" },
    { id: "words:tightness", label: "Tightness" },
    { id: "words:other", label: "Other / describe it" },
  ],
  head: [
    { id: "words:pain", label: "Pain" },
    { id: "words:dizziness", label: "Dizziness" },
    { id: "words:weakness", label: "Weakness" },
    { id: "words:vision trouble", label: "Vision trouble" },
    { id: "words:other", label: "Something else" },
  ],
  stomach: [
    { id: "words:pain", label: "Pain or cramps" },
    { id: "words:burning", label: "Burning" },
    { id: "words:feeling sick", label: "Feeling sick" },
    { id: "words:bloated", label: "Bloated or full" },
    { id: "words:other", label: "Something else" },
  ],
  default: DESCRIBE_OPTIONS.filter((o) => o.id !== "unsure").map((o) => ({ id: `words:${o.id}`, label: o.label })),
};
const regionOf = (s: ConsultState) =>
  s.bodyArea === "chest" || s.complaint === "heart" ? "chest" : s.bodyArea === "head" || s.complaint === "headache" ? "head" : s.bodyArea?.endsWith("abdomen") || s.complaint === "stomach" ? "stomach" : "default";

function describeTurn(s: ConsultState): Turn {
  const region = regionOf(s);
  const say =
    region === "head" && !s.helpDescribe && !s.bodyDone
      ? "Can you tell me a little more? Is it mainly pain, dizziness, weakness, vision trouble, or something else?"
      : s.helpDescribe || s.whereFirst
        ? "Thank you. What does it feel like?"
        : "Can you describe what it feels like?";
  return compose(s, {
    step: "describe",
    say,
    hint: "In your own words, or tap the closest one.",
    input: { kind: "single", options: FEELINGS[region] },
    mood: "attentive",
    unsure: true,
  });
}

// The next thing the virtual guide says, and what kind of answer it needs.
// One useful question at a time, in everyday words; anything the patient has
// already said is not asked again.
export function nextTurn(s: ConsultState): Turn {
  if (s.emergency) {
    return { step: "emergency", say: EMERGENCY_LINE, input: { kind: "emergency", flags: s.emergency.flags }, mood: "serious" };
  }
  if (s.concernText === undefined) {
    return {
      step: "concern",
      say: s.intro,
      question: "What brought you here today?",
      hint: "Say it in your own words — for example, “I've been coughing for three weeks”. I am not a doctor; I help you find the safest next step.",
      input: { kind: "text", placeholder: "What brings you here today?", optional: false, maxLength: MAX_TEXT },
      mood: "warm",
    };
  }
  const pending = s.pendingFlags[0];
  if (pending) {
    return compose(s, {
      step: `confirm:${pending}`,
      say: `To be safe, I need to ask — is this happening right now: ${getRedFlag(pending).label.toLowerCase().replace(/,? (right )?now$/, "")}?`,
      input: { kind: "single", options: YES_NO },
      mood: "focused",
      unsure: true,
    }, { simple: getRedFlag(pending).label });
  }
  // "I can't explain it", "It hurts here": first, where in the body.
  const needsWhere = (s.helpDescribe || s.whereFirst) && !s.bodyDone;
  if (needsWhere || (s.sideHint && !s.bodyDone)) return bodyTurn(s);
  if (s.bodyArea && LATERAL.has(s.bodyArea) && !s.bodySide && !s.unknown.side) return sideTurn(s);
  if (!s.concernMore && !s.complaint && !s.helpDescribe && !s.whereFirst && isVagueConcern(s.concernText, s.suggested)) {
    const cantExplain = /\b(explain|describe|say)\b/i.test(s.concernText) || uncertainty(s.concernText) !== null;
    const unclearWords = VAGUE_FEELING.test(normalizeWords(s.concernText));
    return compose(s, {
      step: "concern-more",
      say: cantExplain
        ? "That's okay. Tell me what is bothering you most — for example pain, fever, breathing, cough, stomach problems, or something else."
        : unclearWords
          ? "I'm not completely sure what you mean yet. Can you tell me a little more — is it pain, fever, breathing, dizziness, stomach problems, or something else?"
          : "I'm sorry you're feeling unwell. Tell me what is bothering you most right now — for example pain, fever, breathing, cough, stomach problems, or something else.",
      hint: "Use your own words, tap the closest one, or tap “Help me describe it”.",
      input: {
        kind: "single",
        options: [
          { id: "words:pain", label: "Pain" },
          { id: "words:fever", label: "Fever" },
          { id: "words:breathing problem", label: "Breathing" },
          { id: "words:cough", label: "Cough" },
          { id: "words:dizzy", label: "Dizziness" },
          { id: "words:stomach problem", label: "Stomach problems" },
          { id: "help", label: "Help me describe it" },
        ],
      },
      mood: "warm",
      unsure: true,
    });
  }
  if (!s.complaint) {
    const suggested = s.suggested.map(getComplaint).filter((c): c is NonNullable<typeof c> => !!c);
    const focused = s.focus.filter((id) => !s.suggested.includes(id)).map(getComplaint).filter((c): c is NonNullable<typeof c> => !!c);
    const shown = new Set([...suggested, ...focused].map((c) => c.id));
    const rest = complaints.filter((c) => !shown.has(c.id));
    return compose(s, {
      step: "complaint",
      say: suggested.length
        ? `Which of these fits best? It sounds closest to: ${suggested[0].label.toLowerCase()}.`
        : "Which of these is closest to the main problem?",
      input: { kind: "single", options: [...suggested, ...focused, ...rest].map((c) => ({ id: c.id, label: `${c.icon} ${c.label}` })) },
      mood: "attentive",
      unsure: true,
    }, { ack: true });
  }
  const said = normalizeWords(s.concernText);
  const vagueFeeling = VAGUE_FEELING.test(said) && !QUALITY.test(said);
  if (!s.describeDone && (s.helpDescribe || s.whereFirst || (DESCRIBES.has(s.complaint) && vagueFeeling))) return describeTurn(s);
  if (s.unknown.describe && !s.simplePain && !s.unknown.simplePain) {
    return compose(s, {
      step: "simple-pain",
      say: "That's okay. Let's make it easier. Are you having pain?",
      input: { kind: "single", options: YES_NO },
      mood: "attentive",
      unsure: true,
    });
  }
  if (ASKS_BODY.has(s.complaint) && !s.bodyDone) return bodyTurn(s);
  if (s.bodyArea && LATERAL.has(s.bodyArea) && !s.bodySide && !s.unknown.side) return sideTurn(s);
  // Asked early, because later questions depend on how long it has been.
  if (!s.duration && !s.unknown.duration) {
    return compose(s, {
      step: "duration",
      say: PAINFUL.has(s.complaint) && (QUALITY.test(said) || QUALITY.test(s.description ?? "") || s.simplePain === "yes") ? "When did the pain start?" : "When did this start?",
      input: { kind: "single", options: DURATIONS.map((d) => ({ id: d.id, label: d.label })) },
      mood: "attentive",
      unsure: true,
    }, { ack: true });
  }
  // Help-me-describe-it: two more questions a doctor usually asks about a
  // symptom. They go into the summary only; they never change urgency.
  if (s.helpDescribe && !s.pattern && !s.unknown.pattern) {
    return compose(s, {
      step: "pattern",
      say: "Is it there all the time, or does it come and go?",
      input: { kind: "single", options: [{ id: "constant", label: "All the time" }, { id: "comes-and-goes", label: "It comes and goes" }] },
      mood: "attentive",
      unsure: true,
    }, { ack: true });
  }
  if (s.helpDescribe && !s.modifiersDone) {
    return compose(s, {
      step: "modifiers",
      say: "Does anything make it better or worse — for example resting, moving, eating, or lying down?",
      hint: "In your own words. You can say “nothing” or “not sure”.",
      input: { kind: "text", placeholder: "For example: worse when I walk, better when I rest", optional: true, maxLength: MAX_TEXT },
      mood: "attentive",
      unsure: true,
    }, { ack: true });
  }
  if (!s.checkDone) {
    return compose(s, {
      step: "check",
      say: "Before I ask more, to be safe — is any of these happening right now?",
      hint: "Tap anything that is happening now.",
      input: {
        kind: "single",
        options: [
          ...redFlags.filter((f) => f.inChecklist).map((f) => ({ id: f.id, label: f.label, tone: "danger" as const })),
          { id: "none", label: "None of these — continue" },
        ],
      },
      mood: "focused",
    });
  }
  if (!s.who) {
    return compose(s, {
      step: "who",
      say: "Is this for you, or for someone else?",
      input: { kind: "single", options: [{ id: "self", label: "Myself" }, { id: "other", label: s.relation ? `Someone else (${s.relation})` : "Someone else" }] },
      mood: "attentive",
    }, { ack: true });
  }
  if (!s.age) {
    return compose(s, {
      step: "age",
      say: you(s, "How old are you?", "How old is the patient?"),
      hint: "An approximate age is fine.",
      input: { kind: "single", options: AGE_GROUPS.map((g) => ({ id: g.id, label: g.label })) },
      mood: "attentive",
    }, { ack: true });
  }
  if (asksSex(s.age) && !s.sex) {
    return compose(s, {
      step: "sex",
      say: you(s, "Are you female or male? It helps me ask the right questions.", "Is the patient female or male? It helps me ask the right questions."),
      input: { kind: "single", options: [{ id: "female", label: "Female" }, { id: "male", label: "Male" }, { id: "unspecified", label: "Prefer not to say" }] },
      mood: "attentive",
    }, { ack: true });
  }
  if (asksSex(s.age) && !s.specialDone) {
    const options = SPECIALS.filter((x) => x.id === "immunocompromised" || canBePregnant(s.age, s.sex)).map((x) => ({ id: x.id, label: x.label, hint: x.hint || undefined }));
    return compose(s, {
      step: "special",
      say: `Do any of these apply to ${you(s, "you", "the patient")}?`,
      hint: "Tap all that apply.",
      input: { kind: "multi", options, doneLabel: "Continue", noneLabel: "None of these — continue" },
      mood: "attentive",
      unsure: true,
    });
  }
  const ctx = contextOf(s);
  const q = questionsFor(ctx).find((x) => !(x.id in s.answers));
  if (q) return compose(s, { step: `q:${q.id}`, say: q.text, hint: q.help, input: { kind: "single", options: YES_NO }, mood: "attentive", unsure: true }, { ack: true, simple: q.text });
  const c = choicesFor(ctx).find((x) => !(x.id in s.choices));
  if (c) {
    const temp = c.id === "temp";
    return compose(s, {
      step: `c:${c.id}`,
      say: temp ? "If you measured the temperature with a thermometer, what was the highest number?" : c.text,
      input: { kind: "single", options: c.options },
      entry: temp ? "temperature" : undefined,
      mood: "attentive",
      unsure: true,
    }, { ack: true });
  }
  if (!s.progression && !s.unknown.progression) {
    return compose(s, { step: "progression", say: "Since it started, is it getting better, getting worse, or staying the same?", input: { kind: "single", options: PROGRESSIONS.map((d) => ({ id: d.id, label: d.label })) }, mood: "attentive", unsure: true }, { ack: true });
  }
  if (!s.severity && !s.unknown.severity) {
    const options = SEVERITIES.map((d) => ({ id: d.id, label: `${d.label} — ${d.hint}` }));
    return compose(s, {
      step: "severity",
      say: PAINFUL.has(s.complaint ?? "") ? "How bad is it right now? You can choose a number from 0, no pain, to 10, the worst pain you can imagine." : "How bad is it right now?",
      input: { kind: "single", options },
      entry: PAINFUL.has(s.complaint ?? "") ? "pain" : undefined,
      mood: "attentive",
      unsure: true,
    }, { ack: true });
  }
  // Optional history: left out when the patient is distressed, to reach the
  // right service sooner (the summary says it was not asked).
  const short = s.style.distressed;
  if (!s.medicinesDone && !short) {
    return compose(s, {
      step: "medicines",
      say: you(s, "Do you know what medicines you're taking at the moment?", "Do you know what medicines the patient is taking at the moment?"),
      hint: "Write the names as they appear on the packet, or say “none” or “I don't know”. This only goes into the summary for the doctor.",
      input: { kind: "text", placeholder: "For example: Metformin, Amlodipine", optional: true, maxLength: MAX_TEXT },
      mood: "attentive",
      unsure: true,
    }, { ack: true });
  }
  if (!s.allergiesDone && !short) {
    return compose(s, {
      step: "allergies",
      say: you(s, "Do you have any allergies to medicines, or to anything else?", "Does the patient have any allergies to medicines, or to anything else?"),
      input: { kind: "text", placeholder: "For example: penicillin", optional: true, maxLength: MAX_TEXT },
      mood: "attentive",
      unsure: true,
    }, { ack: true });
  }
  if (!s.conditionsDone && !short) {
    return compose(s, {
      step: "conditions",
      say: you(
        s,
        "Have you ever been told that you have a long-term health condition, such as diabetes or high blood pressure?",
        "Has the patient ever been told they have a long-term health condition, such as diabetes or high blood pressure?",
      ),
      input: { kind: "text", placeholder: "For example: diabetes, asthma", optional: true, maxLength: MAX_TEXT },
      mood: "attentive",
      unsure: true,
    }, { ack: true });
  }
  // Every question answered. The triage engine decides; RED always means Emergency Mode.
  const result = triage(toAnswers(s));
  if (result.level === "RED") {
    return { step: "emergency", say: EMERGENCY_LINE, input: { kind: "emergency", flags: result.emergency }, mood: "serious" };
  }
  const text = LEVEL_TEXT[result.level];
  return {
    step: "result",
    say: [recap(s), result.now && text.nowMessage ? text.nowMessage : text.message].filter(Boolean).join(" "),
    question: result.now && text.nowMessage ? text.nowMessage : text.message,
    then: HANDOFF_LINE,
    input: { kind: "result", level: result.level },
    mood: result.level === "ORANGE" ? "serious" : "focused",
  };
}

// "Thank you. You told me about a cough, which started more than two weeks
// ago, and is getting worse." — shows the doctor listened, before the advice.
const ABOUT: Record<string, string> = {
  fever: "a fever", cough: "a cough or breathing problem", heart: "chest discomfort", stomach: "a stomach problem",
  headache: "a headache or dizziness", injury: "an injury", ent: "an ear, nose or throat problem", mouth: "a mouth or tooth problem",
  eye: "an eye problem", skin: "a skin problem", bones: "joint, back or bone pain", urine: "a urine problem",
  pregnancy: "a pregnancy concern", child: "a child who is unwell", mental: "stress, sadness or worry",
  cancer: "a lump, unusual bleeding or weight loss", substance: "an alcohol or drug problem", hiv: "a sexual health concern",
};

export function recap(s: ConsultState): string {
  const c = s.complaint ? ABOUT[s.complaint] : undefined;
  if (!c) return "Thank you for answering my questions.";
  const bits = [`Thank you. You told me about ${c}`];
  if (s.duration) bits.push(`which started ${DURATION_WORDS[s.duration]}`);
  if (s.progression === "worse") bits.push("and is getting worse");
  else if (s.progression === "better") bits.push("and is getting better");
  const neg = s.complaint ? questionsFor(contextOf(s)).find((q) => "emergency" in q.yes && s.answers[q.id] === "no" && !s.prefilled.includes(q.id)) : undefined;
  return `${bits.join(", ")}.${neg ? ` You said: ${neg.negative.charAt(0).toLowerCase()}${neg.negative.slice(1)}.` : ""}`;
}

const clip = (t: string) => t.trim().slice(0, MAX_TEXT);
const SHORTENED = ["medicines", "allergies", "conditions"];

// "My head hurts", "pain in my back": a body part with a feeling word, when
// Reception's keywords found nothing. Only used to suggest a problem group.
const BODY_TO_COMPLAINT: [RegExp, string][] = [
  [/\b(head)\b/, "headache"],
  [/\b(chest)\b/, "heart"],
  [/\b(stomach|tummy|belly|abdomen)\b/, "stomach"],
  [/\b(back|joint|joints|knee|knees|leg|legs|arm|arms|shoulder|hip|neck)\b/, "bones"],
  [/\b(throat|ear|ears|nose)\b/, "ent"],
  [/\b(eye|eyes)\b/, "eye"],
  [/\b(tooth|teeth|mouth|gums?)\b/, "mouth"],
  [/\b(skin|rash|itch\w*)\b/, "skin"],
];
function suggestFrom(text: string, ids: string[]): string[] {
  if (ids.length) return ids;
  const t = text.toLowerCase();
  if (!QUALITY.test(t) && !VAGUE_FEELING.test(t) && !/\b(problem|issue|sore|swollen|swelling)\b/.test(t)) return [];
  const hits = BODY_TO_COMPLAINT.filter(([re]) => re.test(t)).map(([, id]) => id);
  return hits.length === 1 ? hits : [];
}

// One clear problem group from the patient's words is taken as the problem
// (no "which of these?" list); several are offered to choose from.
function withComplaint(s: ConsultState): ConsultState {
  if (s.complaint || s.suggested.length !== 1 || !getComplaint(s.suggested[0])) return s;
  const id = s.suggested[0];
  const special = id === "pregnancy" && !s.special.includes("pregnant") ? [...s.special, "pregnant" as const] : s.special;
  return { ...s, complaint: id, special, remembered: [...s.remembered, "complaint"] };
}

// Free text anywhere can raise an emergency.
// Checked on the words as typed AND as understood ("cant breath" → "can't
// breathe"), so messy typing can only add safety, never hide it.
function withTextFlags(s: ConsultState, text: string): ConsultState {
  const a = detectRedFlags(text);
  const b = detectRedFlags(normalizeWords(text));
  const d = { confirmed: [...new Set([...a.confirmed, ...b.confirmed])], needsConfirmation: [...new Set([...a.needsConfirmation, ...b.needsConfirmation])] };
  const confirmed = d.confirmed.filter((f) => !s.dismissedFlags.includes(f));
  if (confirmed.length) return { ...s, emergency: { flags: confirmed, clear: { kind: "text" } } };
  const pending = d.needsConfirmation.filter((f) => !s.dismissedFlags.includes(f) && !s.pendingFlags.includes(f) && !confirmed.includes(f));
  return pending.length ? { ...s, pendingFlags: [...s.pendingFlags, ...pending] } : s;
}

// Applies the person's answer to the current step. Unknown values are ignored
// (the same state object is returned). Valid "I'm not sure" answers are
// written as "?unsure", "?forgot" or "?describe".
export function respond(s: ConsultState, step: string, value: string | string[]): ConsultState {
  const next = respondCore(s, step, value);
  if (next === s) return s;
  // A memory line is said once, on the very next question.
  const shown = !s.notes.length ? memoryLine(s, step)?.key : undefined;
  return {
    ...next,
    notes: next.notes === s.notes ? [] : next.notes,
    turns: s.turns + 1,
    mentioned: shown ? [...next.mentioned, shown] : next.mentioned,
  };
}

const UNSURE_VALUE: Record<string, Uncertain> = { "?unsure": "Not sure", "?forgot": "Not remembered", "?describe": "Could not describe" };

// Facts mentioned along the way ("…for three weeks", "I'm 34") are kept, so
// they are not asked again, and the doctor says once that she noted them.
// Things patients often say that already answer a warning-sign question
// "yes". Only ever "yes" (it can only add care, never remove it); shown in the
// chart as "(from what you said)", and the question is not asked again.
const ALREADY_YES: [string, RegExp][] = [
  ["fever-weaker", /\bfever\b.*\b(stopped|went|gone|came down|broke|better|down)\b.*\b(worse|weak\w*|sleepy|restless|tired)\b/],
  ["fever-breathing", /\b(short of breath|breathless|breathing (very )?fast|can't catch my breath)\b/],
  ["fever-headache", /\b(severe|bad|terrible|very bad) headache\b/],
  ["fever-chills", /\b(chills|shivering|shivers|rigors)\b/],
  ["fever-vomit", /\b(vomiting (again and again|a lot|repeatedly|everything)|keep (throwing up|vomiting))\b/],
  ["cough-blood", /\bcough\w* (up )?blood\b|\bblood in (my |the )?(phlegm|sputum|spit)\b/],
  ["cough-fever", /\bcough\w*\b.*\bfever\b|\bfever\b.*\bcough\w*\b/],
  ["cough-wheeze", /\bwheez\w*\b/],
  ["cough-sweats", /\b(night sweats?|losing weight|lost weight)\b/],
  ["stomach-fluids", /\b(can't|cannot) keep (anything|any fluids?|water|food|liquids?) down\b/],
  ["stomach-bloody", /\b(blood in (my )?(diarrhoea|stools?|poo)|bloody (diarrhoea|stools?|poo))\b/],
  ["stomach-yellow", /\b(yellow (eyes|skin)|jaundice)\b/],
];

export function yesFromWords(text: string): string[] {
  const t = normalizeWords(text);
  return ALREADY_YES.filter(([, re]) => re.test(t)).map(([id]) => id);
}

function withWordAnswers(s: ConsultState, text: string): ConsultState {
  const ids = yesFromWords(text).filter((id) => !(id in s.answers));
  if (!ids.length) return s;
  return { ...s, answers: { ...s.answers, ...Object.fromEntries(ids.map((id) => [id, "yes" as Answer])) }, prefilled: [...new Set([...s.prefilled, ...ids])] };
}

function absorb(s: ConsultState, text: string): ConsultState {
  let next = withWordAnswers(s, text);
  const notes: string[] = [];
  if (!s.duration && !s.unknown.duration) {
    const d = receive(normalizeWords(text)).duration;
    if (d) {
      next = { ...next, duration: d, remembered: [...next.remembered, "duration"] };
      notes.push(`You mentioned it started ${DURATION_WORDS[d]}.`);
    }
  }
  if (soundsDistressed(text) && !s.style.distressed) {
    next = { ...next, style: { ...next.style, distressed: true } };
    notes.unshift("I can hear this is hard. I'll keep my questions short.");
  }
  return notes.length ? { ...next, notes: [...notes, ...next.notes] } : next;
}

function respondCore(s: ConsultState, step: string, value: string | string[]): ConsultState {
  const v = Array.isArray(value) ? value : [value];
  const one = v[0] ?? "";
  const unsure = UNSURE_VALUE[one];

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

  if (step === "concern-more") {
    if (one === "help" || unsure === "Could not describe") return { ...s, concernMore: true, helpDescribe: true };
    if (unsure) return { ...s, concernMore: true };
    const more = clip(one.startsWith("words:") ? one.slice(6) : one);
    if (!more) return s;
    const r = receive(normalizeWords(more));
    const next: ConsultState = {
      ...s,
      concernMore: true,
      concernText: clip(`${s.concernText ?? ""} — ${more}`),
      suggested: suggestFrom(normalizeWords(more), r.complaintIds),
      duration: s.duration ?? r.duration,
      answers: { ...r.prefill, ...s.answers },
      prefilled: [...new Set([...s.prefilled, ...Object.keys(r.prefill)])],
      special: [...new Set([...s.special, ...r.special])],
    };
    return withTextFlags(absorb(withComplaint(next), more), more);
  }

  if (step === "describe") {
    if (unsure) return { ...s, describeDone: true, unknown: { ...s.unknown, describe: unsure } };
    if (one === "words:other") return s; // the patient will type it
    const opt = DESCRIBE_OPTIONS.find((o) => `words:${o.id}` === one);
    const words = clip(opt ? opt.label : one.startsWith("words:") ? one.slice(6) : one);
    if (!words) return s;
    const next = { ...s, describeDone: true, description: words };
    // Safety first: the words alone, then the words in context ("pressure" in
    // the chest). A match in context is confirmed with the patient.
    const direct = withTextFlags(next, words);
    if (direct.emergency) return direct;
    const region = regionOf(s) === "default" ? (s.complaint ? REGION[s.complaint] : undefined) : regionOf(s);
    if (!region) return direct;
    const ctxFlags: RedFlagId[] = [];
    const feeling = opt ? opt.words : feelingWord(words);
    if (feeling) {
      const d = detectRedFlags(`${region} ${feeling}`);
      ctxFlags.push(...d.confirmed, ...d.needsConfirmation);
    }
    // Weakness or trouble seeing, about the head: check for stroke signs.
    if (region === "head" && /\b(weak\w*|vision|sight|see|seeing|blurr\w*|numb\w*|speech|slurr\w*)\b/i.test(words)) ctxFlags.push("stroke");
    const fresh = [...new Set(ctxFlags)].filter((f) => !s.dismissedFlags.includes(f) && !direct.pendingFlags.includes(f));
    return fresh.length ? { ...direct, pendingFlags: [...direct.pendingFlags, ...fresh] } : direct;
  }

  if (step === "help-describe") return { ...s }; // already switched on by startHelpDescribe
  if (step === "simple-pain") {
    if (unsure) return { ...s, unknown: { ...s.unknown, simplePain: unsure } };
    return one === "yes" || one === "no" ? { ...s, simplePain: one } : s;
  }
  if (step === "side") {
    if (unsure) return { ...s, unknown: { ...s.unknown, side: unsure } };
    return SIDES.some((x) => x.id === one) ? { ...s, bodySide: one as Side, sideHint: undefined } : s;
  }
  if (step === "pattern") {
    if (unsure) return { ...s, unknown: { ...s.unknown, pattern: unsure } };
    return one === "constant" || one === "comes-and-goes" ? { ...s, pattern: one } : s;
  }
  if (step === "modifiers") {
    if (unsure) return { ...s, modifiersDone: true, unknown: { ...s.unknown, modifiers: unsure } };
    const words = clip(one);
    const none = /^(no|nothing|none|nope|not really|nothing i'?ve noticed)\.?$/i.test(words);
    return { ...s, modifiersDone: true, modifiers: words ? (none ? "Nothing noticed" : words) : undefined };
  }

  if (step === "concern") {
    const text = clip(one);
    if (!text) return s;
    const r = receive(normalizeWords(text));
    const mem = rememberFromWords(text, r.who, r.relation, r.ageHint);
    const next: ConsultState = {
      ...s,
      ...mem.fields,
      remembered: mem.remembered,
      concernText: text,
      relation: r.relation,
      special: [...new Set([...s.special, ...r.special])],
      suggested: suggestFrom(normalizeWords(text), r.complaintIds),
      duration: r.duration,
      answers: { ...r.prefill, ...s.answers },
      prefilled: Object.keys(r.prefill),
    };
    // "It hurts here", "on the right": where comes first (never guessed).
    // "I can't explain it": the patient gets help to describe it.
    const t = normalizeWords(text);
    const noPart = !bodyFromWords(t) && !next.suggested.length;
    const side = sideFromWords(t);
    if (noPart && (/\b(here|over here|this (spot|area|place|part|side)|right there)\b/.test(t) || side === "left" || side === "right")) {
      next.whereFirst = true;
      if (side === "left" || side === "right") next.sideHint = side;
    }
    if (!next.suggested.length && /\b(can'?t|cannot|unable to) (explain|describe|say)\b|\bdon'?t know what'?s wrong\b/.test(t) && !/\bdon'?t (really )?know how to\b/.test(t)) {
      next.helpDescribe = true;
    }
    const kept = r.duration ? { ...next, remembered: [...next.remembered, "duration"] } : next;
    const distressed = soundsDistressed(text)
      ? { ...kept, style: { ...kept.style, distressed: true }, notes: ["I can hear this is hard. I'll keep my questions short."] }
      : kept;
    return withTextFlags(withWordAnswers(withComplaint(distressed), text), text);
  }

  if (step.startsWith("confirm:")) {
    const flag = step.slice(8) as RedFlagId;
    const ans = unsure ? "unsure" : one;
    if (!s.pendingFlags.includes(flag) || !["yes", "no", "unsure"].includes(ans)) return s;
    const pendingFlags = s.pendingFlags.filter((f) => f !== flag);
    if (ans === "no") return { ...s, pendingFlags, dismissedFlags: [...s.dismissedFlags, flag] };
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
    if (unsure) return { ...s, special: [], specialDone: true, unknown: { ...s.unknown, special: unsure } };
    const allowed = SPECIALS.filter((x) => x.id === "immunocompromised" || canBePregnant(s.age, s.sex)).map((x) => x.id);
    const chosen = v.filter((x): x is Special => (allowed as string[]).includes(x));
    return { ...s, special: chosen, specialDone: true };
  }

  if (step === "complaint") {
    if (unsure) return respondCore({ ...s, unknown: { ...s.unknown, complaint: unsure } }, "complaint", "other");
    if (!getComplaint(one)) return s;
    const special = one === "pregnancy" && !s.special.includes("pregnant") ? [...s.special, "pregnant" as const] : s.special;
    // Pre-filled answers only apply to the complaint they were made for.
    const keep = one === s.suggested[0];
    const answers = keep ? s.answers : Object.fromEntries(Object.entries(s.answers).filter(([k]) => !s.prefilled.includes(k)));
    return { ...s, complaint: one, special, answers, prefilled: keep ? s.prefilled : [] };
  }

  if (step === "body") {
    if (unsure) return { ...s, bodyDone: true, bodyArea: undefined, sideHint: undefined, unknown: { ...s.unknown, body: unsure } };
    if (one === "skip") return { ...s, bodyDone: true, bodyArea: undefined, sideHint: undefined };
    // "on the right" without a body part: ask which part (never guessed).
    if (one.startsWith("side:")) return { ...s, sideHint: one.slice(5) === "left" ? "left" : "right" };
    if (one === "other-place") return { ...s, sideHint: undefined };
    const [region, side] = one.split("|");
    if (!BODY_AREAS.some((b) => b.id === region)) return s;
    const placed: ConsultState = {
      ...s,
      bodyDone: true,
      bodyArea: region,
      bodySide: SIDES.some((x) => x.id === side) ? (side as Side) : s.bodySide,
      sideHint: undefined,
    };
    // The region can tell us the problem group; nothing is inferred beyond that.
    if (!placed.complaint && REGION_COMPLAINT[region] && !placed.suggested.length) return withComplaint({ ...placed, suggested: [REGION_COMPLAINT[region]] });
    return placed;
  }

  if (step.startsWith("q:")) {
    const id = step.slice(2);
    const q = questionsFor(contextOf(s)).find((x) => x.id === id);
    const ans = unsure ? "unsure" : one;
    if (!q || !["yes", "no", "unsure"].includes(ans)) return s;
    const a = ans as Answer;
    const next = { ...s, answers: { ...s.answers, [id]: a } };
    const flag = emergencyFrom(q, a);
    return flag ? { ...next, emergency: { flags: [flag], clear: { kind: "answer", id } } } : next;
  }

  if (step.startsWith("c:")) {
    const id = step.slice(2);
    const c = choicesFor(contextOf(s)).find((x) => x.id === id);
    if (!c) return s;
    if (unsure) {
      const fallback = c.options.find((o) => /not measured|not sure/i.test(o.label));
      return fallback ? { ...s, choices: { ...s.choices, [id]: fallback.id }, unknown: { ...s.unknown, [`c:${id}`]: unsure } } : s;
    }
    if (id === "temp" && one.startsWith("temp:")) {
      const t = temperatureOption(one.slice(5));
      return t ? { ...s, choices: { ...s.choices, temp: t.option }, temperature: t.text } : s;
    }
    return c.options.some((o) => o.id === one) ? { ...s, choices: { ...s.choices, [id]: one } } : s;
  }

  if ((step === "duration" || step === "progression" || step === "severity") && unsure) return { ...s, unknown: { ...s.unknown, [step]: unsure } };
  if (step === "duration") return DURATIONS.some((d) => d.id === one) ? { ...s, duration: one as Answers["duration"] } : s;
  if (step === "progression") return PROGRESSIONS.some((d) => d.id === one) ? { ...s, progression: one as Answers["progression"] } : s;
  if (step === "severity") {
    if (one.startsWith("pain:")) {
      const n = Number(one.slice(5));
      if (!Number.isInteger(n) || n < 0 || n > 10) return s;
      return { ...s, painScore: n, severity: n >= 7 ? "severe" : n >= 4 ? "moderate" : "mild" };
    }
    return SEVERITIES.some((d) => d.id === one) ? { ...s, severity: one as Answers["severity"] } : s;
  }

  if (step === "medicines" || step === "allergies" || step === "conditions") {
    if (unsure) {
      const done = step === "medicines" ? { medicinesDone: true } : step === "allergies" ? { allergiesDone: true } : { conditionsDone: true };
      return { ...s, ...done, unknown: { ...s.unknown, [step]: unsure } };
    }
    const said = clip(one);
    // "No" / "none" is an answer, not a medicine name.
    const text = said && /^(no|none|nothing|nope|not any|no medicines?|no allerg\w*|not taking any(thing)?|i'?m not taking any(thing)?)\.?$/i.test(said) ? "None (as reported)" : said || undefined;
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

// A measured temperature ("38.5", "101 F") → the matching option. Readings
// above 50 are taken as Fahrenheit. Implausible numbers are not accepted.
export function temperatureOption(raw: string): { option: string; text: string } | null {
  const m = raw.replace(",", ".").match(/(\d{2,3}(?:\.\d)?)\s*(°?\s*[cf])?/i);
  if (!m) return null;
  let v = parseFloat(m[1]);
  const f = /f/i.test(m[2] ?? "") || v > 50;
  if (f) v = Math.round(((v - 32) * 5) / 9 * 10) / 10;
  if (v < 34 || v > 43) return null;
  const option = v < 38 ? "below-38" : v < 39 ? "38-39" : "39-plus";
  return { option, text: `${m[1]}${f ? "°F" : "°C"}${f ? ` (about ${v}°C)` : ""}` };
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

const clean = (t: string) => normalizeWords(t).replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

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
  if (step === "describe") return `words:${text.trim()}`;
  if (step === "concern-more") return `words:${text.trim()}`;
  if (step === "c:temp") {
    if (/\b(not measured|didn'?t measure|no thermometer|not checked)\b/.test(t)) return "not-measured";
    return /\d/.test(t) && temperatureOption(t) ? `temp:${t}` : null;
  }
  if (step === "severity") {
    const n = t.match(/^(?:about |around )?(\d{1,2})(?: out of 10| on 10|\/10)?$/);
    if (n && +n[1] <= 10) return `pain:${n[1]}`;
  }
  if (step === "body") {
    const area = bodyFromWords(t);
    const side = sideFromWords(t);
    if (area) return side && side !== "middle" && side !== "both" && LATERAL.has(area) ? `${area}|${side}` : area;
    if (side === "left" || side === "right") return `side:${side}`;
  }
  if (step === "side") {
    const side = sideFromWords(t);
    if (side) return side;
  }
  if (step === "simple-pain") return yesNo(t);
  if (step === "pattern") {
    if (/\b(all the time|constant\w*|always|non ?stop|doesn'?t stop|continuous\w*)\b/.test(t)) return "constant";
    if (/\b(comes and goes|on and off|off and on|sometimes|now and then|comes? back|goes away)\b/.test(t)) return "comes-and-goes";
    return null;
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
    if (inp.kind === "body" && /\b(skip)\b/.test(t)) return "skip";
    const hits = inp.options.filter((o) => {
      const label = clean(o.label.replace(/^[^a-z0-9]+/i, ""));
      return label && (t === label || t.includes(label) || label.split(" ").filter((w) => w.length > 3).some((w) => t.includes(w)));
    });
    if (hits.length === 1) return hits[0].id;
    // Anything else about "where" is clarified with the body map — never guessed.
    return null;
  }
  return null;
}

const BODY_WORDS: [RegExp, string][] = [
  [/\b(head|forehead|temple|skull)\b/, "head"],
  [/\b(face|eye|eyes|ear|ears|mouth|teeth|tooth|jaw|nose|cheek)\b/, "face"],
  [/\b(neck|throat)\b/, "neck"],
  [/\b(chest|breast|ribs?)\b/, "chest"],
  [/\b(lower (stomach|tummy|belly|abdomen)|below the (navel|belly button)|groin)\b/, "lower-abdomen"],
  [/\b(upper (stomach|tummy|belly|abdomen)|above the (navel|belly button))\b/, "upper-abdomen"],
  [/\b(back|spine|waist)\b/, "back"],
  [/\b(arm|arms|hand|hands|shoulder|elbow|wrist|finger|fingers)\b/, "arms"],
  [/\b(leg|legs|foot|feet|knee|knees|ankle|hip|thigh|toe|toes)\b/, "legs"],
  [/\b(all over|everywhere|whole body|many places)\b/, "all-over"],
];
function sideFromWords(t: string): Side | null {
  const said = (w: string) => new RegExp(`\\b${w}\\b`).test(t);
  if (said("both") || said("both sides")) return "both";
  if (said("middle") || said("centre") || said("center")) return "middle";
  if (said("left") && !said("right")) return "left";
  if (said("right") && !said("left") && !/\bthat'?s right\b|\bright now\b|\ball right\b/.test(t)) return "right";
  return null;
}

function bodyFromWords(t: string): string | null {
  // "lower right side of my stomach" — upper/lower said anywhere near a tummy word
  if (/\b(stomach|tummy|belly|abdomen)\b/.test(t)) {
    if (/\b(lower|bottom|below)\b/.test(t)) return "lower-abdomen";
    if (/\b(upper|top|above)\b/.test(t)) return "upper-abdomen";
  }
  const hits = BODY_WORDS.filter(([re]) => re.test(t)).map(([, id]) => id);
  return hits.length === 1 ? hits[0] : null;
}

// "Help me describe it": the doctor walks through where → what it feels like
// → when → all the time or comes and goes → how strong → what changes it.
export function startHelpDescribe(s: ConsultState): ConsultState {
  if (s.emergency) return s;
  if (s.concernText === undefined) return respond(s, "concern", "I can't explain it");
  return respond({ ...s, helpDescribe: true, concernMore: true }, "help-describe", "start");
}

// ---------------- Helping the patient: explain, why, education ----------------

export const AGE_HELP_LINE = "That's okay — an approximate age is fine. For example, is it a baby, a child, an adult, or someone over 60?";

// Re-says the current question in everyday words.
export function explainLine(turn: Turn, s: ConsultState): string {
  const q = turn.question ?? turn.say;
  const step = turn.step;
  if (step.startsWith("q:") || step.startsWith("confirm:")) {
    const m = plainMeanings(q);
    return m.length
      ? `Let me put it simply. ${m.map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(". ")}. So — ${q.charAt(0).toLowerCase()}${q.slice(1)} You can say yes, no, or not sure.`
      : `I'm asking whether this is happening ${isOther(s) ? "to the patient " : ""}now. You can say yes, no, or not sure. ${q}`;
  }
  const lines: Record<string, string> = {
    concern: "Just tell me in your own words what is bothering you — for example pain, fever, breathing, cough, stomach problems, or something else.",
    "concern-more": "Just tell me in your own words what is bothering you most — for example pain, fever, breathing, cough, stomach problems, or something else.",
    check: "I'm asking if anything very serious is happening right now — like chest pain, great difficulty breathing, heavy bleeding, or someone who cannot be woken. If none of these is happening, choose “None of these”.",
    complaint: "Choose the group that sounds closest to the main problem. If none fits, choose “Something else”.",
    describe: "Tell me what the feeling is like — for example pain, pressure or tightness, burning, or something else. It's fine if you can't describe it.",
    body: "Show me where on the body the problem is. You can tap the picture, or say it in words.",
    duration: "When did this problem first start — today, a few days ago, or longer ago? A rough idea is fine.",
    who: "Are you asking about your own health, or about someone else, like a child or a parent?",
    age: AGE_HELP_LINE,
    sex: "Some questions are only for women or only for men. You can also choose not to say.",
    special: "Some things change how soon someone should be seen: being pregnant, having given birth in the last 6 weeks, or a weaker defence against infection — for example because of HIV, cancer treatment or steroid medicines.",
    progression: "Since it first started, is it getting better, getting worse, or staying about the same?",
    severity: "How much does it stop you doing your normal activities? Mild means you can still do them, moderate means it is hard, and severe means you can hardly do anything.",
    medicines: "Any tablets, syrups, injections or inhalers you take now — including from a pharmacy or traditional medicine. You can say “none” or “I don't know”.",
    allergies: "Has any medicine, food or anything else ever caused a bad reaction — like a rash, swelling, or difficulty breathing?",
    conditions: "Has a doctor or health worker ever told you that you have a long-term illness — such as diabetes, high blood pressure, asthma or TB?",
    "c:temp": "If you checked the temperature with a thermometer, tell me the number. If not, choose “Not measured”.",
  };
  return lines[step] ?? (step.startsWith("c:") ? "Choose the answer that fits best. If you're not sure, you can say so." : q);
}

// Why a question matters — short, honest, never the internal scoring.
export function whyLine(turn: Turn): string {
  const step = turn.step;
  if (step.startsWith("confirm:") || step === "check") return "Some problems need help straight away. I'm checking so that an emergency is never missed.";
  if (step.startsWith("q:")) {
    const id = step.slice(2);
    const q = questionsFor({ who: "self", age: "adult", special: [], complaint: "other" }).find((x) => x.id === id) ?? complaints.flatMap((c) => c.questions).find((x) => x.id === id);
    if (q && "emergency" in q.yes) return "I'm asking because this can be a warning sign that needs urgent care.";
    if (q && "level" in q.yes && (q.yes.level === "ORANGE" || q.yes.now)) return "I'm asking because this can affect how urgently someone should be assessed.";
    return "I'm asking because it helps decide what kind of care may be appropriate.";
  }
  if (step.startsWith("c:")) return "This goes into the summary for the doctor. It helps them, and it doesn't change my advice.";
  const lines: Record<string, string> = {
    concern: "So I understand what is worrying you, and ask questions that fit.",
    "concern-more": "So I understand what is worrying you, and ask questions that fit.",
    complaint: "So the questions I ask fit the problem.",
    describe: "How it feels helps me ask the right questions, and notice anything that may be urgent.",
    body: "Where it is helps decide which service may be right, and the doctor will want to know.",
    duration: "How long a problem has lasted can change how soon someone should be checked.",
    who: "So I ask the questions the right way, and the summary is about the right person.",
    age: "Some problems need more care at certain ages — for example in babies and older people.",
    sex: "Some questions only apply to women, for example about pregnancy.",
    special: "Pregnancy, a recent birth, or a weaker immune system can change how soon someone should be seen.",
    progression: "Whether it is getting better or worse helps decide how soon to be seen.",
    severity: "How much it affects you helps decide how soon someone should check it.",
    medicines: "The doctor needs to know what is already being taken, so nothing clashes. I won't suggest any medicine.",
    allergies: "So the doctor can avoid anything that has caused a bad reaction before.",
    conditions: "Long-term conditions can change what care is safest.",
  };
  return lines[step] ?? "It helps prepare a useful summary for a healthcare professional.";
}

// Three different kinds of difficulty — none of them is a reason to send the
// patient to a helpline. Only clinical reasons do that (see lib/escalation.ts).
export type Difficulty = "language" | "missing" | "knowledge";

export type Outcome =
  | { kind: "answered"; state: ConsultState } // the consultation moved on (or an emergency opened)
  | { kind: "explain"; state: ConsultState; line: string }
  | { kind: "why"; line: string }
  | { kind: "repeat" }
  | { kind: "term"; line: string; state: ConsultState } // "What does allergy mean?"
  | { kind: "education"; answer: EducationAnswer }
  | { kind: "corrected"; state: ConsultState; line: string } // "I said left, not right"
  | { kind: "professional"; line: string } // the patient asks for a real doctor
  | { kind: "control"; action: "slower" | "faster"; line: string } // "speak slower"
  | { kind: "unclear"; state: ConsultState; line: string; difficulty: Difficulty };

export const KNOWLEDGE_LINE = "I don't have verified information about that in my health guide yet, and I don't want to guess about medical information.";
// Kept for older callers; the same honest knowledge limitation.
export const UNKNOWN_LINE = `${KNOWLEDGE_LINE} Let's carry on with your consultation.`;
export const PROFESSIONAL_LINE =
  "Of course. Speaking with a real doctor or health worker is always your choice. I can prepare a summary of what you've told me so far to take with you. You can see the ways to reach one now, or we can carry on so the summary is more complete.";

const MISSING_LINE: Record<string, string> = {
  body: "I need to know where the problem is before I can guide you further. Can you show me on the picture, or tell me the part of the body?",
  side: "I need to know which side it is on. Please tap left, right, middle or both — or “I'm not sure”.",
  describe: "I need a little more about how it feels before I can guide you further. Tap the closest one, or tell me in your own words.",
  "concern-more": "I need to know a little more about what is bothering you. You can tap one of the choices, or “Help me describe it”.",
};

// The clarification ladder: say it another way → simplify → make it easier.
function clarify(s: ConsultState, turn: Turn, extra = ""): { state: ConsultState; line: string; difficulty: Difficulty } {
  const count = s.unclear.step === turn.step ? s.unclear.count + 1 : 1;
  const state = { ...s, unclear: { step: turn.step, count } };
  const missing = MISSING_LINE[turn.step];
  if (missing && count < 3 && turn.step !== "concern-more") return { state, line: `${extra}${missing}`, difficulty: "missing" };
  if (count === 1) {
    return { state, line: `${extra}I didn't quite understand that. Could you say it another way, or choose one of the answers below?`, difficulty: missing ? "missing" : "language" };
  }
  if (count === 2) {
    return { state: { ...state, style: { ...state.style, explained: state.style.explained + 1 } }, line: `${extra}I'm not completely sure I understood. Let me ask that another way. ${explainLine(turn, s)}`, difficulty: "language" };
  }
  const easier =
    turn.step === "concern" || turn.step === "concern-more"
      ? "Let's make it easier. Tap “Help me describe it”, and I'll ask about it one small step at a time."
      : turn.unsure
        ? "Let's make it easier. Just tap the answer that is closest — or tap “I'm not sure”, and we'll carry on."
        : "Let's make it easier. Just tap the answer that is closest.";
  return { state, line: `${extra}${easier}`, difficulty: "language" };
}

const CORRECTION = /\b(actually|i said|i meant|i mean|not (the )?(left|right)|correction|change (it|that)|i made a mistake|that'?s wrong|sorry,? (it'?s|i meant))\b|^no\b.*\b(left|right|middle)\b|\bsorry\b.*\b(left|right|middle)\b|\bwrong side\b/i;

// "Actually, I said left, not right." — the patient's correction replaces
// what was stored, and the doctor says what she changed.
function correction(s: ConsultState, text: string): { state: ConsultState; line: string } | null {
  const t = normalizeWords(text);
  if (!CORRECTION.test(t)) return null;
  // Sides: "not right" removes right; the remaining side is the correction.
  const negated = new Set([...t.matchAll(/\bnot (?:the )?(left|right)\b/g)].map((m) => m[1]));
  const sides = (["left", "right", "middle", "both"] as const).filter((x) => new RegExp(`\\b${x}\\b`).test(t) && !negated.has(x));
  if ((s.bodySide || s.sideHint || s.bodyArea) && sides.length === 1) {
    const side = sides[0];
    const next = s.bodyArea ? { ...s, bodySide: side, sideHint: undefined } : { ...s, sideHint: side === "left" || side === "right" ? side : undefined };
    return { state: { ...next, corrections: [...s.corrections, `Side changed to ${SIDE_WORD[side]}`] }, line: `Okay. I've changed that to the ${SIDE_WORD[side]}${side === "both" || side === "middle" ? "" : " side"}.` };
  }
  const area = bodyFromWords(t);
  if (area && s.bodyDone) {
    return {
      state: { ...s, bodyArea: area, bodySide: undefined, corrections: [...s.corrections, `Place changed to ${label(BODY_AREAS, area)}`] },
      line: `Okay. I've changed that to: ${label(BODY_AREAS, area)?.toLowerCase()}.`,
    };
  }
  const d = receive(text).duration ?? (/\b(today|this morning)\b/.test(t) ? "today" : /\byesterday\b/.test(t) ? "1-3-days" : undefined);
  if (d && (s.duration || s.unknown.duration)) {
    const unknown = { ...s.unknown };
    delete unknown.duration;
    return { state: { ...s, duration: d, unknown, corrections: [...s.corrections, "Start time changed"] }, line: `Okay. I've changed that: it started ${DURATION_WORDS[d]}.` };
  }
  return null;
}

const WANTS_PROFESSIONAL = /\b(real|human|actual|proper) (doctor|person|nurse)\b|\b(talk|speak) to (a |an )?(doctor|nurse|human|person|someone real)\b|\bsee a doctor (now|today)\b/i;

const shortAnswer = (s: ConsultState, words: string): ConsultState => {
  const short = words.split(/\s+/).filter(Boolean).length <= 3 ? s.style.short + 1 : 0;
  return short === s.style.short ? s : { ...s, style: { ...s.style, short } };
};
const understood = (s: ConsultState): ConsultState => (s.unclear.count ? { ...s, unclear: { step: "", count: 0 } } : s);

// "I already told you." — look back through what the patient said this visit;
// if it answers the current question, use it (and apologise). Otherwise say
// so honestly and ask once more. Never invent the answer.
function recall(s: ConsultState, turn: Turn): Outcome {
  // Two problems were named: ask which matters most rather than picking one.
  if (turn.step === "complaint" && s.suggested.length > 1) {
    const names = s.suggested.slice(0, 3).map((id) => getComplaint(id)?.label.toLowerCase().replace(/,.*$/, "").replace(/ or .*$/, "")).filter(Boolean);
    return { kind: "explain", state: s, line: `Sorry — you did. You mentioned ${names.join(" and ")}. Which one is bothering you most? Tap it below.` };
  }
  for (const earlier of [...s.said.slice(0, -1)].reverse()) {
    const value = interpretText(turn, earlier);
    if (value === null || (turn.input.kind === "text" && turn.step !== "concern")) continue;
    const next = respond(s, turn.step, value);
    if (next !== s) {
      return { kind: "answered", state: { ...next, notes: [`Sorry — you did tell me: “${earlier}”. I've noted it.`, ...next.notes.filter((n) => !n.startsWith("Sorry"))] } };
    }
  }
  // A start time said earlier, in any form.
  if (turn.step === "duration") {
    for (const earlier of [...s.said].reverse()) {
      const d = receive(normalizeWords(earlier)).duration;
      if (d) return { kind: "answered", state: { ...respond(s, "duration", d), notes: [`Sorry — you did tell me. I've noted that it started ${DURATION_WORDS[d]}.`] } };
    }
  }
  return {
    kind: "unclear",
    state: s,
    line: "I'm sorry — I may have missed it. I don't have that answer from you yet. Could you tell me once more, or tap the closest answer?",
    difficulty: "missing",
  };
}

// Everything the patient types or says goes through here. Order matters:
//  1. safety (red flags) — always first, can open an emergency at any step
//  2. corrections, "I want a real doctor", "what does that word mean?",
//     "what does this mean?" / "why are you asking?" / "say that again"
//  3. "I don't know", "I forgot", "I can't explain it" — valid answers
//  4. an answer to the current question
//  5. a general health question → verified knowledge, or an honest
//     "I don't have verified information about that yet"
//  6. otherwise: the clarification ladder. Never a helpline.
export function converse(s0: ConsultState, turn: Turn, text: string): Outcome {
  if (s0.emergency) return { kind: "answered", state: s0 };
  const words = clip(text);
  if (!words) return { kind: "unclear", ...clarify(s0, turn) };
  // Everything the patient says is remembered for this visit.
  const s: ConsultState = { ...s0, said: [...s0.said, words].slice(-40) };

  const flagged = withTextFlags(s, words);
  if (flagged.emergency || flagged.pendingFlags.length !== s.pendingFlags.length) return { kind: "answered", state: absorb(flagged, words) };

  const fix = correction(s, words);
  if (fix) return { kind: "corrected", state: fix.state, line: fix.line };
  if (WANTS_PROFESSIONAL.test(words)) return { kind: "professional", line: PROFESSIONAL_LINE };

  const term = askedTerm(normalizeWords(words));
  // A fuller verified answer wins over the one-line glossary meaning.
  const fuller = term && isGeneralQuestion(words) ? findEducation(words) : null;
  if (fuller) return { kind: "education", answer: fuller };
  if (term) {
    const again = s.explainedTerms.includes(term.id) ? "As I mentioned, " : "";
    const T = `${term.term.charAt(0).toUpperCase()}${term.term.slice(1)}`;
    return { kind: "term", line: `${again}${again ? `“${term.term}”` : `“${T}”`} means ${term.meaning}.`, state: { ...s, explainedTerms: [...new Set([...s.explainedTerms, term.id])] } };
  }

  let meta = metaIntent(words);
  // "I don't know how to explain it" at the start is an answer, not a request.
  if (meta === "explain" && (turn.step === "concern" || turn.step === "concern-more" || turn.step === "describe") && !/\b(what do you mean|understand|what does)\b/i.test(words)) meta = null;
  if (meta === "why") return { kind: "why", line: whyLine(turn) };
  if (meta === "repeat") return { kind: "repeat" };
  if (meta === "slower") return { kind: "control", action: "slower", line: "Of course. I'll speak more slowly." };
  if (meta === "faster") return { kind: "control", action: "faster", line: "Okay. I'll speak at a normal pace." };
  if (meta === "rephrase") {
    return { kind: "explain", state: { ...s, style: { ...s.style, explained: s.style.explained + 1 } }, line: `Sure — let me ask that another way. ${explainLine(turn, s)}` };
  }
  if (meta === "already") return recall(s, turn);
  if (meta === "explain") {
    return { kind: "explain", state: { ...s, style: { ...s.style, explained: s.style.explained + 1 } }, line: explainLine(turn, s) };
  }

  const general = isGeneralQuestion(words);
  if (turn.step === "concern") {
    if (general) {
      const e = findEducation(words);
      return e ? { kind: "education", answer: e } : { kind: "unclear", state: s, line: `${KNOWLEDGE_LINE} What brought you here today?`, difficulty: "knowledge" };
    }
    return { kind: "answered", state: respond(shortAnswer(s, words), "concern", words) };
  }

  // A clear health question ("What is TB?") is answered from verified content.
  const edu = general ? findEducation(words) : null;
  if (edu) return { kind: "education", answer: edu };

  if (turn.step === "check" && /^(yes|yeah|yep|haan|aw)\b/i.test(words)) {
    return { kind: "explain", state: s, line: "Which one is happening? Please tap it, or tell me in a few words." };
  }
  if (turn.step === "concern-more" && /^(no|nothing|none|nope)\b/i.test(words)) return { kind: "answered", state: respond(s, "concern-more", "?unsure") };

  const u = uncertainty(words);
  if (u && turn.unsure) {
    const value = u === "Not remembered" ? "?forgot" : u === "Could not describe" ? "?describe" : "?unsure";
    const next = respond(s, turn.step, value);
    if (next !== s) return { kind: "answered", state: understood(next) };
  }
  if (u && turn.step === "age") return { kind: "explain", state: s, line: AGE_HELP_LINE };

  const value = interpretText(turn, words);
  if (value !== null) {
    const base = shortAnswer(s, words);
    const next = respond(base, turn.step, value);
    if (next !== base) return { kind: "answered", state: understood(absorb(next, words)) };
  }

  // A question that is not an answer, and not in the verified knowledge.
  if (general || isQuestion(words)) {
    return { kind: "unclear", state: s, line: `${KNOWLEDGE_LINE} Let's carry on. ${turn.question ?? turn.say}`, difficulty: "knowledge" };
  }

  // Not understood — but facts mentioned on the way are still remembered.
  return { kind: "unclear", ...clarify(absorb(s, words), turn) };
}

export type TextResult = { state: ConsultState; understood: boolean };

// A typed or spoken answer, for callers that only need the new state.
export function respondText(s: ConsultState, turn: Turn, text: string): TextResult {
  const o = converse(s, turn, text);
  if (o.kind === "answered") return { state: o.state, understood: true };
  if (o.kind === "unclear") return { state: o.state, understood: false };
  return { state: s, understood: false };
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
  // Missing → "Not provided"; a valid "not sure / forgot" answer is recorded as such.
  const row = (l: string, v?: string, key?: string): ChartRow =>
    v && v.trim()
      ? { label: l, value: v.trim(), provided: true }
      : key && s.unknown[key]
        ? { label: l, value: s.unknown[key], provided: true }
        : key && s.style.distressed && SHORTENED.includes(key) && nextTurn(s).input.kind === "result"
          ? { label: l, value: "Not asked (kept the consultation short) — please ask", provided: false }
          : { label: l, value: NOT_PROVIDED, provided: false };
  const ctx = contextOf(s);
  const qs = s.complaint ? questionsFor(ctx) : [];
  const said = (a: Answer, emergencyOnly: boolean) =>
    qs.filter((q) => s.answers[q.id] === a && !s.prefilled.includes(q.id) && ("emergency" in q.yes) === emergencyOnly);
  // Answers taken from the patient's own opening words (only ever "yes").
  const fromWords = qs.filter((q) => s.prefilled.includes(q.id) && s.answers[q.id] === "yes").map((q) => `${q.positive} (from what you said)`);

  const reported: ChartRow[] = [
    row("Main concern", s.concernText),
    row("Main problem", s.complaint ? `${getComplaint(s.complaint)?.label}${s.remembered.includes("complaint") ? " (from what you said)" : ""}` : undefined),
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
  if (s.description || s.unknown.describe) reported.push(row("How it feels", s.description && `${s.description} (patient's words)`, "describe"));
  if ((s.complaint && ASKS_BODY.has(s.complaint)) || s.bodyArea || s.whereFirst || s.helpDescribe) {
    const where = label(BODY_AREAS, s.bodyArea);
    const side = s.bodySide ? ` — ${SIDE_WORD[s.bodySide]}${s.bodySide === "left" || s.bodySide === "right" ? " side" : ""}` : "";
    reported.push(row("Where", where ? `${where}${side}` : s.bodyWords && `${s.bodyWords} (patient's words)`, "body"));
  }
  if (s.simplePain || s.unknown.simplePain) reported.push(row("Pain", s.simplePain === "yes" ? "Yes" : s.simplePain === "no" ? "No" : undefined, "simplePain"));
  if (s.pattern || s.unknown.pattern) reported.push(row("Pattern", s.pattern === "constant" ? "All the time" : s.pattern ? "Comes and goes" : undefined, "pattern"));
  if (s.modifiersDone) reported.push(row("Better or worse with", s.modifiers, "modifiers"));
  if (s.corrections.length) reported.push(row("Corrected by patient", s.corrections.join("; ")));
  reported.push(
    row("Duration", label(DURATIONS, s.duration) && `${label(DURATIONS, s.duration)}${s.remembered.includes("duration") ? " (from what you said)" : ""}`, "duration"),
    row("Change", label(PROGRESSIONS, s.progression), "progression"),
    row("How bad", label(SEVERITIES, s.severity) && `${label(SEVERITIES, s.severity)}${s.painScore !== undefined ? ` — pain ${s.painScore}/10 (patient-rated)` : ""}`, "severity"),
    row("Symptoms reported", [...fromWords, ...said("yes", false).map((q) => q.positive)].join("; ")),
    row("Relevant negatives", said("no", false).map((q) => q.negative).join("; ")),
  );
  const unsure = qs.filter((q) => s.answers[q.id] === "unsure" && !s.prefilled.includes(q.id));
  if (unsure.length) reported.push(row("Not sure about", unsure.map((q) => q.positive).join("; ")));
  for (const c of s.complaint ? choicesFor(ctx) : []) {
    const v = c.id === "temp" && s.temperature ? `${s.temperature} (measured by patient)` : s.unknown[`c:${c.id}`] ?? label(c.options, s.choices[c.id]);
    if (v) reported.push(row(c.summaryLabel, v));
  }
  reported.push(
    row("Current medicines", s.medicines, "medicines"),
    row("Known allergies", s.allergies, "allergies"),
    row("Existing conditions", [s.conditions, s.special.includes("immunocompromised") ? "Weak immune system" : ""].filter(Boolean).join("; "), "conditions"),
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
