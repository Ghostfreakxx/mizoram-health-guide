// Lip-sync from text, timed to the speech engine.
//
// The browser's speech engine does not expose its audio or phonemes, so the
// mouth is driven from the TEXT being spoken, timed to the voice:
//  - Each word becomes mouth shapes (visemes) from its letters, with common
//    letter pairs (th, sh, ch, oo, ee, ng, qu) and silent letters handled.
//  - One word schedule per sentence. When the engine reports word starts
//    (boundary events), the schedule is re-anchored to the real audio and the
//    speaking rate is learned; without them, timing is estimated, including
//    pauses at commas and full stops.
//  - Shapes flow into each other (coarticulation): the end of a word blends
//    into the start of the next, short gaps keep the mouth relaxed rather than
//    snapping shut, and the next shape is anticipated just before it starts.
//  - The mouth starts with the audio (begin on the engine's start event) and
//    stops with it (end on its end event, Stop or an interruption).
// Limitations: the avatar has 7 mouth controls (jaw, lips part, press,
// pucker, funnel, stretch, upper lip); there are no tongue or teeth controls,
// so sounds like "l", "t" or "th" are approximated.

export type Viseme = { jawOpen: number; mouthPucker: number; mouthFunnel: number; mouthStretch: number; mouthPress: number; lipsPart: number; mouthUpperUp: number };

export const REST: Viseme = { jawOpen: 0, mouthPucker: 0, mouthFunnel: 0, mouthStretch: 0, mouthPress: 0, lipsPart: 0, mouthUpperUp: 0 };
const V = (o: Partial<Viseme>): Viseme => ({ ...REST, ...o });

export const MAX_JAW = 0.38; // never more: avoids an unnatural, "dislocated" jaw

// Letter patterns → mouth shapes. null = silent (no time, no shape).
const SHAPES: [RegExp, Viseme | null][] = [
  [/^(gh)(?![aeiou])/, null], // though, night
  [/^(kn|wr)/, V({ jawOpen: 0.08, lipsPart: 0.3 })], // know, write (first letter silent)
  [/^(th)/, V({ jawOpen: 0.08, lipsPart: 0.34, mouthUpperUp: 0.08 })],
  [/^(sh|ch|j|tch)/, V({ jawOpen: 0.08, mouthFunnel: 0.38, lipsPart: 0.28 })],
  [/^(qu)/, V({ jawOpen: 0.08, mouthPucker: 0.45, lipsPart: 0.15 })],
  [/^(oo|ou|ow|ew|w|u)/, V({ jawOpen: 0.1, mouthPucker: 0.5, lipsPart: 0.18 })],
  [/^(ee|ea|ie|ey|y)/, V({ jawOpen: 0.11, mouthStretch: 0.4, lipsPart: 0.36 })],
  [/^(ng)/, V({ jawOpen: 0.1, lipsPart: 0.26 })],
  [/^(oa|o)/, V({ jawOpen: 0.22, mouthFunnel: 0.42, lipsPart: 0.3 })],
  [/^(ai|ay|a)/, V({ jawOpen: 0.3, lipsPart: 0.46 })],
  [/^(e|i)/, V({ jawOpen: 0.16, mouthStretch: 0.3, lipsPart: 0.38 })],
  [/^(mm|m|bb|b|pp|p)/, V({ mouthPress: 0.85 })], // lips fully closed
  [/^(ff|f|ph|v)/, V({ jawOpen: 0.05, lipsPart: 0.2, mouthPress: 0.2, mouthUpperUp: 0.18 })], // lower lip to upper teeth
  [/^(ss|s|z|c(?=[eiy])|t|d|n|l)/, V({ jawOpen: 0.06, lipsPart: 0.3, mouthStretch: 0.14 })], // teeth nearly together
  [/^(r)/, V({ jawOpen: 0.09, mouthPucker: 0.2, lipsPart: 0.24 })],
  [/^(k|c|g|h|x|q)/, V({ jawOpen: 0.14, lipsPart: 0.3 })],
  [/^[a-z]/, V({ jawOpen: 0.1, lipsPart: 0.3 })],
];

export type Segment = { v: Viseme; weight: number };

const DIGITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

// What the voice says for a written word: digits and symbols are spoken as
// words, so the mouth moves for them too ("Call 108 or 112 now" — the most
// important words in an emergency). Digit by digit is an approximation of
// how a voice reads a number; the timing is corrected by the engine's word
// events when it sends them.
export function spokenForm(word: string): string {
  return word
    .replace(/\d/g, (d) => ` ${DIGITS[+d]} `)
    .replace(/°/g, " degrees ")
    .replace(/%/g, " percent ")
    .replace(/&/g, " and ");
}

// Splits a word into mouth-shape segments with relative durations.
export function segments(word: string): Segment[] {
  return spokenForm(word).split(/\s+/).flatMap(letterSegments);
}

function letterSegments(word: string): Segment[] {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length > 3 && w.endsWith("e") && !/[aeiou]e$/.test(w)) w = w.slice(0, -1); // silent final e
  const out: Segment[] = [];
  while (w.length) {
    const hit = SHAPES.find(([re]) => re.test(w))!;
    const m = w.match(hit[0])![0];
    if (hit[1]) {
      const vowel = /^[aeiouy]/.test(m);
      out.push({ v: hit[1], weight: vowel ? 1.35 : 0.75 });
    }
    w = w.slice(m.length);
  }
  return out;
}

export function visemeFor(ch: string): Viseme {
  return segments(ch)[0]?.v ?? REST;
}

export function mix(a: Viseme, b: Viseme, f: number): Viseme {
  const o = { ...REST };
  for (const k of Object.keys(o) as (keyof Viseme)[]) o[k] = a[k] + (b[k] - a[k]) * f;
  o.jawOpen = Math.min(MAX_JAW, o.jawOpen);
  return o;
}

const scale = (v: Viseme, s: number): Viseme => mix(REST, v, s);
const smooth = (x: number) => x * x * (3 - 2 * x);

// Mouth shape `elapsed` seconds into a word lasting `duration` seconds. The
// last shape blends into `next` (the next word's first shape) when given.
export function visemeAt(word: string, elapsed: number, duration: number, next: Viseme = REST, emphasis = 1): Viseme {
  const segs = segments(word);
  if (!segs.length || elapsed < 0 || elapsed > duration) return REST;
  const total = segs.reduce((a, s) => a + s.weight, 0);
  let x = (elapsed / duration) * total;
  for (let i = 0; i < segs.length; i++) {
    if (x <= segs[i].weight) {
      const f = x / segs[i].weight;
      // blend into the next shape over the last 40% of each segment
      const to = segs[i + 1]?.v ?? next;
      return scale(mix(segs[i].v, to, smooth(Math.max(0, (f - 0.6) / 0.4))), emphasis);
    }
    x -= segs[i].weight;
  }
  return REST;
}

const lettersOf = (w: string) => spokenForm(w).replace(/[^a-z]/gi, "").length;
const pauseAfter = (w: string) => (/[.!?]$/.test(w) ? 0.32 : /[,;:]$/.test(w) ? 0.16 : 0.03);
const firstShape = (w: string | undefined) => (w ? segments(w)[0]?.v ?? REST : REST);
const lastShape = (w: string) => {
  const s = segments(w);
  return s[s.length - 1]?.v ?? REST;
};

type Word = { text: string; at: number; letters: number; pause: number; phrase: number; question: boolean; stressed: boolean; final: boolean };

export type Rhythm = {
  speaking: boolean; // an utterance is playing (true in short gaps between words too)
  phrase: number; // phrase index (changes at punctuation)
  phraseAge: number; // seconds since the current phrase started
  beat: number; // emphasis pulse on stressed words (0..1)
  question: boolean; // in the last words of a question
};

const SILENT: Rhythm = { speaking: false, phrase: 0, phraseAge: 0, beat: 0, question: false };

export class LipSync {
  private words: Word[] = [];
  private starts: number[] = []; // seconds after t0
  private t0 = 0;
  private boundaryIndex = -1; // last word confirmed by the engine
  private boundaryTime = 0;
  private perLetter = 0.068; // seconds per letter; adapts to the real voice
  private pausedAt: number | null = null;
  speaking = false;
  rate = 1;

  begin(text: string, now: number, rate = 1) {
    const words: Word[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    let phrase = 0;
    while ((m = re.exec(text))) {
      const w = m[0];
      words.push({ text: w, at: m.index, letters: lettersOf(w), pause: pauseAfter(w), phrase, question: false, stressed: lettersOf(w) >= 6, final: false });
      if (/[.,;:!?]$/.test(w)) phrase++;
    }
    // Mark the last 3 words of each question, and each phrase's last word.
    for (let i = 0; i < words.length; i++) {
      if (/[?]$/.test(words[i].text)) for (let j = Math.max(0, i - 2); j <= i; j++) if (words[j].phrase === words[i].phrase) words[j].question = true;
      if (i === words.length - 1 || words[i + 1].phrase !== words[i].phrase) words[i].final = true;
    }
    this.words = words;
    this.t0 = now;
    this.boundaryIndex = -1;
    this.pausedAt = null;
    this.rate = rate;
    this.speaking = words.length > 0;
    this.reschedule(0, 0);
  }

  private duration(w: Word) {
    return Math.max(0.12, (w.letters * this.perLetter + 0.05) / this.rate);
  }

  // Lays out word start times from word `from`, starting at `at` (s after t0).
  private reschedule(from: number, at: number) {
    let t = at;
    for (let i = from; i < this.words.length; i++) {
      this.starts[i] = t;
      t += this.duration(this.words[i]) + this.words[i].pause / this.rate;
    }
  }

  // charIndex from the speech engine's word-boundary event: re-anchor the
  // schedule to the real audio and learn the speaking rate.
  word(charIndex: number, now: number) {
    let i = this.words.findIndex((w, k) => charIndex >= w.at && (k === this.words.length - 1 || charIndex < this.words[k + 1].at));
    if (i < 0) i = 0;
    if (this.boundaryIndex >= 0 && i === this.boundaryIndex + 1) {
      const prev = this.words[this.boundaryIndex];
      const measured = (now - this.boundaryTime - prev.pause / this.rate) / Math.max(1, prev.letters);
      if (measured > 0.02 && measured < 0.2) this.perLetter = this.perLetter * 0.7 + measured * 0.3 * this.rate;
    }
    this.boundaryIndex = i;
    this.boundaryTime = now;
    this.reschedule(i, now - this.t0);
  }

  // The real length of the sentence's audio (a recorded or generated voice
  // knows it; a phone's speech engine does not): the speaking rate is set so
  // the words fill it, pauses included.
  fit(seconds: number) {
    if (!this.words.length || !(seconds > 0.3)) return;
    const fixed = this.words.reduce((a, w) => a + (0.05 + w.pause) / this.rate, 0);
    const letters = this.words.reduce((a, w) => a + w.letters, 0);
    const target = seconds - 0.1 - fixed; // a little silence at the start and end
    if (target <= 0 || !letters) return;
    this.perLetter = Math.min(0.2, Math.max(0.03, (target * this.rate) / letters));
    this.reschedule(0, 0);
  }

  pause(now: number) {
    if (this.pausedAt === null) this.pausedAt = now;
  }

  resume(now: number) {
    if (this.pausedAt === null) return;
    const d = now - this.pausedAt;
    this.t0 += d;
    this.boundaryTime += d;
    this.pausedAt = null;
  }

  end() {
    this.speaking = false;
    this.boundaryIndex = -1;
    this.pausedAt = null;
  }

  // Where in the schedule we are.
  private locate(now: number): { i: number; elapsed: number; dur: number; toNext: number | null } | null {
    if (!this.speaking || !this.words.length || this.pausedAt !== null) return null;
    let rel = now - this.t0;
    // With real word events, never run more than one word ahead of the audio:
    // if the next event is late, hold in the gap (up to 0.35 s), then carry on.
    if (this.boundaryIndex >= 0) {
      const ahead = this.boundaryIndex + 1;
      if (ahead < this.words.length && rel > this.starts[ahead]) {
        const late = rel - this.starts[ahead];
        if (late < 0.35) rel = this.starts[ahead] - 0.001;
      }
    }
    if (rel < 0) return null;
    let i = 0;
    while (i + 1 < this.words.length && this.starts[i + 1] <= rel) i++;
    const elapsed = rel - this.starts[i];
    const dur = this.duration(this.words[i]);
    const toNext = i + 1 < this.words.length ? this.starts[i + 1] - rel : null;
    if (toNext === null && elapsed > dur + 0.25) return null; // estimated end of the sentence
    return { i, elapsed, dur, toNext };
  }

  visemeAt(now: number): Viseme {
    const at = this.locate(now);
    if (!at) return REST;
    const w = this.words[at.i];
    const next = this.words[at.i + 1];
    const nextShape = next && w.pause < 0.1 ? firstShape(next.text) : REST;
    // Stressed words open a little more; phrase-final words relax.
    const emphasis = (w.stressed ? 1.12 : 1) * (w.final ? 0.9 : 1);
    if (at.elapsed <= at.dur) return visemeAt(w.text, at.elapsed, at.dur, nextShape, emphasis);
    // Between words: the last shape relaxes quickly; just before the next
    // word, its first shape is anticipated (lips close early for "m", "b", "p").
    const after = at.elapsed - at.dur;
    const relax = Math.exp(-after / (w.pause > 0.1 ? 0.06 : 0.09));
    let v = scale(lastShape(w.text), relax * 0.85);
    if (next && at.toNext !== null && at.toNext < 0.08) v = mix(v, firstShape(next.text), (1 - at.toNext / 0.08) * 0.7);
    return v;
  }

  // For body language and gaze: phrase, time into it, emphasis and questions.
  rhythm(now: number): Rhythm {
    const at = this.locate(now);
    if (!at) return SILENT;
    const w = this.words[at.i];
    let first = at.i;
    while (first > 0 && this.words[first - 1].phrase === w.phrase) first--;
    const rel = now - this.t0;
    const inWord = at.elapsed <= at.dur;
    return {
      speaking: true,
      phrase: w.phrase,
      phraseAge: Math.max(0, rel - this.starts[first]),
      beat: w.stressed && inWord ? Math.exp(-at.elapsed / 0.12) : 0,
      question: w.question,
    };
  }
}
