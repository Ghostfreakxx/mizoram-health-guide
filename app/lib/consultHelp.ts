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

export type Meta = "explain" | "why" | "repeat";

const EXPLAIN = /\b(i don'?t understand|i do not understand|don'?t get it|what do you mean|what does (that|this|it)( word| term)? mean|what do (those|these) words mean|meaning\??$|explain( that| please| it)?$|not clear|confus(ed|ing)|what is that\??$|huh\??$|pardon\??$|say (it|that) (more )?simpl\w*)\b/;
const WHY = /\b(why (are|do) you (ask|need|want)\w*|why (does|is) (that|this|it) (matter|important)|why that question|why do you need to know|what is this for)\b/;
const REPEAT = /^(repeat|say (it|that) again|again please|come again|sorry\??|what\??)$/;

export function metaIntent(text: string): Meta | null {
  const t = text.toLowerCase().replace(/[’‘]/g, "'").trim();
  if (WHY.test(t)) return "why";
  if (EXPLAIN.test(t)) return "explain";
  if (REPEAT.test(t)) return "repeat";
  return null;
}

export type Uncertain = "Not sure" | "Not remembered" | "Could not describe";

// "I don't know", "maybe", "I forgot", "I can't explain it" — all valid answers.
export function uncertainty(text: string): Uncertain | null {
  const t = text.toLowerCase().replace(/[’‘]/g, "'").trim();
  if (/\b(forgot|forget|forgotten|can'?t remember|cannot remember|don'?t remember|do not remember|not remember)\b/.test(t)) return "Not remembered";
  if (/\b(can'?t explain|cannot explain|don'?t know how to (explain|say|describe)|hard to (explain|describe)|can'?t describe|cannot describe)\b/.test(t)) return "Could not describe";
  if (/^(i )?(don'?t know|do not know|dunno|not sure|i'?m not sure|unsure|maybe|perhaps|no idea|can'?t say|not certain|hard to say)\b/.test(t)) return "Not sure";
  return null;
}

// "I don't feel well" — true when the words name no problem we can work with.
export function isVagueConcern(text: string, complaintIds: string[]): boolean {
  if (complaintIds.length) return false;
  const t = text.toLowerCase().replace(/[’‘]/g, "'");
  return (
    t.split(/\s+/).filter(Boolean).length <= 12 &&
    /\b(not feeling (well|good|right)|don'?t feel (well|good|right)|feel(ing)? (unwell|sick|ill|bad|off|strange|weird|funny)|unwell|sick|ill|not well|something('s| is) wrong|don'?t (really )?know how to (explain|say|describe)|can'?t explain|hard to explain|not sure|don'?t know|help)\b/.test(t)
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
