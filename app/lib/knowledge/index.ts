// The verified Health Knowledge layer.
//
// The virtual doctor answers general health questions ONLY from content that
// is already published on this site after review, and that lists its
// sources: the topic pages (app/content), the Medicine Information guide and
// the Lab Report Explainer. Each paragraph becomes a passage that keeps its
// sources; retrieval returns passages word for word — nothing is generated.
//
// Adding knowledge = adding reviewed content to those modules (or a new
// module registered in SOURCES_OF_KNOWLEDGE below). Categories without
// content are listed as "awaiting verified content", so the doctor says
// honestly that she does not have that information yet.

import { labTests } from "../../ai-hospital/data/labTests";
import { generalSafety, medicines } from "../../ai-hospital/data/medicines";
import { cancer } from "../../content/cancer";
import { diabetes } from "../../content/diabetes";
import { drugs } from "../../content/drugs";
import { heart } from "../../content/heart";
import { hiv } from "../../content/hiv";
import { malaria } from "../../content/malaria";
import { mental } from "../../content/mental";
import { motherChild } from "../../content/motherChild";
import { tb } from "../../content/tb";
import { tobacco } from "../../content/tobacco";
import type { TopicContent } from "../../content/types";
import { sourcesFor } from "../sources";

export type Category =
  | "symptoms"
  | "human-body"
  | "common-illnesses"
  | "infectious-diseases"
  | "heart-health"
  | "lung-health"
  | "digestive-health"
  | "diabetes"
  | "blood-pressure"
  | "cancer"
  | "hiv"
  | "tb"
  | "malaria"
  | "dengue"
  | "pregnancy"
  | "child-health"
  | "mental-wellbeing"
  | "substance-use"
  | "vaccination"
  | "nutrition"
  | "medicine-safety"
  | "tests-and-reports";

export const CATEGORY_LABEL: Record<Category, string> = {
  symptoms: "Symptoms",
  "human-body": "Human body",
  "common-illnesses": "Common illnesses",
  "infectious-diseases": "Infectious diseases",
  "heart-health": "Heart health",
  "lung-health": "Lung health",
  "digestive-health": "Digestive health",
  diabetes: "Diabetes",
  "blood-pressure": "Blood pressure",
  cancer: "Cancer",
  hiv: "HIV",
  tb: "TB",
  malaria: "Malaria",
  dengue: "Dengue",
  pregnancy: "Pregnancy",
  "child-health": "Child health",
  "mental-wellbeing": "Mental wellbeing",
  "substance-use": "Substance use",
  vaccination: "Vaccination",
  nutrition: "Nutrition",
  "medicine-safety": "Medicine safety",
  "tests-and-reports": "Tests and reports",
};

export type Passage = {
  id: string;
  categories: Category[];
  topic: { title: string; href: string };
  terms: RegExp; // words that show a question is about this topic
  question?: string; // a FAQ or myth this passage answers
  kind: "overview" | "faq" | "myth" | "sign" | "prevention" | "local" | "medicine" | "test";
  text: string;
  sources: string[];
};

type TopicSpec = { content: TopicContent; categories: Category[]; terms: RegExp };

const TOPICS: TopicSpec[] = [
  { content: tb, categories: ["tb", "infectious-diseases", "lung-health"], terms: /\b(tb|tuberculosis)\b/ },
  { content: hiv, categories: ["hiv", "infectious-diseases"], terms: /\b(hiv|aids|art|pep|ictc)\b/ },
  { content: heart, categories: ["heart-health", "blood-pressure"], terms: /\b(heart|blood pressure|bp|hypertension|cholesterol|stroke|heart attack)\b/ },
  { content: malaria, categories: ["malaria", "dengue", "infectious-diseases"], terms: /\b(malaria|dengue|mosquito\w*)\b/ },
  { content: diabetes, categories: ["diabetes"], terms: /\b(diabet\w*|blood sugar|sugar level|insulin|glucose)\b/ },
  { content: cancer, categories: ["cancer"], terms: /\b(cancer\w*|tumou?r\w*)\b/ },
  { content: tobacco, categories: ["substance-use", "cancer"], terms: /\b(tobacco|smok\w*|cigarettes?|bidi|kuhva|betel|gutkha|khaini|paan)\b/ },
  { content: drugs, categories: ["substance-use"], terms: /\b(alcohol\w*|drink\w*|drugs?|heroin|addict\w*|substance)\b/ },
  { content: mental, categories: ["mental-wellbeing"], terms: /\b(mental|depress\w*|anxiety|anxious|stress\w*|panic|sleep|lonel\w*)\b/ },
  { content: motherChild, categories: ["pregnancy", "child-health", "vaccination"], terms: /\b(pregnan\w*|baby|babies|newborn|breastfeed\w*|antenatal|vaccin\w*|immuni[sz]\w*|delivery)\b/ },
];

function topicPassages(t: TopicSpec): Passage[] {
  const c = t.content;
  const base = { categories: t.categories, topic: { title: c.title, href: c.slug }, terms: t.terms, sources: c.sources.map((s) => s.label) };
  const out: Passage[] = [];
  c.overview.forEach((text, i) => out.push({ ...base, id: `${c.slug}#overview-${i}`, kind: "overview", text }));
  if (c.local) out.push({ ...base, id: `${c.slug}#local`, kind: "local", text: c.local.text });
  c.faqs.forEach((f, i) => out.push({ ...base, id: `${c.slug}#faq-${i}`, kind: "faq", question: f.q, text: f.a }));
  c.myths.forEach((m, i) => out.push({ ...base, id: `${c.slug}#myth-${i}`, kind: "myth", question: m.myth, text: m.fact }));
  c.prevention.forEach((p, i) => out.push({ ...base, id: `${c.slug}#prevention-${i}`, kind: "prevention", question: p.title, text: p.text }));
  return out;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function medicinePassages(): Passage[] {
  const out: Passage[] = [];
  for (const m of medicines) {
    const names = [m.name.replace(/\s*\(.*\)/, ""), ...(m.also ? m.also.split(/[,/]/) : []), ...(m.name.match(/\(([^)]+)\)/)?.[1].split(/[,/]/) ?? [])]
      .map((n) => n.trim().toLowerCase())
      .filter((n) => n.length > 1);
    const terms = new RegExp(`\\b(${names.map(escape).join("|")})s?\\b`);
    const sources = sourcesFor(m.sourceIds).map((s) => s.title);
    const base = { categories: ["medicine-safety"] as Category[], topic: { title: "Medicine information", href: "/ai-hospital/medicines" }, terms, sources };
    out.push({ ...base, id: `medicine:${m.id}#used`, kind: "medicine", question: `What is ${m.name} used for?`, text: `${m.name}: ${m.usedFor}` });
    m.keyPoints.forEach((k, i) => out.push({ ...base, id: `medicine:${m.id}#${i}`, kind: "medicine", text: k }));
  }
  generalSafety.points.forEach((p, i) =>
    out.push({
      id: `medicine-safety#${i}`,
      categories: ["medicine-safety"],
      topic: { title: "Medicine information", href: "/ai-hospital/medicines" },
      terms: /\b(medicines?|tablets?|pills?|prescription|expiry|pharmacist)\b/,
      kind: "medicine",
      text: p,
      sources: sourcesFor(generalSafety.sourceIds).map((s) => s.title),
    }),
  );
  return out;
}

function testPassages(): Passage[] {
  return labTests.flatMap((t) => {
    const names = [t.name.replace(/\s*\(.*\)/, ""), ...(t.also ? t.also.split(/[,/]/) : []), ...(t.name.match(/\(([^)]+)\)/)?.[1].split(/[,/]/) ?? [])]
      .map((n) => n.trim().toLowerCase())
      .filter((n) => n.length > 1);
    const base = {
      categories: ["tests-and-reports"] as Category[],
      topic: { title: "Lab report explainer", href: "/ai-hospital/lab-reports" },
      terms: new RegExp(`\\b(${names.map(escape).join("|")})\\b`),
      sources: sourcesFor(t.sourceIds).map((s) => s.title),
    };
    return [
      { ...base, id: `test:${t.id}#measures`, kind: "test" as const, question: `What does the ${t.name} test measure?`, text: `${t.name}: ${t.measures}` },
      { ...base, id: `test:${t.id}#why`, kind: "test" as const, question: `Why is the ${t.name} test done?`, text: t.whyDone },
    ];
  });
}

export const PASSAGES: Passage[] = [...TOPICS.flatMap(topicPassages), ...medicinePassages(), ...testPassages()];

// Categories with verified content, and those still waiting for it.
export function coverage(): { category: Category; label: string; passages: number }[] {
  return (Object.keys(CATEGORY_LABEL) as Category[]).map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    passages: PASSAGES.filter((p) => p.categories.includes(category)).length,
  }));
}

// ---------------- Retrieval ----------------

const STOP = new Set(
  "a an the is are was were be been am i me my you your we our it its this that these those of to in on for with and or but if so do does did can could should would will what which who whom whose when where why how about tell explain please mean means meaning any some there their they them he she his her from by at as into than then too very just also not no yes really much many more most get got have has had high low normal good bad people person thing things know feel like".split(
    " ",
  ),
);
const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "");
const tokens = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(stem);

export type KnowledgeAnswer = {
  id: string;
  question: string;
  text: string[];
  topic: { title: string; href: string };
  sources: string[];
  categories: Category[];
};

// Finds verified passages for a question, or null. It never stretches: a
// passage is only returned when the question names its topic AND the passage
// shares meaningful words with the question (or it is the topic's opening
// explanation for a "what is …?" question).
export function retrieve(question: string): KnowledgeAnswer | null {
  const q = question.toLowerCase().replace(/[’‘]/g, "'");
  const candidates = PASSAGES.filter((p) => p.terms.test(q));
  if (!candidates.length) return null;
  // The words that named the topic ("tb", "dengue", "blood pressure").
  const topicWords = new Set(candidates.flatMap((p) => (q.match(new RegExp(p.terms.source, "g")) ?? []).flatMap((m) => m.split(/\s+/).map(stem))));
  const textWords = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).map(stem);
  const qTokens = tokens(q).filter((w) => !topicWords.has(w));
  const whatIs = /^(what is|what's|what are|whats|tell me about|explain|define|what does .* mean)\b/.test(q);

  const scored = candidates.map((p) => {
    const words = new Set([...tokens(p.text), ...tokens(p.question ?? "").map((w) => w)]);
    const overlap = qTokens.filter((w) => words.has(w)).length;
    const qOverlap = p.question ? qTokens.filter((w) => tokens(p.question!).includes(w)).length : 0;
    // The passage names the exact thing asked about ("depression", not just "mental").
    const named = [...topicWords].some((w) => textWords(p.text).includes(w)) ? 1 : 0;
    // "What is X?" → the first overview paragraph that names X.
    const opening = whatIs && named && (p.kind === "overview" || p.id.endsWith("#used") || p.id.endsWith("#measures")) ? 2 - (Number(p.id.match(/overview-(\d)/)?.[1] ?? 0) * 0.2) : 0;
    return { p, score: overlap + qOverlap * 1.5 + opening + named * 0.5 };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  // Weak matches are refused: better "I don't have that yet" than a near-miss.
  if (!best || best.score < 2) return null;
  // A second passage from the same topic when it also matches well.
  const second = scored.find((x) => x !== best && x.p.topic.href === best.p.topic.href && x.score >= Math.max(1.5, best.score * 0.6));
  const parts = [best.p, ...(second ? [second.p] : [])];
  return {
    id: best.p.id,
    question: best.p.question ?? question.trim().replace(/\s+/g, " "),
    text: parts.map((x) => x.text),
    topic: best.p.topic,
    sources: [...new Set(parts.flatMap((x) => x.sources))],
    categories: best.p.categories,
  };
}
