// The doctor's behaviour rules (doctor/director.ts) and how they show in gaze.

import { describe, expect, it } from "vitest";
import { converse, nextTurn, respond, startConsultation, type Turn } from "../../app/lib/consultation";
import { planReply, planTurn, thinkMs } from "../../app/ai-hospital/consult-room/doctor/director";
import { gazeAt } from "../../app/ai-hospital/consult-room/doctor/gaze";
import { EFFECTS, PERFORMANCE, isSpeakingState } from "../../app/ai-hospital/consult-room/doctor/state";

const ctx = { first: false, lastSaid: "I have had a headache for two days", reducedMotion: false };
const turnFor = (words: string): Turn => {
  const s0 = startConsultation("General Medicine");
  const o = converse(s0, nextTurn(s0), words);
  return nextTurn("state" in o ? o.state : s0);
};

describe("the director", () => {
  it("an emergency is said at once: no pause, interrupts everything, scrolls into view", () => {
    const p = planTurn(turnFor("my chest feels crushed and I can't breathe"), ctx);
    expect(p.delayMs).toBe(0);
    expect(p.interrupt).toBe(true);
    expect(p.lines[0].state).toBe("emergency");
    expect(p.after).toBe("emergency");
    expect(p.before).toBeUndefined();
  });

  it("an ordinary question gets a short, natural pause (0.6–1.4 s), thinking first", () => {
    const p = planTurn(turnFor("I've been coughing for three weeks"), ctx);
    expect(p.delayMs).toBeGreaterThanOrEqual(600);
    expect(p.delayMs).toBeLessThanOrEqual(1400);
    expect(p.before).toBe("processing");
    expect(p.interrupt).toBe(false);
    expect(thinkMs("x".repeat(500))).toBe(1400);
  });

  it("presenting the body map → the doctor 'shows' it", () => {
    const t = turnFor("I can't explain it");
    expect(t.input.kind).toBe("body");
    expect(planTurn(t, ctx).lines[0].state).toBe("showing");
  });

  it("the first greeting: noticing the patient, then hello (no pause with reduced motion)", () => {
    const t = nextTurn(startConsultation("General Medicine"));
    expect(planTurn(t, { ...ctx, first: true }).lines[0].state).toBe("greeting");
    expect(planTurn(t, { ...ctx, first: true, reducedMotion: true }).delayMs).toBe(0);
  });

  it("results: urgent → concerned; self-care → reassuring; then the handoff line", () => {
    let s = startConsultation("General Medicine");
    s = respond(s, "concern", "I've had a runny nose and sneezing for two days");
    for (let i = 0; i < 60 && !["result", "emergency"].includes(nextTurn(s).step); i++) {
      const t = nextTurn(s);
      const opts = "options" in t.input ? t.input.options.map((o) => o.id) : [];
      s = respond(s, t.step, t.step === "check" ? "none" : t.step === "who" ? "self" : t.step === "age" ? "adult" : t.step === "progression" ? "same" : t.step === "severity" ? "mild" : t.input.kind === "multi" ? [] : t.input.kind === "text" ? "" : opts.includes("no") ? "no" : opts[0]);
    }
    const p = planTurn(nextTurn(s), ctx);
    expect(p.lines[0].state).toBe("reassuring");
    expect(p.lines.at(-1)?.state).toBe("handoff");
    expect(p.after).toBe("complete");
  });

  it("reactions match what happened", () => {
    const s0 = startConsultation("General Medicine");
    const t = nextTurn(respond(s0, "concern", "My stomach hurts"));
    const here = respond(s0, "concern", "My stomach hurts");
    const corrected = converse(respond(here, "body", "lower-abdomen|right"), nextTurn(respond(here, "body", "lower-abdomen|right")), "no sorry left");
    expect(corrected.kind).toBe("corrected");
    if (corrected.kind === "corrected") {
      const p = planReply(corrected, t, nextTurn(corrected.state));
      expect(p.lines.map((l) => l.state)).toEqual(["acknowledging", "asking"]);
    }
    const edu = converse(here, nextTurn(here), "How does TB spread?");
    if (edu.kind === "education") expect(planReply(edu, t, t).lines.map((l) => l.state)).toEqual(["educating", "asking"]);
    const unclear = converse(here, nextTurn(here), "blah blah");
    if (unclear.kind === "unclear") expect(planReply(unclear, t, t).lines[0].state).toBe("clarifying");
  });
});

describe("environment awareness: the doctor glances at what she shows", () => {
  it("while asking with the body map: patient → the picture → patient", () => {
    const at = (age: number) => gazeAt(10, "showing", 9, { speaking: true, phrase: 0, phraseAge: age }).target;
    expect(at(0.2)).toBe("patient");
    expect(at(1.1)).toBe("visual");
    expect(at(2.5)).toBe("patient");
  });
  it("muted: the same glance on the state's own timeline", () => {
    expect(gazeAt(10.1, "showing", 10).target).toBe("patient");
    expect(gazeAt(11.0, "showing", 10).target).toBe("visual");
  });
  it("'showing' behaves like asking for the voice, Talk and captions", () => {
    expect(EFFECTS.showing).toEqual(EFFECTS.asking);
    expect(isSpeakingState("showing")).toBe(true);
    expect(PERFORMANCE.showing.gaze).toBe("showing");
    expect(PERFORMANCE.emergency.gesture).toBe(0); // no distracting movement in an emergency
  });
});

describe("reactions to corrections, contradictions and 'not sure'", () => {
  const routineAt = () => {
    let s = startConsultation("General Medicine");
    const o = converse(s, nextTurn(s), "I've been coughing for a week");
    s = "state" in o ? o.state : s;
    for (let i = 0; i < 20; i++) {
      const t = nextTurn(s);
      if (t.step.startsWith("q:")) {
        const next = respond(s, t.step, "yes");
        if (!next.emergency && nextTurn(next).step.startsWith("q:")) return next;
        s = respond(s, t.step, "no");
        continue;
      }
      const opts = "options" in t.input ? t.input.options.map((x) => x.id) : [];
      s = respond(s, t.step, t.step === "check" ? "none" : t.input.kind === "multi" ? [] : opts.includes("adult") ? "adult" : opts[0]);
    }
    throw new Error("no routine question");
  };

  it("a correction is acknowledged (nod, glance at the chart), then the question is asked", () => {
    const s = routineAt();
    const t = nextTurn(s);
    const o = converse(s, t, "sorry, I meant no");
    expect(o.kind).toBe("corrected");
    const p = planReply(o as Parameters<typeof planReply>[0], t, nextTurn("state" in o ? o.state : s));
    expect(p.lines[0].state).toBe("acknowledging");
    expect(p.lines[1].state).toBe("asking");
    expect(PERFORMANCE.acknowledging.gaze).toBe("review");
    // the glance at the chart returns to the patient before the question
    expect(gazeAt(10.85, "review", 10).target).toBe("patient");
  });

  it("a contradiction check is calm and steady: eye contact, never a concerned or urgent face", () => {
    const s = routineAt();
    const o = converse(s, nextTurn(s), "actually no, I don't");
    const t = nextTurn("state" in o ? o.state : s);
    expect(t.step).toBe("recheck");
    expect(planTurn(t, ctx).lines[0].state).toBe("checking");
    expect(PERFORMANCE.checking.expression).not.toMatch(/concerned|urgent/);
    expect(PERFORMANCE.checking.gaze).toBe("patient");
    expect(isSpeakingState("checking") && EFFECTS.checking.routine).toBe(true);
  });

  it("the first 'not sure' of a visit is reassured once — not after every one", () => {
    let s = routineAt();
    const said: string[] = [];
    for (let i = 0; i < 4; i++) {
      const t = nextTurn(s);
      if (!t.step.startsWith("q:")) break;
      s = respond(s, t.step, "unsure");
      said.push(nextTurn(s).say);
    }
    expect(said.filter((x) => /“not sure” is a useful answer/.test(x)).length).toBe(1);
  });
});
