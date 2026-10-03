"use client";

// The patient's controls for talking with the doctor. Always in reach: on a
// phone the bar sticks to the bottom of the screen. Every control is a real
// button with a text label (no icon-only controls), at least 44 px tall.

export type MicStatus = "ready" | "listening" | "processing" | "speaking";

export const MIC_LABEL: Record<MicStatus, string> = {
  ready: "Ready",
  listening: "Listening…",
  processing: "Processing…",
  speaking: "Doctor speaking…",
};

const DOT: Record<MicStatus, string> = {
  ready: "bg-slate-400",
  listening: "bg-red-600 motion-safe:animate-pulse",
  processing: "bg-amber-500",
  speaking: "bg-blue-700",
};

type Props = {
  status: MicStatus;
  talk: { available: boolean; listening: boolean; reason?: string };
  canAnswer: boolean; // false at the end, during an emergency or before the start
  speaking: boolean;
  slower: boolean;
  onTalk: () => void;
  onType: () => void;
  onRepeat: () => void;
  onStop: () => void;
  onSlower: () => void;
};

const btn =
  "min-h-12 flex-1 rounded-xl border-2 px-3 py-2 text-base font-bold disabled:opacity-40 sm:flex-none sm:px-4";

export default function ConversationControls(p: Props) {
  return (
    <div
      role="group"
      aria-label="Talk with the doctor"
      className="sticky bottom-0 z-20 -mx-4 space-y-2 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${DOT[p.status]}`} />
          {MIC_LABEL[p.status]}
          {p.talk.listening && <span className="font-normal text-red-800">· microphone on</span>}
        </p>
        <button
          type="button"
          aria-pressed={p.slower}
          onClick={p.onSlower}
          className={`min-h-11 rounded-lg border-2 px-3 text-sm font-semibold ${p.slower ? "border-blue-900 bg-blue-900 text-white" : "border-slate-300 bg-white text-slate-800"}`}
        >
          🐢 Slower
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={p.onTalk}
          disabled={!p.canAnswer || !p.talk.available}
          aria-pressed={p.talk.listening}
          title={p.talk.available ? undefined : p.talk.reason}
          className={`${btn} ${p.talk.listening ? "border-red-700 bg-red-700 text-white" : "border-blue-900 bg-blue-900 text-white hover:bg-blue-800"}`}
        >
          🎙️ {p.talk.listening ? "Stop listening" : "Talk"}
        </button>
        <button type="button" onClick={p.onType} disabled={!p.canAnswer} className={`${btn} border-slate-300 bg-white text-slate-900`}>
          ⌨️ Type instead
        </button>
        <button type="button" onClick={p.onRepeat} className={`${btn} border-slate-300 bg-white text-slate-900`}>
          ↻ Repeat
        </button>
        <button type="button" onClick={p.onStop} disabled={!p.speaking} className={`${btn} border-slate-300 bg-white text-slate-900`}>
          ■ Stop
        </button>
      </div>
      {!p.talk.available && p.talk.reason && p.canAnswer && <p className="text-xs text-slate-600">{p.talk.reason}</p>}
    </div>
  );
}
