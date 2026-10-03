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

export type SpeakHandlers = { onStart?: () => void; onEnd?: () => void; onWord?: () => void };

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
      u.onboundary = () => h?.onWord?.();
      synth.speak(u);
    },
    stop: () => synth.cancel(),
    pause: () => synth.pause(),
    resume: () => synth.resume(),
  };
}

// Reserved for spoken answers. Returns null until a recogniser is approved.
export type SpeechInput = { start: (onText: (text: string) => void) => void; stop: () => void };
export function approvedSpeechInput(): SpeechInput | null {
  return null;
}
