// Health education inside a consultation ("What is TB?").
//
// Every answer is taken word for word from the site's reviewed topic pages
// (app/content/*), which list their sources. Nothing here is generated, and
// a test checks that each answer still appears in that content. These
// curated entries handle common questions precisely; anything else is looked
// up in the verified Health Knowledge layer (lib/knowledge). If neither has
// it, the doctor says so honestly — never a made-up answer.
//
// Education is always shown separately from the personal consultation: it
// is general information, not an assessment of the patient.

import { diabetes } from "../content/diabetes";
import { heart } from "../content/heart";
import { hiv } from "../content/hiv";
import { malaria } from "../content/malaria";
import { tb } from "../content/tb";
import type { TopicContent } from "../content/types";
import { retrieve } from "./knowledge";

export type EducationAnswer = {
  id: string;
  question: string; // the question as the doctor understood it
  text: string[]; // verbatim from the topic page
  topic: { title: string; href: string };
  sources: string[];
};

type Entry = {
  id: string;
  question: string;
  topic: TopicContent;
  // all must match (topic word + intent)
  match: RegExp[];
  text: (t: TopicContent) => string[];
};

const faq = (t: TopicContent, q: RegExp) => t.faqs.find((f) => q.test(f.q))?.a ?? "";
const myth = (t: TopicContent, m: RegExp) => t.myths.find((f) => m.test(f.myth))?.fact ?? "";

const TB = /\b(tb|tuberculosis)\b/;
const HIV = /\b(hiv|aids)\b/;
const BP = /\b(blood pressure|bp|hypertension)\b/;
const DENGUE = /\bdengue\b/;
const MALARIA = /\bmalaria\b/;
const DIABETES = /\b(diabetes|diabetic|blood sugar)\b/;
const HEART_ATTACK = /\b(heart attack|stroke)\b/;
const SPREAD = /\b(spread|spreads|spreading|catch|infect\w*|contagious|transmit\w*)\b|\bhow (do|does|can) (you|i|people|someone) (get|catch)\b|\bpass(ed)? (on|from)\b/;

const ENTRIES: Entry[] = [
  { id: "tb-finish", question: "Why should I finish my TB medicine?", topic: tb, match: [TB, /\b(finish|complete|stop|stopping|full course|medicine|treatment|tablets?)\b/], text: (t) => [t.overview[2]] },
  { id: "tb-free", question: "Is TB treatment free?", topic: tb, match: [TB, /\b(free|cost|pay|price)\b/], text: (t) => [faq(t, /free/i)] },
  { id: "tb-spread", question: "How does TB spread?", topic: tb, match: [TB, SPREAD], text: (t) => [t.overview[0]] },
  { id: "tb-what", question: "What is TB?", topic: tb, match: [TB], text: (t) => [t.overview[0], t.intro] },

  { id: "hiv-spread", question: "How does HIV spread?", topic: hiv, match: [HIV, SPREAD], text: (t) => [t.local?.text ?? "", myth(t, /hugging/i)] },
  { id: "hiv-test", question: "Where can I get an HIV test?", topic: hiv, match: [HIV, /\b(test|tested|testing|check)\b/], text: (t) => [faq(t, /tested/i)] },
  { id: "hiv-pep", question: "What is PEP?", topic: hiv, match: [/\bpep\b/], text: (t) => [faq(t, /PEP/)] },
  { id: "hiv-what", question: "What is HIV?", topic: hiv, match: [HIV], text: (t) => [t.overview[0], t.overview[2]] },

  { id: "bp-what", question: "What does blood pressure mean?", topic: heart, match: [BP], text: (t) => [faq(t, /blood pressure numbers/i), t.overview[2]] },
  { id: "heart-attack", question: "What is a heart attack?", topic: heart, match: [HEART_ATTACK], text: (t) => [t.overview[1]] },

  { id: "dengue-painkillers", question: "Can I take painkillers for dengue?", topic: malaria, match: [DENGUE, /\b(painkiller|paracetamol|ibuprofen|aspirin|medicine|tablet)s?\b/], text: (t) => [faq(t, /painkillers/i)] },
  { id: "dengue-what", question: "What is dengue?", topic: malaria, match: [DENGUE], text: (t) => [t.overview[1]] },
  { id: "malaria-test", question: "Where can I get a malaria test?", topic: malaria, match: [MALARIA, /\b(test|tested|testing|check)\b/], text: (t) => [faq(t, /malaria test/i)] },
  { id: "malaria-what", question: "What is malaria?", topic: malaria, match: [MALARIA], text: (t) => [t.overview[0], t.overview[2]] },

  { id: "diabetes-what", question: "What is diabetes?", topic: diabetes, match: [DIABETES], text: (t) => [t.overview[0]] },
];

// A general health question (not a description of the patient's own problem).
const QUESTION =
  /^(what|whats|what's|how|why|is|are|can|could|does|do|should|when|where|who|which|tell me about|explain|define)\b|\?\s*$/;
const PERSONAL = /\b(i have|i've|i am|i'm|my|me|i feel|i got|hurts?|pain in)\b/;

// Any question ("Can I drink alcohol with my tablets?").
export function isQuestion(text: string): boolean {
  return QUESTION.test(text.toLowerCase().trim());
}

export function isGeneralQuestion(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (!QUESTION.test(t)) return false;
  // "Is my chest pain serious?" is about the patient, not general education.
  return !PERSONAL.test(t) || /^(what is|what's|what are|how does|how do|why should|tell me about|explain)\b/.test(t);
}

export function findEducation(text: string): EducationAnswer | null {
  const t = text.toLowerCase();
  const e = ENTRIES.find((x) => x.match.every((m) => m.test(t)));
  if (!e) {
    const k = retrieve(text);
    return k ? { id: k.id, question: k.question, text: k.text, topic: k.topic, sources: k.sources } : null;
  }
  const parts = e.text(e.topic).filter(Boolean);
  if (!parts.length) return null;
  return {
    id: e.id,
    question: e.question,
    text: parts,
    topic: { title: e.topic.title, href: e.topic.slug },
    sources: e.topic.sources.map((s) => s.label),
  };
}

export const EDUCATION_IDS = ENTRIES.map((e) => e.id);
export const allEducation = (): EducationAnswer[] => ENTRIES.map((e) => findEducation(e.question)!).filter(Boolean);
