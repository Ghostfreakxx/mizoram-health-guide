// Summary fidelity: after a long, messy conversation, does the visit summary
// say what the patient actually meant?
//
// Each seeded patient has a hidden truth, decided when each question is first
// asked. They answer in words, and sometimes: answer wrongly and then correct
// themselves ("sorry, I meant yes", "actually it started last week"), say
// "I don't know", ask why / what a word means, or mention a second problem.
// At the end every summary row is compared with the truth.

import { type ConsultState, type Turn, chartOf, contextOf, converse, nextTurn, respond, startConsultation } from "../../app/lib/consultation";
import { DURATIONS, PROGRESSIONS, SEVERITIES, questionsFor } from "../../app/lib/safety/triage";

function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const SAY: Record<string, Record<string, string>> = {
  yesno: { yes: "yes", no: "no", unsure: "not sure" },
  duration: { today: "it started today", "1-3-days": "since 2 days", "4-14-days": "about a week", "over-2-weeks": "more than a month" },
  progression: { better: "getting better", same: "about the same", worse: "getting worse" },
  severity: { mild: "mild", moderate: "moderate", severe: "very bad" },
};
// How a patient corrects the answer they just gave, in words.
const FIX: Record<string, Record<string, string[]>> = {
  yesno: {
    yes: ["sorry, I meant yes", "wait, actually yes I do", "no sorry, it's yes"],
    no: ["sorry, I meant no", "actually no, I don't", "wait, that's wrong — no"],
    unsure: ["sorry, actually I'm not sure", "I meant I don't know"],
  },
  duration: { today: ["actually it started today"], "1-3-days": ["actually it started yesterday"], "4-14-days": ["sorry, actually it started last week"], "over-2-weeks": ["actually it's been more than a month"] },
};
const ASIDES = ["why do you ask?", "what does that mean?", "how does TB spread?"];
const OPENINGS = ["I've been coughing", "I have a fever", "my stomach hurts", "I have a headache", "it burns when I pass urine", "my back hurts"];

export type Finding = { seed: number; problem: string; detail: string };

const key = (step: string) => (step.startsWith("q:") ? "yesno" : step);

export function play(seed: number): Finding[] {
  const r = rng(seed);
  const truth: Record<string, string> = {};
  const findings: Finding[] = [];
  const said: string[] = [];
  const note = (problem: string, detail: string) => findings.push({ seed, problem, detail: `${detail} | ${said.join(" / ")}` });
  let s: ConsultState = startConsultation("General Medicine");
  let other: string | undefined;
  for (let i = 0; i < 120; i++) {
    const t: Turn = nextTurn(s);
    if (t.input.kind === "emergency" || t.input.kind === "result") break;
    const words = (w: string) => {
      said.push(w);
      const o = converse(s, nextTurn(s), w);
      return o;
    };
    if (t.step === "concern") {
      const o = words(OPENINGS[Math.floor(r() * OPENINGS.length)]);
      s = "state" in o ? o.state : s;
      continue;
    }
    // "Should I change that answer?" — the patient answers truthfully.
    if (t.step === "recheck" && s.recheck) {
      const want = truth[`q:${s.recheck.key}`];
      const v = want && want === (s.recheck.to ?? "yes") ? "yes" : "no";
      said.push(`[recheck ${s.recheck.key} → ${v}]`);
      s = respond(s, "recheck", v);
      if (s.emergency) return findings;
      continue;
    }
    const k = key(t.step);
    const bank = SAY[k];
    const opts = "options" in t.input ? t.input.options.map((o) => o.id) : [];
    if (!bank || !opts.some((o) => bank[o])) {
      const v = t.input.kind === "multi" ? [] : t.input.kind === "text" ? "" : t.step === "check" ? "none" : opts.includes("no") ? "no" : opts[0];
      const next = respond(s, t.step, v);
      if (next === s) break;
      s = next;
      continue;
    }
    // Detours before answering.
    if (r() < 0.15) {
      const o = words(ASIDES[Math.floor(r() * ASIDES.length)]);
      s = "state" in o ? o.state : s;
      if (nextTurn(s).step !== t.step) continue;
    }
    if (!other && r() < 0.05) {
      other = "I also have a rash";
      const o = words(other);
      s = "state" in o ? o.state : s;
      if (nextTurn(s).step !== t.step) continue;
    }
    const choices = opts.filter((o) => bank[o]);
    // The truth. Never "yes" to a danger sign (that would end the visit early).
    const intent = k === "yesno" ? (r() < 0.6 ? "no" : r() < 0.6 ? "unsure" : "yes") : choices[Math.floor(r() * choices.length)];
    truth[t.step] = intent;
    const mistake = FIX[k] && r() < 0.15 ? choices.find((c) => c !== intent && FIX[k][intent]) : undefined;
    const o = words(bank[mistake ?? intent]);
    s = "state" in o ? o.state : s;
    if (s.emergency) return findings; // a "yes" that opened Emergency Mode: correct behaviour, visit over
    if (mistake) {
      const fixWords = FIX[k][intent][Math.floor(r() * FIX[k][intent].length)];
      const before = nextTurn(s);
      const o2 = words(fixWords);
      const after = "state" in o2 ? o2.state : s;
      // The correction must not be taken as the answer to the NEXT question.
      if (before.step !== t.step && before.step.startsWith("q:") && after.answers[before.step.slice(2)] !== undefined && s.answers[before.step.slice(2)] === undefined)
        note("correction answered the next question", `${fixWords} → ${before.step}=${after.answers[before.step.slice(2)]} (meant to fix ${t.step})`);
      s = after;
      if (s.emergency) return findings;
    }
  }
  // Compare the summary with the truth.
  const chart = chartOf(s);
  const rows = Object.fromEntries([...chart.reported, ...chart.safety].map((x) => [x.label, x.value]));
  const all = JSON.stringify(rows);
  const words = { duration: DURATIONS, progression: PROGRESSIONS, severity: SEVERITIES } as const;
  for (const [field, label] of [["duration", "Duration"], ["progression", "Change"], ["severity", "How bad"]] as const) {
    if (!truth[field]) continue;
    const want = words[field].find((d) => d.id === truth[field])!.label;
    if (!(rows[label] ?? "").startsWith(want)) note(`${label} wrong in summary`, `meant ${want}, summary says ${rows[label]}`);
  }
  const qs = s.complaint ? questionsFor(contextOf(s)) : [];
  for (const q of qs) {
    const want = truth[`q:${q.id}`];
    if (!want) continue;
    const got = s.answers[q.id];
    if (got !== want) note("answer wrong in summary", `q:${q.id} meant ${want}, recorded ${got}`);
    if (want === "no" && (rows["Symptoms reported"] ?? "").includes(q.positive)) note("denied symptom listed as present", q.positive);
    if (want === "yes" && !all.includes(q.positive)) note("symptom missing from summary", q.positive);
  }
  if (other && !(rows["Other problems mentioned (not assessed)"] ?? "").toLowerCase().includes("rash")) note("other problem missing", rows["Other problems mentioned (not assessed)"] ?? "-");
  return findings;
}
