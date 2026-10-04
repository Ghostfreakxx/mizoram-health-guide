import { describe, expect, it } from "vitest";
import { type ConsultState, NOT_PROVIDED, chartOf, converse, nextTurn, respond, startConsultation, toAnswers } from "../../app/lib/consultation";
import { DEMO_SCENARIOS, demoAnswer } from "../../app/lib/demoScenarios";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";
import { LEVEL_ORDER, triage } from "../../app/lib/safety/triage";

function play(id: string) {
  const sc = DEMO_SCENARIOS.find((x) => x.id === id)!;
  let s: ConsultState = startConsultation("General Medicine");
  const said: string[] = [];
  let educated: string | null = null;
  for (let i = 0; i < 200; i++) {
    const t = nextTurn(s);
    said.push(t.say, ...(t.then ? [t.then] : []));
    if (t.input.kind === "result" || t.input.kind === "emergency") return { s, t, said, steps: i, educated };
    if (sc.asks && t.step === sc.asks.at && educated === null) {
      // The patient's typed question goes through the same engine.
      const o = converse(s, t, sc.asks.question);
      educated = o.kind === "education" ? o.answer.id : `not answered (${o.kind})`;
      if (o.kind === "education") said.push(...o.answer.text);
      if ("state" in o) s = o.state;
      continue;
    }
    const next = respond(s, t.step, demoAnswer(sc, t, s));
    if (next === s) throw new Error(`${id}: answer not accepted at ${t.step}`);
    s = next;
  }
  throw new Error(`${id}: did not finish`);
}

describe("demo scenarios run through the real engine", () => {
  for (const sc of DEMO_SCENARIOS) {
    it(`${sc.letter}. ${sc.title}`, () => {
      const { t, s, said, steps } = play(sc.id);
      if (sc.expect.kind === "emergency") {
        expect(t.input.kind).toBe("emergency");
        if (t.input.kind === "emergency") expect(t.input.flags).toContain(sc.expect.flag);
        // Emergency interrupts at once: no routine questions first.
        expect(steps).toBeLessThanOrEqual(1);
      } else {
        expect(t.input.kind).toBe("result");
        if (t.input.kind === "result") expect(sc.expect.levels).toContain(t.input.level);
        expect(t.input.kind === "result" && t.input.level).toBe(triage(toAnswers(s)).level);
      }
      if (sc.asks) expect(play(sc.id).educated).toBe(sc.asks.expectId);
      for (const line of said) expect(violatesLanguagePolicy(line), line).toBeNull();
    });
  }
});

describe("presentation-critical safety properties", () => {
  it("'My chest feels very tight and I'm struggling to breathe' interrupts immediately", () => {
    const s = respond(startConsultation("General Medicine"), "concern", "My chest feels very tight and I'm struggling to breathe.");
    expect(nextTurn(s).input.kind).toBe("emergency");
  });

  it("an emergency cannot be overridden by later answers", () => {
    const s = respond(startConsultation("General Medicine"), "concern", "crushing chest pain");
    expect(nextTurn(s).input.kind).toBe("emergency");
    for (const [step, v] of [["check", "none"], ["who", "self"], ["age", "adult"], ["severity", "mild"], ["progression", "better"]] as const) {
      const after = respond(s, step, v);
      expect(after).toBe(s);
      expect(nextTurn(after).input.kind).toBe("emergency");
    }
  });

  it("RED never becomes GREEN: adding answers can only keep or raise urgency", () => {
    const { s } = play("cough");
    const base = triage(toAnswers(s)).level;
    for (const id of Object.keys(s.answers)) {
      const raised = triage({ ...toAnswers(s), answers: { ...s.answers, [id]: "yes" } }).level;
      expect(LEVEL_ORDER.indexOf(raised)).toBeLessThanOrEqual(LEVEL_ORDER.indexOf(base));
    }
  });

  it("symptoms taken from the patient's own words are shown, and marked as such", () => {
    const { s } = play("cough");
    const sym = chartOf(s).reported.find((r) => r.label === "Symptoms reported")!;
    expect(sym.provided).toBe(true);
    expect(sym.value).toMatch(/\(from what you said\)/);
  });

  it("missing information stays 'Not provided' — never guessed", () => {
    const { s } = play("fever");
    const c = chartOf(s);
    const meds = c.reported.find((r) => r.label === "Current medicines")!;
    expect(meds.value).toBe(NOT_PROVIDED);
    expect(meds.provided).toBe(false);
    const allergies = c.reported.find((r) => r.label === "Known allergies")!;
    expect(allergies.value).toBe(NOT_PROVIDED);
  });

  it("the chart never contains a diagnosis, prescription or dose", () => {
    for (const sc of DEMO_SCENARIOS) {
      const { s } = play(sc.id);
      const c = chartOf(s);
      for (const r of [...c.reported, ...c.safety, ...(c.routing ?? [])]) {
        expect(violatesLanguagePolicy(`${r.label}: ${r.value}`), r.label).toBeNull();
        expect(r.value).not.toMatch(/\b\d+\s?(mg|mcg|ml)\b/i);
      }
    }
  });
});

describe("the core demonstration scenarios show what they claim", () => {
  it("1. 'Can't explain' goes through Help me describe it and keeps the body location", () => {
    const { s } = play("describe");
    expect(s.helpDescribe).toBe(true);
    expect(s.bodyArea).toBe("upper-abdomen");
    expect(s.bodySide).toBe("right");
  });
  it("3. a routine cold ends in self-care with warning signs, not a referral", () => {
    const { t } = play("routine");
    expect(t.input.kind === "result" && t.input.level).toBe("GREEN");
  });
  it("8. the visit summary carries medicines, allergies and conditions as the patient said them", () => {
    const { s } = play("summary");
    const chart = JSON.stringify(chartOf(s));
    for (const w of ["Amlodipine", "Penicillin", "High blood pressure"]) expect(chart).toContain(w);
  });
  it("there are exactly eight core scenarios", () => {
    expect(DEMO_SCENARIOS.filter((d) => d.group === "core")).toHaveLength(8);
  });
});
