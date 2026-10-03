// Lip-sync from text, timed to the speech engine.
//
// The phone's speech engine reports when each word starts (boundary events).
// Each word is turned into mouth shapes from its letters — with common letter
// pairs (th, sh, ch, oo, ee) — and blended so shapes flow into each other.
// When the engine gives no word events, timings are estimated from the text,
// including pauses at commas and full stops. The mouth only moves while audio
// is actually playing, and returns to rest when it stops.

export type Viseme = { jawOpen: number; mouthPucker: number; mouthFunnel: number; mouthStretch: number; mouthPress: number; lipsPart: number };

export const REST: Viseme = { jawOpen: 0, mouthPucker: 0, mouthFunnel: 0, mouthStretch: 0, mouthPress: 0, lipsPart: 0 };
const V = (o: Partial<Viseme>): Viseme => ({ ...REST, ...o });

const MAX_JAW = 0.38; // never more: avoids an unnatural, "dislocated" jaw

const SHAPES: [RegExp, Viseme][] = [
  [/^(th)/, V({ jawOpen: 0.08, lipsPart: 0.32 })],
  [/^(sh|ch|j)/, V({ jawOpen: 0.1, mouthFunnel: 0.35, lipsPart: 0.25 })],
  [/^(oo|ou|ow|w|u)/, V({ jawOpen: 0.1, mouthPucker: 0.5, lipsPart: 0.18 })],
  [/^(ee|ea|ie|y)/, V({ jawOpen: 0.12, mouthStretch: 0.38, lipsPart: 0.35 })],
  [/^(o)/, V({ jawOpen: 0.22, mouthFunnel: 0.42, lipsPart: 0.3 })],
  [/^(a)/, V({ jawOpen: 0.3, lipsPart: 0.45 })],
  [/^(e|i)/, V({ jawOpen: 0.16, mouthStretch: 0.3, lipsPart: 0.38 })],
  [/^(m|b|p)/, V({ mouthPress: 0.55 })],
  [/^(f|v)/, V({ jawOpen: 0.05, lipsPart: 0.22, mouthPress: 0.15 })],
  [/^[a-z]/, V({ jawOpen: 0.1, lipsPart: 0.32 })],
];

export type Segment = { v: Viseme; weight: number };

// Splits a word into mouth-shape segments with relative durations.
export function segments(word: string): Segment[] {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1); // silent final e
  const out: Segment[] = [];
  while (w.length) {
    const hit = SHAPES.find(([re]) => re.test(w))!;
    const m = w.match(hit[0])![0];
    const vowel = /[aeiouy]/.test(m[0]);
    out.push({ v: hit[1], weight: vowel ? 1.3 : 0.8 });
    w = w.slice(m.length);
  }
  return out;
}

export function visemeFor(ch: string): Viseme {
  return segments(ch)[0]?.v ?? REST;
}

function mix(a: Viseme, b: Viseme, f: number): Viseme {
  const o = { ...REST };
  for (const k of Object.keys(o) as (keyof Viseme)[]) o[k] = a[k] + (b[k] - a[k]) * f;
  o.jawOpen = Math.min(MAX_JAW, o.jawOpen);
  return o;
}

// Mouth shape `elapsed` seconds into a word lasting `duration` seconds.
export function visemeAt(word: string, elapsed: number, duration: number): Viseme {
  const segs = segments(word);
  if (!segs.length || elapsed < 0 || elapsed > duration) return REST;
  const total = segs.reduce((a, s) => a + s.weight, 0);
  let x = (elapsed / duration) * total;
  for (let i = 0; i < segs.length; i++) {
    if (x <= segs[i].weight) {
      const f = x / segs[i].weight;
      // blend into the next shape over the last 40% of each segment
      const next = segs[i + 1]?.v ?? REST;
      return mix(segs[i].v, next, Math.max(0, (f - 0.6) / 0.4));
    }
    x -= segs[i].weight;
  }
  return REST;
}

const lettersOf = (w: string) => w.replace(/[^a-z]/gi, "").length;
const pauseAfter = (w: string) => (/[.!?]$/.test(w) ? 0.32 : /[,;:]$/.test(w) ? 0.16 : 0.04);

export class LipSync {
  private words: { text: string; at: number }[] = [];
  private start = 0;
  private boundary: { index: number; time: number } | null = null;
  private perLetter = 0.068; // seconds per letter; adapts to the real voice
  private pausedAt: number | null = null;
  speaking = false;
  rate = 1;

  begin(text: string, now: number, rate = 1) {
    const words: { text: string; at: number }[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) words.push({ text: m[0], at: m.index });
    this.words = words;
    this.start = now;
    this.boundary = null;
    this.pausedAt = null;
    this.rate = rate;
    this.speaking = true;
  }

  // charIndex from the speech engine's word-boundary event
  word(charIndex: number, now: number) {
    let i = this.words.findIndex((w, k) => charIndex >= w.at && (k === this.words.length - 1 || charIndex < this.words[k + 1].at));
    if (i < 0) i = 0;
    const prev = this.boundary;
    if (prev && i === prev.index + 1) {
      // learn the real speaking rate from the gap between words
      const gap = now - prev.time - pauseAfter(this.words[prev.index].text);
      const letters = Math.max(1, lettersOf(this.words[prev.index].text));
      const measured = gap / letters;
      if (measured > 0.02 && measured < 0.2) this.perLetter = this.perLetter * 0.7 + measured * 0.3;
    }
    this.boundary = { index: i, time: now };
  }

  pause(now: number) {
    if (this.pausedAt === null) this.pausedAt = now;
  }

  resume(now: number) {
    if (this.pausedAt === null) return;
    const d = now - this.pausedAt;
    this.start += d;
    if (this.boundary) this.boundary.time += d;
    this.pausedAt = null;
  }

  end() {
    this.speaking = false;
    this.boundary = null;
    this.pausedAt = null;
  }

  private duration(w: string) {
    return Math.max(0.12, (lettersOf(w) * this.perLetter + 0.05) / this.rate);
  }

  // Which word is being said now, and how far into it.
  private locate(now: number): { index: number; elapsed: number; duration: number } | null {
    if (!this.speaking || !this.words.length || this.pausedAt !== null) return null;
    if (this.boundary) {
      const w = this.words[this.boundary.index];
      return { index: this.boundary.index, elapsed: now - this.boundary.time, duration: this.duration(w.text) };
    }
    let t = now - this.start;
    for (let i = 0; i < this.words.length; i++) {
      const d = this.duration(this.words[i].text);
      if (t < d) return { index: i, elapsed: t, duration: d };
      t -= d + pauseAfter(this.words[i].text) / this.rate;
      if (t < 0) return null; // a pause between words: mouth at rest
    }
    return null;
  }

  visemeAt(now: number): Viseme {
    const at = this.locate(now);
    return at ? visemeAt(this.words[at.index].text, at.elapsed, at.duration) : REST;
  }

  // For body language: phrase number (changes at punctuation) and a word beat.
  rhythm(now: number): { speaking: boolean; phrase: number; beat: number } {
    const at = this.locate(now);
    if (!at) return { speaking: false, phrase: 0, beat: 0 };
    let phrase = 0;
    for (let i = 0; i < at.index; i++) if (/[.,;:!?]$/.test(this.words[i].text)) phrase++;
    const long = lettersOf(this.words[at.index].text) >= 6;
    return { speaking: true, phrase, beat: long ? Math.exp(-at.elapsed / 0.12) : 0 };
  }
}
