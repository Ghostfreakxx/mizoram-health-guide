import { describe, expect, it } from "vitest";
import { bodyAt } from "../../app/ai-hospital/consult-room/doctor/body";
import { EXPRESSIONS, blinkAt } from "../../app/ai-hospital/consult-room/doctor/face";
import { gazeAt } from "../../app/ai-hospital/consult-room/doctor/gaze";
import { LipSync, REST, segments, visemeFor } from "../../app/ai-hospital/consult-room/doctor/lipsync";
import { performAt } from "../../app/ai-hospital/consult-room/doctor/perform";
import { type DoctorState, EFFECTS, PERFORMANCE, STATE_LABEL, isSpeakingState } from "../../app/ai-hospital/consult-room/doctor/state";

const STATES = Object.keys(PERFORMANCE) as DoctorState[];

describe("the doctor's state machine", () => {
  it("has the consultation states, each with a label and a performance", () => {
    expect(STATES.sort()).toEqual(
      ["acknowledging", "asking", "checking", "clarifying", "complete", "concerned", "educating", "emergency", "explaining", "greeting", "handoff", "idle", "initializing", "listening", "processing", "reassuring", "showing"].sort(),
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
  it("listening is still: no gestures, eyes on the patient, small nods only", () => {
    expect(PERFORMANCE.listening.gesture).toBe(0);
    expect(PERFORMANCE.listening.gaze).toBe("patient");
    expect(EXPRESSIONS[PERFORMANCE.listening.expression].mouthSmile).toBeLessThanOrEqual(0.12);
    expect(PERFORMANCE.processing.gaze).toBe("review"); // thinking looks different: a glance at the chart
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

describe("one state table drives every subsystem", () => {
  it("every state has effects; the emergency stops routine questions and Talk", () => {
    for (const st of STATES) expect(EFFECTS[st], st).toBeDefined();
    expect(EFFECTS.emergency.routine).toBe(false);
    expect(EFFECTS.emergency.talk).toBe(false);
    expect(EFFECTS.listening.speaks).toBe(false);
    expect(EFFECTS.listening.caption).toBe("listening");
    expect(EFFECTS.clarifying.caption).not.toBe("urgent");
  });
  it("clarifying is never a concerned or urgent face", () => {
    expect(PERFORMANCE.clarifying.expression).not.toMatch(/concerned|urgent/);
  });
});

describe("gaze follows the conversation", () => {
  it("returns from the chart to the patient before the next question is spoken (< 0.8 s)", () => {
    expect(gazeAt(10.4, "review", 10).target).toBe("chart");
    expect(gazeAt(10.85, "review", 10).target).toBe("patient");
  });
  it("starts every spoken phrase looking at the patient", () => {
    for (let phrase = 0; phrase < 30; phrase++) {
      expect(gazeAt(5, "conversational", 0, { speaking: true, phrase, phraseAge: 0.2 }).target).toBe("patient");
      expect(gazeAt(5, "explaining", 0, { speaking: true, phrase, phraseAge: 0.3 }).target).toBe("patient");
    }
  });
  it("while explaining, sometimes glances at the chart; in an emergency, never looks away", () => {
    const targets = Array.from({ length: 40 }, (_, phrase) => Array.from({ length: 30 }, (_, k) => gazeAt(5, "explaining", 0, { speaking: true, phrase, phraseAge: k / 10 }).target)).flat();
    expect(targets).toContain("chart");
    // eye contact most of the time, even while explaining
    expect(targets.filter((x) => x === "patient").length / targets.length).toBeGreaterThan(0.7);
    for (let phrase = 0; phrase < 40; phrase++) expect(gazeAt(5, "steady", 0, { speaking: true, phrase, phraseAge: 0.9 }).target).toBe("patient");
  });
  it("while loading, the doctor is at her notes (not staring)", () => {
    expect(gazeAt(1, "preparing", 0).target).toBe("chart");
  });
});

describe("micro-behaviour", () => {
  it("a brief eyebrow flash when greeting; brows lift at the end of a question", () => {
    const g = performAt(10.5, "greeting", 10);
    expect(g.face.browOuterUp).toBeGreaterThan(EXPRESSIONS.welcoming.browOuterUp);
    const q = performAt(20, "asking", 10, { speaking: true, question: true, phrase: 1, phraseAge: 1 });
    const n = performAt(20, "asking", 10, { speaking: true, question: false, phrase: 1, phraseAge: 1 });
    expect(q.face.browInnerUp).toBeGreaterThan(n.face.browInnerUp);
  });
  it("nods more while the patient is actively typing or talking", () => {
    const count = (active: number) => Array.from({ length: 600 }, (_, i) => bodyAt(i / 10, PERFORMANCE.listening, { patientActive: active }).headPitch).filter((p) => p > 0.03).length;
    expect(count(0.5)).toBeGreaterThan(count(99));
  });
});

describe("lip-sync quality", () => {
  it("lips close fully for m, b and p", () => {
    expect(visemeFor("m").mouthPress).toBeGreaterThanOrEqual(0.8);
    expect(visemeFor("b").jawOpen).toBe(0);
  });
  it("silent letters take no time ('though' has no 'gh' shape)", () => {
    expect(segments("though").length).toBe(segments("tho").length);
  });
  it("the mouth does not snap shut between words in a phrase", () => {
    const l = new LipSync();
    l.begin("we will check your answers now", 0);
    const jaw = Array.from({ length: 120 }, (_, i) => l.visemeAt(i / 100).jawOpen);
    // many tiny closures in a row would be "flapping": count frames at full rest mid-phrase
    const restFrames = jaw.slice(5, 100).filter((j) => j === 0).length;
    expect(restFrames).toBeLessThan(15);
  });
  it("rhythm stays 'speaking' between words, and reports questions", () => {
    const l = new LipSync();
    l.begin("Where does it hurt?", 0);
    const samples = Array.from({ length: 60 }, (_, i) => l.rhythm(i / 50));
    expect(samples.slice(1, 40).every((r) => r.speaking)).toBe(true);
    expect(samples.some((r) => r.question)).toBe(true);
  });
  it("re-anchors to real word events and never runs ahead of the audio", () => {
    const l = new LipSync();
    const text = "please tell me more about the pain";
    l.begin(text, 0);
    l.word(0, 0.0);
    // the engine is slow: the next word event has not arrived yet at 0.5 s
    const r = l.rhythm(0.5);
    expect(r.speaking).toBe(true);
    l.word(text.indexOf("tell"), 0.6);
    expect(l.visemeAt(0.65).jawOpen + l.visemeAt(0.65).lipsPart).toBeGreaterThan(0);
  });
  it("stops the moment the audio stops", () => {
    const l = new LipSync();
    l.begin("Hello there, how are you feeling today?", 0);
    l.end();
    expect(l.visemeAt(0.3)).toEqual(REST);
    expect(l.rhythm(0.3).speaking).toBe(false);
  });
});
