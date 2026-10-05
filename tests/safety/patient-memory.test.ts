// Patient memory that changes behaviour: negations are respected, later
// statements that contradict earlier answers are asked about, second
// problems are kept, and every chart fact says where it came from.

import { describe, expect, it } from "vitest";
import { type ConsultState, type Outcome, chartOf, converse, feverFromWords, nextTurn, respond, splitConcerns, startConsultation, stripNegated, yesFromWords } from "../../app/lib/consultation";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";

const start = () => startConsultation("General Medicine");
function say(s: ConsultState, words: string): { s: ConsultState; o: Outcome } {
  const o = converse(s, nextTurn(s), words);
  return { s: "state" in o ? o.state : s, o };
}
function talk(lines: string[], s0 = start()) {
  let s = s0;
  for (const w of lines) s = say(s, w).s;
  return s;
}
// Answers routine questions until a given step comes up.
function until(s0: ConsultState, step: RegExp, answer = (id: string, opts: string[]) => (opts.includes("no") ? "no" : opts[0])) {
  let s = s0;
  for (let i = 0; i < 60; i++) {
    const t = nextTurn(s);
    if (step.test(t.step) || ["result", "emergency"].includes(t.step)) return s;
    const opts = "options" in t.input ? t.input.options.map((o) => o.id) : [];
    const v = t.step === "check" ? "none" : t.step === "who" ? "self" : t.step === "age" ? "adult" : t.step === "sex" ? "female" : t.input.kind === "multi" ? [] : t.input.kind === "text" ? "" : answer(t.step, opts);
    const n = respond(s, t.step, v);
    if (n === s) throw new Error(`stuck at ${t.step}`);
    s = n;
  }
  throw new Error("did not reach " + step);
}

describe("negations are never turned into symptoms", () => {
  it("'a cough but no fever' does not record a fever", () => {
    expect(yesFromWords("I have a cough but no fever")).not.toContain("cough-fever");
    expect(yesFromWords("I have a cough and a fever")).toContain("cough-fever");
    expect(stripNegated("cough but no fever")).not.toMatch(/fever/);
  });
  it("'not coughing blood' is not 'coughing blood'", () => {
    expect(yesFromWords("I'm not coughing up blood")).not.toContain("cough-blood");
  });
  it("a measured reading is recognised, and readings below 38 °C are not a fever", () => {
    expect(feverFromWords("my temperature was 39 degrees")?.reading?.celsius).toBe(39);
    expect(feverFromWords("it was 101 F")?.reading?.celsius).toBeCloseTo(38.3, 1);
    expect(feverFromWords("temperature was 37.2")?.said).toBe(false);
    expect(feverFromWords("I don't have a fever")).toBeNull();
  });
});

describe("contradictions are asked about, never silently overwritten or ignored", () => {
  it("'no fever' earlier, then 'my temperature was 39' → the doctor asks, then records the reading", () => {
    let s = talk(["I've been coughing for a week, I don't have a fever"]);
    expect(s.denied).toContain("fever");
    s = until(s, /^q:cough-blood$/);
    const r = say(s, "my temperature was 39 degrees this morning");
    const t = nextTurn(r.s);
    expect(t.step).toBe("recheck");
    expect(t.say).toMatch(/Earlier you said you didn't have a fever, but you've now said your temperature was 39°C\. Should I record that you have a measured fever\?/);
    expect(violatesLanguagePolicy(t.say)).toBeNull();
    // The reading itself is the patient's own measurement and is kept.
    expect(r.s.temperature).toBe("39°C");
    const yes = respond(r.s, "recheck", "yes");
    expect(yes.recheck).toBeUndefined();
    expect(yes.answers["cough-fever"]).toBe("yes");
    expect(yes.corrections.join(" ")).toMatch(/measured fever/);
  });

  it("an earlier 'no' to a warning-sign question + later words saying yes → asked; 'yes' updates it", () => {
    let s = talk(["I've been coughing for three weeks"]);
    s = until(s, /^q:cough-blood$/);
    s = respond(s, "q:cough-blood", "no");
    const r = say(s, "actually there is blood when I cough up phlegm");
    expect(nextTurn(r.s).step).toBe("recheck");
    expect(r.s.answers["cough-blood"]).toBe("no"); // not overwritten yet
    const fixed = respond(r.s, "recheck", "yes");
    expect(fixed.answers["cough-blood"]).toBe("yes");
    expect(chartOf(fixed).reported.find((x) => x.label === "Symptoms reported")?.value).toMatch(/Coughing up blood/);
  });

  it("'No, keep my earlier answer' keeps it and the record says so; 'Not sure' records uncertainty", () => {
    let s = until(talk(["I've been coughing for three weeks"]), /^q:cough-blood$/);
    s = respond(s, "q:cough-blood", "no");
    const r = say(s, "I cough blood sometimes");
    expect(respond(r.s, "recheck", "no").answers["cough-blood"]).toBe("no");
    expect(respond(r.s, "recheck", "no").corrections.join(" ")).toMatch(/Kept earlier answer/);
    expect(respond(r.s, "recheck", "unsure").answers["cough-blood"]).toBe("unsure");
  });

  it("an emergency answer reached through a recheck still opens Emergency Mode", () => {
    let s = until(talk(["I've been coughing for three weeks"]), /^q:cough-severe$/);
    s = respond(s, "q:cough-severe", "no");
    // Not a free-text red flag phrase on its own, so the recheck asks first.
    s = { ...s, recheck: { key: "cough-severe", earlier: "no", now: "“lips going a bit blue”" } };
    expect(nextTurn(respond(s, "recheck", "yes")).step).toBe("emergency");
  });
});

describe("more than one problem", () => {
  it("'My main problem is cough, but I also have back pain' → questions follow the cough; back pain is kept", () => {
    const split = splitConcerns("My main problem is cough, but I also have back pain.");
    expect(split?.other).toBe("back pain");
    const s = talk(["My main problem is cough, but I also have back pain."]);
    expect(s.complaint).toBe("cough");
    expect(s.otherConcerns).toEqual(["back pain"]);
    expect(nextTurn(s).say).toMatch(/I've noted back pain as well/);
    const row = chartOf(s).reported.find((x) => x.label.startsWith("Other problems"));
    expect(row?.value).toMatch(/back pain/);
    expect(row?.status).toBe("from-words");
  });

  it("a second problem mentioned mid-consultation is noted, not 'misunderstood'", () => {
    const s = until(talk(["I've been coughing for three weeks"]), /^q:/);
    const r = converse(s, nextTurn(s), "I also have a headache");
    expect(r.kind).toBe("noted");
    if (r.kind === "noted") {
      expect(r.state.otherConcerns).toEqual(["a headache"]);
      expect(r.line).toMatch(/noted a headache as well/);
      expect(r.state.complaint).toBe("cough");
    }
  });

  it("the result reminds the patient that the other problem was not assessed", () => {
    let s = talk(["My main problem is cough, but I also have back pain."]);
    s = until(s, /^never$/);
    const t = nextTurn(s);
    expect(t.step).toBe("result");
    expect(t.say).toMatch(/You also mentioned back pain/);
  });

  it("safety still reads every word: a red flag in the second problem is an emergency", () => {
    const s = talk(["My main problem is a cough, but I also have chest pain and can't breathe"]);
    expect(nextTurn(s).step).toBe("emergency");
  });
});

describe("every fact says where it came from", () => {
  it("confirmed, from the patient's words, uncertain, not provided", () => {
    let s = talk(["I've been coughing for three weeks"]);
    s = until(s, /^progression$/);
    s = respond(s, "progression", "?unsure");
    const rows = chartOf(s).reported;
    const get = (l: string) => rows.find((r) => r.label === l)!;
    expect(get("Duration").status).toBe("from-words");
    expect(get("Age group").status).toBe("confirmed");
    expect(get("Change").status).toBe("uncertain");
    expect(get("Current medicines").status).toBe("not-provided");
  });
});
