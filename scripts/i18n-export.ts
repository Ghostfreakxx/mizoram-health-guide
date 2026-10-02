// Writes a translation spreadsheet (CSV) for Mizo translators.
// Usage: npm run i18n:export   → docs/translation/mizo-translation.csv
import { writeFileSync } from "node:fs";
import { catalog } from "../app/i18n/catalog";
import { lus } from "../app/i18n";

const esc = (s = "") => `"${s.replace(/"/g, '""')}"`;
const rows = [["key", "screen", "safety_critical", "context", "english", "mizo", "status", "reviewer", "reviewed_on", "notes"].join(",")];
for (const e of catalog) {
  const t = lus[e.key];
  rows.push([e.key, e.surface, e.critical ? "yes" : "no", e.context ?? "", e.text, t?.text ?? "", t?.status ?? "", t?.reviewer ?? "", t?.reviewedOn ?? "", t?.notes ?? ""].map(esc).join(","));
}
writeFileSync("docs/translation/mizo-translation.csv", rows.join("\n") + "\n");
console.log(`Wrote ${catalog.length} strings to docs/translation/mizo-translation.csv`);
