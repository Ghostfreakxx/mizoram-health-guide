// Safety regression corpus. Every phrase here is something a real person
// might type or say. The table is the specification:
//
//   conversation difficulty  ≠ emergency, and ≠ "go see a doctor"
//   a red flag               = immediate emergency, whatever else is said
//   unsure words             = asked about directly, never silently ignored
//   missing information      stays missing; nothing clinical is invented
//
// Add a row whenever a real conversation surprises us.

import { describe, expect, it } from "vitest";
import { type ConsultState, type Outcome, chartOf, converse, nextTurn, respond, startConsultation } from "../../app/lib/consultation";
import { escalationFor } from "../../app/lib/escalation";
import { detectRedFlags } from "../../app/lib/safety/detect";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";
import { receive } from "../../app/lib/safety/reception";
import type { RedFlagId } from "../../app/lib/safety/redFlags";

const start = () => startConsultation("General Medicine");
function say(s: ConsultState, words: string): { s: ConsultState; o: Outcome } {
  const o = converse(s, nextTurn(s), words);
  return { s: "state" in o ? o.state : s, o };
}
const lineOf = (o: Outcome) => ("line" in o && typeof o.line === "string" ? o.line : "");
const HANDOFF = /\b(108|112|14416|helpline|call (a|the|your) doctor|see a doctor|go to (a |the )?hospital)\b/i;
const DOSE = /\b\d+(\.\d+)?\s?(mg|mcg|ml|units?|tablets? (a|per|every)|puffs?)\b/i;
const DIAGNOSIS = /\byou (have|'ve got|are suffering from|definitely have|probably have)\b/i;

// ---------------------------------------------------------------------------
// 1. Red flags: emergency at once, in plain, broken, misspelt or local English.
const EMERGENCIES: [string, RedFlagId][] = [
  ["chest pain cant breath", "chest_pain"],
  ["cheast pian but im fine", "chest_pain"],
  ["My chest feels crushed and I can't breathe", "chest_pain"],
  ["my chest is paining very much and sweating", "chest_pain"],
  ["he cant breathe properly lips going blue", "breathing"],
  ["My baby won't wake properly.", "infant"],
  ["baby not feeding and very sleepy", "infant"],
  ["I took too many tablets.", "overdose"],
  ["she swallowed rat poison", "poisoning"],
  ["I'm pregnant and bleeding.", "pregnancy"],
  ["pregnant, water broke, baby not moving", "pregnancy"],
  ["just had a baby and bleeding a lot", "postpartum"],
  ["fits came to my son", "seizure"],
  ["my daughter is having fits", "seizure"],
  ["he is not waking up", "unconscious"],
  ["she fainted and not responding", "unconscious"],
  ["bleeding not stopping", "bleeding"],
  ["vomiting blood", "bleeding"],
  ["face is drooping one side", "stroke"],
  ["sudden weakness in the left arm", "stroke"],
  ["severe headache worst ever", "stroke"],
  ["high fever with stiff neck", "severe_infection"],
  ["fever and a rash that doesn't fade", "severe_infection"],
  ["lips and tongue swollen after eating", "allergy"],
  ["snake bit my leg", "snakebite"],
  ["bike accident head injury", "injury"],
  ["I want to end my life", "suicide"],
  ["I want to die but don't call anyone", "suicide"],
];

describe("red flags escalate immediately", () => {
  it.each(EMERGENCIES)("%s → %s", (words, flag) => {
    expect(detectRedFlags(words).confirmed, words).toContain(flag);
    // Reception sends it straight to Emergency Mode.
    expect(receive(words).detection.confirmed).toContain(flag);
    // The consultation stops normal questioning at once.
    const { s } = say(start(), words);
    expect(nextTurn(s).step, words).toBe("emergency");
  });

  it.each([
    ["chest pain but I'm okay now", "chest_pain"],
    ["it's probably nothing but I can't breathe", "breathing"],
    ["don't worry, just took too many pills", "overdose"],
  ] as const)("reassurance never cancels a red flag: %s", (words, flag) => {
    expect(detectRedFlags(words).confirmed).toContain(flag);
  });

  it("an emergency mid-consultation interrupts whatever question is open", () => {
    let s = say(start(), "I have had a cough for a week").s;
    for (let i = 0; i < 4 && nextTurn(s).step !== "emergency"; i++) s = say(s, "now my chest is very tight and I can't breathe").s;
    expect(nextTurn(s).step).toBe("emergency");
  });
});

// ---------------------------------------------------------------------------
// 2. Unsure words: never confirmed from words alone, never ignored — asked.
describe("unsure or negated danger words are asked about directly", () => {
  it.each([
    ["breathing problem very much", "breathing"],
    ["I get short of breath", "breathing"],
    ["black stool since yesterday", "bleeding"],
    ["no chest pain", "chest_pain"],
    ["no heavy bleeding", "bleeding"],
  ] as const)("%s → ask about %s", (words, flag) => {
    const d = detectRedFlags(words);
    expect(d.needsConfirmation, words).toContain(flag);
    expect(d.confirmed).not.toContain(flag);
    const { s } = say(start(), words);
    expect(["emergency", "result"]).not.toContain(nextTurn(s).step);
    expect(nextTurn(s).say, words).toMatch(/to be safe/i);
  });

  it("a question about a word is not a symptom report", () => {
    expect(detectRedFlags("what does shortness of breath mean?").needsConfirmation).toEqual([]);
  });

  it("explaining or asking about words never cancels a real red flag", () => {
    expect(detectRedFlags("what does it mean when you can't breathe").confirmed).toContain("breathing");
  });
});

// ---------------------------------------------------------------------------
// 3. Conversation difficulty is NOT clinical urgency.
const DIFFICULT = [
  "idk",
  "I don't know",
  "maybe",
  "not sure",
  "hmm",
  "what?",
  "sorry?",
  "I can't explain",
  "I can't explain the pain",
  "something wrong here",
  "something hurts here",
  "right side pain",
  "Here on my right",
  "I don't feel well",
  "I feel weird",
  "My mother is feeling strange",
  "blah blah",
  "ok",
  "I don't know what's wrong, but something hurts on my right",
];

describe("conversation difficulty never becomes an emergency or a handoff", () => {
  it.each(DIFFICULT)("'%s' → help, not escalation", (words) => {
    expect(detectRedFlags(words).confirmed, words).toEqual([]);
    const { s, o } = say(start(), words);
    const t = nextTurn(s);
    expect(["emergency", "result"], words).not.toContain(t.step);
    expect(escalationFor(s), words).toBeNull();
    expect(o.kind, words).not.toBe("needs-professional");
    for (const l of [lineOf(o), t.say]) {
      expect(l, l).not.toMatch(HANDOFF);
      expect(violatesLanguagePolicy(l), l).toBeNull();
    }
  });

  it("ten misunderstandings in a row still never escalate", () => {
    let s = start();
    for (let i = 0; i < 10; i++) {
      const r = say(s, ["blah", "idk", "hmm", "what", "maybe"][i % 5]);
      s = r.s;
      expect(["emergency", "result"]).not.toContain(nextTurn(s).step);
      expect(escalationFor(s)).toBeNull();
    }
  });

  it("'I can't explain' starts Help me describe it, at the body map", () => {
    const { s } = say(start(), "I can't explain");
    expect(s.helpDescribe).toBe(true);
    expect(nextTurn(s).step).toBe("body");
  });
});

// ---------------------------------------------------------------------------
// 4. Memory: corrections update the record; answers are not asked again.
describe("the record follows the patient", () => {
  it("'right side pain' → 'no sorry left' changes the stored side", () => {
    const a = say(say(start(), "My stomach hurts").s, "right side pain").s;
    expect(a.sideHint).toBe("right");
    const placed = respond(a, "body", "lower-abdomen|right");
    const { s, o } = say(placed, "no sorry left");
    expect(o.kind).toBe("corrected");
    expect(s.bodySide).toBe("left");
  });

  it("'I've been coughing for weeks' is remembered as a cough, and the cough is not asked about again", () => {
    const { s } = say(start(), "I've been coughing for weeks.");
    expect(nextTurn(s).step).not.toBe("complaint");
    expect(chartOf(s).reported.some((r) => /cough/i.test(r.value))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Nothing is invented: no measurements, diagnoses, prescriptions or doses.
describe("missing stays missing; nothing clinical is invented", () => {
  it("a consultation with skipped answers shows them as not provided, never guessed", () => {
    let s = say(start(), "I have a headache").s;
    let guard = 0;
    while (!["result", "emergency"].includes(nextTurn(s).step) && guard++ < 80) {
      const t = nextTurn(s);
      if (t.input.kind === "single" || t.input.kind === "body")
        s = respond(s, t.step, t.step === "check" ? "none" : t.step.startsWith("q:") ? "no" : t.input.options[0].id);
      else s = respond(s, t.step, t.input.kind === "multi" ? [] : "");
    }
    const chart = chartOf(s);
    const all = JSON.stringify(chart);
    // No vital sign appears unless the patient typed one.
    expect(all).not.toMatch(/\b\d{2,3}\s?\/\s?\d{2,3}\b/); // blood pressure
    expect(all).not.toMatch(/\b(SpO2|oxygen saturation)\b.*\d/i);
    expect(all).not.toMatch(/\b3[5-9](\.\d)?\s?°?C\b/); // temperature
    for (const r of chart.reported) {
      if (/medicines|allergies|conditions/i.test(r.label)) expect(r.value).toMatch(/not (asked|provided|remembered)|none \(as reported\)|^$/i);
    }
  });

  it("no line anywhere in the corpus diagnoses, prescribes or doses", () => {
    for (const words of [...DIFFICULT, ...EMERGENCIES.map((e) => e[0]), "what should I take for fever", "can I take paracetamol", "what disease do I have", "is it cancer"]) {
      const { s, o } = say(start(), words);
      for (const l of [lineOf(o), nextTurn(s).say]) {
        expect(l, `${words} → ${l}`).not.toMatch(DOSE);
        expect(l, `${words} → ${l}`).not.toMatch(DIAGNOSIS);
        expect(violatesLanguagePolicy(l), l).toBeNull();
      }
    }
  });
});
