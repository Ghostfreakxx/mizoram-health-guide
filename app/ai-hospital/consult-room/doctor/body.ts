// Posture, breathing, head movement and hands. Movement is small: a listening
// doctor is mostly still; explaining brings small, phrase-timed gestures.

import type { Performance } from "./state";
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
  opts: { reducedMotion?: boolean; speaking?: boolean; phrase?: number; beat?: number; reviewing?: boolean; seed?: number } = {},
): Body {
  const m = opts.reducedMotion ? 0 : 1;
  const seed = opts.seed ?? 0;
  const h = perf.head * m;
  let headPitch = noise(t * 0.17, 2 + seed) * 0.018 * h;
  let headYaw = noise(t * 0.13, 1 + seed) * 0.03 * h;
  const headRoll = noise(t * 0.11, 3 + seed) * 0.014 * h;

  // Listening: an occasional small nod (not on a fixed beat).
  if (perf.nods && m) {
    const w = Math.floor(t / 4.6);
    const into = t - w * 4.6;
    if (hash(w * 5 + seed) < 0.55 && into < 0.7) headPitch += Math.sin((into / 0.7) * Math.PI) * 0.05;
  }
  // Speaking: tiny emphasis on word beats, and small phrase-level turns.
  if (opts.speaking && m) {
    headPitch += (opts.beat ?? 0) * 0.012;
    headYaw += (hash((opts.phrase ?? 0) * 7 + seed) * 2 - 1) * 0.025 * perf.head;
  }

  // Hands: still unless speaking; a gesture belongs to a phrase, not a loop.
  let gesture = 0;
  if (opts.speaking && m && perf.gesture > 0) {
    const p = opts.phrase ?? 0;
    gesture = hash(p * 19 + 4 + seed) < 0.55 ? perf.gesture : perf.gesture * 0.25;
  }

  return {
    breath: Math.sin(t * ((2 * Math.PI) / 4.6)) * (0.85 + 0.15 * noise(t * 0.1, 8)),
    lean: perf.lean,
    shift: noise(t * 0.04, 9 + seed) * m,
    headYaw,
    headPitch,
    headRoll,
    armPose: opts.reviewing ? "tablet" : armPoseAt(t, seed),
    gesture,
  };
}
