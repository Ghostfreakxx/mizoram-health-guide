// Builds the patient-prepared doctor summary. Pure function: it includes only
// information the patient actually supplied, and never invents anything.

export const SUMMARY_LABEL = "Patient-prepared summary — not a medical diagnosis.";

export type SummaryData = {
  generatedAt: Date;
  forWhom?: string; // "Self" / "Someone else (mother)"
  age?: string;
  sex?: string;
  pregnancy?: string;
  mainConcern?: string;
  started?: string;
  progression?: string;
  severity?: string;
  location?: string;
  feels?: string; // how it feels, in the patient's words
  pattern?: string; // all the time / comes and goes
  triggers?: string; // what makes it better or worse
  notes?: string[]; // uncertainties, corrections, things not asked
  relevant?: string[];
  safety?: string[]; // answers to danger-sign questions
  negatives?: string[];
  unsure?: string[];
  measurements?: { label: string; value: string }[];
  conditions?: string;
  medicines?: string;
  allergies?: string;
  reports?: string;
  questions?: string[];
  triage?: { level: string; recommendation: string; departments: string[] };
};

export type SummarySection = { heading: string; lines: string[] };

const clean = (s?: string) => (s ?? "").trim();
const has = (s?: string) => clean(s).length > 0;

export function summarySections(d: SummaryData): SummarySection[] {
  const sections: SummarySection[] = [];
  const add = (heading: string, lines: (string | undefined | false)[]) => {
    const kept = lines.filter((l): l is string => typeof l === "string" && l.trim().length > 0);
    if (kept.length) sections.push({ heading, lines: kept });
  };

  add("Patient", [
    has(d.forWhom) && `Prepared for: ${clean(d.forWhom)}`,
    has(d.age) && `Age group: ${clean(d.age)}`,
    has(d.sex) && `Sex: ${clean(d.sex)}`,
    has(d.pregnancy) && `Pregnancy: ${clean(d.pregnancy)}`,
  ]);
  add("Main concern", [has(d.mainConcern) && clean(d.mainConcern)]);
  add("Course", [
    has(d.started) && `When it started: ${clean(d.started)}`,
    has(d.progression) && `How it has changed: ${clean(d.progression)}`,
    has(d.severity) && `How bad: ${clean(d.severity)}`,
    has(d.location) && `Where: ${clean(d.location)}`,
    has(d.feels) && `How it feels: ${clean(d.feels)}`,
    has(d.pattern) && `Pattern: ${clean(d.pattern)}`,
    has(d.triggers) && `Better or worse with: ${clean(d.triggers)}`,
  ]);
  add("Relevant symptoms reported", d.relevant ?? []);
  add("Measurements reported", (d.measurements ?? []).filter((m) => has(m.value)).map((m) => `${m.label}: ${m.value}`));
  add("Important safety answers", d.safety ?? []);
  const safety = new Set(d.safety ?? []);
  add("Asked about and reported as NOT present", (d.negatives ?? []).filter((n) => !safety.has(n)));
  add("Patient was not sure about", d.unsure ?? []);
  add("Notes from the conversation", d.notes ?? []);
  add("Existing health conditions", [has(d.conditions) && clean(d.conditions)]);
  add("Current medicines", [has(d.medicines) && clean(d.medicines)]);
  add("Known allergies", [has(d.allergies) && clean(d.allergies)]);
  add("Reports and tests brought", [has(d.reports) && clean(d.reports)]);
  add("Questions for the doctor", (d.questions ?? []).map(clean));
  if (d.triage) {
    add("AI Hospital navigation result (guidance on urgency, not a diagnosis)", [
      `Urgency: ${d.triage.level}`,
      d.triage.recommendation,
      d.triage.departments.length > 0 && `Suggested service: ${d.triage.departments.join(", ")}`,
    ]);
  }
  return sections;
}

export function formatGenerated(date: Date): string {
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function summaryText(d: SummaryData): string {
  const out = ["PATIENT-PREPARED HEALTH SUMMARY", SUMMARY_LABEL, `Generated: ${formatGenerated(d.generatedAt)}`, ""];
  for (const s of summarySections(d)) {
    out.push(s.heading.toUpperCase());
    for (const l of s.lines) out.push(`- ${l}`);
    out.push("");
  }
  out.push("Prepared with AI Hospital (Mizoram Health Guide). This is information from the patient, not a medical diagnosis.");
  return out.join("\n");
}
