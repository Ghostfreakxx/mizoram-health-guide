// The doctor's natural voice (optional): sentences spoken with audio made by
// this site's /api/voice (OpenAI text-to-speech; the key stays on the
// server). The consultation's only network call. What may be sent, and why,
// is in lib/doctorVoice.ts:
// - only the doctor's own sentence, its tone and pace;
// - never a sentence that repeats the patient's own words — the device's
//   voice says those;
// - an emergency never waits: the emergency line is fetched when the
//   consultation begins, and if it is not ready the device's voice says it
//   at once;
// - on any failure the device's voice says the sentence; after three
//   failures in a row the natural voice stops for the rest of the visit.
// Played with Web Audio: the context is started by the patient's own tap
// ("Begin consultation"), which phones require before any sound.

import { type Tone, VOICE_PATH, patientWordsIn } from "../../lib/doctorVoice";
import type { SpeakHandlers, SpeechOutput } from "./voice";

const FETCH_TIMEOUT_MS = 8000;
const SLOW_BELOW = 0.85; // the room's "Slower" rate

export type NaturalVoice = SpeechOutput & {
  // On for this visit: the site has it, the patient has not switched it off,
  // and it has not failed repeatedly.
  enabled: boolean;
  readonly failed: boolean;
  unlock: () => void; // call from a tap
  prefetch: (sentences: string[], o?: { tone?: Tone; rate?: number }) => void;
};

type Ctx = AudioContext;

export function naturalSpeech(device: SpeechOutput, deps: { patientTexts: () => string[]; onGiveUp: () => void }): NaturalVoice {
  let ctx: Ctx | null = null;
  const loading = new Map<string, Promise<AudioBuffer | null>>();
  const ready = new Map<string, AudioBuffer>();
  let playing: AudioBufferSourceNode | null = null;
  let token = 0;
  let failures = 0;
  let failed = false;

  const keyOf = (text: string, tone: Tone, slow: boolean) => `${tone}|${slow ? 1 : 0}|${text}`;

  function load(text: string, tone: Tone, slow: boolean): Promise<AudioBuffer | null> {
    const key = keyOf(text, tone, slow);
    const known = loading.get(key);
    if (known) return known;
    const p = (async () => {
      const c = ctx;
      if (!c) return null;
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
      try {
        const r = await fetch(VOICE_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ v: 1, text, tone, slow }),
          cache: "no-store",
          credentials: "omit",
          signal: ac.signal,
        });
        if (!r.ok) return null;
        const buffer = await c.decodeAudioData(await r.arrayBuffer());
        ready.set(key, buffer);
        return buffer;
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    })();
    loading.set(key, p);
    // A failed sentence can be tried again later.
    void p.then((b) => {
      if (!b) loading.delete(key);
    });
    return p;
  }

  function stopPlaying() {
    const p = playing;
    playing = null;
    try {
      p?.stop();
    } catch {
      // already stopped
    }
  }

  function play(buffer: AudioBuffer, h: SpeakHandlers | undefined) {
    const c = ctx!;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    let ended = false;
    let guard: ReturnType<typeof setTimeout> | undefined;
    const end = () => {
      if (ended) return;
      ended = true;
      clearTimeout(guard);
      if (playing === src) playing = null;
      h?.onEnd?.();
    };
    // Never wait forever, even if the "ended" event is lost (not while paused).
    const watch = (ms: number) => {
      guard = setTimeout(() => (c.state === "suspended" ? watch(1000) : end()), ms);
    };
    src.onended = end;
    playing = src;
    if (c.state === "suspended") void c.resume();
    src.start();
    h?.onStart?.();
    h?.onDuration?.(buffer.duration);
    watch((buffer.duration + 1.5) * 1000);
  }

  const api: NaturalVoice = {
    enabled: false,
    get failed() {
      return failed;
    },
    get available() {
      return (api.enabled && !!ctx) || device.available;
    },
    unlock() {
      if (typeof window === "undefined") return;
      if (!ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        try {
          ctx = new AC();
        } catch {
          return;
        }
      }
      void ctx.resume().catch(() => {});
    },
    prefetch(sentences, o = {}) {
      if (!api.enabled || !ctx) return;
      const texts = deps.patientTexts();
      const slow = (o.rate ?? 1) < SLOW_BELOW;
      for (const s of sentences) if (s.trim() && !patientWordsIn(s, texts)) void load(s, o.tone ?? "calm", slow);
    },
    speak(text, h, rate = 0.92, o = {}) {
      stopPlaying();
      device.stop();
      const my = ++token;
      const tone = o.tone ?? "calm";
      const slow = rate < SLOW_BELOW;
      // The device's voice; if it has none, the words are written only (the
      // natural voice still works, so this is not a voice failure).
      const byDevice = () => device.speak(text, api.enabled ? { ...h, onFail: undefined } : h, rate);
      if (!api.enabled || !ctx || patientWordsIn(text, deps.patientTexts())) return byDevice();
      const buffer = ready.get(keyOf(text, tone, slow));
      if (buffer) return play(buffer, h);
      // An emergency is said at once: never wait for the network.
      if (tone === "urgent") {
        void load(text, tone, slow);
        return byDevice();
      }
      void load(text, tone, slow).then((b) => {
        if (my !== token) return; // stopped, or another sentence started
        if (!b) {
          failures++;
          if (failures >= 3 && !failed) {
            failed = true;
            api.enabled = false;
            deps.onGiveUp();
          }
          return byDevice();
        }
        failures = 0;
        play(b, h);
      });
    },
    stop() {
      token++;
      stopPlaying();
      device.stop();
    },
    pause() {
      void ctx?.suspend().catch(() => {});
      device.pause();
    },
    resume() {
      void ctx?.resume().catch(() => {});
      device.resume();
    },
  };
  return api;
}

// Is a natural voice set up on this site? Asks once (no patient data in it).
let availability: Promise<boolean> | null = null;
export function naturalVoiceAvailable(): Promise<boolean> {
  availability ??= (async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 4000);
    try {
      const r = await fetch(VOICE_PATH, { cache: "no-store", credentials: "omit", signal: ac.signal });
      const j: unknown = r.ok ? await r.json() : null;
      const on = !!j && typeof j === "object" && (j as { available?: unknown }).available === true;
      if (!on) availability = null;
      return on;
    } catch {
      availability = null;
      return false;
    } finally {
      clearTimeout(timer);
    }
  })();
  return availability;
}
