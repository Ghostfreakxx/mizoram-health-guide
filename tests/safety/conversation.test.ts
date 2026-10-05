import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type ConsultState,
  type Outcome,
  KNOWLEDGE_LINE,
  UNKNOWN_LINE,
  chartOf,
  converse,
  explainLine,
  nextTurn,
  recap,
  respond,
  startConsultation,
  toAnswers,
  whyLine,
} from "../../app/lib/consultation";
import { allEducation, findEducation } from "../../app/lib/education";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";
import { complaints, triage } from "../../app/lib/safety/triage";

const start = () => startConsultation("General Medicine");

// Plays a conversation; returns the final state and everything the doctor said.
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

describe("it feels like a conversation", () => {
  it("'I don't feel well' → the doctor asks what is bothering them most", () => {
    const { s } = talk(["I don't feel well"]);
    expect(nextTurn(s).say).toBe(
      "I'm sorry you're feeling unwell. Tell me what is bothering you most right now — for example pain, fever, breathing, cough, stomach problems, or something else.",
    );
  });

  it("'My stomach hurts' → 'Where exactly does it hurt?' → 'here on the right' is clarified, never guessed", () => {
    const { s, doctor } = talk(["I don't feel well", "My stomach hurts"]);
    expect(doctor.at(-1)).toMatch(/Where exactly does it hurt\?$/);
    const r = talk(["here on the right"], s);
    expect(r.s.bodyArea).toBeUndefined();
    expect(r.s.sideHint).toBe("right");
    const t = nextTurn(r.s);
    expect(t.say).toMatch(/When you say “on the right”, which part of your body do you mean\?/);
    if (t.input.kind === "body") expect(t.input.options.map((o) => o.label)).toEqual(expect.arrayContaining(["Right side of chest", "Right upper stomach", "Right lower stomach", "Right side of back", "Right arm", "Right leg"]));
    const placed = respond(r.s, "body", "lower-abdomen|right");
    expect(placed.bodyArea).toBe("lower-abdomen");
    expect(placed.bodySide).toBe("right");
    expect(nextTurn(placed).question).toBe("When did the pain start?");
  });

  it("the exact test: 'I don't really know how to explain it' → help → 'chest feels strange' → describe → 'Like pressure' → safety", () => {
    const a = talk(["I don't really know how to explain it"]);
    expect(nextTurn(a.s).say).toBe(
      "That's okay. Tell me what is bothering you most — for example pain, fever, breathing, cough, stomach problems, or something else.",
    );
    const b = talk(["My chest feels strange"], a.s);
    expect(nextTurn(b.s).say).toMatch(/Can you describe what it feels like\?$/);
    const c = talk(["Like pressure"], b.s);
    // The safety system evaluates it at once: no routine question comes first.
    expect(nextTurn(c.s).step).toBe("confirm:chest_pain");
    expect(nextTurn(talk(["yes"], c.s).s).input.kind).toBe("emergency");
    expect(nextTurn(talk(["not sure"], c.s).s).input.kind).toBe("emergency");
  });

  it("asks one question at a time and guides: 'I have a cough' → how long?", () => {
    const { s } = talk(["I have a cough"]);
    expect(nextTurn(s).question).toBe("When did this start?");
  });
});

describe("helping when the patient doesn't understand", () => {
  const breathingQ = () => {
    let s = talk(["fever since yesterday", "none", "me", "30", "male", "no"]).s;
    while (nextTurn(s).step !== "q:fever-breathing") s = respond(s, nextTurn(s).step, "no");
    return s;
  };

  it("'I don't understand' → simple words, then the same question again", () => {
    const s = breathingQ();
    const o = converse(s, nextTurn(s), "I don't understand");
    expect(o.kind).toBe("explain");
    if (o.kind !== "explain") return;
    expect(o.line).toMatch(/difficult to breathe, or you feel you are not getting enough air/);
    expect(nextTurn(o.state).step).toBe("q:fever-breathing");
  });

  it("after an explanation, later questions keep using plain words", () => {
    const s = breathingQ();
    const o = converse(s, nextTurn(s), "what does that mean?");
    if (o.kind !== "explain") throw new Error(o.kind);
    const next = respond(o.state, "q:fever-breathing", "no");
    expect(next.style.explained).toBe(1);
  });

  it("'Why are you asking?' gets a short, honest reason — never scores", () => {
    const s = breathingQ();
    const o = converse(s, nextTurn(s), "why are you asking me that?");
    expect(o.kind).toBe("why");
    if (o.kind === "why") {
      expect(o.line).toMatch(/how urgently someone should be assessed|warning sign/);
      expect(o.line).not.toMatch(/score|points|level|RED|ORANGE/);
    }
  });
});

describe("uncertainty is a valid answer — never invented", () => {
  it("'I don't know' / 'I forgot' are recorded as such", () => {
    let s = talk(["I have a cough", "I don't know"]).s; // duration
    expect(s.unknown.duration).toBe("Not sure");
    expect(chartOf(s).reported.find((r) => r.label === "Duration")!.value).toBe("Not sure");
    // carry on to medicines
    let guard = 0;
    while (nextTurn(s).step !== "medicines" && guard++ < 60) {
      const t = nextTurn(s);
      s = respond(s, t.step, t.input.kind === "single" || t.input.kind === "body" ? (t.step === "check" ? "none" : t.step.startsWith("q:") ? "no" : t.input.options[0].id) : t.input.kind === "multi" ? [] : "x");
    }
    const m = talk(["I forgot"], s);
    expect(m.s.medicines).toBeUndefined();
    expect(m.s.unknown.medicines).toBe("Not remembered");
    const none = talk(["none"], s);
    expect(none.s.medicines).toBe("None (as reported)");
  });

  it("unknown course of illness is never reassured as self-care", () => {
    let s = talk(["I have a mild cough", "I don't know"]).s;
    let guard = 0;
    while (!["result", "emergency"].includes(nextTurn(s).step) && guard++ < 80) {
      const t = nextTurn(s);
      if (t.step === "progression" || t.step === "severity") s = respond(s, t.step, "?unsure");
      else s = respond(s, t.step, t.input.kind === "single" || t.input.kind === "body" ? (t.step === "check" ? "none" : t.step.startsWith("q:") ? "no" : t.input.options[0].id) : t.input.kind === "multi" ? [] : "");
    }
    expect(triage(toAnswers(s)).level).not.toBe("GREEN");
  });

  it("age is never guessed: 'I don't know' gets help to give a rough age", () => {
    let s = talk(["fever since yesterday", "none"]).s;
    if (nextTurn(s).step === "who") s = respond(s, "who", "self");
    expect(nextTurn(s).step).toBe("age");
    const o = converse(s, nextTurn(s), "I don't know");
    expect(o.kind).toBe("explain");
    expect(s.age).toBeUndefined();
  });
});

describe("the doctor remembers", () => {
  it("a three-week cough is never asked 'how long' — and she says she remembers, once", () => {
    let s = talk(["I've been coughing for three weeks"]).s;
    const said: string[] = [];
    let guard = 0;
    while (!["result", "emergency"].includes(nextTurn(s).step) && guard++ < 80) {
      const t = nextTurn(s);
      said.push(t.say);
      expect(t.step).not.toBe("duration");
      s = respond(s, t.step, t.input.kind === "single" || t.input.kind === "body" ? (t.step === "check" ? "none" : t.step.startsWith("q:") ? "no" : t.input.options[0].id) : t.input.kind === "multi" ? [] : "");
    }
    const mentions = said.filter((x) => x.includes("You mentioned that the cough started more than two weeks ago"));
    expect(mentions).toHaveLength(1);
    expect(nextTurn(s).say).toMatch(/You told me about a cough/);
  });

  it("facts mentioned later ('since yesterday') are kept, not asked again", () => {
    const s = talk(["I don't feel well", "my stomach hurts since yesterday"]).s;
    expect(s.duration).toBe("1-3-days");
  });

  it("recap names a reported important negative", () => {
    let s = talk(["I have a cough"]).s;
    s = { ...s, duration: "1-3-days", answers: { ...s.answers, "cough-severe": "no" } };
    expect(recap(s)).toMatch(/You said: no severe breathing difficulty/);
  });
});

describe("adapting to the patient — only from what they say", () => {
  it("distress: acknowledged once, optional history is left out and flagged for the doctor", () => {
    let s = talk(["please help me, my head hurts so much, I'm scared"]).s;
    expect(nextTurn(s).say).toMatch(/^I can hear this is hard/);
    let guard = 0;
    const steps: string[] = [];
    while (!["result", "emergency"].includes(nextTurn(s).step) && guard++ < 80) {
      const t = nextTurn(s);
      steps.push(t.step);
      s = respond(s, t.step, t.input.kind === "single" || t.input.kind === "body" ? (t.step === "check" ? "none" : t.step.startsWith("q:") ? "no" : t.input.options[0].id) : t.input.kind === "multi" ? [] : "");
    }
    expect(steps).not.toContain("medicines");
    if (nextTurn(s).step === "result") expect(chartOf(s).reported.find((r) => r.label === "Current medicines")!.value).toMatch(/Not asked/);
  });
});

describe("letting the patient show the problem", () => {
  it("pain scale 0–10 maps to severity and is kept for the doctor", () => {
    const s = respond({ ...talk(["My stomach hurts"]).s }, "severity", "pain:8");
    expect(s.severity).toBe("severe");
    expect(s.painScore).toBe(8);
  });

  it("a measured temperature is accepted in °C or °F, and implausible numbers are refused", () => {
    const base = talk(["fever since yesterday"]).s;
    const c = respond(base, "c:temp", "temp:38.6");
    expect(c.choices.temp).toBe("38-39");
    expect(c.temperature).toBe("38.6°C");
    const f = respond(base, "c:temp", "temp:101 F");
    expect(f.choices.temp).toBe("38-39");
    expect(respond(base, "c:temp", "temp:60")).toBe(base);
  });
});

describe("health education — verified, separate, honest", () => {
  const content = readdirSync(join(__dirname, "../../app/content"))
    .map((f) => readFileSync(join(__dirname, "../../app/content", f), "utf8"))
    .join("\n");

  it("every education answer is word for word from the reviewed topic pages", () => {
    const all = allEducation();
    expect(all.length).toBeGreaterThanOrEqual(12);
    for (const e of all) {
      expect(e.sources.length, e.id).toBeGreaterThan(0);
      for (const t of e.text) expect(content.includes(t.replace(/'/g, "'")), `${e.id}: ${t.slice(0, 40)}`).toBe(true);
    }
  });

  it.each([
    ["What is TB?", "tb-what"],
    ["How does HIV spread?", "hiv-spread"],
    ["What does blood pressure mean?", "bp-what"],
    ["Why should I finish my TB medicine?", "tb-finish"],
    ["What is dengue?", "dengue-what"],
  ])("'%s' → %s", (q, id) => {
    expect(findEducation(q)?.id).toBe(id);
    const s = talk(["I have a cough"]).s;
    const o = converse(s, nextTurn(s), q);
    expect(o.kind).toBe("education");
  });

  it("a question it cannot answer safely gets an honest answer, never a made-up one", () => {
    const s = talk(["I have a cough"]).s;
    for (const q of ["What does my spleen do?", "What is lupus?", "Can I drink alcohol with my tablets?"]) {
      const o = converse(s, nextTurn(s), q);
      expect(o.kind, q).toBe("unclear");
      if (o.kind === "unclear") {
        expect(o.difficulty).toBe("knowledge");
        expect(o.line.startsWith(KNOWLEDGE_LINE)).toBe(true);
      }
    }
  });

  it("education never changes the consultation", () => {
    const s = talk(["I have a cough"]).s;
    const o = converse(s, nextTurn(s), "What is TB?");
    expect(o.kind).toBe("education");
    // Only "which answer was given" is remembered (for "tell me more"); nothing clinical changes.
    if (o.kind === "education") {
      expect(o.state.lastEducation).toBe(o.answer.id);
      expect(nextTurn(o.state)).toEqual(nextTurn(s));
      expect(o.state.answers).toEqual(s.answers);
      expect(chartOf(o.state)).toEqual(chartOf(s));
    }
  });
});

describe("emergency stays deterministic and first", () => {
  it("'My chest hurts badly and I can't breathe' stops the consultation at once", () => {
    const { s } = talk(["My chest hurts badly and I can't breathe"]);
    expect(nextTurn(s).input.kind).toBe("emergency");
  });

  it("danger words at ANY step (even while asking 'why?') open the emergency", () => {
    const s = talk(["I have a cough"]).s;
    const o = converse(s, nextTurn(s), "why? I can't breathe now");
    expect(o.kind).toBe("answered");
    if (o.kind === "answered") expect(nextTurn(o.state).input.kind).toBe("emergency");
  });
});

describe("simple, policy-safe language", () => {
  it("every explanation, reason and memory line passes the language policy and avoids jargon", () => {
    const lines = new Set<string>([UNKNOWN_LINE]);
    for (const c of complaints) {
      let s = talk([`problem: ${c.label}`]).s;
      s = respond(s, "complaint", c.id);
      let guard = 0;
      while (!["result", "emergency"].includes(nextTurn(s).step) && guard++ < 80) {
        const t = nextTurn(s);
        lines.add(t.say);
        lines.add(explainLine(t, s));
        lines.add(whyLine(t));
        s = respond(s, t.step, t.input.kind === "single" || t.input.kind === "body" ? (t.step === "check" ? "none" : t.step.startsWith("q:") ? "no" : t.input.options[0].id) : t.input.kind === "multi" ? [] : "");
      }
      lines.add(nextTurn(s).say);
    }
    for (const l of lines) {
      expect(violatesLanguagePolicy(l), l).toBeNull();
      expect(l, l).not.toMatch(/\b(dyspn\w*|hypertension|pyrexia|haemoptysis|emesis|syncope|myocardial)\b/i);
    }
  });
});
