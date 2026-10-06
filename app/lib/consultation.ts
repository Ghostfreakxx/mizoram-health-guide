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
import { DESCRIBE_OPTIONS, type ProfessionalTopic, type Uncertain, feelingWord, isVagueConcern, metaIntent, normalizeWords, plainMeanings, plainTerms, professionalQuestion, soundsDistressed, uncertainty } from "./consultHelp";
import { type EducationAnswer, allEducation, findEducation, isGeneralQuestion, isQuestion } from "./education";
import { askedTerm } from "./knowledge/glossary";
import { BOUNDARY_ANSWERS, EMERGENCY_SPOKEN, KNOWLEDGE_LIMIT, LEVEL_TEXT, PROFESSIONAL_REQUEST } from "./safety/language";
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
  dismissedFlags: RedFlagId[]; // asked directly and answered "no"
  exitedFlags: RedFlagId[]; // the patient left Emergency Mode for these ("this is not an emergency")
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
  doctorQuestions: string[]; // questions only a professional can answer, saved for them
  // Other problems the patient mentioned ("…but I also have back pain"). Kept
  // in their words for the summary; the questions focus on the main concern.
  otherConcerns: string[];
  // Things the patient said they do NOT have, in words ("no fever").
  denied: string[];
  // The yes/no answer just given, so "sorry, I meant yes" can change it.
  lastAnswered?: { step: string; value: string };
  // A new statement that contradicts an earlier answer — asked about, never
  // silently overwritten or silently ignored.
  recheck?: { key: string; earlier: string; now: string; to?: Answer }; // `to`: the value to change to (default yes)
  lastEducation?: string; // the health-information answer just given ("tell me more")
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

export const EMERGENCY_LINE = EMERGENCY_SPOKEN;
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
    exitedFlags: [],
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
    doctorQuestions: [],
    otherConcerns: [],
    denied: [],
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
  // A line that already reassures ("That's okay. Let's make it easier…") needs no second one.
  const notes = /^that'?s (okay|ok|fine)\b/i.test(t.say) ? s.notes.filter((n) => n !== UNSURE_OK) : s.notes;
  const note = notes.length ? notes.slice(0, 2).join(" ") : memoryLine(s, t.step)?.line;
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
  // Something new contradicts an earlier answer: ask which is right.
  if (s.recheck) {
    const r = s.recheck;
    const fever = r.key === "fever";
    return {
      step: "recheck",
      say: fever
        ? `Earlier you said ${r.earlier}, but you've now said ${r.now}. Should I record that you have a measured fever?`
        : `Earlier you said ${r.earlier} Just now you said ${r.now}. Should I change that answer to ${RECHECK_TO[r.to ?? "yes"]}?`,
      question: fever ? "Should I record that you have a measured fever?" : `Should I change that answer to ${RECHECK_TO[r.to ?? "yes"]}?`,
      hint: "I want your summary to be right, so I'm checking rather than guessing.",
      input: { kind: "single", options: [{ id: "yes", label: "Yes, change it" }, { id: "no", label: "No, keep my earlier answer" }, { id: "unsure", label: "Not sure" }] },
      mood: "focused",
      unsure: true,
    };
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
  const others = s.otherConcerns.length ? ` You also mentioned ${s.otherConcerns.join(" and ")}: my advice is about the main problem, so please tell the health worker about that too.` : "";
  return `${bits.join(", ")}.${neg ? ` You said: ${neg.negative.charAt(0).toLowerCase()}${neg.negative.slice(1)}.` : ""}${others}`;
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
  // A clear red flag ALWAYS opens Emergency Mode — an earlier "no" to an
  // unclear mention never hides it. Only a flag the patient has just left
  // Emergency Mode for is asked about directly again (never ignored).
  const confirmed = d.confirmed.filter((f) => !s.exitedFlags.includes(f));
  if (confirmed.length) return { ...s, emergency: { flags: confirmed, clear: { kind: "text" } } };
  const askAgain = d.confirmed.filter((f) => s.exitedFlags.includes(f));
  const pending = [...new Set([...askAgain, ...d.needsConfirmation.filter((f) => !s.dismissedFlags.includes(f))])].filter((f) => !s.pendingFlags.includes(f));
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
  // The first "not sure" of the visit: said once that it is a useful answer.
  const unsureNow = (step.startsWith("q:") && value === "unsure") || (!!next.unknown[step] && !s.unknown[step]);
  const reassure = unsureNow && !s.mentioned.includes("unsure-ok");
  const notes = next.notes === s.notes ? [] : next.notes;
  return {
    ...next,
    notes: reassure ? [UNSURE_OK, ...notes] : notes,
    turns: s.turns + 1,
    mentioned: [...next.mentioned, ...(shown ? [shown] : []), ...(reassure ? ["unsure-ok"] : [])],
    lastAnswered: step.startsWith("q:") && typeof value === "string" ? { step, value } : undefined,
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
  ["cough-blood", /\bcough\w* (up )?blood\b|\bblood in (my |the )?(phlegm|sputum|spit)\b|\bblood\b[^|]{0,30}\bcough\w*|\bcough\w*[^|]{0,30}\bblood\b/],
  ["cough-fever", /\bcough\w*\b.*\bfever\b|\bfever\b.*\bcough\w*\b/],
  ["cough-wheeze", /\bwheez\w*\b/],
  ["cough-sweats", /\b(night sweats?|losing weight|lost weight)\b/],
  ["stomach-fluids", /\b(can't|cannot) keep (anything|any fluids?|water|food|liquids?) down\b/],
  ["stomach-bloody", /\b(blood in (my )?(diarrhoea|stools?|poo)|bloody (diarrhoea|stools?|poo))\b/],
  ["stomach-yellow", /\b(yellow (eyes|skin)|jaundice)\b/],
];

// "I have a cough but no fever": the negated part is removed before looking
// for symptoms, so a "no" is never turned into a "yes".
const NEGATED = /\b(no|not|never|without|nor|don'?t (?:have|get)|doesn'?t (?:have|get)|haven'?t (?:had|got)|hasn'?t (?:had|got)|didn'?t (?:have|get))\b((?:\s+(?:a|an|any|much|really|the|high))*\s+[a-z']+)/g;
export function stripNegated(t: string): string {
  return t.replace(NEGATED, " | ");
}

export function yesFromWords(text: string): string[] {
  const t = stripNegated(normalizeWords(text));
  return ALREADY_YES.filter(([, re]) => re.test(t)).map(([id]) => id);
}

// Fever in the patient's words: "I have a fever", or a measured reading
// ("my temperature was 39", "101 F"). Readings below 38 °C are not a fever.
const DENIES_FEVER = /\b(no|not|never|without|don'?t have|doesn'?t have|haven'?t had|hasn'?t had|didn'?t have)\s+(a\s+|any\s+|high\s+)?(fever|temperature)\b/;
const READING = /\b(\d{2,3}(?:[.,]\d)?)\s*(?:°\s*[cf]\b|[cf]\b|degrees?(?:\s*(?:c|f|celsius|fahrenheit))?\b|deg\b)|\b(?:temperature|temp|fever)\s+(?:was|is|of|at|reached|went up to)\s+(\d{2,3}(?:[.,]\d)?)/;
export function feverFromWords(text: string): { said: boolean; reading?: { text: string; celsius: number } } | null {
  const t = normalizeWords(text);
  const m = t.match(READING);
  let reading: { text: string; celsius: number } | undefined;
  if (m) {
    const raw = m[1] ?? m[2];
    const unit = /f\b|fahrenheit/.test(m[0]) ? " F" : "";
    const opt = temperatureOption(`${raw}${unit}`);
    const v = parseFloat(raw.replace(",", "."));
    const celsius = unit || v > 50 ? Math.round(((v - 32) * 5) / 9 * 10) / 10 : v;
    if (opt) reading = { text: opt.text, celsius };
  }
  const said = /\b(fever\w*|high temperature)\b/.test(stripNegated(t)) && !DENIES_FEVER.test(t);
  if (!said && !(reading && reading.celsius >= 38)) return reading ? { said: false, reading } : null;
  return { said, reading };
}

// What the patient says can add facts along the way. A new "yes" for a
// question not yet asked is kept (it can only add care). A new statement that
// contradicts an earlier answer is ASKED about (`recheck`) — never silently
// overwritten, never silently ignored.
function withWordAnswers(s: ConsultState, text: string): ConsultState {
  let next = s;
  const t = normalizeWords(text);
  if (DENIES_FEVER.test(t) && !next.denied.includes("fever")) next = { ...next, denied: [...next.denied, "fever"] };
  const qs = questionsFor(contextOf(next));
  const ids = new Set(yesFromWords(text));
  const fever = feverFromWords(text);
  const feverNow = !!fever && (fever.said || (fever.reading?.celsius ?? 0) >= 38);
  if (fever?.reading && !next.temperature) next = { ...next, temperature: fever.reading.text, remembered: [...next.remembered, "temperature"] };
  if (feverNow) for (const q of qs) if (/-fever$/.test(q.id)) ids.add(q.id);
  // "I don't have a fever" … later "my temperature was 39".
  if (feverNow && next.denied.includes("fever") && !DENIES_FEVER.test(t) && !next.recheck) {
    next = { ...next, recheck: { key: "fever", earlier: "you didn't have a fever", now: fever?.reading ? `your temperature was ${fever.reading.text}` : "you have a fever" } };
  }
  const fresh: string[] = [];
  for (const id of ids) {
    const before = next.answers[id];
    if (before === undefined) fresh.push(id);
    else if (before === "no" && !next.recheck) {
      const q = qs.find((x) => x.id === id);
      if (q) next = { ...next, recheck: { key: id, earlier: `no when I asked: “${q.text}”`, now: `“${clip(text).slice(0, 80)}”` } };
    }
  }
  // While a fever contradiction is open, fever answers wait for the patient.
  const add = next.recheck?.key === "fever" ? fresh.filter((id) => !/-fever$/.test(id)) : fresh;
  if (!add.length) return next;
  return { ...next, answers: { ...next.answers, ...Object.fromEntries(add.map((id) => [id, "yes" as Answer])) }, prefilled: [...new Set([...next.prefilled, ...add])] };
}

// "…but I also have back pain": a second problem, kept in the patient's words.
const ALSO = /\b(also|as well|another (problem|thing|issue)|plus|on top of that|besides that)\b/;
const LEAD_IN = /^(?:(?:and|but|i|i've|i'm|im|i am|i also|also|have|has|got|get|getting|having|there is|there's|as well|plus|on top of that|besides that|another problem is|another thing is)\s+)+/;
function problemIn(t: string): string | undefined {
  const p = stripNegated(t);
  return suggestFrom(p, receive(p).complaintIds)[0];
}
export function splitConcerns(text: string): { main: string; other: string; otherProblem: string } | null {
  const t = normalizeWords(text).replace(/[.!]+\s*$/, "");
  const tooEnd = /\s+too$/.exec(t); // "I have back pain too"
  const m = tooEnd ?? ALSO.exec(t);
  if (!m) return null;
  const before = tooEnd ? "" : t.slice(0, m.index).replace(/\b(but|and)\s*$/, "").trim();
  const after = tooEnd ? t.slice(0, m.index).trim() : t.slice(m.index).trim();
  const otherProblem = problemIn(after);
  if (!otherProblem) return null;
  const words = after.replace(LEAD_IN, "").replace(/^(also|as well)\s+/, "").replace(/[.!]+$/, "").trim();
  return { main: before, other: words || after, otherProblem };
}

// A second problem mentioned during the consultation. Returns null when the
// words are not about a different problem.
function addOtherConcern(s: ConsultState, text: string): { state: ConsultState; line: string } | null {
  const split = splitConcerns(text);
  if (!split || split.otherProblem === s.complaint) return null;
  if (s.otherConcerns.some((c) => c.toLowerCase() === split.other.toLowerCase())) return null;
  const state = { ...s, otherConcerns: [...s.otherConcerns, split.other] };
  return { state, line: `I've noted ${split.other} as well. It will be in your summary so a health worker can look at it too. Let's finish with ${s.complaint ? (NOUN[s.complaint] ?? "the main problem") : "the main problem"} first.` };
}

function absorb(s: ConsultState, text: string): ConsultState {
  let next = withWordAnswers(s, text);
  const other = addOtherConcern(next, text);
  if (other) next = { ...other.state, notes: [...next.notes, other.line.replace(/ Let's finish.*$/, "")] };
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
    return { ...s, dismissedFlags: [...s.dismissedFlags, ...e.flags], exitedFlags: [...new Set([...s.exitedFlags, ...e.flags])], emergency: null };
  }
  // While in an emergency, nothing else can change the outcome.
  if (s.emergency) return s;

  if (step === "concern-more") {
    if (one === "help" || unsure === "Could not describe") return { ...s, concernMore: true, helpDescribe: true };
    if (unsure) return { ...s, concernMore: true };
    const more = clip(one.startsWith("words:") ? one.slice(6) : one);
    if (!more) return s;
    const r = receive(normalizeWords(more));
    const positive = stripNegated(normalizeWords(more));
    const next: ConsultState = {
      ...s,
      concernMore: true,
      concernText: clip(`${s.concernText ?? ""} — ${more}`),
      suggested: suggestFrom(positive, receive(positive).complaintIds),
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

  if (step === "recheck") {
    const r = s.recheck;
    const ans = unsure ? "unsure" : one;
    if (!r || !["yes", "no", "unsure"].includes(ans)) return s;
    const cleared: ConsultState = { ...s, recheck: undefined };
    const qs = questionsFor(contextOf(s));
    // The fever question(s) this applies to, and a single question otherwise.
    const ids = r.key === "fever" ? qs.filter((q) => /-fever$/.test(q.id)).map((q) => q.id) : [r.key];
    if (ans === "no") {
      return { ...cleared, corrections: [...s.corrections, r.key === "fever" ? "Kept: no fever (a temperature reading was also mentioned)" : `Kept earlier answer (${qs.find((q) => q.id === r.key)?.negative ?? r.key})`] };
    }
    const value: Answer = ans === "yes" ? (r.to ?? "yes") : "unsure";
    let next: ConsultState = {
      ...cleared,
      denied: r.key === "fever" && ans === "yes" ? s.denied.filter((d) => d !== "fever") : s.denied,
      answers: { ...s.answers, ...Object.fromEntries(ids.map((id) => [id, value])) },
      prefilled: s.prefilled.filter((id) => !ids.includes(id)),
      corrections: [...s.corrections, r.key === "fever" ? (ans === "yes" ? "Changed: has a measured fever" : "Not sure whether there is a fever") : `Changed answer: ${qs.find((q) => q.id === r.key)?.positive ?? r.key} — ${VALUE_WORD[value].toLowerCase()}`],
    };
    if (r.key === "fever" && ans === "unsure") next = { ...next, unknown: { ...next.unknown, fever: "Not sure" } };
    for (const id of ids) {
      const q = qs.find((x) => x.id === id);
      const flag = q ? emergencyFrom(q, value) : null;
      if (flag) return { ...next, emergency: { flags: [flag], clear: { kind: "answer", id } } };
    }
    return next;
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
    // "I don't have a fever" must not suggest fever as the problem.
    const positive = stripNegated(normalizeWords(text));
    const rc = receive(positive);
    const mem = rememberFromWords(text, r.who, r.relation, r.ageHint);
    // "My main problem is cough, but I also have back pain": the questions
    // follow the main problem; the other is kept for the summary. Safety
    // checks still read every word.
    const split = splitConcerns(text);
    const mainProblem = split && split.main ? problemIn(split.main) : undefined;
    const two = !!split && !!mainProblem && mainProblem !== split.otherProblem;
    const main = two ? receive(split!.main) : r;
    const next: ConsultState = {
      ...s,
      ...mem.fields,
      remembered: mem.remembered,
      concernText: text,
      relation: r.relation,
      special: [...new Set([...s.special, ...r.special])],
      suggested: two ? [mainProblem!] : suggestFrom(positive, rc.complaintIds),
      duration: two ? main.duration : r.duration,
      answers: { ...main.prefill, ...s.answers },
      prefilled: Object.keys(main.prefill),
      otherConcerns: two ? [split!.other] : s.otherConcerns,
      notes: two ? [`I've noted ${split!.other} as well — it will be in your summary. Let's start with ${NOUN[mainProblem!] ?? "the main problem"}.`] : s.notes,
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
      ? { ...kept, style: { ...kept.style, distressed: true }, notes: ["I can hear this is hard. I'll keep my questions short.", ...kept.notes] }
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

const YES = /^(yes|yeah|yep|yup|ya|yah|haan|ha|aw|correct|true|right|that'?s right|that'?s correct|absolutely|definitely|of course|uh huh|i do|i have|i am|it is|it does|there is|sure|ok yes|(a bit|a little|sometimes|slightly) yes)\b/;
const NO = /^(no|nope|nah|negative|not really|never|none|nothing|i don'?t|i do not|i haven'?t|i have not|it isn'?t|it is not|there isn'?t|not at all)\b/;
const UNSURE = /\b(not sure|unsure|not certain|uncertain|not too sure|don'?t know|do not know|dunno|idk|maybe|perhaps|possibly|no idea|no clue|can'?t say|cannot say|can'?t tell|hard to say|difficult to say|might be|could be|didn'?t check|did not check|haven'?t checked|have not checked|not checked|didn'?t measure|can'?t remember|cannot remember|don'?t remember|do not remember|forgot|forget)\b/;
// ("I didn't check" / "I can't remember" is not a "no": a danger sign nobody checked stays unknown.)
// A hedged yes ("I think so", "probably") is a yes: on a danger-sign question
// that errs toward care, and it is what the words mean.
const HEDGED_YES = /^(i think so|i guess so|i believe so|probably|probably yes|i think yes|yes i think)\b/;

// Stretched words typed for emphasis ("noooo", "yesss", "yaaa") are the plain word.
const unstretch = (t: string) => t.replace(/\bn+o{2,}\b/g, "no").replace(/\by+e+s{2,}\b|\bye{2,}s+\b/g, "yes").replace(/\bya{2,}h?\b/g, "ya");
const clean = (t: string) => unstretch(normalizeWords(t).replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim());

const NEGATION = /\b(no|not|never|none|nothing|nope|nah)\b|n't\b/;

// Statement openers ("there is…", "I have…", "it is…") mean yes only in a
// short reply. "There is blood when I cough", said to an unrelated question,
// is new information — never a "yes" to the question on screen.
const OPENER = /^(i do|i have|i am|it is|it does|there is|correct|right)\b/;

const FILLER = new Set(["yes", "yeah", "so", "it", "that", "one", "some", "a", "bit", "little", "sometimes", "really", "i", "think", "do", "is", "does", "am", "have", "there"]);

function yesNo(t0: string): string | null {
  // Leading fillers ("actually yes", "well, no", "um not sure") carry no meaning.
  const t = t0.replace(/^((actually|well|um+|uh+|hmm+|so|oh)\b[\s,]*)+/, "").trim() || t0;
  if (OPENER.test(t) && !/^(yes|yeah|yep|yup|haan|ha|aw)\b/.test(t) && !NEGATION.test(t)) {
    const rest = t.replace(OPENER, "").trim().split(" ").filter(Boolean);
    if (rest.some((w) => !FILLER.has(w))) return null;
  }
  if (HEDGED_YES.test(t)) return "yes";
  if (UNSURE.test(t)) return "unsure";
  if (NO.test(t)) return "no";
  if (YES.test(t) && NEGATION.test(t)) return /^(yes|yeah|yep|yup|ya|yah|haan|ha|aw|sure|true)\b/.test(t) ? null : "no"; // "yes but not much" → ask; "I have no fever" → no
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
  if (step.startsWith("q:") || step.startsWith("confirm:") || step === "recheck") return yesNo(t);
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
    if (/\b(not measured|didn'?t (measure|check)|did not (measure|check)|haven'?t (measured|checked)|no thermometer|not checked|don'?t have a thermometer)\b/.test(t)) return "not-measured";
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
    // Negated change ("not improving or worse", "not getting better") is not a direction.
    const notBetter = /\b(not|isn'?t|no|nor|neither) (getting |really )?(better|improv\w*)\b/.test(t);
    const notWorse = /\b(not|isn'?t|no|nor|neither|or) (getting |any )?worse\b/.test(t);
    if (notBetter && notWorse) return "same";
    if (notBetter || notWorse) return /\b(same|no change|unchanged)\b/.test(t) ? "same" : null;
    if (/\b(better|improv\w*|less)\b/.test(t)) return "better";
    if (/\b(worse|worsen\w*|more|increas\w*)\b/.test(t)) return "worse";
    if (/\b(same|no change|unchanged|similar|not changed|not changing|no different|staying)\b/.test(t)) return "same";
    return null;
  }
  if (step === "severity") {
    if (/\b(severe|very bad|terrible|unbearable|can'?t do anything|cannot do anything|worst|really really bad|can hardly|hardly (do|get|move|walk|work)|can'?t (even )?get (up|out of bed)|bedridden)\b/.test(t)) return "severe";
    if (/\b(moderate|medium|quite bad|fairly bad|hard to|difficult to)\b/.test(t)) return "moderate";
    if (/\b(mild|slight|a little|not bad|not too bad|not so bad|manageable|okay|ok|can still)\b/.test(t)) return "mild";
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

export const UNSURE_OK = "That's okay — “not sure” is a useful answer. I've noted it.";
export const AGE_HELP_LINE = "That's okay — an approximate age is fine. For example, is it a baby, a child, an adult, or someone over 60?";

// How each step is re-said in everyday words ("what do you mean?"). Some
// carry clinical examples, so each is on the review list (W-explain-*).
export const EXPLAIN_LINES: Record<string, string> = {
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
  recheck: "You told me two different things. I want to write down the right one. Choose “Yes” to change your earlier answer, “No” to keep it, or “Not sure”.",
};
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

  return EXPLAIN_LINES[step] ?? (step.startsWith("c:") ? "Choose the answer that fits best. If you're not sure, you can say so." : q);
}

// Why each step is asked ("why do you ask?"). On the review list (W-why-*).
export const WHY_SAFETY = {
  check: "Some problems need help straight away. I'm checking so that an emergency is never missed.",
  warning: "I'm asking because this can be a warning sign that needs urgent care.",
  urgency: "I'm asking because this can affect how urgently someone should be assessed.",
  routine: "I'm asking because it helps decide what kind of care may be appropriate.",
  summary: "This goes into the summary for the doctor. It helps them, and it doesn't change my advice.",
};
const WHY_DEFAULT = "It helps prepare a useful summary for a healthcare professional.";
export const WHY_LINES: Record<string, string> = {
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
  recheck: "Two of your answers did not match. I'd rather ask than guess, so your summary is right.",
};
// Why a question matters — short, honest, never the internal scoring.
export function whyLine(turn: Turn): string {
  const step = turn.step;
  if (step.startsWith("confirm:") || step === "check") return WHY_SAFETY.check;
  if (step.startsWith("q:")) {
    const id = step.slice(2);
    const q = questionsFor({ who: "self", age: "adult", special: [], complaint: "other" }).find((x) => x.id === id) ?? complaints.flatMap((c) => c.questions).find((x) => x.id === id);
    if (q && "emergency" in q.yes) return WHY_SAFETY.warning;
    if (q && "level" in q.yes && (q.yes.level === "ORANGE" || q.yes.now)) return WHY_SAFETY.urgency;
    return WHY_SAFETY.routine;
  }
  if (step.startsWith("c:")) return WHY_SAFETY.summary;

  return WHY_LINES[step] ?? WHY_DEFAULT;
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
  // depth: "short" (one sentence), "normal", or "more" (everything verified on it)
  | { kind: "education"; answer: EducationAnswer; state: ConsultState; depth: "short" | "normal" | "more" }
  | { kind: "corrected"; state: ConsultState; line: string } // "I said left, not right"
  | { kind: "noted"; state: ConsultState; line: string } // "I also have back pain" — kept for the summary
  | { kind: "professional"; line: string } // the patient asks for a real doctor
  | { kind: "control"; action: "slower" | "faster" | "brief" | "detailed"; line: string; state: ConsultState } // "speak slower", "keep it short"
  | { kind: "needs-professional"; topic: ProfessionalTopic; state: ConsultState; line: string } // prescription, diagnosis, tests
  | { kind: "unclear"; state: ConsultState; line: string; difficulty: Difficulty };

const MORE = /\b(tell me more|explain (it |that )?more|more (detail|details|information|info)|in more detail|elaborate|say more)\b/i;
const SHORT = /\b(short(er)? answer|in short|briefly|keep it short|be brief|short version|summari[sz]e( it)?|just the main (point|thing))\b/i;
function styleRequest(words: string): "more" | "short" | null {
  if (MORE.test(words)) return "more";
  if (SHORT.test(words)) return "short";
  return null;
}
function educated(s: ConsultState, answer: EducationAnswer, depth: "short" | "normal" | "more" = "normal"): Outcome {
  return { kind: "education", answer, state: { ...s, lastEducation: answer.id }, depth };
}

export const KNOWLEDGE_LINE = KNOWLEDGE_LIMIT;
// Kept for older callers; the same honest knowledge limitation.
export const UNKNOWN_LINE = `${KNOWLEDGE_LINE} Let's carry on with your consultation.`;
const PROFESSIONAL_ANSWER: Record<ProfessionalTopic, string> = BOUNDARY_ANSWERS;
export const PROFESSIONAL_LINE = PROFESSIONAL_REQUEST;

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

// Clear signs of changing the last answer. A bare "sorry, no" is a polite
// answer to the question on screen, not a correction.
const FIX_MARK = /\b(oops|i meant|i mean|that'?s wrong|that was wrong|my mistake|wrong answer|correction)\b|^(no )?(sorry|wait)\b.*\b(i meant|it'?s|it is|actually|change)\b/;
const FIX_LEAD = /^(no |oh |um |uh )?(sorry|wait|oops|actually|i meant|i mean|that'?s wrong|that was wrong|my mistake|wrong answer|correction|it'?s|it is|no sorry)[\s,.;:!-]*/;
const VALUE_WORD: Record<string, string> = { yes: "Yes", no: "No", unsure: "Not sure" };
const RECHECK_TO: Record<Answer, string> = { yes: "yes", no: "no", unsure: "“not sure”" };

function answerCorrection(s: ConsultState, turn: Turn, words: string): { state: ConsultState; line: string } | null {
  const last = s.lastAnswered;
  if (!last || last.step === turn.step || !last.step.startsWith("q:")) return null;
  let t = clean(words);
  // "Actually no" when the question now on screen is not a yes/no one can only
  // be about the last answer.
  const marked = FIX_MARK.test(t) || (/^actually\b/.test(t) && !turn.step.startsWith("q:") && !turn.step.startsWith("confirm:") && turn.step !== "recheck");
  // "Actually no…" may change the last answer or answer this one: ask, never guess.
  const ambiguous = !marked && /^actually\b/.test(t) && turn.step.startsWith("q:");
  if (!marked && !ambiguous) return null;
  for (let i = 0; i < 4 && FIX_LEAD.test(t); i++) t = t.replace(FIX_LEAD, "").trim();
  const value = t ? (yesNo(t) as Answer | null) : null;
  if (!value || value === last.value) return null;
  const id = last.step.slice(2);
  if (ambiguous) {
    const qs = questionsFor(contextOf(s));
    const asked = qs.find((x) => x.id === id);
    if (!asked) return null;
    // Words that would raise urgency on the question now on screen answer it:
    // a danger sign is never delayed by a check about an earlier answer.
    const current = qs.find((x) => x.id === turn.step.slice(2));
    if (current && value !== "no" && ("emergency" in current.yes || ("level" in current.yes && (current.yes.level === "ORANGE" || current.yes.level === "RED" || current.yes.now)))) return null;
    const before = last.value === "unsure" ? "you weren't sure" : last.value;
    return { state: { ...s, recheck: { key: id, earlier: `${before} when I asked: “${asked.text}”`, now: `“${clip(words).slice(0, 80)}”`, to: value } }, line: "" };
  }
  const answers = { ...s.answers };
  delete answers[id];
  const cleared = { ...s, answers, prefilled: s.prefilled.filter((x) => x !== id) };
  const next = respondCore(cleared, last.step, value);
  if (next === cleared) return null;
  const q = questionsFor(contextOf(s)).find((x) => x.id === id);
  const what = q ? q.positive.charAt(0).toLowerCase() + q.positive.slice(1) : "the last question";
  return {
    state: { ...next, lastAnswered: { step: last.step, value }, corrections: [...s.corrections, `Answer changed to “${VALUE_WORD[value]}”: ${what}`] },
    line: `Okay — I've changed your last answer to “${VALUE_WORD[value]}” for: ${what}.`,
  };
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
  // A bare "yes"/"no" was the answer to a DIFFERENT question — never reused.
  // For a warning-sign question, only words that describe that sign count.
  const bare = (w: string) => w.trim().split(/\s+/).length <= 3 && /^(yes|yeah|yep|yup|no|nope|nah|not sure|maybe|ok|okay|sure|i don'?t know|idk|i think so)\b/i.test(w.trim());
  for (const earlier of [...s.said.slice(0, -1)].reverse()) {
    if (bare(earlier)) continue;
    if (turn.step.startsWith("q:")) {
      if (!yesFromWords(earlier).includes(turn.step.slice(2))) continue;
      const next = respond(s, turn.step, "yes");
      if (next !== s) return { kind: "answered", state: { ...next, notes: [`Sorry — you did tell me: “${earlier}”. I've noted it.`] } };
      continue;
    }
    if (turn.step.startsWith("confirm:") || turn.step === "recheck") continue;
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
  if (flagged.emergency || flagged.pendingFlags.length !== s.pendingFlags.length) {
    // An unsure danger word in the very first message: keep the words as the
    // main concern too, so the safety question comes next — not the greeting.
    const base = !flagged.emergency && turn.step === "concern" && s.concernText === undefined ? respondCore(flagged, "concern", words) : flagged;
    return { kind: "answered", state: absorb(base, words) };
  }

  // "Sorry, I meant yes" just after a yes/no answer changes THAT answer — it
  // is never taken as the answer to the question now on screen.
  const changed = answerCorrection(s, turn, words);
  if (changed) return changed.state.emergency || !changed.line ? { kind: "answered", state: changed.state } : { kind: "corrected", state: changed.state, line: changed.line };
  const fix = correction(s, words);
  if (fix) return { kind: "corrected", state: fix.state, line: fix.line };
  if (WANTS_PROFESSIONAL.test(words)) return { kind: "professional", line: PROFESSIONAL_LINE };
  // A question only a professional can answer: say so honestly, keep it for them.
  const pro = professionalQuestion(words);
  if (pro && turn.step !== "medicines") {
    const keep = pro === "serious" ? s.doctorQuestions : [...new Set([...s.doctorQuestions, words])];
    return { kind: "needs-professional", topic: pro, state: { ...s, doctorQuestions: keep }, line: `${PROFESSIONAL_ANSWER[pro]} ${turn.step === "concern" ? "What brought you here today?" : "Let's carry on."}` };
  }

  const term = askedTerm(normalizeWords(words));
  // A fuller verified answer wins over the one-line glossary meaning.
  const fuller = term && isGeneralQuestion(words) ? findEducation(words) : null;
  if (fuller) return educated(s, fuller);
  if (term) {
    const again = s.explainedTerms.includes(term.id) ? "As I mentioned, " : "";
    const T = `${term.term.charAt(0).toUpperCase()}${term.term.slice(1)}`;
    return { kind: "term", line: `${again}${again ? `“${term.term}”` : `“${T}”`} means ${term.meaning}.`, state: { ...s, explainedTerms: [...new Set([...s.explainedTerms, term.id])] } };
  }

  // Communication style — how the doctor talks, never what is medically said.
  const style = styleRequest(words);
  if (style) {
    const last = s.lastEducation ? allEducation().find((e) => e.id === s.lastEducation) : undefined;
    if (last && (style === "more" || style === "short")) return educated(s, last, style);
    if (style === "short") return { kind: "control", action: "brief", line: "Okay — I'll keep it short.", state: { ...s, style: { ...s.style, short: 2 } } };
    if (style === "more") return { kind: "control", action: "detailed", line: "Of course — I'll explain more as we go.", state: { ...s, style: { ...s.style, short: 0, explained: s.style.explained + 1 } } };
  }

  let meta = metaIntent(words);
  // "I don't know how to explain it" at the start is an answer, not a request.
  if (meta === "explain" && (turn.step === "concern" || turn.step === "concern-more" || turn.step === "describe") && !/\b(what do you mean|understand|what does)\b/i.test(words)) meta = null;
  if (meta === "why") return { kind: "why", line: whyLine(turn) };
  if (meta === "repeat") return { kind: "repeat" };
  if (meta === "slower") return { kind: "control", action: "slower", line: "Of course. I'll speak more slowly.", state: s };
  if (meta === "faster") return { kind: "control", action: "faster", line: "Okay. I'll speak at a normal pace.", state: s };
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
      return e ? educated(s, e) : { kind: "unclear", state: s, line: `${KNOWLEDGE_LINE} What brought you here today?`, difficulty: "knowledge" };
    }
    return { kind: "answered", state: respond(shortAnswer(s, words), "concern", words) };
  }

  // A clear health question ("What is TB?") is answered from verified content.
  const edu = general ? findEducation(words) : null;
  if (edu) return educated(s, edu);

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

  // "I also have back pain": a second problem — noted, not misunderstood.
  const other = addOtherConcern(withWordAnswers(s, words), words);
  if (other) return { kind: "noted", state: other.state, line: `${other.line} ${turn.question ?? turn.say}` };

  // A question that is not an answer, and not in the verified knowledge.
  if (general || isQuestion(words)) {
    return { kind: "unclear", state: s, line: `${KNOWLEDGE_LINE} Let's carry on. ${turn.question ?? turn.say}`, difficulty: "knowledge" };
  }

  // Not an answer — but facts mentioned on the way are still remembered. If
  // they contradict an earlier answer, the doctor asks about that at once.
  const absorbed = absorb(s, words);
  if (absorbed.recheck && !s.recheck) return { kind: "answered", state: absorbed };
  return { kind: "unclear", ...clarify(absorbed, turn) };
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

// Where a fact came from. Only "confirmed" and "from-words" are the patient's
// own statements; nothing is ever recorded as a fact by guessing.
export type FactStatus = "confirmed" | "from-words" | "uncertain" | "not-provided";
export type ChartRow = { label: string; value: string; provided: boolean; status: FactStatus };

const UNCERTAIN_VALUES = /^(not sure|not remembered|could not describe|not sure about)\b|not asked/i;
function statusOf(value: string, provided: boolean): FactStatus {
  if (!provided) return "not-provided";
  if (UNCERTAIN_VALUES.test(value)) return "uncertain";
  if (/\((from what you said|patient's words)\)/.test(value)) return "from-words";
  return "confirmed";
}
export type Chart = {
  reported: ChartRow[]; // REPORTED BY PATIENT
  safety: ChartRow[]; // answers to safety (danger-sign) questions
  routing: ChartRow[] | null; // SYSTEM ROUTING INFORMATION (only once known)
};

const label = <T extends { id: string; label: string }>(list: readonly T[], id?: string) => list.find((x) => x.id === id)?.label;

export function chartOf(s: ConsultState): Chart {
  // Missing → "Not provided"; a valid "not sure / forgot" answer is recorded as such.
  const make = (l: string, value: string, provided: boolean): ChartRow => ({ label: l, value, provided, status: statusOf(value, provided) });
  const row = (l: string, v?: string, key?: string): ChartRow =>
    v && v.trim()
      ? make(l, v.trim(), true)
      : key && s.unknown[key]
        ? make(l, s.unknown[key], true)
        : key && s.style.distressed && SHORTENED.includes(key) && nextTurn(s).input.kind === "result"
          ? make(l, "Not asked (kept the consultation short) — please ask", false)
          : make(l, NOT_PROVIDED, false);
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
  const choices = s.complaint ? choicesFor(ctx) : [];
  for (const c of choices) {
    const v = c.id === "temp" && s.temperature ? `${s.temperature} (measured by patient${s.remembered.includes("temperature") ? ", from what you said" : ""})` : s.unknown[`c:${c.id}`] ?? label(c.options, s.choices[c.id]);
    if (v) reported.push(row(c.summaryLabel, v));
  }
  // A reading the patient mentioned, where no temperature question is asked.
  if (s.temperature && !choices.some((c) => c.id === "temp")) reported.push(row("Temperature", `${s.temperature} (measured by patient${s.remembered.includes("temperature") ? ", from what you said" : ""})`));
  if (s.unknown.fever) reported.push(row("Fever", s.unknown.fever));
  if (s.otherConcerns.length) reported.push(row("Other problems mentioned (not assessed)", `${s.otherConcerns.join("; ")} (patient's words)`));
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
