// Hundreds of simulated consultations — the doctor tested like a game NPC.
//
// Each simulated patient is seeded (reproducible: a failure names its seed)
// and behaves like a real one: answers by button or in their own words,
// misunderstands, asks what words mean, asks why, says "I already told you",
// corrects themselves, mentions a second problem, contradicts an earlier
// answer, asks health questions, and — sometimes — says something that is an
// emergency. After EVERY input the invariants below are checked.
//
// This finds engine bugs at scale. It is not clinical validation.

import { describe, expect, it } from "vitest";
import { type ConsultState, type Outcome, chartOf, converse, nextTurn, respond, startConsultation } from "../../app/lib/consultation";
import { escalationFor } from "../../app/lib/escalation";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";
import { questionsFor } from "../../app/lib/safety/triage";
import { contextOf } from "../../app/lib/consultation";

function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];

const OPENINGS = [
  // routine
  "I've been coughing for three weeks", "fever since yesterday", "I have a headache since two days", "my stomach hurts", "I've had a runny nose and sneezing for two days",
  "my back hurts", "I have a rash on my arm", "my eye is red and itchy", "it burns when I pass urine", "my knee is swollen",
  // ambiguous / confused
  "I don't feel well", "something feels wrong here", "I can't explain it", "here on my right", "idk", "my mother is feeling strange", "I feel weird",
  // multi-problem
  "My main problem is cough, but I also have back pain", "headache and also my stomach hurts", "I have fever and my knee hurts too",
  // contradiction-prone
  "I have a cough but no fever", "I've been coughing for a week, I don't have a fever",
  // others / family
  "my child has a fever", "my baby has diarrhoea", "I'm pregnant and I have a headache", "my father is 70 and has been dizzy",
] as const;

const DIFFICULT = ["idk", "what?", "huh", "hmm", "blah blah", "can you say that again", "what does that mean", "why do you ask", "I already told you", "can you ask differently", "speak slower", "sorry?", "ok"] as const;
const SIDE_TALK = ["no sorry left", "actually it started yesterday", "I also have a headache", "I have back pain too", "my temperature was 39 degrees", "I have a fever", "there is blood when I cough", "how does TB spread?", "what is malaria?", "what is blood pressure?", "can I take paracetamol?", "what disease do I have?", "I want to talk to a real doctor"] as const;
const EMERGENCIES = ["my chest feels crushed and I can't breathe", "he is not waking up", "I took too many tablets", "I want to end my life", "her face is drooping on one side", "bleeding not stopping", "my baby won't wake properly"] as const;

// The patient's natural-language version of a button answer.
const WORDS: Record<string, string[]> = {
  yes: ["yes", "yeah", "i think so", "yes it is"],
  no: ["no", "nope", "not really", "no it isn't"],
  unsure: ["not sure", "maybe", "i don't know"],
  same: ["about the same", "no change"],
  worse: ["it's getting worse"],
  better: ["a bit better"],
  mild: ["mild", "not bad"],
  moderate: ["quite bad"],
  severe: ["very bad"],
  self: ["it's for me", "myself"],
  adult: ["I'm 34", "34"],
  female: ["female"],
  male: ["male"],
};

type Kind = "button" | "words" | "difficult" | "side" | "emergency";

function simulate(seed: number) {
  const r = rng(seed);
  const emergencyAt = r() < 0.18 ? 2 + Math.floor(r() * 10) : -1;
  let s = startConsultation("General Medicine");
  const said: string[] = [];
  const fail = (msg: string) => `seed ${seed} after ${JSON.stringify(said)}: ${msg}`;
  let turnCount = 0;
  let outcome = "running";
  for (let i = 0; i < 160; i++) {
    const t = nextTurn(s);
    for (const line of [t.say, t.then ?? ""]) expect(violatesLanguagePolicy(line), fail(line)).toBeNull();
    if (t.input.kind === "emergency" || t.input.kind === "result") {
      outcome = t.input.kind;
      break;
    }
    // Facts already known are not asked again.
    const known: Record<string, unknown> = { duration: s.duration, progression: s.progression, severity: s.severity, who: s.who, age: s.age, sex: s.sex };
    if (t.step in known) expect(known[t.step], fail(`asked ${t.step} again`)).toBeUndefined();
    if (t.step.startsWith("q:")) expect(s.answers[t.step.slice(2)], fail(`asked ${t.step} again`)).toBeUndefined();

    turnCount++;
    const opts = "options" in t.input ? t.input.options.map((o) => o.id) : [];
    let kind: Kind = r() < 0.55 ? "button" : r() < 0.6 ? "words" : r() < 0.6 ? "difficult" : "side";
    if (i === emergencyAt) kind = "emergency";
    if (t.step === "concern") kind = "words";

    let input: string | string[];
    if (kind === "button") {
      if (t.step === "check") input = "none";
      else if (t.input.kind === "multi") input = [];
      else if (t.input.kind === "text") input = r() < 0.5 ? "" : pick(r, ["none", "Metformin", "penicillin", "I don't know"]);
      // The simulated patient never ticks a red flag by button (emergencies come only from EMERGENCIES).
      else input = pick(r, opts.filter((o) => !/^(breathing|chest_pain|stroke|unconscious|seizure|bleeding|allergy|severe_infection|overdose|poisoning|snakebite|injury|suicide|pregnancy|postpartum|infant)$/.test(o)).concat(opts.includes("no") ? ["no", "no", "no"] : []));
      const next = respond(s, t.step, input);
      if (next === s && t.input.kind !== "text") continue; // e.g. "other-place": keep going
      said.push(`[${t.step}=${JSON.stringify(input)}]`);
      const before = s;
      s = next;
      checkEmergencyCause(before, s, t.step, input, false, fail);
      continue;
    }
    const words =
      kind === "emergency"
        ? pick(r, EMERGENCIES)
        : kind === "difficult"
          ? pick(r, DIFFICULT)
          : kind === "side"
            ? pick(r, SIDE_TALK)
            : t.step === "concern"
              ? pick(r, OPENINGS)
              : (WORDS[pick(r, opts.length ? opts : ["yes"])] ?? WORDS[pick(r, ["yes", "no", "unsure"])]).at(Math.floor(r() * 2)) ?? "yes";
    said.push(words);
    const before = s;
    let o: Outcome;
    try {
      o = converse(s, t, words);
    } catch (e) {
      throw new Error(fail(`converse threw: ${e}`));
    }
    if ("line" in o && typeof o.line === "string") expect(violatesLanguagePolicy(o.line), fail(o.line)).toBeNull();
    if (o.kind === "education") for (const l of o.answer.text) expect(violatesLanguagePolicy(l), fail(l)).toBeNull();
    s = "state" in o ? o.state : s;
    if (kind === "emergency") expect(nextTurn(s).step, fail("emergency words did not interrupt")).toBe("emergency");
    else checkEmergencyCause(before, s, t.step, words, true, fail);
    // Difficulty never becomes a handoff.
    // (Unless the words were a valid answer — "ok" can answer a free-text question.)
    if (kind === "difficult" && o.kind !== "answered") expect(escalationFor(s), fail("difficulty escalated")).toBeNull();
    expect(s.said.length).toBeLessThanOrEqual(40);
  }
  // Nothing clinical is invented in the record.
  // (Answers to questions that quote a threshold, e.g. "180/110 or higher", are the patient's answers.)
  const chart = JSON.stringify(chartOf(s).reported.filter((r) => !["Symptoms reported", "Relevant negatives", "Not sure about"].includes(r.label)));
  const temp = said.some((w) => /39 degrees/.test(w));
  const pickedRange = !!s.choices.temp && s.choices.temp !== "not-measured"; // a range button the patient chose
  if (!temp && !pickedRange) expect(chart, fail("temperature invented")).not.toMatch(/°C|°F/);
  const bp = chart.match(/.{40}\b\d{2,3}\s?\/\s?\d{2,3}\b.{10}/);
  expect(bp?.[0] ?? null, fail("blood pressure invented")).toBeNull();
  return { outcome, turns: turnCount };
}

// An emergency may only come from: emergency words, a "yes"/"not sure" to a
// danger-sign question, a confirmation, or a contradiction resolved to yes.
function checkEmergencyCause(before: ConsultState, after: ConsultState, step: string, input: string | string[], typed: boolean, fail: (m: string) => string) {
  if (nextTurn(before).step === "emergency" || nextTurn(after).step !== "emergency") return;
  const v = Array.isArray(input) ? "" : input;
  if (typed) {
    // Typed words: only red-flag words, or an answer to a danger-sign question.
    const answeringDanger = (step.startsWith("q:") || step.startsWith("confirm:") || step === "recheck") && /^(yes|yeah|i think so|not sure|maybe|i don't know|yes it is)$/i.test(v);
    const redWords = after.emergency?.clear.kind === "text";
    expect(answeringDanger || redWords, fail(`emergency from "${v}" at ${step}`)).toBe(true);
    return;
  }
  const danger = step.startsWith("q:") && (() => {
    const q = questionsFor(contextOf(before)).find((x) => x.id === step.slice(2));
    return !!q && "emergency" in q.yes && (v === "yes" || v === "unsure");
  })();
  const confirm = (step.startsWith("confirm:") || step === "recheck") && (v === "yes" || v === "unsure");
  const words = after.emergency?.clear.kind === "text"; // medicines/allergies text with red-flag words
  expect(danger || confirm || words, fail(`emergency from button ${step}=${v}`)).toBe(true);
}

describe("simulated consultations", () => {
  const N = 400;
  it(`${N} seeded patients: no crash, safety invariants hold at every step, every visit ends`, () => {
    const outcomes = { result: 0, emergency: 0, running: 0 };
    let maxTurns = 0;
    for (let seed = 1; seed <= N; seed++) {
      const { outcome, turns } = simulate(seed);
      outcomes[outcome as keyof typeof outcomes]++;
      maxTurns = Math.max(maxTurns, turns);
    }
    // Every simulated visit finished (no infinite loops), most with a result.
    expect(outcomes.running, JSON.stringify(outcomes)).toBe(0);
    // Random patients often say "yes"/"not sure" to danger signs, so many end
    // in Emergency Mode; both outcomes must be well represented.
    expect(outcomes.result, JSON.stringify(outcomes)).toBeGreaterThan(N * 0.25);
    expect(outcomes.emergency, JSON.stringify(outcomes)).toBeGreaterThan(N * 0.15);
    expect(maxTurns).toBeLessThan(160);
  });
});
