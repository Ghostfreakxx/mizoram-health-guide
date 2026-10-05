// Where the doctor looks. Real people do not hold perfect eye contact: they
// look at the patient most of the time, glance at notes while thinking, and
// break gaze briefly while talking. Eye contact increases while listening.

import type { GazePolicy } from "./state";
import { hash } from "./random";

// "visual": the on-screen tool the doctor is showing (the body map).
export type GazeTarget = "patient" | "chart" | "down" | "away" | "visual";
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

// While speaking, gaze follows the phrases: eyes on the patient as each
// phrase begins; on some phrases a brief look away while "finding the words";
// when explaining, a glance at the chart (the information being explained).
function whileSpeaking(policy: GazePolicy, phrase: number, phraseAge: number, seed: number): GazeTarget {
  // Showing the body map: look at the patient, glance at the picture while
  // pointing it out, then back to the patient for the question.
  if (policy === "showing") return phrase === 0 && phraseAge > 0.7 && phraseAge < 1.7 ? "visual" : "patient";
  if (phraseAge < 0.6) return "patient";
  const r = hash(phrase * 29 + 7 + seed);
  if (policy === "explaining" && r < 0.34 && phraseAge < 1.5) return "chart";
  if (policy !== "steady" && phrase > 0 && r > 0.78 && phraseAge < 1.05) return hash(phrase * 31 + seed) < 0.6 ? "down" : "away";
  return "patient";
}

export function gazeAt(
  t: number,
  policy: GazePolicy,
  since: number,
  opts: { reducedMotion?: boolean; seed?: number; speaking?: boolean; phrase?: number; phraseAge?: number } = {},
): Gaze {
  const dt = Math.max(0, t - since);
  const seed = opts.seed ?? 0;
  let target: GazeTarget = "patient";
  if (opts.speaking && (policy === "conversational" || policy === "explaining" || policy === "steady" || policy === "showing")) {
    target = whileSpeaking(policy, opts.phrase ?? 0, opts.phraseAge ?? 0, seed);
    return { target, ...micro(t, opts.reducedMotion, seed) };
  }
  switch (policy) {
    case "notice":
      // Finishing a note, then looking up to the patient: "noticing" them.
      target = dt < 0.9 ? "chart" : "patient";
      break;
    case "review":
      // A brief look at the chart after an answer — and back to the patient
      // before the next question is spoken.
      target = dt > 0.15 && dt < 0.75 ? "chart" : dt >= 0.75 && dt < 4 ? "patient" : dt >= 4 ? conversational(dt - 4, seed) : "patient";
      break;
    case "explaining":
      target = conversational(dt, seed);
      break;
    case "showing":
      // Not speaking (muted): the same glance at the picture, then the patient.
      target = dt > 0.6 && dt < 1.6 ? "visual" : dt >= 1.6 ? conversational(dt - 1.6, seed) : "patient";
      break;
    case "preparing":
      // Finishing notes at the chart before the patient arrives.
      target = dt % 7 < 5.5 ? "chart" : "down";
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
  return { target, ...micro(t, opts.reducedMotion, seed) };
}

// Tiny fixational eye movements: hold, then jump slightly (never a fixed stare).
function micro(t: number, reducedMotion: boolean | undefined, seed: number) {
  const m = reducedMotion ? 0 : 1;
  const step = Math.floor(t / 1.3);
  return {
    sx: (hash(step * 17 + 1 + seed) * 2 - 1) * 0.018 * m,
    sy: (hash(step * 17 + 2 + seed) * 2 - 1) * 0.012 * m,
  };
}
