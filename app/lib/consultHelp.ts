// Helping the patient through the consultation: plain-English explanations
// of questions, why a question is asked, and recognising what the patient
// means when they are unsure, confused, or asking something else.
//
// Nothing here decides urgency. Explanations only re-say a question in
// everyday words (the glossary in knowledge/glossary.ts); reasons never reveal
// scoring. Only what the patient actually says is used: no guessing about
// education, intelligence, diagnosis or feelings beyond their own words.

// ---------------- Plain-English glossary ----------------

import { GLOSSARY } from "./knowledge/glossary";

export function plainTerms(text: string): { term: string; meaning: string }[] {
  const out: { term: string; meaning: string }[] = [];
  for (const g of GLOSSARY) {
    const m = text.match(g.match);
    if (m && !out.some((o) => o.meaning === g.meaning)) out.push({ term: m[0].toLowerCase(), meaning: g.meaning });
    if (out.length >= 3) break;
  }
  return out;
}

export function plainMeanings(text: string): string[] {
  return plainTerms(text).map((x) => `“${x.term}” means ${x.meaning}`);
}

// "Pressure", "it's like a squeeze" → the plain feeling word, so it can be
// checked in context ("chest pressure") by the safety detector.
export function feelingWord(text: string): string | null {
  const t = text.toLowerCase();
  if (/\b(pressure|tight\w*|squeez\w*|heavy|heaviness|crush\w*|pressing)\b/.test(t)) return "pressure";
  if (/\b(pain|painful|hurt\w*|ache|aching|sore|sharp|stabbing)\b/.test(t)) return "pain";
  if (/\b(burn\w*)\b/.test(t)) return "burning";
  return null;
}

// ---------------- What the patient means ----------------

// ---------------- Messy, real-world typing ----------------

// Text-speak, common misspellings and missing apostrophes, so "idk",
// "somethin wrong wit my chest" or "cant breath" are understood. Used for
// understanding only; the patient's own words are still what is recorded.
const FIXES: [RegExp, string][] = [
  [/[’‘`´]/g, "'"],
  [/\bidk\b/g, "i don't know"],
  [/\bdunno\b/g, "don't know"],
  [/\bidc\b/g, "i don't care"],
  [/\b(im|iam)\b/g, "i'm"],
  [/\bive\b/g, "i've"],
  [/\bid\b(?= (like|want|rather))/g, "i'd"],
  [/\b(dont|dnt)\b/g, "don't"],
  [/\b(cant|cnt)\b/g, "can't"],
  [/\bwont\b/g, "won't"],
  [/\bdidnt\b/g, "didn't"],
  [/\bdoesnt\b/g, "doesn't"],
  [/\bisnt\b/g, "isn't"],
  [/\bwasnt\b/g, "wasn't"],
  [/\bhavent\b/g, "haven't"],
  [/\bits\b(?= (been|getting|hurting|very|really|a |not|like))/g, "it's"],
  [/\bu\b/g, "you"],
  [/\bur\b/g, "your"],
  [/\b(pls|plz|plez)\b/g, "please"],
  [/\b(somethin|smthing|sumthing|somthing)\b/g, "something"],
  [/\bnothin\b/g, "nothing"],
  [/\bwit\b/g, "with"],
  [/\bwat\b/g, "what"],
  [/\b(abt|bout)\b/g, "about"],
  [/\b(b4)\b/g, "before"],
  [/\b(wks?)\b/g, "weeks"],
  [/\b(hrs?)\b/g, "hours"],
  [/\b(mins?)\b/g, "minutes"],
  [/\b(yday|yest|yesterdy)\b/g, "yesterday"],
  [/\b(2day|tday)\b/g, "today"],
  [/\b(can't|cannot|can not|hard to|trouble|unable to|difficult to|struggling to) breath\b/g, "$1 breathe"],
  [/\b(brething|breating|breathin)\b/g, "breathing"],
  [/\b(stomache|stomch|stomac|tummy)\b/g, "stomach"],
  [/\b(chst|chesst)\b/g, "chest"],
  [/\b(hed)\b/g, "head"],
  [/\b(feaver|fevr|fiver|fevar)\b/g, "fever"],
  [/\b(coff|cogh|caugh|couf)\b/g, "cough"],
  [/\b(cofing|coffing|caughing|coughin)\b/g, "coughing"],
  [/\b(diarrhea|diarhea|diarrohea|diarrhoe|loose motions?)\b/g, "diarrhoea"],
  [/\b(vomitting|vommiting|vomitin)\b/g, "vomiting"],
  [/\b(pregnent|pragnant|pregant|pregnat)\b/g, "pregnant"],
  [/\b(bleding|bleedin|bledding)\b/g, "bleeding"],
  [/\b(wierd)\b/g, "weird"],
  [/\b(dizy|dizzey)\b/g, "dizzy"],
  [/\b(hedache|headace)\b/g, "headache"],
  [/\b(painfull)\b/g, "painful"],
  [/\b(alot)\b/g, "a lot"],
  [/\bn\b(?= \w)/g, "and"],
  [/\b(bcoz|coz|cuz|bc)\b/g, "because"],
  [/\s+/g, " "],
];

export function normalizeWords(text: string): string {
  let t = text.toLowerCase();
  for (const [re, to] of FIXES) t = t.replace(re, to);
  return t.trim();
}

export type Meta = "explain" | "why" | "repeat" | "rephrase" | "slower" | "faster" | "already";

const EXPLAIN = /\b(i don'?t understand|i do not understand|don'?t get it|what do you mean|what does (that|this|it)( word| term)? mean|what do (those|these) words mean|meaning\??$|explain( that| please| it)?$|not clear|confus(ed|ing)|what is that\??$|huh\??$|pardon\??$|say (it|that) (more )?simpl\w*)\b/;
const WHY = /\b(why (are|do) you (ask|need|want)\w*|why (does|is) (that|this|it) (matter|important)|why that question|why do you need to know|what is this for)\b/;
const REPEAT = /^(repeat( that| it| please)?|say (it|that) again|again please|come again|sorry\??|what\??|can you repeat( that| it)?\??|please repeat)$/;
const REPHRASE = /\b((ask|say|put|explain) (it |that |this |the question )?(differently|another way|a different way|in other words|in another way|more simply|simpler|in simple words)|rephrase|use (simpler|easier|different) words|i don'?t get the question)\b/;
const SLOWER = /\b((speak|talk|say it|go|read it) (a bit |a little |more )?slow(ly|er)?|slow down|too fast|slower please)\b/;
const FASTER = /\b((speak|talk|go) (a bit |a little )?faster|too slow|normal speed)\b/;
const ALREADY = /\b(already (told|said|answered|mentioned|gave|explained)|i (told|said) (you|that)( already)?|as i said|i just said)\b/;

export function metaIntent(text: string): Meta | null {
  const t = normalizeWords(text).replace(/[.!]+$/, "");
  if (WHY.test(t)) return "why";
  if (ALREADY.test(t)) return "already";
  if (SLOWER.test(t)) return "slower";
  if (FASTER.test(t)) return "faster";
  if (REPHRASE.test(t)) return "rephrase";
  if (EXPLAIN.test(t)) return "explain";
  if (REPEAT.test(t)) return "repeat";
  return null;
}

export type Uncertain = "Not sure" | "Not remembered" | "Could not describe";

// "I don't know", "maybe", "I forgot", "I can't explain it" — all valid answers.
export function uncertainty(text: string): Uncertain | null {
  const t = normalizeWords(text);
  if (/\b(forgot|forget|forgotten|can'?t remember|cannot remember|don'?t remember|do not remember|not remember)\b/.test(t)) return "Not remembered";
  if (/\b(can'?t explain|cannot explain|don'?t know how to (explain|say|describe)|hard to (explain|describe)|can'?t describe|cannot describe)\b/.test(t)) return "Could not describe";
  if (/^(i )?(really )?(don'?t know|do not know|dunno|not sure|i'?m not sure|unsure|maybe|perhaps|no idea|can'?t say|not certain|hard to say|no clue|not really sure|i guess|possibly|might be)\b/.test(t)) return "Not sure";
  return null;
}

// "I don't feel well" — true when the words name no problem we can work with.
export function isVagueConcern(text: string, complaintIds: string[]): boolean {
  if (complaintIds.length) return false;
  const t = normalizeWords(text);
  return (
    t.split(/\s+/).filter(Boolean).length <= 12 &&
    /\b(not feeling (well|good|right)|don'?t feel (well|good|right)|feel(ing)? (unwell|sick|ill|bad|off|strange|weird|funny)|unwell|sick|ill|not well|something('s| is) wrong|don'?t (really )?know how to (explain|say|describe)|can'?t explain|hard to explain|not sure|don'?t know|no idea|maybe|forgot|help|i'?m not okay|something'?s off)\b/.test(t)
  );
}

// Words that show the patient is distressed, in their own words only.
export function soundsDistressed(text: string): boolean {
  return /\b(scared|frightened|terrified|panick\w*|very worried|so worried|please help|help me|unbearable|can'?t bear|can'?t take (it|this)|crying|so much pain|worst pain|really bad)\b/i.test(text);
}

// Words that describe how something feels, for "Can you describe it?"
export const DESCRIBE_OPTIONS = [
  { id: "pain", label: "Pain or aching", words: "pain" },
  { id: "pressure", label: "Pressure, tightness or heaviness", words: "pressure" },
  { id: "burning", label: "Burning", words: "burning" },
  { id: "other", label: "Something else", words: "" },
  { id: "unsure", label: "I can't describe it", words: "" },
] as const;

// Questions only a qualified professional can answer: a prescription or dose,
// a diagnosis, or whether a test is needed. These are real (clinical) reasons
// for a human — the doctor says so honestly and saves the question for them.
export type ProfessionalTopic = "prescription" | "diagnosis" | "test" | "serious";

export function professionalQuestion(text: string): ProfessionalTopic | null {
  const t = normalizeWords(text);
  if (/\b(prescribe|prescription|which (medicine|tablet|antibiotic|drug)s?|what (medicine|tablet|antibiotic|drug|dose)s?|how (much|many) (should i|do i|to|can i) take|dose|dosage|(can|should) i take|give me (some )?(medicine|tablets?|antibiotics?))\b/.test(t)) return "prescription";
  if (/\b(do i need|should i (get|have|do)|will i need)\b.*\b(test|tests|x-?ray|scan|blood test|ultrasound|ecg)\b/.test(t)) return "test";
  if (/^(is (it|this) (serious|bad|dangerous)|how serious is (it|this))\b/.test(t)) return "serious";
  if (/\b(do i have|have i got|is (it|this)|could (it|this) be|might (it|this) be|am i)\b.*\b(cancer|tb|tuberculosis|hiv|aids|dengue|malaria|diabetes|diabetic|heart attack|stroke|covid|infection|pneumonia|typhoid|ulcer|pregnant)\b/.test(t)) return "diagnosis";
  if (/\b(what do i have|what'?s wrong with me|what is wrong with me|diagnose|what disease|what illness)\b/.test(t)) return "diagnosis";
  return null;
}
