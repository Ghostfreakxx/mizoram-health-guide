// Personalised explanation changes HOW the doctor talks — never what is
// medically said. Every word still comes from the verified library.

import { describe, expect, it } from "vitest";
import { type ConsultState, converse, nextTurn, startConsultation } from "../../app/lib/consultation";
import { planReply } from "../../app/ai-hospital/consult-room/doctor/director";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";

const start = () => startConsultation("General Medicine");
const said = (s: ConsultState, w: string) => converse(s, nextTurn(s), w);

describe("personalised explanation", () => {
  it("'tell me more' after a health answer gives the rest of the SAME verified answer", () => {
    const first = said(start(), "How does TB spread?");
    expect(first.kind).toBe("education");
    if (first.kind !== "education") return;
    const more = said(first.state, "tell me more");
    expect(more.kind).toBe("education");
    if (more.kind !== "education") return;
    expect(more.depth).toBe("more");
    expect(more.answer.id).toBe(first.answer.id);
    const t = nextTurn(first.state);
    const p = planReply(more, t, t);
    const spoken = p.lines[0].text;
    for (const part of more.answer.text) expect(spoken).toContain(part); // nothing added, nothing invented
    expect(violatesLanguagePolicy(spoken)).toBeNull();
  });

  it("'short answer' gives one sentence of it", () => {
    const first = said(start(), "What is malaria?");
    if (first.kind !== "education") throw new Error("no education");
    const short = said(first.state, "short answer please");
    if (short.kind !== "education") throw new Error("not short");
    const t = nextTurn(first.state);
    const spoken = planReply(short, t, t).lines[0].text;
    expect(spoken.startsWith("In short:")).toBe(true);
    expect(spoken.split(/[.!?]\s/).length).toBeLessThanOrEqual(2);
    expect(first.answer.text[0].startsWith(spoken.replace("In short: ", "").slice(0, 20))).toBe(true);
  });

  it("'keep it short' makes later questions brief (no extra hints); the questions themselves are unchanged", () => {
    const s = said(start(), "I've been coughing for three weeks");
    const st = "state" in s ? s.state : start();
    const before = nextTurn(st);
    const brief = said(st, "keep it short");
    expect(brief.kind).toBe("control");
    if (brief.kind !== "control") return;
    const after = nextTurn(brief.state);
    expect(after.step).toBe(before.step);
    expect(after.question).toBe(before.question);
    expect(after.hint).toBeUndefined();
  });

  it("'go on' is not mistaken for a request for more detail", () => {
    const first = said(start(), "How does TB spread?");
    if (first.kind !== "education") throw new Error("no education");
    expect(said(first.state, "go on").kind).not.toBe("education");
  });
});
