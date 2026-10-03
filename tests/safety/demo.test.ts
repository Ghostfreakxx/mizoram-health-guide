import { describe, expect, it } from "vitest";
import { type ConsultState, NOT_PROVIDED, chartOf, nextTurn, respond, startConsultation, toAnswers } from "../../app/lib/consultation";
import { DEMO_SCENARIOS, demoAnswer } from "../../app/lib/demoScenarios";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";
import { LEVEL_ORDER, triage } from "../../app/lib/safety/triage";

function play(id: string) {
  const sc = DEMO_SCENARIOS.find((x) => x.id === id)!;
  let s: ConsultState = startConsultation("General Medicine");
  const said: string[] = [];
  for (let i = 0; i < 200; i++) {
    const t = nextTurn(s);
    said.push(t.say, ...(t.then ? [t.then] : []));
    if (t.input.kind === "result" || t.input.kind === "emergency") return { s, t, said, steps: i };
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
