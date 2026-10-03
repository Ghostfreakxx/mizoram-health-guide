// How the virtual guide moves. Pure functions of time and state, so the same
// motion drives the 3D and 2D presentations and can be tested.
//
// Motion is deliberately small: real clinicians sit still and listen.

import type { Mood } from "../../lib/consultation";

export type Activity = "idle" | "listening" | "thinking" | "speaking";

export type Pose = {
  headYaw: number; // radians, + = towards the information panel
  headPitch: number; // + = nod down
  headRoll: number;
  lean: number; // 0..1 leaning slightly forward
  breath: number; // -1..1
  blink: number; // 0 open .. 1 closed
  brow: number; // -1 furrowed .. 1 raised
  smile: number; // 0..1
  mouth: number; // 0 closed .. 1 open
  gesture: number; // 0 hands resting .. 1 explaining
};

// Deterministic pseudo-random number in [0, 1) for an integer.
function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// Smooth noise, roughly in -1..1.
function noise(t: number, seed: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(i * 31 + seed) * 2 - 1;
  const b = hash((i + 1) * 31 + seed) * 2 - 1;
  return a + (b - a) * u;
}

// Natural blinking: every 2.5 to 6 seconds, each blink lasting ~0.15 s.
export function blinkAt(t: number): number {
  let start = 0;
  for (let k = 0; ; k++) {
    const gap = 2.5 + hash(k + 101) * 3.5;
    if (start + gap > t) {
      const into = t - start;
      const dur = 0.15;
      if (into < 0 || into > dur) return 0;
      return Math.sin((into / dur) * Math.PI);
    }
    start += gap;
    if (k > 100000) return 0;
  }
}

const MOOD: Record<Mood, { smile: number; brow: number; lean: number }> = {
  warm: { smile: 0.35, brow: 0.15, lean: 0.2 },
  attentive: { smile: 0.15, brow: 0.1, lean: 0.35 },
  focused: { smile: 0.05, brow: -0.15, lean: 0.5 },
  serious: { smile: 0, brow: -0.35, lean: 0.7 },
};

export function poseAt(
  t: number,
  activity: Activity,
  mood: Mood,
  opts: { reducedMotion?: boolean; voiceLevel?: number } = {},
): Pose {
  const m = MOOD[mood];
  const still = opts.reducedMotion ? 0 : 1;
  const calm = mood === "serious" ? 0.5 : 1; // serious: steadier

  const breath = Math.sin(t * ((2 * Math.PI) / 4.2)); // ~14 breaths a minute
  let headYaw = noise(t * 0.25, 1) * 0.05 * still * calm;
  let headPitch = noise(t * 0.2, 2) * 0.03 * still * calm;
  const headRoll = noise(t * 0.15, 3) * 0.02 * still * calm;
  let gesture = 0;
  let mouth = 0;
  let brow = m.brow;

  if (activity === "listening") {
    // An occasional small nod.
    const cycle = t % 3.6;
    if (cycle < 0.7) headPitch += Math.sin((cycle / 0.7) * Math.PI) * 0.07 * still;
    brow += 0.1;
  } else if (activity === "thinking") {
    // A brief glance towards the information panel.
    headYaw += 0.14 * still;
    headPitch += 0.04 * still;
  } else if (activity === "speaking") {
    headYaw += noise(t * 0.8, 4) * 0.04 * still * calm;
    headPitch += noise(t * 0.9, 5) * 0.03 * still * calm;
    gesture = (0.45 + 0.35 * noise(t * 0.5, 6)) * still * calm;
    // Lips follow the voice level when the voice is on; otherwise stay closed.
    const level = opts.voiceLevel ?? 0;
    mouth = level > 0 ? Math.min(1, level * (0.55 + 0.45 * Math.abs(Math.sin(t * 11)))) : 0;
  }

  return {
    headYaw,
    headPitch,
    headRoll,
    lean: m.lean,
    breath,
    blink: blinkAt(t),
    brow: Math.max(-1, Math.min(1, brow)),
    smile: activity === "speaking" ? m.smile * 0.6 : m.smile,
    mouth,
    gesture,
  };
}
