// Posture, breathing, head movement and hands. Movement is small: a listening
// doctor is mostly still; explaining brings small, phrase-timed gestures.

import type { DoctorState, Performance } from "./state";
import { hash, noise } from "./random";

export type ArmPose = "clasped" | "apart" | "tablet";

export type Body = {
  breath: number; // -1..1, almost invisible
  lean: number; // 0..1
  shift: number; // -1..1 very slow weight shift
  headYaw: number;
  headPitch: number;
  headRoll: number;
  armPose: ArmPose;
  gesture: number; // 0..1 right hand, open palm
};

// Occasional arm repositioning while still (every ~18–30 s).
export function armPoseAt(time: number, seed = 0): ArmPose {
  const t = Math.max(0, time) % 3600; // the 400 segments cover over 2 hours; repeat hourly
  let start = 0;
  for (let k = 0; k < 400; k++) {
    const len = 18 + hash(k * 11 + seed) * 12;
    if (t < start + len) return hash(k * 11 + 3 + seed) < 0.62 ? "clasped" : "apart";
    start += len;
  }
  return "clasped";
}

export function bodyAt(
  t: number,
  perf: Performance,
  opts: {
    reducedMotion?: boolean;
    speaking?: boolean;
    phrase?: number;
    beat?: number;
    question?: boolean;
    reviewing?: boolean;
    seed?: number;
    patientActive?: number;
    sinceState?: number;
    state?: DoctorState;
  } = {},
): Body {
  const m = opts.reducedMotion ? 0 : 1;
  const seed = opts.seed ?? 0;
  const h = perf.head * m;
  let headPitch = noise(t * 0.17, 2 + seed) * 0.018 * h;
  let headYaw = noise(t * 0.13, 1 + seed) * 0.03 * h;
  const headRoll = noise(t * 0.11, 3 + seed) * 0.014 * h;

  // Listening: an occasional small nod — more often while the patient is
  // actually typing or talking ("mm-hm"), never on a fixed beat.
  if (perf.nods && m) {
    const active = (opts.patientActive ?? 99) < 2;
    const period = active ? 2.8 : 4.6;
    const w = Math.floor(t / period);
    const into = t - w * period;
    if (hash(w * 5 + seed) < (active ? 0.7 : 0.4) && into < 0.6) headPitch += Math.sin((into / 0.6) * Math.PI) * (active ? 0.045 : 0.035);
  }
  // An answer arrived: a small acknowledging nod before thinking.
  if ((opts.state === "processing" || opts.state === "acknowledging") && m) {
    const x = opts.sinceState ?? 9;
    if (x < 0.5) headPitch += Math.sin((x / 0.5) * Math.PI) * 0.035;
  }
  // Speaking: tiny emphasis on stressed words, small phrase-level turns, and
  // a slight tilt at the end of a question.
  let roll = 0;
  if (opts.speaking && m) {
    headPitch += (opts.beat ?? 0) * 0.012;
    headYaw += (hash((opts.phrase ?? 0) * 7 + seed) * 2 - 1) * 0.025 * perf.head;
    if (opts.question) roll += 0.02;
  }

  // Hands: still unless speaking; a gesture belongs to a phrase, not a loop.
  let gesture = 0;
  if (opts.speaking && m && perf.gesture > 0) {
    const p = opts.phrase ?? 0;
    // Most phrases have still hands; a few get one small open-palm gesture.
    gesture = p > 0 && hash(p * 19 + 4 + seed) < 0.4 ? perf.gesture : 0;
  }

  return {
    breath: Math.sin(t * ((2 * Math.PI) / 4.6)) * (0.85 + 0.15 * noise(t * 0.1, 8)),
    lean: perf.lean,
    shift: noise(t * 0.04, 9 + seed) * m,
    headYaw,
    headPitch,
    headRoll: headRoll + roll * m,
    armPose: opts.reviewing ? "tablet" : armPoseAt(t, seed),
    gesture,
  };
}
