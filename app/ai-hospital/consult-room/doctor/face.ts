// Facial expressions and blinking. Restrained and professional: expressions
// are small combinations of brows, eyes, cheeks and mouth — never theatrical.

import type { Expression } from "./state";
import { hash } from "./random";

export type Face = {
  browInnerUp: number;
  browDown: number;
  browOuterUp: number;
  mouthSmile: number;
  mouthFrown: number;
  mouthPress: number;
  eyeSquint: number;
  eyeWide: number;
};

const ZERO: Face = { browInnerUp: 0, browDown: 0, browOuterUp: 0, mouthSmile: 0, mouthFrown: 0, mouthPress: 0, eyeSquint: 0, eyeWide: 0 };

// Morph weights per expression. The model's resting eyes are a little heavy,
// so most expressions open them slightly (eyeWide) to look attentive.
export const EXPRESSIONS: Record<Expression, Face> = {
  neutral: { ...ZERO, mouthSmile: 0.08, eyeWide: 0.2 },
  welcoming: { ...ZERO, mouthSmile: 0.32, browInnerUp: 0.12, browOuterUp: 0.08, eyeSquint: 0.12, eyeWide: 0.12 },
  listening: { ...ZERO, mouthSmile: 0.1, browInnerUp: 0.16, eyeWide: 0.24 },
  thinking: { ...ZERO, browDown: 0.12, mouthPress: 0.12, eyeSquint: 0.1, eyeWide: 0.08 },
  reassuring: { ...ZERO, mouthSmile: 0.2, browInnerUp: 0.14, eyeSquint: 0.08, eyeWide: 0.14 },
  concerned: { ...ZERO, browInnerUp: 0.34, browDown: 0.12, mouthPress: 0.1, eyeWide: 0.2 },
  urgent: { ...ZERO, browInnerUp: 0.3, browDown: 0.28, mouthPress: 0.18, eyeWide: 0.26 },
  // Patient and helpful: a slight, kind lift of the brows; a small smile.
  helpful: { ...ZERO, mouthSmile: 0.14, browInnerUp: 0.22, eyeSquint: 0.05, eyeWide: 0.18 },
};

export function expressionFace(e: Expression): Face {
  return EXPRESSIONS[e];
}

// Natural blinking: intervals vary (2–7 s), each blink ~0.14–0.2 s, sometimes
// a double blink. Extra blinks happen on large gaze shifts (see gaze.ts).
// The schedule is 96 irregular intervals long (~7 minutes) and then repeats,
// so the cost per frame is constant however long the page stays open.
type Blink = { at: number; dur: number; double: boolean };
const schedules = new Map<number, { blinks: Blink[]; length: number }>();

function schedule(seed: number) {
  let s = schedules.get(seed);
  if (!s) {
    const blinks: Blink[] = [];
    let at = 0;
    for (let k = 0; k < 96; k++) {
      at += 2 + hash(k * 7 + 101 + seed) * 5;
      blinks.push({ at, dur: 0.14 + hash(k * 7 + 303 + seed) * 0.06, double: hash(k * 7 + 707 + seed) < 0.12 });
    }
    s = { blinks, length: at + 2 };
    schedules.set(seed, s);
  }
  return s;
}

export function blinkAt(t: number, seed = 0): number {
  if (t < 0) return 0;
  const { blinks, length } = schedule(seed);
  const x = t % length;
  // binary search for the last blink starting at or before x
  let lo = 0;
  let hi = blinks.length - 1;
  if (x < blinks[0].at) return 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (blinks[mid].at <= x) lo = mid;
    else hi = mid - 1;
  }
  const b = blinks[lo];
  const into = x - b.at;
  if (into <= b.dur) return Math.sin((into / b.dur) * Math.PI);
  if (b.double) {
    const d2 = into - b.dur - 0.12;
    if (d2 >= 0 && d2 <= b.dur) return Math.sin((d2 / b.dur) * Math.PI);
  }
  return 0;
}

// Blink shape for a blink triggered at time `at` (e.g. on a gaze shift).
export function triggeredBlink(t: number, at: number): number {
  const into = t - at;
  return into >= 0 && into <= 0.16 ? Math.sin((into / 0.16) * Math.PI) : 0;
}
