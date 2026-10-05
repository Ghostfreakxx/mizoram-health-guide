// Digital Receptionist: turns a short free-text message into a structured
// hand-off for the Triage Desk.
//
// It does NOT decide urgency on its own. It only:
// - detects emergency red flags (which always win),
// - suggests the main concern, who the patient is, how long, and any special
//   situation,
// - pre-fills answers that can only RAISE urgency (never "no" answers).
// The deterministic triage engine then asks its questions and decides.

import { type Detection, detectRedFlags, normalize } from "./detect";
import type { AgeGroup, Answer, Duration, Special } from "./triage";

export type Reception = {
  detection: Detection;
  complaintIds: string[]; // best first; empty if not understood
  who?: "self" | "other";
  relation?: string;
  ageHint?: AgeGroup;
  special: Special[];
  duration?: Duration;
  durationText?: string;
  prefill: Record<string, Answer>;
};

const COMPLAINT_KEYWORDS: [string, RegExp][] = [
  ["hiv", /\b(hiv|aids|condom|unprotected|sexually|std|sti|needle ?stick|shared (a )?needles?|exposure|exposed)\b/],
  ["substance", /\b(alcohol|drinking too much|drunk|drugs?|heroin|addict\w*|withdrawal|de-?addiction)\b/],
  ["mental", /\b(stress\w*|sad|sadness|depress\w*|anxi\w*|worried|worry|panic|lonely|mental|hopeless|can'?t sleep|cannot sleep|no sleep)\b/],
  ["fever", /\b(fever\w*|temperature|chills|shivering|malaria|dengue|hot body)\b/],
  ["cough", /\b(cough\w*|breathless\w*|short of breath|shortness of breath|wheez\w*|phlegm|tb|tuberculosis)\b/],
  ["heart", /\b(chest|heart|palpitations?|heartbeat|blood pressure|bp|hypertension)\b/],
  ["stomach", /\b(stomach|vomit\w*|diarrh\w*|loose motions?|nausea|abdom\w*|belly|tummy|throwing up)\b/],
  ["headache", /\b(headaches?|dizz\w*|migraine|head ?ache)\b/],
  ["injury", /\b(injur\w*|wound|cut|burn\w*|bite|bitten|fell|fall|fracture\w*|sprain\w*|accident)\b/],
  ["ent", /\b(ear|ears|earache|nose|nosebleed|throat|hearing|tonsil\w*|hoarse)\b/],
  ["mouth", /\b(tooth|teeth|toothache|gums?|mouth)\b/],
  ["eye", /\b(eyes?|vision|blurry|blurred|see clearly)\b/],
  ["skin", /\b(rash\w*|itch\w*|skin|pimples?|patch(es)?|moles?|blisters?)\b/],
  ["bones", /\b(back ?pain|joints?|knees?|bones?|shoulder|neck pain|hip)\b/],
  ["urine", /\b(urin\w*|pee|peeing|passing water)\b/],
  ["cancer", /\b(lump|lumps|cancer|losing weight|weight loss|lost weight)\b/],
  ["pregnancy", /\b(pregnan\w*)\b/],
];

const OTHER_PERSON = /\b(my )?(mother|mom|mum|mummy|father|dad|daddy|papa|son|daughter|child|kid|baby|wife|husband|brother|sister|grandmother|grandfather|grandma|grandpa|granny|aunt|uncle|friend|neighbour|neighbor|patient|he|she|him|her)\b/;
const OLDER = /\b(grandmother|grandfather|grandma|grandpa|granny|elderly|old (man|woman|lady))\b/;
const BABY = /\b(baby|newborn|new born|infant)\b/;

const NUM: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, couple: 2, few: 3, several: 4,
};

function durationFrom(t: string): { duration: Duration; text: string } | undefined {
  if (/\b(today|this morning|this afternoon|this evening|tonight|just now|an hour|few hours|hours ago|since morning)\b/.test(t)) {
    return { duration: "today", text: "today" };
  }
  if (/\b(since yesterday|yesterday|last night)\b/.test(t)) return { duration: "1-3-days", text: "since yesterday" };
  if (/\b(last week)\b/.test(t)) return { duration: "4-14-days", text: "since last week" };
  if (/\b(last month|last year|for months|for years|many months|long time)\b/.test(t)) return { duration: "over-2-weeks", text: "for a long time" };
  const m = t.match(/\b(more than |over |longer than |at least |less than |under )?(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|couple|few|several)( of)? (days?|weeks?|months?|years?)\b/);
  if (!m) return undefined;
  const n = /^\d+$/.test(m[2]) ? parseInt(m[2], 10) : NUM[m[2]];
  const unit = m[4].replace(/s$/, "");
  // "more than two weeks" is past the boundary; "less than a week" is before it.
  const shift = !m[1] ? 0 : /^(less|under)/.test(m[1]) ? -0.5 : 0.5;
  const days = n * (unit === "day" ? 1 : unit === "week" ? 7 : unit === "month" ? 30 : 365) + shift;
  const duration: Duration = days < 1 ? "today" : days <= 3 ? "1-3-days" : days <= 14 ? "4-14-days" : "over-2-weeks";
  return { duration, text: m[0] };
}

function ageFrom(t: string): AgeGroup | undefined {
  const m = t.match(/\b(\d+) ?(days?|weeks?|months?|years?|yrs?)( old)?\b/);
  if (m && /old|baby|child|son|daughter|aged|age/.test(t)) {
    const n = parseInt(m[1], 10);
    const unit = m[2];
    const months = unit.startsWith("day") ? n / 30 : unit.startsWith("week") ? n / 4.3 : unit.startsWith("month") ? n : n * 12;
    if (months < 2) return "young-infant";
    if (months < 60) return "child-under-5";
    if (months < 216) return "child";
    if (months < 720) return "adult";
    return "older";
  }
  if (OLDER.test(t)) return "older";
  return undefined;
}

export function receive(message: string): Reception {
  const detection = detectRedFlags(message);
  const t = normalize(typeof message === "string" ? message.slice(0, 2000) : "");

  const scored = COMPLAINT_KEYWORDS.map(([id, re]) => ({ id, n: (t.match(new RegExp(re.source, "g")) ?? []).length }))
    .filter((s) => s.n > 0);
  // Pregnancy is a situation, not a complaint, when another concern is named.
  const named = scored.filter((s) => s.id !== "pregnancy");
  const ranked = (named.length ? named : scored).sort((a, b) => b.n - a.n).map((s) => s.id);

  const special: Special[] = [];
  if (/\bpregnan\w*\b/.test(t)) special.push("pregnant");
  if (/\b(gave birth|given birth|delivered|just had a baby|after (the )?delivery|post ?partum)\b/.test(t)) special.push("postpartum");
  if (/\b(hiv positive|living with hiv|have hiv|has hiv|chemo\w*|cancer treatment|transplant|steroid)\b/.test(t)) special.push("immunocompromised");

  const ageHint = ageFrom(t);

  let complaintIds = ranked;
  if (BABY.test(t) || (ageHint && (ageHint === "young-infant" || ageHint === "child-under-5"))) {
    complaintIds = ranked.length ? ranked : ["child"];
  }

  const relationMatch = t.match(OTHER_PERSON);
  const who: "self" | "other" | undefined = relationMatch ? "other" : /\b(i|i'm|im|me|my)\b/.test(t) ? "self" : undefined;

  const d = durationFrom(t);

  // Pre-fill answers that can only raise urgency.
  const prefill: Record<string, Answer> = {};
  if (complaintIds[0] === "cough" && d?.duration === "over-2-weeks") prefill["cough-2weeks"] = "yes";
  if (complaintIds[0] === "hiv" && /\b(yesterday|last night|today|this morning|(1|2|3|one|two|three) days? ago)\b/.test(t)) {
    prefill["hiv-72h"] = "yes";
  }
  if (complaintIds[0] === "fever" && /\b(fever (went|has gone|gone|disappeared|stopped|came down)|no more fever|fever is gone)\b/.test(t) && /\b(weak\w*|sleepy|restless|tired)\b/.test(t)) {
    prefill["fever-weaker"] = "yes";
  }

  return {
    detection,
    complaintIds,
    who,
    relation: relationMatch && relationMatch[2] !== "he" && relationMatch[2] !== "she" ? relationMatch[2] : undefined,
    ageHint,
    special,
    duration: d?.duration,
    durationText: d?.text,
    prefill,
  };
}
