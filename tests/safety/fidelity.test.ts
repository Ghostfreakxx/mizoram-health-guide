// Summary fidelity after long, messy conversations (see fidelity.ts).

import { describe, expect, it } from "vitest";
import { type ConsultState, contextOf, converse, nextTurn, respond, startConsultation } from "../../app/lib/consultation";
import { questionsFor } from "../../app/lib/safety/triage";
import { play } from "./fidelity";

describe("the summary says what the patient meant, after corrections, detours and 'I don't know'", () => {
  it("1500 seeded messy visits: every summary row matches the patient's final answers", () => {
    const findings = Array.from({ length: 1500 }, (_, i) => play(i + 1)).flat();
    expect(findings.slice(0, 5)).toEqual([]);
  }, 60_000);
});

// Walks to the first routine yes/no question (a "yes" that changes nothing
// urgent) of a cough visit, with another question after it.
const routine = (s: ConsultState, step: string) => {
  const q = questionsFor(contextOf(s)).find((x) => x.id === step.slice(2));
  return !!q && !("emergency" in q.yes) && !("level" in q.yes && (q.yes.level === "ORANGE" || q.yes.level === "RED" || q.yes.now));
};
function toQuestions(): ConsultState {
  let s = startConsultation("General Medicine");
  let t = nextTurn(s);
  const o = converse(s, t, "I've been coughing for a week");
  s = "state" in o ? o.state : s;
  for (let i = 0; i < 20; i++) {
    t = nextTurn(s);
    if (t.step.startsWith("q:") && routine(s, t.step)) {
      const next = respond(s, t.step, "yes");
      if (nextTurn(next).step.startsWith("q:")) return s;
    }
    if (t.step.startsWith("q:")) {
      s = respond(s, t.step, "no");
      continue;
    }
    const opts = "options" in t.input ? t.input.options.map((x) => x.id) : [];
    s = respond(s, t.step, t.step === "check" ? "none" : t.input.kind === "multi" ? [] : opts.includes("adult") ? "adult" : opts.includes("self") ? "self" : opts[0]);
  }
  throw new Error("no question reached");
}
const say = (s: ConsultState, w: string) => {
  const o = converse(s, nextTurn(s), w);
  return { o, s: "state" in o ? o.state : s };
};

describe("changing the last answer in words (pinned — these were misread before)", () => {
  it("'sorry, I meant no' changes the last answer and does NOT answer the next question", () => {
    let s = toQuestions();
    const first = nextTurn(s).step;
    s = say(s, "yes").s;
    const second = nextTurn(s).step;
    const { o, s: after } = say(s, "sorry, I meant no");
    expect(o.kind).toBe("corrected");
    expect(after.answers[first.slice(2)]).toBe("no");
    expect(after.answers[second.slice(2)]).toBeUndefined();
    expect(nextTurn(after).step).toBe(second);
    expect("line" in o && o.line).toMatch(/changed your last answer to “No”/);
  });
  it("'sorry, no' is a polite answer to the question on screen", () => {
    let s = toQuestions();
    const first = nextTurn(s).step;
    s = say(s, "yes").s;
    const second = nextTurn(s).step;
    const after = say(s, "sorry, no").s;
    expect(after.answers[first.slice(2)]).toBe("yes");
    expect(after.answers[second.slice(2)]).toBe("no");
  });
  it("'actually no' on the next yes/no question is asked about, never guessed", () => {
    let s = toQuestions();
    s = say(s, "yes").s;
    const after = say(s, "actually no, I don't").s;
    const t = nextTurn(after);
    expect(t.step).toBe("recheck");
    expect(t.say).toMatch(/Should I change that answer to no\?/);
  });
});

describe("a correction to 'yes' on a danger sign is acted on at once", () => {
  it("'no' then 'sorry, I meant yes' to an emergency question opens Emergency Mode", () => {
    let s = startConsultation("General Medicine");
    s = say(s, "I've been coughing for a week").s;
    for (let i = 0; i < 20; i++) {
      const t = nextTurn(s);
      if (t.step.startsWith("q:")) {
        const q = questionsFor(contextOf(s)).find((x) => x.id === t.step.slice(2))!;
        s = respond(s, t.step, "no");
        if ("emergency" in q.yes && nextTurn(s).step !== t.step) {
          const after = say(s, "sorry, I meant yes").s;
          expect(after.emergency).not.toBeNull();
          expect(nextTurn(after).step).toBe("emergency");
          return;
        }
        continue;
      }
      const opts = "options" in t.input ? t.input.options.map((x) => x.id) : [];
      s = respond(s, t.step, t.step === "check" ? "none" : t.input.kind === "multi" ? [] : opts.includes("adult") ? "adult" : opts.includes("self") ? "self" : opts[0]);
    }
    throw new Error("no emergency question reached");
  });
});
