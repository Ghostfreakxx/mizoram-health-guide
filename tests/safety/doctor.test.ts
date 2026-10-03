import { describe, expect, it } from "vitest";
import { bodyAt } from "../../app/ai-hospital/consult-room/doctor/body";
import { EXPRESSIONS, blinkAt } from "../../app/ai-hospital/consult-room/doctor/face";
import { gazeAt } from "../../app/ai-hospital/consult-room/doctor/gaze";
import { LipSync, segments, visemeFor } from "../../app/ai-hospital/consult-room/doctor/lipsync";
import { performAt } from "../../app/ai-hospital/consult-room/doctor/perform";
import { type DoctorState, PERFORMANCE, STATE_LABEL, isSpeakingState } from "../../app/ai-hospital/consult-room/doctor/state";

const STATES = Object.keys(PERFORMANCE) as DoctorState[];

describe("the doctor's state machine", () => {
  it("has the eleven consultation states, each with a label and a performance", () => {
    expect(STATES.sort()).toEqual(
      ["asking", "complete", "concerned", "emergency", "explaining", "greeting", "handoff", "idle", "listening", "processing", "reassuring"].sort(),
    );
    for (const s of STATES) expect(STATE_LABEL[s]).toBeTruthy();
  });
  it("never smiles in an emergency or when concerned", () => {
    expect(EXPRESSIONS[PERFORMANCE.emergency.expression].mouthSmile).toBe(0);
    expect(EXPRESSIONS[PERFORMANCE.concerned.expression].mouthSmile).toBe(0);
    for (let t = 0; t < 10; t += 0.9) expect(performAt(t, "emergency", 0).face.mouthSmile).toBe(0);
  });
  it("expressions stay restrained (no theatrical values)", () => {
    for (const f of Object.values(EXPRESSIONS)) for (const v of Object.values(f)) expect(v).toBeLessThanOrEqual(0.4);
  });
  it("only the speaking states are speaking", () => {
    expect(isSpeakingState("listening")).toBe(false);
    expect(isSpeakingState("processing")).toBe(false);
    expect(isSpeakingState("asking")).toBe(true);
  });
});

describe("gaze: natural, not a fixed stare", () => {
  it("looks at the patient most of the time while talking, with short breaks", () => {
    const samples = Array.from({ length: 3000 }, (_, i) => gazeAt(i / 50, "conversational", 0).target);
    const atPatient = samples.filter((g) => g === "patient").length / samples.length;
    expect(atPatient).toBeGreaterThan(0.8);
    expect(atPatient).toBeLessThan(0.98);
  });
  it("holds eye contact steadily in an emergency", () => {
    for (let t = 0; t < 20; t += 0.3) expect(gazeAt(t, "steady", 0).target).toBe("patient");
  });
  it("notices the patient: a glance up from the chart when greeting", () => {
    expect(gazeAt(10.3, "notice", 10).target).toBe("chart");
    expect(gazeAt(11.5, "notice", 10).target).toBe("patient");
  });
  it("glances at the chart while checking an answer, then returns", () => {
    expect(gazeAt(5.5, "review", 5).target).toBe("chart");
    expect(gazeAt(6.3, "review", 5).target).toBe("patient");
  });
  it("reduced motion removes the small eye jumps", () => {
    const g = gazeAt(3.3, "patient", 0, { reducedMotion: true });
    expect(g.sx).toBe(0);
    expect(g.sy).toBe(0);
  });
});

describe("blinking", () => {
  it("blinks sometimes and briefly, with varied intervals", () => {
    const samples = Array.from({ length: 6000 }, (_, i) => blinkAt(i / 100));
    const closed = samples.filter((b) => b > 0.5).length / samples.length;
    expect(closed).toBeGreaterThan(0.005);
    expect(closed).toBeLessThan(0.08);
    for (const b of samples) expect(b).toBeGreaterThanOrEqual(0);
  });
  it("keeps blinking however long the page stays open", () => {
    for (const start of [600, 3600, 86400]) {
      const window = Array.from({ length: 3000 }, (_, i) => blinkAt(start + i / 100));
      expect(window.some((b) => b > 0.5), `after ${start}s`).toBe(true);
    }
  });
});

describe("body language", () => {
  it("reduced motion keeps the head and hands still", () => {
    for (let t = 0; t < 20; t += 0.7) {
      for (const st of ["listening", "explaining", "processing"] as const) {
        const b = bodyAt(t, PERFORMANCE[st], { reducedMotion: true, speaking: true, phrase: 2 });
        expect(b.headYaw).toBeCloseTo(0, 10);
        expect(b.gesture).toBeCloseTo(0, 10);
      }
    }
  });
  it("hands are still while listening; gestures belong to spoken phrases", () => {
    for (let t = 0; t < 30; t += 0.5) {
      expect(bodyAt(t, PERFORMANCE.listening).gesture).toBe(0);
      expect(bodyAt(t, PERFORMANCE.explaining, { speaking: false }).gesture).toBe(0);
    }
    const phrases = Array.from({ length: 12 }, (_, p) => bodyAt(1, PERFORMANCE.explaining, { speaking: true, phrase: p }).gesture);
    expect(Math.max(...phrases)).toBeGreaterThan(0.3);
  });
  it("looks at the tablet while reviewing", () => {
    expect(bodyAt(1, PERFORMANCE.processing, { reviewing: true }).armPose).toBe("tablet");
  });
});

describe("lip-sync", () => {
  it("closes the lips for m/b/p and opens for vowels; handles letter pairs", () => {
    expect(visemeFor("m").mouthPress).toBeGreaterThan(0.4);
    expect(visemeFor("a").jawOpen).toBeGreaterThan(0.2);
    expect(segments("though").length).toBeLessThan("though".length);
  });
  it("never opens the jaw unnaturally wide", () => {
    const l = new LipSync();
    l.begin("Hello. I am your virtual health guide, and I will ask a few questions.", 0);
    for (let i = 0; i < 400; i++) expect(l.visemeAt(i / 50).jawOpen).toBeLessThanOrEqual(0.38);
  });
  it("moves only while speaking, and rests when stopped or paused", () => {
    const l = new LipSync();
    expect(l.visemeAt(1).jawOpen).toBe(0);
    l.begin("Hello there", 0);
    expect(Math.max(...Array.from({ length: 20 }, (_, i) => l.visemeAt(i / 40).jawOpen))).toBeGreaterThan(0.05);
    l.pause(0.1);
    expect(l.visemeAt(0.2).jawOpen).toBe(0);
    l.resume(0.5);
    l.end();
    expect(l.visemeAt(0.6).jawOpen).toBe(0);
  });
  it("speaks more slowly when asked (rate)", () => {
    const fast = new LipSync();
    const slow = new LipSync();
    const text = "Please tell me more about the cough";
    fast.begin(text, 0, 1);
    slow.begin(text, 0, 0.8);
    const lastMoving = (l: LipSync) => {
      let last = 0;
      for (let i = 0; i < 600; i++) if (l.rhythm(i / 100).speaking) last = i / 100;
      return last;
    };
    expect(lastMoving(slow)).toBeGreaterThan(lastMoving(fast));
  });
});
