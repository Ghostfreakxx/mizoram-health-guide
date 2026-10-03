// When does the virtual doctor send the patient to real care?
//
// Clinical escalation is decided ONLY by the deterministic safety and triage
// engines (or by the patient asking for a real professional). Conversational
// difficulty — unusual wording, a misunderstanding, "I don't know", a
// question the verified knowledge cannot answer, uncertain speech — is never
// a reason. The doctor clarifies instead (see converse() in consultation.ts).

import { type ConsultState, nextTurn } from "./consultation";
import type { Level } from "./safety/triage";

export type EscalationReason =
  | "emergency-red-flag" // a verified red flag: Emergency Mode, 108/112
  | "urgent-triage" // triage result ORANGE: be seen urgently
  | "routing-criteria" // triage result YELLOW: sourced criteria (duration, worsening, age, pregnancy…) say a health worker should check it
  | "self-care-result" // triage result GREEN: self-care, with a summary in case it changes
  | "patient-request"; // the patient asked to talk to a real doctor or health worker

export type Escalation = { reason: EscalationReason; level?: Level; helplines: boolean };

// Things that must never, on their own, lead to a helpline or a handoff.
export const NOT_REASONS = [
  "unusual wording",
  "a misunderstanding (even repeated)",
  "the patient said “I don't know” / “I forgot”",
  "a question the verified knowledge layer cannot answer",
  "a hard or unexpected question",
  "uncertain speech recognition",
] as const;

export function escalationFor(s: ConsultState, opts: { patientAsked?: boolean } = {}): Escalation | null {
  const t = nextTurn(s);
  if (t.input.kind === "emergency") return { reason: "emergency-red-flag", level: "RED", helplines: true };
  if (t.input.kind === "result") {
    const level = t.input.level;
    if (level === "RED") return { reason: "emergency-red-flag", level, helplines: true };
    if (level === "ORANGE") return { reason: "urgent-triage", level, helplines: true };
    if (level === "YELLOW") return { reason: "routing-criteria", level, helplines: false };
    return { reason: "self-care-result", level, helplines: false };
  }
  if (opts.patientAsked) return { reason: "patient-request", helplines: false };
  return null; // mid-consultation: keep helping
}
