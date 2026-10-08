import { describe, expect, it } from "vitest";
import { type ConsultState, type Outcome, chartOf, converse, learn, nextTurn, respond, startConsultation, stripNegated } from "../../app/lib/consultation";
import { allergiesIn, conditionsIn, medicinesIn, modifiersIn, patternIn, symptomsIn } from "../../app/lib/consultMemory";
import { MENTIONS, SPOKEN, spokenFor, spokenQuestion } from "../../app/lib/consultSpeech";
import { normalizeWords } from "../../app/lib/consultHelp";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";
import { complaints, populationQuestions } from "../../app/lib/safety/triage";

// VD4: memory of everything the patient says, multi-problem openings, and
// danger-sign questions said in everyday words. Synthetic patients only.

const start = () => startConsultation("General Medicine");
function talk(lines: string[], s0: ConsultState = start()) {
  let s = s0;
  const doctor: string[] = [nextTurn(s).say];
  const outcomes: Outcome[] = [];
  for (const w of lines) {
    const o = converse(s, nextTurn(s), w);
    outcomes.push(o);
    if ("state" in o) s = o.state;
    if ("line" in o) doctor.push(o.line);
    if (o.kind === "answered") doctor.push(nextTurn(s).say);
  }
  return { s, doctor, outcomes, last: outcomes[outcomes.length - 1] };
}
const pos = (t: string) => stripNegated(normalizeWords(t));
const row = (s: ConsultState, label: string) => chartOf(s).reported.find((r) => r.label === label);

describe("memory: facts are kept whatever question is on screen", () => {
  it("symptoms, never from a denial", () => {
    expect(symptomsIn(pos("I have had a headache and fever for three days"))).toEqual(["fever", "headache"]);
    expect(symptomsIn(pos("I have a cough but no fever"))).toEqual(["cough"]);
    expect(symptomsIn(pos("I don't have a headache"))).toEqual([]);
    expect(symptomsIn(pos("loose motions and vomiting since morning"))).toEqual(["vomiting", "diarrhoea"]);
  });
  it("medicines by name only; conditions that are the patient's own; allergies", () => {
    expect(medicinesIn(pos("I took paracetamol yesterday and some cough syrup"))).toEqual(["paracetamol", "cough syrup"]);
    expect(medicinesIn(pos("I have not taken any medicine"))).toEqual([]);
    expect(conditionsIn(pos("I'm diabetic and a BP patient"))).toEqual(["diabetes", "high blood pressure"]);
    expect(conditionsIn(pos("my father has diabetes"))).toEqual([]);
    expect(allergiesIn(pos("I am allergic to penicillin"))).toEqual(["penicillin"]);
  });
  it("pattern and what makes it worse", () => {
    expect(patternIn(pos("it comes and goes"))).toBe("comes-and-goes");
    expect(patternIn(pos("it is there all the time"))).toBe("constant");
    expect(modifiersIn(pos("it comes and goes, worse after food"))).toBe("worse after food");
    expect(modifiersIn(pos("better when I rest"))).toBe("better when i rest");
  });
});

describe("a first message with two problems", () => {
  it("names only those problems, and the other stays in My Visit", () => {
    const { s } = talk(["I have had a headache and fever for three days"]);
    const t = nextTurn(s);
    expect(t.say).toMatch(/You mentioned a fever and a headache\. Which one is troubling you most\?/);
    expect(t.input.kind === "single" && t.input.options.map((o) => o.id)).toEqual(["fever", "headache", "list"]);
    const chosen = respond(s, "complaint", "fever");
    expect(row(chosen, "Symptoms mentioned")?.value).toMatch(/fever; headache/);
  });
  it("'Something else' opens the full list", () => {
    const { s } = talk(["I have had a headache and fever for three days"]);
    const all = nextTurn(respond(s, "complaint", "list"));
    expect(all.input.kind === "single" && all.input.options.length).toBeGreaterThan(10);
  });
});

describe("volunteered information is noted, not misunderstood", () => {
  const toSex = () => talk(["I have had a headache and fever for three days", "fever", "none", "35"]).s;
  it("'I took paracetamol yesterday' while asked about sex → noted, same question again", () => {
    const s = toSex();
    expect(nextTurn(s).step).toBe("sex");
    const o = converse(s, nextTurn(s), "I took paracetamol yesterday");
    expect(o.kind).toBe("noted");
    if (o.kind !== "noted") return;
    expect(o.line).toMatch(/^Thank you\. I've noted paracetamol under your medicines\. Are you female or male/);
    expect(nextTurn(o.state).step).toBe("sex");
  });
  it("the medicines question then says what was already mentioned, and 'no others' keeps it", () => {
    let s = respond(toSex(), "sex", "female");
    s = (converse(s, nextTurn(s), "I took paracetamol yesterday") as { state: ConsultState }).state;
    for (let i = 0; i < 40 && nextTurn(s).step !== "medicines"; i++) {
      const t = nextTurn(s);
      if (t.input.kind === "multi") s = respond(s, t.step, []);
      else if (t.input.kind === "single") s = respond(s, t.step, t.input.options.find((o) => o.id === "no" || o.id === "same" || o.id === "mild" || o.id === "not-measured" || o.id === "none")?.id ?? t.input.options[0].id);
    }
    const t = nextTurn(s);
    expect(t.say).toMatch(/You mentioned paracetamol\. Are you taking any other medicines/);
    s = respond(s, "medicines", "no others");
    expect(row(s, "Current medicines")?.value).toBe("paracetamol (from what you said)");
  });
  it("the danger-sign question refers to the headache already mentioned", () => {
    let s = respond(toSex(), "sex", "female");
    s = respond(s, "special", []);
    for (let i = 0; i < 20 && nextTurn(s).step !== "q:fever-headache"; i++) s = respond(s, nextTurn(s).step, "no");
    expect(nextTurn(s).say).toMatch(/You mentioned a headache\. Is it severe\?$/);
  });
  it("'it comes and goes, worse after food' records the pattern and what makes it worse", () => {
    const { s } = talk(["I don't really know. Something hurts around here.", "lower tummy", "left", "it comes and goes, worse after food"]);
    expect(s.pattern).toBe("comes-and-goes");
    expect(s.modifiers).toBe("worse after food");
    expect(row(s, "Pattern")?.value).toBe("Comes and goes");
  });
  it("'I'm diabetic' at the female/male question is noted — never recorded as 'male'", () => {
    const s = toSex();
    const o = converse(s, nextTurn(s), "I'm diabetic");
    expect(o.kind).toBe("noted");
    if (o.kind !== "noted") return;
    expect(o.state.sex).toBeUndefined();
    expect(o.state.conditionsSaid).toEqual(["diabetes"]);
    expect(nextTurn(o.state).step).toBe("sex");
    for (const [w, sex] of [["f", "female"], ["m", "male"], ["I am a woman", "female"], ["male", "male"]] as const) {
      const a = converse(s, nextTurn(s), w);
      expect("state" in a && a.state.sex, w).toBe(sex);
    }
  });
  it("a number is an age only when the answer is about age", () => {
    const s = talk(["I have had a headache and fever for three days", "fever", "none"]).s;
    expect(nextTurn(s).step).toBe("age");
    for (const [w, age] of [["34", "adult"], ["I'm 70", "older"], ["3 months old", "child-under-5"], ["about 8 years", "child"], ["she is 2", "child-under-5"]] as const) {
      const o = converse(s, nextTurn(s), w);
      expect("state" in o && o.state.age, w).toBe(age);
    }
    const o = converse(s, nextTurn(s), "I took 2 tablets");
    expect("state" in o ? o.state.age : undefined).toBeUndefined();
  });
  it("safety first: a medicine mention with a danger sign opens Emergency Mode, it is not just 'noted'", () => {
    const s = toSex();
    const o = converse(s, nextTurn(s), "I took an overdose of paracetamol");
    expect(o.kind).toBe("answered");
    expect("state" in o && o.state.emergency).toBeTruthy();
  });
  it("learn() never touches urgency fields", () => {
    const s = talk(["I have a cough"]).s;
    const l = learn(s, "I'm diabetic, I took paracetamol, it comes and goes, I also have a headache").state;
    expect(l.answers).toEqual(s.answers);
    expect(l.emergency).toBe(s.emergency);
    expect(l.pendingFlags).toEqual(s.pendingFlags);
  });
});

describe("help when the patient cannot explain", () => {
  it("'i dont understand' twice at the start → the body map, one step at a time", () => {
    const { s, outcomes } = talk(["idk", "i dont understand", "i dont understand"]);
    expect(outcomes[1].kind).toBe("explain");
    expect(nextTurn(s).input.kind).toBe("body");
  });
});

describe("danger-sign questions in everyday words", () => {
  const all = [...populationQuestions, ...complaints.flatMap((c) => c.questions)];
  it("every rule question has a spoken form (none read out as a form fragment)", () => {
    expect(all.filter((q) => !SPOKEN[q.id]).map((q) => q.id)).toEqual([]);
  });
  it("spoken forms keep the rule's key words (same meaning) and pass the language policy", () => {
    const stop = new Set(["there", "their", "which", "would", "about", "after", "again", "being", "could", "every", "other", "person", "patient", "anything", "within", "without", "really", "something"]);
    const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "");
    const lost: string[] = [];
    for (const q of all) {
      for (const other of [false, true]) {
        const said = spokenFor(SPOKEN[q.id], other);
        expect(violatesLanguagePolicy(said), `${q.id}: ${said}`).toBeNull();
        expect(said.endsWith("?"), q.id).toBe(true);
        const key = q.text.toLowerCase().match(/[a-z]{5,}/g)?.filter((w) => !stop.has(w)) ?? [];
        // Plain-word swaps that keep the meaning (each one deliberate).
        const SAME: Record<string, string[]> = { fluids: ["drinks"], difficulty: ["hard"], severe: ["very"], cannot: ["unable", "can't"], possible: ["could"], confusion: ["confused"], difficult: ["hard"] };
        const kept = key.filter((w) => [stem(w).slice(0, 5), ...(SAME[w] ?? [])].some((x) => said.toLowerCase().includes(x)));
        if (kept.length / Math.max(1, key.length) < 0.6) lost.push(`${q.id}: "${q.text}" vs "${said}" (kept ${kept.join(",")})`);
      }
      expect(spokenFor(SPOKEN[q.id], false), q.id).not.toMatch(/\bthe person\b/);
    }
    expect(lost).toEqual([]);
  });
  it("a mention is never taken from a denial", () => {
    expect(spokenQuestion("fever-headache", "Severe headache?", { other: false, said: pos("I have a fever but no headache") }).mentioned).toBe(false);
    expect(spokenQuestion("fever-headache", "Severe headache?", { other: false, said: pos("fever and a bad headache") }).say).toBe("You mentioned a headache. Is it severe?");
    for (const [id, m] of Object.entries(MENTIONS)) {
      expect(all.some((q) => q.id === id), id).toBe(true);
      expect(m.lead.endsWith("."), id).toBe(true);
    }
  });
  it("after an explanation, meanings are written under the question — not read out", () => {
    let s = talk(["I have had a headache and fever for three days", "fever", "none", "35", "female"]).s;
    s = respond(s, "special", []);
    const o = converse(s, nextTurn(s), "what does that mean?");
    if ("state" in o) s = o.state;
    s = respond(s, nextTurn(s).step, "no");
    const t = nextTurn(s);
    expect(t.say).not.toMatch(/By “/);
  });
});
