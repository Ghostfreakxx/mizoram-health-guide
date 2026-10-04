// The overhaul's final acceptance scenarios, run through the real engine.

import { describe, expect, it } from "vitest";
import { type ConsultState, type Outcome, converse, nextTurn, respond, startConsultation, toAnswers } from "../../app/lib/consultation";
import { triage } from "../../app/lib/safety/triage";
import { escalationFor } from "../../app/lib/escalation";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";

const start = () => startConsultation("General Medicine");
function say(s: ConsultState, words: string): { s: ConsultState; o: Outcome } {
  const o = converse(s, nextTurn(s), words);
  return { s: "state" in o ? o.state : s, o };
}

describe("acceptance: the three journeys", () => {
  it("'I don't know what's wrong, but something hurts on my right' → the doctor helps, no handoff", () => {
    const { s, o } = say(start(), "I don't know what's wrong, but something hurts on my right");
    const turn = nextTurn(s);
    expect(["emergency", "result"]).not.toContain(turn.step);
    expect(escalationFor(s)).toBeNull();
    expect(o.kind).not.toBe("needs-professional");
    // A helpful next question (or a body map) — not a dead end.
    expect(turn.say.length).toBeGreaterThan(10);
    for (const l of ["line" in o ? o.line : "", turn.say]) expect(violatesLanguagePolicy(l), l).toBeNull();
  });

  it("'My chest feels crushed and I can't breathe' → emergency at once", () => {
    const { s } = say(start(), "My chest feels crushed and I can't breathe");
    expect(nextTurn(s).step).toBe("emergency");
    expect(escalationFor(s)?.level ?? "RED").toBe("RED");
  });

  it("a routine consultation ends in a summary with a non-emergency result", () => {
    let s = say(start(), "I have had a mild headache for two days").s;
    let guard = 0;
    while (!["result", "emergency"].includes(nextTurn(s).step) && guard++ < 80) {
      const t = nextTurn(s);
      if (t.step === "who") s = respond(s, t.step, "self");
      else if (t.input.kind === "single" || t.input.kind === "body")
        s = respond(s, t.step, t.step === "check" ? "none" : t.step.startsWith("q:") ? "no" : t.input.options[0].id);
      else s = respond(s, t.step, t.input.kind === "multi" ? [] : "");
    }
    expect(nextTurn(s).step).toBe("result");
    const r = triage(toAnswers(s));
    expect(r.level).not.toBe("RED");
    expect(r.failsafe ?? false).toBe(false);
    expect(r.departments.length).toBeGreaterThan(0);
  });
});
