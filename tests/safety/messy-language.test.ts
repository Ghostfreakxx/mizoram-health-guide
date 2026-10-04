// Real people type and speak messily. The doctor must understand what it
// can, ask when it can't — and messy wording must never hide an emergency
// or invent an answer.

import { describe, expect, it } from "vitest";
import { normalizeWords } from "../../app/lib/consultHelp";
import { type ConsultState, type Outcome, chartOf, converse, nextTurn, respond, startConsultation, yesFromWords } from "../../app/lib/consultation";
import { escalationFor } from "../../app/lib/escalation";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";

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
const kind = (s: ConsultState) => nextTurn(s).input.kind;
const HANDOFF = /\b(108|112|helpline|call (a|the|your) doctor|contact (a|the|your) doctor)\b/i;

describe("emergencies are recognised however they are typed", () => {
  it.each([
    ["My chest hurts."],
    ["chest pain cant breath"],
    ["My chest is crushing and I can't breathe."],
    ["My baby won't wake properly."],
    ["I took too many pills but I'm okay."],
    ["I'm pregnant and bleeding a little."],
  ])("'%s' → EMERGENCY at once", (w) => {
    const { s } = say(start(), w);
    expect(kind(s)).toBe("emergency");
    expect(escalationFor(s)?.reason).toBe("emergency-red-flag");
  });

  it("the same messy words mid-consultation also stop everything", () => {
    const mid = talk(["I have a cough", "today"]).s;
    for (const w of ["chest pain cant breath", "my baby wont wake properly", "took too many pills"]) expect(kind(say(mid, w).s), w).toBe("emergency");
  });

  it("normalising can only add safety: a red flag in the raw words still counts", () => {
    expect(kind(say(start(), "CHEST PAIN!!! can't breathe").s)).toBe("emergency");
  });
});

describe("messy wording is understood", () => {
  it("text-speak and misspellings", () => {
    expect(normalizeWords("idk")).toBe("i don't know");
    expect(normalizeWords("somethin wrong wit my chest")).toBe("something wrong with my chest");
    expect(normalizeWords("i have a bad coff n fevr since 3 wks")).toBe("i have a bad cough and fever since 3 weeks");
    expect(normalizeWords("chest pain cant breath")).toBe("chest pain can't breathe");
  });

  it("'somethin wrong wit my chest' → chest, then 'what does it feel like?'", () => {
    const { s } = say(start(), "somethin wrong wit my chest");
    expect(s.complaint).toBe("heart");
    expect(nextTurn(s).step).toBe("describe");
    expect(escalationFor(s)).toBeNull();
  });

  it("'I've coughed for three weeks.' → the duration is remembered and never asked", () => {
    const { s } = say(start(), "I've coughed for three weeks.");
    expect(s.duration).toBe("over-2-weeks");
    expect(s.answers["cough-2weeks"]).toBe("yes");
    expect(nextTurn(s).step).not.toBe("duration");
  });

  it("'My fever stopped but now I feel much worse.' → recorded as that warning-sign answer, from their words", () => {
    const { s } = say(start(), "My fever stopped but now I feel much worse.");
    expect(s.complaint).toBe("fever");
    expect(s.answers["fever-weaker"]).toBe("yes");
    expect(chartOf(s).reported.find((r) => r.label === "Symptoms reported")!.value).toMatch(/from what you said/);
  });

  it("'I had possible HIV exposure yesterday.' → the 72-hour window is noted, no emergency", () => {
    const { s } = say(start(), "I had possible HIV exposure yesterday.");
    expect(s.complaint).toBe("hiv");
    expect(s.answers["hiv-72h"]).toBe("yes");
    expect(kind(s)).not.toBe("emergency");
  });

  it("words only ever add 'yes' to warning-sign questions — never 'no'", () => {
    for (const w of ["no fever", "I don't have chills", "not coughing blood"]) {
      // These mention the words but are not affirmations; nothing is set to "no" from free text.
      const ids = yesFromWords(w);
      const s = say(start(), `I have a cough. ${w}`).s;
      for (const id of Object.keys(s.answers)) expect(s.answers[id], `${w}: ${id}`).toBe("yes");
      expect(ids.length).toBeLessThanOrEqual(1);
    }
  });
});

describe("conversation recovery", () => {
  it.each([["idk"], ["maybe"], ["I forgot."], ["I'm not sure"], ["no idea"]])("'%s' at the start → help, not a list or a helpline", (w) => {
    const { s } = say(start(), w);
    const t = nextTurn(s);
    expect(t.step).toBe("concern-more");
    expect(t.say).toMatch(/^That's okay\./);
    expect(t.say).not.toMatch(HANDOFF);
  });

  it("'idk' / 'maybe' mid-consultation → recorded as not sure, consultation continues", () => {
    const s0 = talk(["I have a cough"]).s;
    for (const w of ["idk", "maybe"]) {
      const { s } = say(s0, w);
      expect(s.unknown.duration, w).toBe("Not sure");
      expect(escalationFor(s)).toBeNull();
    }
  });

  it("'Speak slower.' → slows down, keeps the question", () => {
    const { o } = say(talk(["I have a cough"]).s, "Speak slower.");
    expect(o.kind).toBe("control");
    if (o.kind === "control") expect(o.action).toBe("slower");
  });

  it("'Can you ask that differently?' → asks another way (not a knowledge failure)", () => {
    for (const w of ["Can you ask that differently?", "say it more simply", "use simpler words"]) {
      const { o } = say(talk(["I have a cough"]).s, w);
      expect(o.kind, w).toBe("explain");
      if (o.kind === "explain") expect(o.line).toMatch(/^Sure — let me ask that another way\./);
    }
  });

  it("'I already told you' → uses what they said earlier, with an apology", () => {
    // "for three weeks" was said in passing at the start, but the patient picked a different problem.
    let s = talk(["I have a cough and it's been going on for three weeks"]).s;
    s = { ...s, duration: undefined, remembered: s.remembered.filter((r) => r !== "duration") };
    expect(nextTurn(s).step).toBe("duration");
    const { s: after, o } = say(s, "I already told you");
    expect(o.kind).toBe("answered");
    expect(after.duration).toBe("over-2-weeks");
    expect(nextTurn(after).say).toMatch(/^Sorry — you did tell me/);
  });

  it("'I already answered that' when they did not → an honest apology and the question again, nothing invented", () => {
    const { s, o } = say(talk(["I have a cough"]).s, "I already answered that.");
    expect(o.kind).toBe("unclear");
    if (o.kind === "unclear") expect(o.line).toMatch(/I may have missed it\. I don't have that answer from you yet/);
    expect(s.duration).toBeUndefined();
  });

  it("two problems named and 'I already told you' → asks which bothers them most", () => {
    const { s } = say(start(), "I've had a cough for three weeks with fever");
    const { o } = say(s, "I already told you");
    expect(o.kind).toBe("explain");
    if (o.kind === "explain") expect(o.line).toMatch(/Which one is bothering you most\?/);
  });

  it("'what does shortness of breath mean' → explained; again later → 'As I mentioned'", () => {
    const s0 = talk(["I have a cough"]).s;
    const a = say(s0, "what does shortness of breath mean");
    expect(a.o.kind).toBe("term");
    const b = say(a.s, "what does shortness of breath mean?");
    if (b.o.kind === "term") expect(b.o.line).toMatch(/^As I mentioned/);
  });

  it("'here right side' / 'No sorry left' → asks which right-side part, then corrects", () => {
    const a = talk(["My stomach hurts", "here right side"]).s;
    expect(a.sideHint).toBe("right");
    expect(nextTurn(a).say).toMatch(/which part of your body do you mean/);
    const placed = respond(a, "body", "lower-abdomen|right");
    const { s, o } = say(placed, "No sorry left");
    expect(o.kind).toBe("corrected");
    expect(s.bodySide).toBe("left");
  });

  it("'I can't explain.' → Help me describe it", () => {
    const { s } = say(start(), "I can't explain.");
    expect(s.helpDescribe).toBe(true);
    expect(nextTurn(s).step).toBe("body");
  });

  it("everything the patient says is remembered for this visit", () => {
    const { s } = talk(["I have a cough", "banana", "today"]);
    expect(s.said).toEqual(["I have a cough", "banana", "today"]);
  });
});

describe("no invented information, no diagnosis, no doses", () => {
  it("lines produced while recovering pass the language policy", () => {
    const base = talk(["I have a cough"]).s;
    const lines: string[] = [];
    for (const w of ["idk", "Speak slower.", "Can you ask that differently?", "I already answered that.", "what does wheezing mean", "What is the spleen?", "I want a real doctor", "banana", "blah", "xyz"]) {
      const { o } = say(base, w);
      if ("line" in o) lines.push(o.line);
    }
    for (const l of lines) expect(violatesLanguagePolicy(l), l).toBeNull();
  });

  it("unanswered questions stay 'Not provided' — never guessed", () => {
    const { s } = say(start(), "somethin wrong wit my chest");
    const rows = chartOf(s).reported;
    for (const label of ["Age group", "Duration", "Current medicines", "Known allergies"]) {
      expect(rows.find((r) => r.label === label)!.value, label).toBe("Not provided");
    }
  });
});

describe("the real doctor's summary includes what the conversation learned", () => {
  it("how it feels, pattern, triggers and notes (uncertainty, corrections) are listed — never invented", async () => {
    const { summarySections } = await import("../../app/lib/summary");
    const sections = summarySections({
      generatedAt: new Date(0),
      mainConcern: "Stomach pain",
      location: "Lower tummy — right side",
      feels: "Pain or cramps",
      pattern: "Comes and goes",
      triggers: "worse when I walk",
      notes: ["When it started: not sure", "Corrected by the patient: Side changed to right"],
    });
    const text = sections.map((s) => `${s.heading}: ${s.lines.join(" | ")}`).join("\n");
    expect(text).toMatch(/How it feels: Pain or cramps/);
    expect(text).toMatch(/Pattern: Comes and goes/);
    expect(text).toMatch(/Better or worse with: worse when I walk/);
    expect(text).toMatch(/Notes from the conversation: When it started: not sure \| Corrected by the patient/);
    // nothing appears that was not supplied
    expect(text).not.toMatch(/Current medicines|Known allergies/);
  });
});
