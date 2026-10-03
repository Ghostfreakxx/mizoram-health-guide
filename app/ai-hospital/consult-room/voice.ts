// Voice for the virtual doctor.
//
// OUTPUT: the phone's built-in text-to-speech. Speech is produced by the
// browser on the device; AI Hospital sends nothing anywhere.
//
// INPUT ("Talk"): the browser's speech recognition turns speech into text.
// Spoken words appear in the answer box so the patient can check or correct
// them; then they go through exactly the same safety checks as typed text.
// Modes (NEXT_PUBLIC_VOICE_INPUT):
//   "consent" (default) — available after the patient agrees, in plain words,
//                          that their browser's speech service (in Chrome:
//                          Google) converts the audio to text.
//   "on-device"         — only on-device recognition (Chrome processLocally).
//                          Its availability check has crashed tabs in testing,
//                          so it is only ever tried after the button is pressed.
//   "off"               — typing only.
// The microphone is never used without the patient pressing Talk, and the
// browser always asks for permission first.

export type VoiceMode = "consent" | "on-device" | "off";
export const VOICE_MODE: VoiceMode = (["consent", "on-device", "off"] as const).includes(process.env.NEXT_PUBLIC_VOICE_INPUT as VoiceMode)
  ? (process.env.NEXT_PUBLIC_VOICE_INPUT as VoiceMode)
  : "consent";

export const VOICE_CONSENT_TEXT =
  "To turn your speech into text, your browser's own speech service is used. In Chrome, this sends the audio of what you say to Google. AI Hospital does not record or keep it. You can type instead at any time.";

// ---------------- Output ----------------

export type SpeakHandlers = { onStart?: () => void; onEnd?: () => void; onWord?: (charIndex: number) => void };

export type SpeechOutput = {
  available: boolean;
  speak: (text: string, h?: SpeakHandlers, rate?: number) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
};

// A calm, clear voice: Indian English if the device has one.
function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  if (!voices.length) return null;
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang === "en-IN" ? 10 : v.lang.startsWith("en-GB") ? 6 : v.lang.startsWith("en") ? 4 : 0) +
    (/neerja|heera|veena|female|zira|samantha|serena/i.test(v.name) ? 3 : 0) +
    (/natural|neural|online/i.test(v.name) ? 2 : 0) +
    (v.localService ? 1 : 0);
  return [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
}

export function browserSpeech(): SpeechOutput {
  const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  if (!synth) {
    const noop = () => {};
    return { available: false, speak: (_t, h) => h?.onEnd?.(), stop: noop, pause: noop, resume: noop };
  }
  let voice = pickVoice(synth);
  synth.addEventListener?.("voiceschanged", () => (voice = pickVoice(synth)));
  return {
    available: true,
    speak(text, h, rate = 0.92) {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "en-IN";
      u.rate = rate;
      u.pitch = 1;
      u.onstart = () => h?.onStart?.();
      u.onend = () => h?.onEnd?.();
      u.onerror = () => h?.onEnd?.();
      u.onboundary = (e) => {
        if (e.name === "word" || e.name === undefined) h?.onWord?.(e.charIndex);
      };
      synth.speak(u);
    },
    stop: () => synth.cancel(),
    pause: () => synth.pause(),
    resume: () => synth.resume(),
  };
}

// ---------------- Input ----------------

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
  onspeechend?: (() => void) | null;
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

export type VoiceInputStatus = { ok: true; needsConsent: boolean } | { ok: false; reason: string };

// A cheap check that never touches the microphone or the recogniser.
export function voiceInputSetting(): VoiceInputStatus {
  if (VOICE_MODE === "off") return { ok: false, reason: "Speaking your answers is switched off. Please type your answer." };
  if (!srClass()) return { ok: false, reason: "Speaking your answers is not available in this browser. Please type instead." };
  return { ok: true, needsConsent: VOICE_MODE === "consent" };
}

const LANG = "en-IN";

export type ListenHandlers = { onText: (text: string, final: boolean) => void; onEnd: () => void; onError: (message: string) => void };

// Starts listening. Returns a stop function. Audio handling depends on the
// mode (see top of file). Never called without the patient pressing Talk.
export async function listen(h: ListenHandlers): Promise<() => void> {
  const SR = srClass();
  if (!SR || VOICE_MODE === "off") {
    h.onError("Speaking your answers is not available. Please type instead.");
    return () => {};
  }
  if (VOICE_MODE === "on-device") {
    try {
      if (typeof SR.available !== "function") throw new Error("no on-device recognition");
      const st = await SR.available({ langs: [LANG], processLocally: true });
      if (st === "downloadable" && SR.install) await SR.install({ langs: [LANG], processLocally: true });
      else if (st !== "available" && st !== "downloading") throw new Error("unavailable");
    } catch {
      h.onError("On-device speech recognition is not available. Please type instead.");
      return () => {};
    }
  }
  const rec = new SR();
  rec.lang = LANG;
  if (VOICE_MODE === "on-device") rec.processLocally = true;
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e) => {
    let text = "";
    let final = false;
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      final = e.results[i].isFinal;
    }
    h.onText(text.trim(), final);
  };
  rec.onerror = (e) =>
    h.onError(
      e.error === "not-allowed" || e.error === "service-not-allowed"
        ? "Microphone permission was not given. You can type your answer instead."
        : e.error === "no-speech"
          ? "I didn't hear anything. Press Talk to try again, or type."
          : e.error === "network"
            ? "Speech could not be converted (no connection). Please type instead."
            : "Could not hear clearly. Please try again or type your answer.",
    );
  rec.onend = () => h.onEnd();
  try {
    rec.start();
  } catch {
    h.onError("The microphone could not start. Please type instead.");
    return () => {};
  }
  return () => {
    try {
      rec.stop();
    } catch {
      // already stopped
    }
  };
}
