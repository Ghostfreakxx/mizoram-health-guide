// "I cannot understand you yet" is NOT "you need a real doctor".
// These tests protect that distinction — and protect the emergency
// safeguards, which must not weaken.

import { describe, expect, it } from "vitest";
import { needsSpeechConfirmation } from "../../app/ai-hospital/consult-room/voice";
import {
  type ConsultState,
  KNOWLEDGE_LINE,
  type Outcome,
  chartOf,
  converse,
  nextTurn,
  respond,
  startConsultation,
  startHelpDescribe,
} from "../../app/lib/consultation";
import { NOT_REASONS, escalationFor } from "../../app/lib/escalation";
import { GLOSSARY, askedTerm, termsIn } from "../../app/lib/knowledge/glossary";
import { PASSAGES, coverage, retrieve } from "../../app/lib/knowledge";

const start = () => startConsultation("General Medicine");

function say(s: ConsultState, words: string): { s: ConsultState; o: Outcome } {
  const o = converse(s, nextTurn(s), words);
  return { s: "state" in o ? o.state : s, o };
}
function talk(lines: string[], s0 = start()) {
  let s = s0;
  const outcomes: Outcome[] = [];
  for (const w of lines) {
    const r = say(s, w);
    s = r.s;
    outcomes.push(r.o);
  }
  return { s, outcomes };
}

// Helplines, emergency numbers and "go see someone" wording.
const HANDOFF_WORDS = /\b(108|112|14416|1097|helpline|call (a|the|your) doctor|contact (a|the|your) doctor|see a doctor|go to (a |the )?hospital|emergency)\b/i;
const linesOf = (o: Outcome) => ("line" in o ? [o.line] : []);
const isClinical = (s: ConsultState) => ["emergency", "result"].includes(nextTurn(s).input.kind);

describe("conversational difficulty never becomes clinical escalation", () => {
  it.each([
    ["I feel weird."],
    ["It hurts here."],
    ["Here on the right."],
    ["I don't know."],
    ["I can't explain it."],
    ["blah blah"],
    ["My head is doing something."],
  ])("'%s' → clarification, not a helpline", (words) => {
    const { s, o } = say(start(), words);
    expect(isClinical(s), words).toBe(false);
    expect(escalationFor(s)).toBeNull();
    for (const l of [...linesOf(o), nextTurn(s).say]) expect(l, l).not.toMatch(HANDOFF_WORDS);
  });

  it("repeated misunderstanding climbs a ladder: another way → simpler → easier — and keeps going", () => {
    const base = talk(["I have a cough"]).s;
    const { s, outcomes } = talk(["banana", "blah", "xyz", "spoon"], base);
    const lines = outcomes.map((o) => (o.kind === "unclear" ? o.line : ""));
    expect(lines[0]).toMatch(/^I didn't quite understand that\. Could you say it another way/);
    expect(lines[1]).toMatch(/^I'm not completely sure I understood\. Let me ask that another way\./);
    expect(lines[2]).toMatch(/^Let's make it easier\./);
    for (const o of outcomes) {
      expect(o.kind).toBe("unclear");
      if (o.kind === "unclear") expect(o.difficulty).toBe("language");
      for (const l of linesOf(o)) expect(l).not.toMatch(HANDOFF_WORDS);
    }
    expect(nextTurn(s).step).toBe(nextTurn(base).step); // same question, still helping
    expect(escalationFor(s)).toBeNull();
  });

  it("three different failure states: language, missing information, unverified knowledge", () => {
    const cough = talk(["I have a cough"]).s;
    const lang = say(cough, "banana").o;
    expect(lang.kind === "unclear" && lang.difficulty).toBe("language");

    const where = talk(["It hurts here."]).s;
    const missing = say(where, "somewhere around there").o;
    expect(missing.kind === "unclear" && missing.difficulty).toBe("missing");
    if (missing.kind === "unclear") expect(missing.line).toMatch(/I need to know where the problem is before I can guide you further/);

    const k = say(cough, "What does my spleen do?").o;
    expect(k.kind === "unclear" && k.difficulty).toBe("knowledge");
    if (k.kind === "unclear") expect(k.line.startsWith(KNOWLEDGE_LINE)).toBe(true);
  });

  it("'What does the spleen do?' → knowledge limitation, NOT escalation; the consultation continues", () => {
    const cough = talk(["I have a cough"]).s;
    const { s, o } = say(cough, "What does the spleen do?");
    expect(o.kind).toBe("unclear");
    if (o.kind === "unclear") {
      expect(o.line).toMatch(/I don't have verified information about that in my health guide yet, and I don't want to guess/);
      expect(o.line).not.toMatch(HANDOFF_WORDS);
      expect(o.line).toMatch(/When did this start\?$/); // and carries on
    }
    expect(nextTurn(s).step).toBe("duration");
    expect(escalationFor(s)).toBeNull();
  });

  it("'I don't know' continues safely, recorded as such", () => {
    const { s } = talk(["I have a cough", "I don't know"]);
    expect(s.unknown.duration).toBe("Not sure");
    expect(isClinical(s)).toBe(false);
  });

  it("asking for a real doctor is respected — and is a real reason", () => {
    const { o } = say(talk(["I have a cough"]).s, "I want to talk to a real doctor");
    expect(o.kind).toBe("professional");
    expect(escalationFor(start(), { patientAsked: true })?.reason).toBe("patient-request");
  });

  it("the documented non-reasons cover the cases above", () => {
    expect(NOT_REASONS).toContain("a question the verified knowledge layer cannot answer");
    expect(NOT_REASONS).toContain("uncertain speech recognition");
  });
});

describe("clarification engine", () => {
  it("'I feel weird.' → asks for a little more, with quick answers and Help me describe it", () => {
    const { s } = say(start(), "I feel weird.");
    const t = nextTurn(s);
    expect(t.step).toBe("concern-more");
    expect(t.say).toMatch(/^I'm not completely sure what you mean yet\./);
    if (t.input.kind === "single") expect(t.input.options.map((o) => o.label)).toContain("Help me describe it");
  });

  it("'It hurts here.' → asks where, with the body map", () => {
    const { s } = say(start(), "It hurts here.");
    const t = nextTurn(s);
    expect(t.step).toBe("body");
    expect(t.input.kind).toBe("body");
    expect(t.say).toMatch(/Where do you feel it\?/);
  });

  it("'It feels weird here' → where → chest → which side → what does it feel like (chest options)", () => {
    let s = say(start(), "It feels weird here.").s;
    s = respond(s, "body", "chest");
    expect(nextTurn(s).step).toBe("side");
    s = respond(s, "side", "left");
    const t = nextTurn(s);
    expect(t.step).toBe("describe");
    if (t.input.kind === "single") expect(t.input.options.map((o) => o.label)).toEqual(["Pressure", "Sharp pain", "Burning", "Tightness", "Other / describe it"]);
    // and safety still evaluates the answer
    expect(nextTurn(respond(s, "describe", "words:pressure")).step).toBe("confirm:chest_pain");
  });

  it("'Here on the right.' → asks which right-side area; the side is stored only after confirmation", () => {
    const { s } = talk(["My stomach hurts", "Here on the right."]);
    expect(s.bodyArea).toBeUndefined();
    expect(s.bodySide).toBeUndefined();
    const t = nextTurn(s);
    expect(t.say).toMatch(/When you say “on the right”, which part of your body do you mean\?/);
    const placed = respond(s, "body", "upper-abdomen|right");
    expect([placed.bodyArea, placed.bodySide]).toEqual(["upper-abdomen", "right"]);
  });

  it("region and side are separate fields; a side is never guessed from a body part alone", () => {
    const s = respond(talk(["My stomach hurts"]).s, "body", "lower-abdomen");
    expect(s.bodyArea).toBe("lower-abdomen");
    expect(s.bodySide).toBeUndefined();
    expect(nextTurn(s).step).toBe("side");
    const explicit = say(talk(["My stomach hurts"]).s, "lower right side of my stomach").s; // said explicitly
    expect(explicit.bodyArea).toBe("lower-abdomen");
    expect(explicit.bodySide).toBe("right");
  });

  it("'I said left, not right.' → corrects the stored side and says so", () => {
    const placed = respond(talk(["My stomach hurts", "Here on the right."]).s, "body", "lower-abdomen|right");
    const { s, o } = say(placed, "Actually, I said left, not right.");
    expect(o.kind).toBe("corrected");
    if (o.kind === "corrected") expect(o.line).toBe("Okay. I've changed that to the left side.");
    expect(s.bodySide).toBe("left");
    expect(chartOf(s).reported.find((r) => r.label === "Where")!.value).toMatch(/left side/);
    expect(chartOf(s).reported.find((r) => r.label === "Corrected by patient")!.value).toMatch(/left/);
  });

  it("a corrected start time replaces the old one", () => {
    const s0 = talk(["I have a cough", "today"]).s;
    const { s, o } = say(s0, "Actually it started three weeks ago");
    expect(o.kind).toBe("corrected");
    expect(s.duration).toBe("over-2-weeks");
  });

  it("recovery: 'My head is doing something.' → more → 'I don't know. Strange.' → 'Are you having pain?'", () => {
    const a = say(start(), "My head is doing something.").s;
    expect(nextTurn(a).say).toMatch(/Can you tell me a little more\? Is it mainly pain, dizziness, weakness, vision trouble, or something else\?/);
    const b = say(a, "I don't know. Strange.").s;
    const t = nextTurn(b);
    expect(t.say).toBe("That's okay. Let's make it easier. Are you having pain?");
    if (t.input.kind === "single") expect(t.input.options.map((o) => o.label)).toEqual(["Yes", "No", "Not sure"]);
    expect(isClinical(say(b, "not sure").s)).toBe(false);
  });

  it("weakness or trouble seeing in the head → a stroke-sign safety check (not a routine question)", () => {
    const a = say(start(), "My head is doing something.").s;
    expect(nextTurn(respond(a, "describe", "words:weakness")).step).toBe("confirm:stroke");
  });
});

describe("Help me describe it", () => {
  it("'I can't explain it.' → where → which area → what it feels like → when → pattern → better/worse", () => {
    let s = say(start(), "I can't explain it.").s;
    expect(nextTurn(s).say).toBe("That's okay. I'll help you describe it. First, where in your body do you notice the problem?");
    s = respond(s, "body", "lower-abdomen");
    expect(nextTurn(s).step).toBe("side");
    s = respond(s, "side", "right");
    expect(nextTurn(s).say).toBe("Thank you. What does it feel like?");
    s = respond(s, "describe", "words:pain");
    expect(nextTurn(s).question).toBe("When did the pain start?");
    s = respond(s, "duration", "today");
    expect(nextTurn(s).step).toBe("pattern");
    s = respond(s, "pattern", "comes-and-goes");
    expect(nextTurn(s).step).toBe("modifiers");
    s = say(s, "worse when I walk").s;
    expect(s.modifiers).toBe("worse when I walk");
    const rows = chartOf(s).reported;
    expect(rows.find((r) => r.label === "Where")!.value).toBe("Lower tummy — right side");
    expect(rows.find((r) => r.label === "Pattern")!.value).toBe("Comes and goes");
  });

  it("can be started from any symptom question", () => {
    const s = startHelpDescribe(talk(["I have a cough"]).s);
    expect(s.helpDescribe).toBe(true);
    expect(nextTurn(s).step).toBe("body");
  });
});

describe("words the patient may not know", () => {
  it("'What does allergy mean?' → simple explanation, no state change", () => {
    const s = talk(["I have a cough"]).s;
    const { o } = say(s, "What does allergy mean?");
    expect(o.kind).toBe("term");
    if (o.kind === "term") expect(o.line).toMatch(/reacts badly to something/);
  });
  it("'What does that word mean?' → re-says the question simply", () => {
    let s = talk(["fever since yesterday", "none", "me", "30", "male", "no"]).s;
    while (nextTurn(s).step !== "q:fever-breathing") s = respond(s, nextTurn(s).step, "no");
    const { o } = say(s, "What does that word mean?");
    expect(o.kind).toBe("explain");
  });
  it("hard words in a question are offered as 'What does … mean?'", () => {
    expect(termsIn("Wheezing, or the chest feels tight?", { hardOnly: true }).map((t) => t.term)).toContain("wheezing");
    expect(askedTerm("what does wheezing mean")?.id).toBe("wheezing");
  });
  it("the glossary is flagged for clinician review", () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(50);
    expect(GLOSSARY.every((g) => g.reviewed === false)).toBe(true);
  });
});

describe("verified knowledge layer", () => {
  it("is organised by category and every passage keeps its sources", () => {
    expect(PASSAGES.length).toBeGreaterThan(150);
    for (const p of PASSAGES) expect(p.sources.length, p.id).toBeGreaterThan(0);
    const cov = Object.fromEntries(coverage().map((c) => [c.category, c.passages]));
    expect(cov.tb).toBeGreaterThan(0);
    expect(cov["medicine-safety"]).toBeGreaterThan(0);
    expect(cov["tests-and-reports"]).toBeGreaterThan(0);
  });
  it("finds verified answers beyond the curated list", () => {
    expect(retrieve("What is metformin?")?.id).toBe("medicine:metformin#used");
    expect(retrieve("What does HbA1c measure?")?.id).toBe("test:hba1c#measures");
    expect(retrieve("Can I stop BP medicine?")?.text[0]).toMatch(/Never stop without asking your doctor/);
  });
  it("refuses weak matches rather than guessing", () => {
    for (const q of ["What does my spleen do?", "What causes high blood pressure?", "What is lupus?"]) expect(retrieve(q), q).toBeNull();
  });
});

describe("speech recognition is confirmed when uncertain", () => {
  it("low confidence → 'I heard … Is that correct?'; high or unknown → checked in the box before Send", () => {
    expect(needsSpeechConfirmation("my chest feels", 0.42)).toBe(true);
    expect(needsSpeechConfirmation("my chest feels tight", 0.93)).toBe(false);
    expect(needsSpeechConfirmation("my chest feels", undefined)).toBe(false);
    expect(needsSpeechConfirmation("", 0.1)).toBe(false);
  });
});

describe("emergency safeguards are unchanged", () => {
  it.each([["My chest is crushing and I can't breathe."], ["I took too many tablets and feel sleepy."]])("'%s' → EMERGENCY immediately", (words) => {
    const { s } = say(start(), words);
    expect(nextTurn(s).input.kind).toBe("emergency");
    expect(escalationFor(s)?.reason).toBe("emergency-red-flag");
  });
  it("danger words inside a correction or a question still open the emergency", () => {
    const s = talk(["I have a cough"]).s;
    for (const w of ["Actually I can't breathe now", "What does it mean if I can't breathe now?"]) {
      expect(nextTurn(say(s, w).s).input.kind, w).toBe("emergency");
    }
  });
});

describe("questions only a professional can answer — honest, specific, saved for them, no helpline", () => {
  it.each([
    ["Can you prescribe me antibiotics?", "prescription"],
    ["how much paracetamol should i take", "prescription"],
    ["Do I have TB?", "diagnosis"],
    ["what's wrong with me", "diagnosis"],
    ["Do I need an x-ray?", "test"],
    ["Is it serious?", "serious"],
  ])("'%s' → %s", (q, topic) => {
    const s = talk(["I have a cough"]).s;
    const { s: after, o } = say(s, q);
    expect(o.kind).toBe("needs-professional");
    if (o.kind === "needs-professional") {
      expect(o.topic).toBe(topic);
      expect(o.line).not.toMatch(HANDOFF_WORDS);
      expect(o.line).toMatch(/Let's carry on\.$/);
    }
    if (topic !== "serious") expect(after.doctorQuestions).toContain(q);
    expect(nextTurn(after).step).toBe(nextTurn(s).step); // the consultation continues
    expect(escalationFor(after)).toBeNull();
  });

  it("never gives a dose or names a medicine to take", () => {
    const { o } = say(talk(["I have a fever"]).s, "what dose of paracetamol can I take");
    if ("line" in o) expect(o.line).not.toMatch(/\b\d+\s?(mg|ml|tablets?)\b/i);
  });

  it("danger words in such a question still open the emergency", () => {
    const { s } = say(talk(["I have a cough"]).s, "Do I have a heart attack? my chest is crushing");
    expect(nextTurn(s).input.kind).toBe("emergency");
  });
});
