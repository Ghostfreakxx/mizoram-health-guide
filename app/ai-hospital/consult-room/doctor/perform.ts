// One frame of the doctor's performance: everything the 3D and 2D doctors
// need, derived only from the consultation state, time, the voice and
// whether the patient is typing or talking right now.

import { bodyAt, type Body } from "./body";
import { type Face, blinkAt, expressionFace, triggeredBlink } from "./face";
import { type Gaze, gazeAt } from "./gaze";
import { hash } from "./random";
import { PERFORMANCE, type DoctorState } from "./state";

export type Frame = { state: DoctorState; face: Face; blink: number; gaze: Gaze; body: Body };

export type PerformOptions = {
  reducedMotion?: boolean;
  speaking?: boolean;
  phrase?: number;
  phraseAge?: number;
  beat?: number;
  question?: boolean;
  lastGazeShift?: number;
  patientActive?: number; // seconds since the patient last typed or spoke
  seed?: number;
};

const pulse = (x: number, a: number, b: number) => (x > a && x < b ? Math.sin(((x - a) / (b - a)) * Math.PI) : 0);

export function performAt(t: number, state: DoctorState, since: number, opts: PerformOptions = {}): Frame {
  const perf = PERFORMANCE[state];
  const m = opts.reducedMotion ? 0 : 1;
  const dt = Math.max(0, t - since);
  const gaze = gazeAt(t, perf.gaze, since, opts);
  const reviewing = gaze.target === "chart" && (state === "processing" || state === "summarizing" || state === "initializing" || state === "acknowledging");
  const body = bodyAt(t, perf, { ...opts, reviewing, sinceState: dt, state });

  // Blinks: natural rhythm, plus one with larger gaze shifts, plus sometimes
  // at the start of a new spoken phrase (people blink at pauses).
  let blink = Math.max(blinkAt(t, opts.seed ?? 0), opts.lastGazeShift !== undefined ? triggeredBlink(t, opts.lastGazeShift) : 0);
  if (opts.speaking && (opts.phrase ?? 0) > 0 && hash((opts.phrase ?? 0) * 13 + 5) < 0.5) blink = Math.max(blink, pulse(opts.phraseAge ?? 9, 0, 0.16));

  // Micro-expressions on top of the state's expression (all small).
  const face = { ...expressionFace(perf.expression) };
  if (state === "greeting") {
    // a quick eyebrow flash when noticing the patient — a natural greeting
    const flash = pulse(dt, 0.25, 0.8) * m;
    face.browOuterUp += 0.22 * flash;
    face.browInnerUp += 0.12 * flash;
  }
  if (opts.speaking && opts.question && state !== "emergency") {
    // brows lift a little at the end of a question
    face.browInnerUp += 0.1;
    face.browOuterUp += 0.1;
  }
  if (state === "listening" && (opts.patientActive ?? 99) < 2) {
    // attentive while the patient is typing or talking
    face.eyeWide += 0.05;
    face.mouthSmile = Math.min(face.mouthSmile, 0.08);
  }
  return { state, face, blink, gaze, body };
}
