// How the virtual guide behaves. Pure functions of time and state, shared by
// the 3D and 2D presentations, so behaviour is consistent and testable.
//
// A real clinician listening to a patient is mostly still: small breathing,
// natural blinks, eye contact, an occasional nod. Movement is kept small.

// The consultation state machine. The screen and the guide both follow it.
export type GuideState = "waiting" | "greeting" | "listening" | "thinking" | "asking" | "explaining" | "urgent" | "handoff" | "complete";

export const STATE_LABEL: Record<GuideState, string> = {
  waiting: "Waiting",
  greeting: "Greeting",
  listening: "Listening",
  thinking: "Reviewing your answer",
  asking: "Asking",
  explaining: "Explaining",
  urgent: "Urgent",
  handoff: "Preparing your summary",
  complete: "Complete",
};

export type Pose = {
  headYaw: number; // radians, + = towards the information panel
  headPitch: number; // + = nod down
  headRoll: number;
  lean: number; // 0..1, leaning slightly towards the patient
  breath: number; // -1..1
  blink: number; // 0 open .. 1 closed
  gazeX: number; // small eye movements around eye contact (radians)
  gazeY: number;
  browInnerUp: number; // 0..1 (attentive, caring)
  browDown: number; // 0..1 (concentration, concern)
  smile: number; // 0..1
  squint: number; // 0..1
  gesture: number; // 0 hands resting .. 1 explaining with the right hand
  shift: number; // -1..1 slow posture shift
};

// Deterministic pseudo-random number in [0, 1) for an integer.
function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// Smooth noise, roughly in -1..1.
export function noise(t: number, seed: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(i * 31 + seed) * 2 - 1;
  const b = hash((i + 1) * 31 + seed) * 2 - 1;
  return a + (b - a) * u;
}

// Natural blinking: every 2.5 to 6 seconds, ~0.15 s long; sometimes a double blink.
export function blinkAt(t: number): number {
  const period = 4.25; // average gap
  const k0 = Math.max(0, Math.floor(t / period) - 2);
  let start = 0;
  for (let k = 0; k < k0; k++) start += 2.5 + hash(k + 101) * 3.5;
  for (let k = k0; k < k0 + 6; k++) {
    const gap = 2.5 + hash(k + 101) * 3.5;
    const into = t - (start + gap);
    if (into >= 0 && into <= 0.15) return Math.sin((into / 0.15) * Math.PI);
    if (hash(k + 707) < 0.15 && into >= 0.3 && into <= 0.45) return Math.sin(((into - 0.3) / 0.15) * Math.PI);
    start += gap;
  }
  return 0;
}

// Small eye movements (micro-saccades): the gaze holds, then jumps slightly.
function saccade(t: number, seed: number, amount: number): number {
  const hold = Math.floor(t / 1.7);
  return (hash(hold * 13 + seed) * 2 - 1) * amount;
}

const STATE: Record<GuideState, { smile: number; browInnerUp: number; browDown: number; lean: number; squint: number }> = {
  waiting: { smile: 0.18, browInnerUp: 0.05, browDown: 0, lean: 0.15, squint: 0 },
  greeting: { smile: 0.3, browInnerUp: 0.2, browDown: 0, lean: 0.25, squint: 0.05 },
  listening: { smile: 0.12, browInnerUp: 0.18, browDown: 0, lean: 0.4, squint: 0.05 },
  thinking: { smile: 0.05, browInnerUp: 0.05, browDown: 0.12, lean: 0.3, squint: 0.08 },
  asking: { smile: 0.15, browInnerUp: 0.3, browDown: 0, lean: 0.35, squint: 0 },
  explaining: { smile: 0.1, browInnerUp: 0.12, browDown: 0.05, lean: 0.3, squint: 0 },
  urgent: { smile: 0, browInnerUp: 0.35, browDown: 0.3, lean: 0.6, squint: 0.15 },
  handoff: { smile: 0.25, browInnerUp: 0.15, browDown: 0, lean: 0.3, squint: 0.05 },
  complete: { smile: 0.25, browInnerUp: 0.1, browDown: 0, lean: 0.2, squint: 0.05 },
};

export function poseAt(t: number, state: GuideState, opts: { reducedMotion?: boolean } = {}): Pose {
  const s = STATE[state];
  const move = opts.reducedMotion ? 0 : 1;
  const calm = state === "urgent" ? 0.45 : 1; // steadier when serious

  let headYaw = noise(t * 0.18, 1) * 0.035 * move * calm;
  let headPitch = noise(t * 0.15, 2) * 0.02 * move * calm;
  const headRoll = noise(t * 0.12, 3) * 0.015 * move * calm;
  let gesture = 0;

  if (state === "listening") {
    // An occasional small nod, roughly every 5 seconds.
    const cycle = t % 5.2;
    if (cycle < 0.8) headPitch += Math.sin((cycle / 0.8) * Math.PI) * 0.06 * move;
  } else if (state === "thinking") {
    // A brief glance down towards the notes, not a theatrical "thinking" effect.
    headPitch += 0.06 * move;
    headYaw += 0.08 * move;
  } else if (state === "explaining" || state === "handoff" || state === "greeting") {
    headYaw += noise(t * 0.5, 4) * 0.035 * move;
    headPitch += noise(t * 0.6, 5) * 0.02 * move;
    gesture = Math.max(0, 0.55 + 0.45 * noise(t * 0.35, 6)) * move;
  } else if (state === "asking") {
    headPitch -= 0.02 * move; // a slight lift of the chin when asking
    gesture = Math.max(0, 0.25 * noise(t * 0.3, 7)) * move;
  }

  return {
    headYaw,
    headPitch,
    headRoll,
    lean: s.lean,
    breath: Math.sin(t * ((2 * Math.PI) / 4.4)),
    blink: blinkAt(t),
    gazeX: saccade(t, 11, 0.025) * move,
    gazeY: saccade(t, 17, 0.015) * move,
    browInnerUp: s.browInnerUp,
    browDown: s.browDown,
    smile: s.smile,
    squint: s.squint,
    gesture,
    shift: noise(t * 0.05, 9) * move,
  };
}

// ---------------- Lip-sync ----------------
//
// The phone's speech engine reports when each word starts. Each word is turned
// into a short sequence of mouth shapes from its letters, timed across the
// word. This needs no audio analysis and sends nothing anywhere.

export type Viseme = { jawOpen: number; mouthPucker: number; mouthFunnel: number; mouthStretch: number; mouthPress: number; lipsPart: number };

const REST: Viseme = { jawOpen: 0, mouthPucker: 0, mouthFunnel: 0, mouthStretch: 0, mouthPress: 0, lipsPart: 0 };

export function visemeFor(ch: string): Viseme {
  const c = ch.toLowerCase();
  if ("a".includes(c)) return { ...REST, jawOpen: 0.32, lipsPart: 0.5 };
  if ("ei".includes(c)) return { ...REST, jawOpen: 0.18, mouthStretch: 0.35, lipsPart: 0.4 };
  if ("o".includes(c)) return { ...REST, jawOpen: 0.22, mouthFunnel: 0.45, lipsPart: 0.3 };
  if ("uw".includes(c)) return { ...REST, jawOpen: 0.1, mouthPucker: 0.55, lipsPart: 0.2 };
  if ("mbp".includes(c)) return { ...REST, mouthPress: 0.55 };
  if ("fv".includes(c)) return { ...REST, jawOpen: 0.05, lipsPart: 0.25 };
  if (/[a-z]/.test(c)) return { ...REST, jawOpen: 0.1, lipsPart: 0.35 };
  return REST;
}

// Mouth shape `elapsed` seconds into speaking `word` that lasts `duration` seconds.
export function visemeAt(word: string, elapsed: number, duration: number): Viseme {
  const letters = word.replace(/[^a-z]/gi, "");
  if (!letters || elapsed < 0 || elapsed > duration) return REST;
  const pos = (elapsed / duration) * letters.length;
  const i = Math.min(letters.length - 1, Math.floor(pos));
  const a = visemeFor(letters[i]);
  const b = visemeFor(letters[Math.min(letters.length - 1, i + 1)]);
  const f = pos - i;
  const mix = (k: keyof Viseme) => a[k] + (b[k] - a[k]) * f;
  return { jawOpen: mix("jawOpen"), mouthPucker: mix("mouthPucker"), mouthFunnel: mix("mouthFunnel"), mouthStretch: mix("mouthStretch"), mouthPress: mix("mouthPress"), lipsPart: mix("lipsPart") };
}

// Rough duration of a spoken word at the given speech rate.
export const wordDuration = (word: string, rate = 0.95) => Math.max(0.12, (word.replace(/[^a-z]/gi, "").length * 0.068 + 0.06) / rate);

export const REST_VISEME = REST;
