// "Change" in My Visit: an answer is asked again; the new answer passes the
// same checks as any answer, everything else is kept, and the change is noted.

import { describe, expect, it } from "vitest";
import { type ConsultState, REOPENABLE, chartOf, converse, nextTurn, reopen, respond, startConsultation, toAnswers } from "../../app/lib/consultation";
import { triage } from "../../app/lib/safety/triage";

function cough(): ConsultState {
  let s = startConsultation("General Medicine");
  const o = converse(s, nextTurn(s), "I've been coughing since yesterday");
  s = "state" in o ? o.state : s;
  for (let i = 0; i < 6; i++) {
    const t = nextTurn(s);
    if (t.step === "check") s = respond(s, "check", "none");
    else if (t.step === "age") s = respond(s, "age", "adult");
    else if (t.step === "sex") s = respond(s, "sex", "female");
    else if (t.step === "special") s = respond(s, "special", []);
    else break;
  }
  return s;
}

describe("reopen (Change in My Visit)", () => {
  it("asks the changed question next and keeps everything else", () => {
    const s = cough();
    expect(s.duration).toBe("1-3-days");
    const r = reopen(s, "duration");
    expect(r.duration).toBeUndefined();
    expect(nextTurn(r).step).toBe("duration");
    expect(nextTurn(r).say).toMatch(/let's change when it started/);
    expect(r.concernText).toBe(s.concernText);
    expect(r.age).toBe("adult");
    const after = respond(r, "duration", "over-2-weeks");
    expect(after.duration).toBe("over-2-weeks");
    expect(after.corrections.join(" ")).toMatch(/Asked again: when it started/);
    expect(chartOf(after).reported.find((x) => x.label === "Duration")?.value).toMatch(/More than 2 weeks/);
  });

  it("the new answer counts for triage (a changed age group changes the questions and the result)", () => {
    const s = cough();
    const before = triage(toAnswers(s)).level;
    const r = respond(reopen(s, "age"), "age", "young-infant");
    expect(r.age).toBe("young-infant");
    // A baby with a cough is never self-care: policy rules apply to the new answer.
    expect(triage(toAnswers(r)).level).not.toBe("GREEN");
    expect(["GREEN", "YELLOW", "ORANGE", "RED"]).toContain(before);
  });

  it("only known steps can be reopened; anything else is a no-op", () => {
    const s = cough();
    expect(reopen(s, "check")).toBe(s);
    expect(reopen(s, "q:cough-blood")).toBe(s);
    for (const step of REOPENABLE) expect(reopen(s, step)).not.toBe(s);
  });
});
