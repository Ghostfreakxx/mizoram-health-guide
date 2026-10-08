// The character director's contract (VD4, phase D): each of the ten
// consultation states the doctor shows is caused by a real conversation event
// — never by a timer or at random — and the face never contradicts the
// moment (no smile in a concern or an emergency).

import { describe, expect, it } from "vitest";
import { type Turn, converse, nextTurn, startConsultation } from "../../app/lib/consultation";
import { planReply, planTurn } from "../../app/ai-hospital/consult-room/doctor/director";
import { EXPRESSIONS } from "../../app/ai-hospital/consult-room/doctor/face";
import { EFFECTS, PERFORMANCE } from "../../app/ai-hospital/consult-room/doctor/state";

const ctx = { first: false, lastSaid: "I have had a headache for two days", reducedMotion: false };
const start = () => startConsultation("General Medicine");
const turnFor = (words: string): Turn => {
  const s0 = start();
  const o = converse(s0, nextTurn(s0), words);
  return nextTurn("state" in o ? o.state : s0);
};
const result = (level: "GREEN" | "YELLOW" | "ORANGE"): Turn => ({ step: "result", say: "…", then: "I've prepared a summary.", input: { kind: "result", level }, mood: "focused" });

describe("ten states, ten real events", () => {
  it("GREETING ← the consultation begins", () => {
    const p = planTurn(nextTurn(start()), { ...ctx, first: true });
    expect(p.lines[0].state).toBe("greeting");
  });
  it("PROCESSING ← an answer arrives; ASKING ← the next question; LISTENING ← waiting for the patient", () => {
    const p = planTurn(turnFor("I've been coughing for three weeks"), ctx);
    expect(p.before).toBe("processing");
    expect(p.lines[0].state).toBe("asking");
    expect(p.after).toBe("listening");
  });
  it("CLARIFYING ← 'what does this mean?', 'why do you ask?', or words that were not understood", () => {
    const s = start();
    const t = nextTurn(s);
    for (const words of ["why do you ask?", "asdf qwerty"]) {
      const o = converse({ ...s, concernText: "cough" }, t, words);
      if (o.kind === "answered" || o.kind === "repeat") continue;
      expect(planReply(o, t, t).lines[0].state).toBe("clarifying");
    }
  });
  it("EXPLAINING ← a routine result; CONCERNED ← an urgent result; SUMMARIZING ← the hand-off; COMPLETE ← finished", () => {
    const y = planTurn(result("YELLOW"), ctx);
    expect(y.lines[0].state).toBe("explaining");
    expect(y.lines.at(-1)?.state).toBe("summarizing");
    expect(y.after).toBe("complete");
    expect(planTurn(result("ORANGE"), ctx).lines[0].state).toBe("concerned");
  });
  it("EMERGENCY ← a red flag: said at once, interrupting everything", () => {
    const p = planTurn(turnFor("my chest feels crushed and I can't breathe"), ctx);
    expect(p.lines[0].state).toBe("emergency");
    expect(p.delayMs).toBe(0);
    expect(p.interrupt).toBe(true);
  });
});

describe("the face never contradicts the moment", () => {
  it("no smile while concerned, urgent or thinking", () => {
    for (const e of ["concerned", "urgent", "thinking"] as const) expect(EXPRESSIONS[e].mouthSmile, e).toBe(0);
  });
  it("in an emergency: no routine questions, no Talk, only the verified emergency line", () => {
    expect(EFFECTS.emergency).toEqual({ routine: false, talk: false, caption: "urgent", speaks: true });
    expect(PERFORMANCE.emergency.gesture).toBe(0);
    expect(PERFORMANCE.emergency.nods).toBe(false);
  });
  it("she nods only while listening (the patient is talking or typing)", () => {
    for (const [state, p] of Object.entries(PERFORMANCE)) if (p.nods) expect(state).toBe("listening");
  });
});
