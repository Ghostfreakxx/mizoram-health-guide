// Renders the review registry for people: Markdown for reading, CSV for a
// spreadsheet. Deterministic (no dates), so a test can check the committed
// files are current.

import { KIND_LABEL, type ReviewItem, type ReviewKind, reviewRegistry, reviewSummary } from "./registry";

const STATUS_LABEL = {
  verified: "VERIFIED",
  "needs-clinician-review": "NEEDS CLINICIAN REVIEW",
  "needs-government-verification": "NEEDS GOVERNMENT VERIFICATION",
  deprecated: "DEPRECATED",
} as const;

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

function sourceText(i: ReviewItem): string {
  if (!i.sources.length) return "No source recorded";
  return i.sources.map((s) => `${s.title} — ${s.organisation} (${s.verified ? `checked ${s.checked}` : "not yet checked"})`).join("; ");
}

export function reviewMarkdown(items: ReviewItem[] = reviewRegistry()): string {
  const sum = reviewSummary(items);
  const kinds = [...new Set(items.map((i) => i.kind))] as ReviewKind[];
  const lines: string[] = [
    "# Clinical and data review list",
    "",
    "> Generated from the code by `npm run review:export`. Do not edit by hand —",
    "> change the rule in the file named under **Defined in**, then regenerate.",
    "",
    "This is every rule, piece of health wording and item of local data that the",
    "Mizoram AI Hospital prototype uses, written out so a clinician or an officer",
    "can review it without reading code. Each item has a stable ID to quote in",
    "review notes (for example `TQ-cough-blood`).",
    "",
    "## How to review",
    "",
    "1. Read the **Rule** — it says exactly what the app does.",
    "2. Check it against the listed source and current practice in Mizoram.",
    "3. Record your decision (approved / changes needed / deprecated) with your",
    "   role and the date. A developer adds it to `SIGN_OFFS` in",
    "   `app/lib/review/registry.ts`; an item becomes VERIFIED only when it is",
    "   approved **and** every source it cites has been checked.",
    "",
    "## Summary",
    "",
    `| Total | Verified | Needs clinician review | Needs government verification | Deprecated |`,
    `| ---: | ---: | ---: | ---: | ---: |`,
    `| ${sum.total} | ${sum.verified} | ${sum.clinician} | ${sum.government} | ${sum.deprecated} |`,
    "",
  ];
  if (sum.missingSources.length) lines.push(`**Items citing a source that does not exist:** ${sum.missingSources.join(", ")}`, "");
  for (const k of kinds) {
    const group = items.filter((i) => i.kind === k);
    lines.push(`## ${KIND_LABEL[k]} (${group.length})`, "", "| ID | Item | Rule | Source | Status | Defined in |", "| --- | --- | --- | --- | --- | --- |");
    for (const i of group) {
      lines.push(`| \`${i.id}\` | ${cell(i.title)} | ${cell(i.rule)} | ${cell(sourceText(i))} | ${STATUS_LABEL[i.status]} | ${cell(i.definedIn)} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

export function reviewCsv(items: ReviewItem[] = reviewRegistry()): string {
  const head = ["id", "kind", "item", "rule", "sources", "reviewer", "status", "defined_in", "decision", "reviewer_role", "date", "note"];
  const rows = items.map((i) =>
    [i.id, i.kind, i.title, i.rule, sourceText(i), i.reviewer, STATUS_LABEL[i.status], i.definedIn, i.signOff?.decision ?? "", i.signOff?.role ?? "", i.signOff?.date ?? "", i.signOff?.note ?? ""].map(csvCell).join(","),
  );
  return [head.join(","), ...rows].join("\n") + "\n";
}
