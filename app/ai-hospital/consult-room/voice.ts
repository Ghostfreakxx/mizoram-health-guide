import { REST_VISEME, type Viseme, visemeAt, wordDuration } from "./doctorMotion";

// Voice for the virtual guide.
//
// OUTPUT (on now): the phone's built-in text-to-speech. Speech is made on the
// device by the browser; AI Hospital sends nothing anywhere.
//
// INPUT (not switched on): spoken answers would go
//   speech → text → the same respond() step as typed text → safety engine.
// Browser speech recognition in some browsers sends audio to an outside
// cloud service, so it stays off until the Health Department chooses an
// on-device or government-hosted recogniser, and the microphone is only ever
// used after the person presses a button and the browser asks permission.

export type SpeakHandlers = { onStart?: () => void; onEnd?: () => void; onWord?: (charIndex: number) => void };

export type SpeechOutput = {
  available: boolean;
  speak: (text: string, h?: SpeakHandlers) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
};

export type Lang = "en" | "lus";

export function browserSpeech(lang: Lang = "en"): SpeechOutput {
  const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  if (!synth) {
    const noop = () => {};
    return { available: false, speak: (_t, h) => h?.onEnd?.(), stop: noop, pause: noop, resume: noop };
  }
  return {
    available: true,
    speak(text, h) {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      // No Mizo voice ships with phones today; English is used until one does.
      void lang;
      u.lang = "en-IN";
      u.rate = 0.95;
      u.onstart = () => h?.onStart?.();
      u.onend = () => h?.onEnd?.();
      u.onerror = () => h?.onEnd?.();
      u.onboundary = (e) => h?.onWord?.(e.charIndex);
      synth.speak(u);
    },
    stop: () => synth.cancel(),
    pause: () => synth.pause(),
    resume: () => synth.resume(),
  };
}

// ---------------- Spoken answers (on-device only) ----------------
// Uses the browser's speech recognition ONLY when it can run on the device
// (Chrome's `processLocally`). If recognition would need an outside cloud
// service, voice input stays off and the person is told why. Recognised words
// are put in the text box for the person to check before sending; they then
// go through exactly the same safety checks as typed text.

export type VoiceInputStatus =
  | { ok: true }
  | { ok: false; reason: string };

type SRInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  processLocally?: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SRClass = {
  new (): SRInstance;
  available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string>;
  install?: (o: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
};

function srClass(): SRClass | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRClass; webkitSpeechRecognition?: SRClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const LANGS = ["en-IN"];

// Off unless the deployment opts in. Checking on-device recognition has
// crashed browser tabs in testing, so it is only ever checked after the
// person presses the microphone button, and only when switched on.
export const VOICE_INPUT_ENABLED = process.env.NEXT_PUBLIC_VOICE_INPUT === "on-device";

export function voiceInputSetting(): VoiceInputStatus {
  if (!VOICE_INPUT_ENABLED) return { ok: false, reason: "Speaking your answers is not switched on in this prototype yet. Please type your answer." };
  if (!srClass()) return { ok: false, reason: "Speaking your answers is not available in this browser. Please type instead." };
  return { ok: true };
}

export async function voiceInputStatus(): Promise<VoiceInputStatus> {
  if (!VOICE_INPUT_ENABLED) return voiceInputSetting();
  const SR = srClass();
  if (!SR) return { ok: false, reason: "Speaking your answers is not available in this browser. Please type instead." };
  if (typeof SR.available !== "function" || !("processLocally" in SR.prototype)) {
    return { ok: false, reason: "This browser would send your voice to an outside service, so voice answers are switched off. Please type instead." };
  }
  try {
    const st = await SR.available({ langs: LANGS, processLocally: true });
    if (st === "available" || st === "downloadable" || st === "downloading") return { ok: true };
  } catch {
    // fall through
  }
  return { ok: false, reason: "On-device speech recognition is not available on this phone. Please type instead." };
}

// Starts listening (the browser asks for microphone permission the first
// time). Returns a stop function. Audio stays on the device.
export async function listenOnDevice(handlers: { onText: (text: string, final: boolean) => void; onEnd: () => void; onError: (message: string) => void }): Promise<() => void> {
  if (!VOICE_INPUT_ENABLED) {
    handlers.onError(voiceInputSetting().ok ? "" : "Speaking your answers is not switched on yet. Please type.");
    return () => {};
  }
  const SR = srClass();
  if (!SR || typeof SR.available !== "function") {
    handlers.onError("Voice answers are not available.");
    return () => {};
  }
  try {
    const st = await SR.available({ langs: LANGS, processLocally: true });
    if (st === "downloadable" && SR.install) await SR.install({ langs: LANGS, processLocally: true });
    else if (st !== "available" && st !== "downloading") throw new Error("unavailable");
  } catch {
    handlers.onError("On-device speech recognition is not available. Please type instead.");
    return () => {};
  }
  const rec = new SR();
  rec.lang = LANGS[0];
  rec.processLocally = true;
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e) => {
    let text = "";
    let final = false;
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      final = e.results[i].isFinal;
    }
    handlers.onText(text.trim(), final);
  };
  rec.onerror = (e) =>
    handlers.onError(
      e.error === "not-allowed" || e.error === "service-not-allowed"
        ? "Microphone permission was not given. You can type your answer instead."
        : "Could not hear clearly. Please try again or type your answer.",
    );
  rec.onend = () => handlers.onEnd();
  rec.start();
  return () => rec.stop();
}

// ---------------- Lip-sync clock ----------------
// Tracks which word is being spoken. Uses the speech engine's word-boundary
// events when the phone provides them, and estimated timings otherwise.


export class LipSync {
  private words: { text: string; at: number }[] = [];
  private start = 0;
  private boundary: { index: number; time: number } | null = null;
  speaking = false;

  begin(text: string, now: number) {
    const words: { text: string; at: number }[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) words.push({ text: m[0], at: m.index });
    this.words = words;
    this.start = now;
    this.boundary = null;
    this.speaking = true;
  }

  // charIndex from SpeechSynthesisUtterance's boundary event
  word(charIndex: number, now: number) {
    let i = this.words.findIndex((w, k) => charIndex >= w.at && (k === this.words.length - 1 || charIndex < this.words[k + 1].at));
    if (i < 0) i = 0;
    this.boundary = { index: i, time: now };
  }

  end() {
    this.speaking = false;
    this.boundary = null;
  }

  visemeAt(now: number): Viseme {
    if (!this.speaking || !this.words.length) return REST_VISEME;
    if (this.boundary) {
      const w = this.words[this.boundary.index];
      return visemeAt(w.text, now - this.boundary.time, wordDuration(w.text));
    }
    // No boundary events from this voice: walk through the words by estimate.
    let t = now - this.start;
    for (const w of this.words) {
      const d = wordDuration(w.text) + 0.05;
      if (t < d) return visemeAt(w.text, t, d - 0.05);
      t -= d;
    }
    return REST_VISEME;
  }
}
