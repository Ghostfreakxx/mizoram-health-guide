// Where the doctor looks. Real people do not hold perfect eye contact: they
// look at the patient most of the time, glance at notes while thinking, and
// break gaze briefly while talking. Eye contact increases while listening.

import type { GazePolicy } from "./state";
import { hash } from "./random";

export type GazeTarget = "patient" | "chart" | "down" | "away";
export type Gaze = { target: GazeTarget; sx: number; sy: number };

// Repeating conversational pattern: look at the patient for 3.5–6 s, then
// break gaze for 0.35–0.7 s (mostly downwards, sometimes slightly aside).
function conversational(dt: number, seed: number): GazeTarget {
  let t = dt % 600;
  for (let k = 0; k < 400; k++) {
    const hold = 3.5 + hash(k * 13 + seed) * 2.5;
    const brk = 0.35 + hash(k * 13 + 5 + seed) * 0.35;
    if (t < hold) return "patient";
    if (t < hold + brk) return hash(k * 13 + 9 + seed) < 0.6 ? "down" : "away";
    t -= hold + brk;
  }
  return "patient";
}

export function gazeAt(t: number, policy: GazePolicy, since: number, opts: { reducedMotion?: boolean; seed?: number } = {}): Gaze {
  const dt = Math.max(0, t - since);
  const seed = opts.seed ?? 0;
  let target: GazeTarget = "patient";
  switch (policy) {
    case "notice":
      // Finishing a note, then looking up to the patient: "noticing" them.
      target = dt < 0.9 ? "chart" : "patient";
      break;
    case "review":
      // A brief look at the chart after an answer, then back to the patient.
      target = dt > 0.2 && dt < 1.1 ? "chart" : dt >= 1.1 ? conversational(dt - 1.1, seed) : "patient";
      break;
    case "patient": {
      // Listening: steady eye contact, with a rare short glance down.
      const w = Math.floor(dt / 9);
      const inW = dt - w * 9;
      target = hash(w * 3 + seed) < 0.5 && inW > 6 && inW < 6.4 ? "down" : "patient";
      break;
    }
    case "steady":
      target = "patient";
      break;
    case "conversational":
      target = conversational(dt, seed);
      break;
  }
  // Tiny fixational eye movements: hold, then jump slightly.
  const m = opts.reducedMotion ? 0 : 1;
  const step = Math.floor(t / 1.3);
  const sx = (hash(step * 17 + 1 + seed) * 2 - 1) * 0.018 * m;
  const sy = (hash(step * 17 + 2 + seed) * 2 - 1) * 0.012 * m;
  return { target, sx, sy };
}
