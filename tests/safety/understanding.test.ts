import { describe, expect, it } from "vitest";
import { chartOf, interpretText, nextTurn, respond, respondText, startConsultation } from "../../app/lib/consultation";

const start = () => startConsultation("General Medicine");
const at = (steps: [string, string | string[]][]) => steps.reduce((s, [k, v]) => respond(s, k, v), start());

describe("typed or spoken answers are understood — or not guessed", () => {
  const q = () => {
    const s = at([["concern", "I've been coughing"], ["check", "none"], ["who", "self"], ["age", "adult"], ["sex", "female"], ["special", []], ["complaint", "cough"], ["duration", "4-14-days"]]);
    return { s, t: nextTurn(s) };
  };

  it.each([
    ["Yes", "yes"],
    ["yeah I do", "yes"],
    ["No", "no"],
    ["I have no fever", "no"],
    ["not really", "no"],
    ["I'm not sure", "unsure"],
    ["maybe", "unsure"],
  ])("'%s' → %s", (said, expected) => {
    const { t } = q();
    expect(t.step).toMatch(/^q:/);
    expect(interpretText(t, said)).toBe(expected);
  });

  it("mixed or unclear answers are not guessed", () => {
    const { t } = q();
    expect(interpretText(t, "yes but not much")).toBeNull();
    expect(interpretText(t, "banana")).toBeNull();
    const r = respondText(q().s, t, "banana");
    expect(r.understood).toBe(false);
    expect(nextTurn(r.state).step).toBe(t.step); // still on the same question
  });

  it("red flags in a free answer open Emergency Mode, even if it also answers the question", () => {
    const { s, t } = q();
    const r = respondText(s, t, "No, but now my chest is crushing and I can't breathe");
    expect(nextTurn(r.state).input.kind).toBe("emergency");
  });

  it("durations, change and severity are understood from words", () => {
    let s = at([["concern", "headache"], ["check", "none"], ["who", "self"], ["age", "adult"], ["sex", "male"], ["special", []], ["complaint", "headache"]]);
    let t = nextTurn(s);
    expect(t.step).toBe("duration");
    expect(interpretText(t, "about three weeks")).toBe("over-2-weeks");
    expect(interpretText(t, "since yesterday")).toBe("1-3-days");
    expect(interpretText(t, "started this morning")).toBe("today");
    s = respond(s, "duration", "1-3-days");
    while (nextTurn(s).step.startsWith("q:") || nextTurn(s).step.startsWith("c:")) {
      const tt = nextTurn(s);
      s = respond(s, tt.step, tt.input.kind === "single" && tt.input.options.some((o) => o.id === "no") ? "no" : (tt.input as { options: { id: string }[] }).options[0].id);
    }
    t = nextTurn(s);
    expect(t.step).toBe("progression");
    expect(interpretText(t, "it's getting worse")).toBe("worse");
    s = respond(s, "progression", "same");
    t = nextTurn(s);
    expect(interpretText(t, "it's quite bad")).toBe("moderate");
  });

  it("age and who are understood", () => {
    const s = at([["concern", "fever"], ["check", "none"]]);
    expect(interpretText(nextTurn(s), "it's for me")).toBe("self");
    const s2 = respond(s, "who", "self");
    expect(interpretText(nextTurn(s2), "34 years")).toBe("adult");
    expect(interpretText(nextTurn(s2), "3 months")).toBe("child-under-5");
  });
});

describe("the doctor remembers what the patient already said", () => {
  it("'My mother, 72, has chest discomfort' is not asked who/age/sex again", () => {
    const s = respond(start(), "concern", "My 72 year old mother has a bad cough");
    expect(s.who).toBe("other");
    expect(s.age).toBe("older");
    expect(s.sex).toBe("female");
    const t = respond(s, "check", "none");
    expect(["who", "age", "sex"]).not.toContain(nextTurn(t).step);
    expect(chartOf(t).reported.find((r) => r.label === "Age group")!.value).toMatch(/from what you said/);
  });
  it("'I'm 34 and coughing for three weeks' remembers age and duration", () => {
    const s = respond(respond(start(), "concern", "I'm 34 and I've been coughing for three weeks"), "check", "none");
    expect(s.age).toBe("adult");
    expect(s.duration).toBe("over-2-weeks");
  });
  it("nothing is invented when the words are vague", () => {
    const s = respond(start(), "concern", "not feeling well");
    expect(s.age).toBeUndefined();
    expect(s.sex).toBeUndefined();
  });
});
