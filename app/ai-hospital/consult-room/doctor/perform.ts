// One frame of the doctor's performance: everything the 3D and 2D doctors
// need, derived only from the consultation state, time and the voice.

import { bodyAt, type Body } from "./body";
import { type Face, blinkAt, expressionFace, triggeredBlink } from "./face";
import { type Gaze, gazeAt } from "./gaze";
import { PERFORMANCE, type DoctorState } from "./state";

export type Frame = { state: DoctorState; face: Face; blink: number; gaze: Gaze; body: Body };

export function performAt(
  t: number,
  state: DoctorState,
  since: number,
  opts: { reducedMotion?: boolean; speaking?: boolean; phrase?: number; beat?: number; lastGazeShift?: number; seed?: number } = {},
): Frame {
  const perf = PERFORMANCE[state];
  const gaze = gazeAt(t, perf.gaze, since, opts);
  const reviewing = gaze.target === "chart" && (state === "processing" || state === "handoff");
  const body = bodyAt(t, perf, { ...opts, reviewing });
  const blink = Math.max(blinkAt(t, opts.seed ?? 0), opts.lastGazeShift !== undefined ? triggeredBlink(t, opts.lastGazeShift) : 0);
  return { state, face: expressionFace(perf.expression), blink, gaze, body };
}
