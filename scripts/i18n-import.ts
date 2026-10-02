// Imports a filled-in translation spreadsheet into app/i18n/lus.json.
// Usage: npm run i18n:import -- path/to/mizo-translation.csv
// Rows are rejected (and reported) if the key is unknown, an emergency
// number is missing, or a "reviewed" row has no reviewer or date.
import { readFileSync, writeFileSync } from "node:fs";
import { catalogByKey } from "../app/i18n/catalog";
import { type Translations, protectedTokens } from "../app/i18n";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run i18n:import -- path/to/mizo-translation.csv");
  process.exit(1);
}
const [header, ...rows] = parseCsv(readFileSync(file, "utf8"));
const col = (name: string) => header.indexOf(name);
const out: Translations = {};
const problems: string[] = [];
for (const r of rows) {
  const key = r[col("key")];
  const text = (r[col("mizo")] ?? "").trim();
  const status = (r[col("status")] ?? "").trim();
  if (!text) continue;
  const source = catalogByKey.get(key);
  if (!source) { problems.push(`${key}: unknown key`); continue; }
  const missing = protectedTokens(source.text).filter((n) => !text.includes(n));
  if (missing.length) { problems.push(`${key}: missing ${missing.join(", ")}`); continue; }
  if (status === "reviewed" && (!r[col("reviewer")]?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(r[col("reviewed_on")]?.trim() ?? ""))) {
    problems.push(`${key}: "reviewed" needs reviewer and reviewed_on (YYYY-MM-DD)`);
    continue;
  }
  out[key] = {
    text,
    status: status === "reviewed" ? "reviewed" : "draft",
    ...(r[col("reviewer")]?.trim() ? { reviewer: r[col("reviewer")].trim() } : {}),
    ...(r[col("reviewed_on")]?.trim() ? { reviewedOn: r[col("reviewed_on")].trim() } : {}),
    ...(r[col("notes")]?.trim() ? { notes: r[col("notes")].trim() } : {}),
  };
}
writeFileSync("app/i18n/lus.json", JSON.stringify(out, null, 2) + "\n");
console.log(`Imported ${Object.keys(out).length} translations into app/i18n/lus.json`);
if (problems.length) {
  console.error(`Rejected ${problems.length} rows:\n- ${problems.join("\n- ")}`);
  process.exitCode = 1;
}
