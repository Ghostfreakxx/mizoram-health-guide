"use client";

import { useEffect, useState } from "react";

// Reads text aloud with the phone's built-in voice. Works offline and sends
// nothing anywhere. Hidden on browsers without speech support.
export default function ReadAloud({ text, label = "Read aloud", className = "" }: { text: string; label?: string; className?: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection after mount
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Stop if the text changes (for example, the next question).
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the text changes
    setSpeaking(false);
  }, [text]);

  if (!supported || !text.trim()) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    u.voice = voices.find((v) => v.lang === "en-IN") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
    u.lang = u.voice?.lang ?? "en-IN";
    u.rate = 0.9;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className={`no-print inline-flex items-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-base font-semibold text-slate-800 hover:bg-slate-50 ${className}`}
    >
      <span aria-hidden>{speaking ? "⏹" : "🔊"}</span> {speaking ? "Stop" : label}
    </button>
  );
}
