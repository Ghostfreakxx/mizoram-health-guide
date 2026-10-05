// Why the doctor is asking (or saying) this — for clinical review.
//
// Every turn maps to the reviewed rule behind it (the IDs used in
// docs/CLINICAL_REVIEW.md), its sources, and a plain purpose. Conversation
// steps that are not clinical rules say so. Nothing here changes behaviour;
// it only explains it.

import { type ConsultState, type Turn, contextOf, toAnswers, whyLine } from "./consultation";
import { getRedFlag, redFlags, type RedFlagId } from "./safety/redFlags";
import { POLICY_RULES, getComplaint, questionsFor, triage } from "./safety/triage";

export type BasisKind = "safety" | "triage-question" | "policy" | "result" | "summary" | "conversation";

export type Basis = {
  kind: BasisKind;
  ruleIds: string[]; // IDs in docs/CLINICAL_REVIEW.md
  sourceIds: string[];
  purpose: string; // why the doctor asks, in plain words
  detail?: string; // what the answer does (for the reviewer)
};

const P = POLICY_RULES;
const uniq = (a: string[]) => [...new Set(a)];

export function basisOf(s: ConsultState, turn: Turn): Basis {
  const step = turn.step;
  const purpose = whyLine(turn);

  if (step === "emergency" && turn.input.kind === "emergency") {
    const flags = turn.input.flags;
    return {
      kind: "safety",
      ruleIds: flags.map((f) => `RF-${f}`),
      sourceIds: uniq(flags.flatMap((f) => getRedFlag(f).sourceIds)),
      purpose: "A red flag was found. Emergency Mode takes over; routine questions stop.",
      detail: flags.map((f) => getRedFlag(f).title).join(", "),
    };
  }
  if (step === "check") {
    const listed = redFlags.filter((f) => f.inChecklist);
    return {
      kind: "safety",
      ruleIds: listed.map((f) => `RF-${f.id}`),
      sourceIds: uniq(listed.flatMap((f) => f.sourceIds)),
      purpose,
      detail: "Any item ticked → Emergency Mode at once.",
    };
  }
  if (step.startsWith("confirm:")) {
    const f = getRedFlag(step.slice(8) as RedFlagId);
    return { kind: "safety", ruleIds: [`RF-${f.id}`], sourceIds: f.sourceIds, purpose, detail: "Danger words were mentioned with a negation or in an unclear way, so the patient is asked directly. Yes or Not sure → Emergency Mode." };
  }
  if (step.startsWith("q:")) {
    const id = step.slice(2);
    const q = questionsFor(contextOf(s)).find((x) => x.id === id);
    if (q) {
      const effect = "emergency" in q.yes ? `Yes → Emergency (${getRedFlag(q.yes.emergency).title})` : `Yes → raises urgency to at least ${q.yes.level}${q.yes.now ? " (now)" : ""}`;
      return { kind: "triage-question", ruleIds: [`TQ-${id}`], sourceIds: q.sourceIds, purpose, detail: `${effect}. Not sure → treated with care (urgent assessment for danger signs). No → no change.` };
    }
  }
  if (step === "duration") return { kind: "policy", ruleIds: [P.long.id, P.notBetter.id, P.missing.id], sourceIds: [...P.long.sourceIds], purpose };
  if (step === "progression") return { kind: "policy", ruleIds: [P.worse.id, P.notBetter.id, P.missing.id], sourceIds: [...P.worse.sourceIds], purpose };
  if (step === "severity") return { kind: "policy", ruleIds: [P.severe.id, P.moderate.id, P.missing.id], sourceIds: [...P.severe.sourceIds], purpose };
  if (step === "age") return { kind: "policy", ruleIds: [P.youngInfant.id, P.underFive.id, P.older.id], sourceIds: uniq([...P.youngInfant.sourceIds, ...P.older.sourceIds]), purpose };
  if (step === "special") return { kind: "policy", ruleIds: [P.pregnant.id, P.postpartum.id, P.immuno.id], sourceIds: uniq([...P.pregnant.sourceIds, ...P.postpartum.sourceIds, ...P.immuno.sourceIds]), purpose };
  if (step === "complaint" || step === "concern" || step === "concern-more") {
    const c = s.complaint ? getComplaint(s.complaint) : undefined;
    return { kind: "conversation", ruleIds: c ? [`TS-${c.id}`] : [], sourceIds: c?.baseReason?.sourceIds ?? [], purpose, detail: "Chooses which reviewed question set is used. The words are also checked for red flags." };
  }
  if (step === "result" && turn.input.kind === "result") {
    const r = triage(toAnswers(s));
    return {
      kind: "result",
      ruleIds: s.complaint ? [`TS-${s.complaint}`] : [],
      sourceIds: uniq(r.reasons.flatMap((x) => x.sourceIds)),
      purpose: "The triage engine's result, in fixed approved wording.",
      detail: r.reasons.map((x) => x.text).join("; ") || "No raising factors",
    };
  }
  if (["medicines", "allergies", "conditions"].includes(step) || step.startsWith("c:")) {
    return { kind: "summary", ruleIds: [], sourceIds: [], purpose, detail: "Goes into the summary only; does not change urgency (medicines/allergies/conditions are still checked for red-flag words)." };
  }
  if (step === "recheck") {
    return { kind: "conversation", ruleIds: s.recheck && s.recheck.key !== "fever" ? [`TQ-${s.recheck.key}`] : [], sourceIds: [], purpose, detail: "A later statement contradicted an earlier answer. Yes → the answer is changed (and re-checked for emergencies); No → kept; Not sure → recorded as not sure." };
  }
  return { kind: "conversation", ruleIds: [], sourceIds: [], purpose, detail: "Helps the patient describe the problem. Not a clinical rule; it does not change urgency." };
}
