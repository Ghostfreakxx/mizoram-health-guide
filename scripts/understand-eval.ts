// Measures the optional online help (/api/understand) on the phrasings the
// device does NOT understand, from the accuracy harness's three sets
// (tests/safety/accuracy.ts). English only; synthetic phrasings.
//
//   npx tsx scripts/understand-eval.ts --dry   # list the cases; no network, no cost
//   AI_UNDERSTANDING=on OPENAI_API_KEY=… npx tsx scripts/understand-eval.ts
//
// The live run calls the model once per case (costs money; a few dozen
// short requests). It reports, for each case the device could not
// understand: a correct suggestion, a WRONG suggestion (the patient would
// have to notice and say no), or no suggestion. A wrong REASSURING
// suggestion to a danger-sign question ("No" when they meant yes / not sure)
// is counted separately: the target is zero.

import { type ConsultState, type Turn, converse, nextTurn, respond, startConsultation } from "../app/lib/consultation";
import { acceptReply, requestFor } from "../app/lib/understand";
import { clientFor, configFromEnv, understandWith } from "../app/api/understand/model";
import { HELD_OUT_A, HELD_OUT_B, PHRASES } from "../tests/safety/accuracy";

const dry = process.argv.includes("--dry");
const OPENINGS: Record<string, string> = { side: "my back hurts", default: "fever since yesterday" };

// A consultation walked to the first turn of this kind of step.
function turnFor(kind: string): { s: ConsultState; t: Turn } | null {
  let s = respond(startConsultation("General Medicine"), "concern", OPENINGS[kind] ?? OPENINGS.default);
  for (let i = 0; i < 60; i++) {
    const t = nextTurn(s);
    if (t.input.kind === "emergency" || t.input.kind === "result") return null;
    if (kind === "yesno" ? t.step.startsWith("q:") : t.step === kind) return { s, t };
    const opts = "options" in t.input ? t.input.options.map((o) => o.id) : [];
    const v = t.input.kind === "multi" ? [] : t.input.kind === "text" ? "" : t.step === "check" ? "none" : opts.includes("no") ? "no" : t.step === "age" ? "adult" : opts[0];
    const next = respond(s, t.step, v);
    if (next === s) return null;
    s = next;
  }
  return null;
}

const understoodHere = (s: ConsultState, t: Turn, words: string) => {
  const o = converse(s, t, words);
  return o.kind !== "unclear";
};

type Case = { set: string; kind: string; intent: string; words: string; s: ConsultState; t: Turn };
const cases: Case[] = [];
for (const [set, bank] of [["training", PHRASES], ["held-out A", HELD_OUT_A], ["held-out B", HELD_OUT_B]] as const) {
  for (const [kind, intents] of Object.entries(bank)) {
    const at = turnFor(kind);
    if (!at) continue;
    for (const [intent, phrasings] of Object.entries(intents)) {
      for (const words of phrasings) if (!understoodHere(at.s, at.t, words)) cases.push({ set, kind, intent, words, ...at });
    }
  }
}

console.log(`${cases.length} phrasings the device does not understand (asked again today):`);
for (const c of cases) console.log(`  [${c.set}] ${c.kind}: "${c.words}" (meant ${c.intent})`);
async function live() {
  const cfg = configFromEnv();
  if (!cfg) {
    console.error("Set AI_UNDERSTANDING=on and OPENAI_API_KEY to run the live measurement (or use --dry).");
    process.exit(1);
  }
  const client = clientFor(cfg);
  const tally = { correct: 0, wrong: 0, none: 0, failed: 0, wrongReassuring: 0 };
  const wrong: string[] = [];
  const started = Date.now();
  for (const c of cases) {
    const req = requestFor(c.t, c.words);
    if (!req) {
      tally.none++;
      continue;
    }
    const asked = await understandWith(client, req, cfg);
    if (asked.status !== "ok") {
      tally.failed++;
      continue;
    }
    const ids = acceptReply(req, asked.reply);
    if (!ids) tally.none++;
    else if (ids.length === 1 && ids[0] === c.intent) tally.correct++;
    else {
      tally.wrong++;
      const reassuring = c.kind === "yesno" && c.intent !== "no" && ids.includes("no");
      if (reassuring) tally.wrongReassuring++;
      wrong.push(`${reassuring ? "WRONG-REASSURING " : ""}${c.kind}: "${c.words}" meant ${c.intent}, suggested ${ids.join("+")}`);
    }
  }
  const n = cases.length;
  const pct = (x: number) => `${((100 * x) / Math.max(1, n)).toFixed(1)}%`;
  console.log(`\nModel ${cfg.model} (effort ${cfg.effort ?? "model default"}), ${n} cases, ${((Date.now() - started) / Math.max(1, n)).toFixed(0)} ms per case on average`);
  console.log(`  correct suggestion: ${tally.correct} (${pct(tally.correct)})`);
  console.log(`  no suggestion:      ${tally.none} (${pct(tally.none)})`);
  console.log(`  wrong suggestion:   ${tally.wrong} (${pct(tally.wrong)}) — of which reassuring on a danger sign: ${tally.wrongReassuring}`);
  console.log(`  request failed:     ${tally.failed}`);
  for (const w of wrong) console.log(`  ${w}`);
}

if (!dry) void live();
