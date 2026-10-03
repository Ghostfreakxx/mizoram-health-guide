"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ConsultState, type Turn, nextTurn, panelItems, respond, startConsultation, toAnswers } from "../../lib/consultation";
import EmergencyMode from "../components/EmergencyMode";
import ResultView from "../components/ResultView";
import { BigChoice } from "../components/ui";
import { type Tier, chooseTier, readDevice } from "./capability";
import Doctor2D from "./Doctor2D";
import type { Activity } from "./doctorMotion";
import type { RoomStyle } from "./rooms";
import { type SpeechOutput, browserSpeech } from "./voice";

// The 3D room is only downloaded after the person opens a consultation.
const Doctor3D = dynamic(() => import("./Doctor3D"), { ssr: false, loading: () => <StageMessage text="Preparing the consultation room…" /> });

function StageMessage({ text }: { text: string }) {
  return <div className="grid h-full place-items-center bg-slate-100 text-lg font-semibold text-slate-700">{text}</div>;
}

// If 3D fails for any reason, fall back to the 2D guide. The consultation
// itself never depends on graphics.
class StageBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

type Display = "auto" | "3d" | "2d" | "text";

function Toggle({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={`min-h-11 rounded-lg border-2 px-3 py-2 text-sm font-semibold ${on ? "border-blue-900 bg-blue-900 text-white" : "border-slate-300 bg-white text-slate-800 hover:border-blue-500"}`}
    >
      {children}
    </button>
  );
}

export default function ConsultationRoom({ room }: { room: RoomStyle }) {
  const [history, setHistory] = useState<ConsultState[]>(() => [startConsultation(room.greeting)]);
  const state = history[history.length - 1];
  const turn = useMemo(() => nextTurn(state), [state]);

  const [begun, setBegun] = useState(false);
  const [activity, setActivity] = useState<Activity>("idle");
  const [voiceOn, setVoiceOn] = useState(true);
  const [subtitles, setSubtitles] = useState(true);
  const [bigSubtitles, setBigSubtitles] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [display, setDisplay] = useState<Display>("auto");
  const [detected, setDetected] = useState<Tier | null>(null);
  const [text, setText] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const voiceLevel = useRef(0);
  const speech = useRef<SpeechOutput | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    speech.current = browserSpeech("en");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- device checks after mount
    setDetected(chooseTier(readDevice()));
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    return () => {
      speech.current?.stop();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const tier: Tier | "none" =
    display === "text" ? "none" : display === "2d" ? "lite" : display === "3d" ? (detected === "lite" ? "lite" : (detected ?? "standard")) : (detected ?? "lite");
  // "3D" chosen on a device without WebGL still shows the 2D guide.

  const say = useCallback(
    (t: Turn) => {
      if (timer.current) clearTimeout(timer.current);
      speech.current?.stop();
      voiceLevel.current = 0;
      const talk = () => {
        setActivity("speaking");
        if (voiceOn && speech.current?.available) {
          speech.current.speak(t.say, {
            onStart: () => (voiceLevel.current = 0.85),
            onEnd: () => {
              voiceLevel.current = 0;
              setActivity("listening");
            },
          });
        } else {
          // Muted: the guide still "speaks" through subtitles, without lip movement.
          timer.current = setTimeout(() => setActivity("listening"), Math.min(6000, 600 + t.say.length * 35));
        }
      };
      if (t.input.kind === "emergency") talk();
      else {
        // A short, natural pause before answering — no theatrical "thinking".
        setActivity("thinking");
        timer.current = setTimeout(talk, 650);
      }
    },
    [voiceOn],
  );

  // Each new turn: the guide responds.
  const lastSaid = useRef("");
  useEffect(() => {
    if (!begun) return;
    const key = `${history.length}:${turn.step}`;
    if (lastSaid.current === key) return;
    lastSaid.current = key;
    say(turn);
    if (turn.input.kind === "emergency") topRef.current?.scrollIntoView({ block: "start" });
  }, [begun, turn, history.length, say]);

  const answer = (value: string | string[]) => {
    const next = respond(state, turn.step, value);
    if (next === state) return;
    setText("");
    setMulti([]);
    setHistory((h) => [...h, next]);
  };
  const back = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  const restart = () => {
    speech.current?.stop();
    lastSaid.current = "";
    setHistory([startConsultation(room.greeting)]);
  };

  const togglePause = () => {
    setPaused((p) => {
      if (p) speech.current?.resume();
      else speech.current?.pause();
      return !p;
    });
  };
  const toggleVoice = () => {
    if (voiceOn) {
      speech.current?.stop();
      voiceLevel.current = 0;
      setActivity("listening");
    }
    setVoiceOn((v) => !v);
  };

  const emergency = turn.input.kind === "emergency";
  const mood = begun ? turn.mood : "warm";
  const items = panelItems(state);
  const showHeading = tier === "none" || !subtitles;

  const stage =
    tier === "none" ? null : (
      <div
        className={`relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100 ${emergency ? "h-44 sm:h-56" : "aspect-[4/5] max-h-[70vh] w-full sm:aspect-[16/10]"}`}
      >
        <div className="h-full w-full" role="img" aria-label={`Virtual guide in a ${room.greeting} consultation room${emergency ? ", looking serious" : ""}.`}>
        {tier === "lite" ? (
          <Doctor2D activity={activity} mood={mood} voiceLevel={voiceLevel} reducedMotion={reducedMotion} paused={paused} room={room} />
        ) : (
          <StageBoundary fallback={<Doctor2D activity={activity} mood={mood} voiceLevel={voiceLevel} reducedMotion={reducedMotion} paused={paused} room={room} />}>
            <Doctor3D activity={activity} mood={mood} voiceLevel={voiceLevel} reducedMotion={reducedMotion} paused={paused} tier={tier} room={room} />
          </StageBoundary>
        )}
        </div>
        <p className="pointer-events-none absolute right-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white">
          Virtual guide · not a real doctor
        </p>
        {begun && subtitles && (
          <p
            aria-hidden
            className={`absolute inset-x-3 bottom-3 rounded-xl px-4 py-3 text-center font-semibold text-white ${emergency ? "bg-red-800/95" : "bg-slate-900/85"} ${bigSubtitles ? "text-2xl" : "text-lg"}`}
          >
            {turn.say}
          </p>
        )}
        {!begun && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-slate-900/60 to-transparent p-3 pt-10">
            <div className="w-full max-w-md rounded-2xl bg-white/95 p-4 text-center shadow-xl">
              <p className="text-xl font-bold text-blue-950">{room.greeting} consultation room</p>
              <p className="mt-1 text-sm text-slate-700 sm:text-base">A virtual guide will ask about the problem and help you find the safest next step. It is not a doctor and cannot diagnose.</p>
              <button type="button" onClick={() => setBegun(true)} className="mt-3 w-full rounded-xl bg-blue-900 px-5 py-3 text-lg font-bold text-white hover:bg-blue-800">
                Begin consultation
              </button>
              <p className="mt-2 text-sm text-slate-600">Your camera and microphone are never used.</p>
            </div>
          </div>
        )}
      </div>
    );

  const controls = (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Consultation controls">
      <Toggle on={voiceOn} onClick={toggleVoice}>{voiceOn ? "🔊 Voice on" : "🔇 Muted"}</Toggle>
      <button type="button" onClick={() => say(turn)} disabled={!begun} className="min-h-11 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-40">
        ↻ Replay
      </button>
      <Toggle on={paused} onClick={togglePause}>{paused ? "▶ Resume" : "⏸ Pause"}</Toggle>
      <Toggle on={subtitles} onClick={() => setSubtitles((s) => !s)}>💬 Subtitles</Toggle>
      <Toggle on={bigSubtitles} onClick={() => setBigSubtitles((s) => !s)}>A+ Larger subtitles</Toggle>
      <Toggle on={reducedMotion} onClick={() => setReducedMotion((s) => !s)}>Reduce motion</Toggle>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        Display
        <select value={display} onChange={(e) => setDisplay(e.target.value as Display)} className="min-h-11 rounded-lg border-2 border-slate-300 bg-white px-2 py-2">
          <option value="auto">Automatic</option>
          <option value="3d">3D room</option>
          <option value="2d">Simple picture</option>
          <option value="text">Text only</option>
        </select>
      </label>
    </div>
  );

  let answerArea: ReactNode = null;
  if (!begun && tier === "none") {
    answerArea = (
      <button type="button" onClick={() => setBegun(true)} className="w-full rounded-xl bg-blue-900 px-5 py-4 text-lg font-bold text-white hover:bg-blue-800">
        Begin consultation
      </button>
    );
  } else if (begun && turn.input.kind === "text") {
    const inp = turn.input;
    answerArea = (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim() || inp.optional) answer(text);
        }}
      >
        <label htmlFor="consult-text" className="sr-only">{turn.say}</label>
        <textarea
          id="consult-text"
          value={text}
          maxLength={inp.maxLength}
          rows={3}
          onChange={(e) => setText(e.target.value)}
          placeholder={inp.placeholder}
          onFocus={() => activity !== "speaking" && setActivity("listening")}
          className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-lg focus:border-blue-700"
        />
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={!text.trim()} className="rounded-xl bg-blue-900 px-6 py-4 text-lg font-bold text-white hover:bg-blue-800 disabled:opacity-40">
            Send
          </button>
          {inp.optional && (
            <button type="button" onClick={() => answer("")} className="rounded-xl border-2 border-slate-300 bg-white px-6 py-4 text-lg font-semibold text-slate-800">
              Skip
            </button>
          )}
        </div>
      </form>
    );
  } else if (begun && turn.input.kind === "single") {
    const opts = turn.input.options;
    answerArea = (
      <div className={`grid gap-3 ${opts.length <= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {opts.map((o) => (
          <BigChoice key={o.id} tone={o.tone === "danger" ? "danger" : "default"} onClick={() => answer(o.id)}>
            {o.label}
          </BigChoice>
        ))}
      </div>
    );
  } else if (begun && turn.input.kind === "multi") {
    const inp = turn.input;
    answerArea = (
      <div className="space-y-3">
        <div className="grid gap-3">
          {inp.options.map((o) => (
            <BigChoice key={o.id} selected={multi.includes(o.id)} onClick={() => setMulti((m) => (m.includes(o.id) ? m.filter((x) => x !== o.id) : [...m, o.id]))}>
              <span className="block">{o.label}</span>
              {o.hint && <span className="mt-1 block text-base font-normal text-slate-600">{o.hint}</span>}
            </BigChoice>
          ))}
        </div>
        <button type="button" onClick={() => answer(multi)} className="w-full rounded-xl bg-blue-900 px-6 py-4 text-lg font-bold text-white hover:bg-blue-800">
          {multi.length ? inp.doneLabel : inp.noneLabel}
        </button>
      </div>
    );
  } else if (begun && turn.input.kind === "result") {
    answerArea = (
      <div id="consult-result" className="space-y-4">
        <h2 className="text-2xl font-bold text-blue-950">📋 Prepare for Doctor</h2>
        <ResultView
          answers={toAnswers(state)}
          meta={{
            relation: state.relation,
            sex: state.sex === "unspecified" ? undefined : state.sex,
            specialAsked: state.specialDone,
            concernText: state.concernText,
            medicines: state.medicines,
            allergies: state.allergies,
          }}
          onRestart={restart}
          onEmergency={(flags) => setHistory((h) => [...h, { ...state, emergency: { flags, clear: { kind: "text" } } }])}
        />
      </div>
    );
  }

  if (emergency && turn.input.kind === "emergency") {
    return (
      <div ref={topRef} className="space-y-4">
        {stage}
        <EmergencyMode flags={turn.input.flags} onExit={() => answer("exit")} exitLabel="This is not an emergency — go back" />
      </div>
    );
  }

  return (
    <div ref={topRef} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        {stage}
        {controls}
        <section aria-labelledby="consult-question" className="space-y-4 rounded-2xl border-2 border-slate-200 bg-white p-5">
          <h2 id="consult-question" aria-live="polite" className={showHeading || !begun ? "text-2xl font-bold text-blue-950" : "sr-only"}>
            {begun ? turn.say : `${room.greeting} consultation room`}
          </h2>
          {begun && turn.hint && <p className="text-lg text-slate-600">{turn.hint}</p>}
          {!begun && tier !== "none" && <p className="text-lg text-slate-700">Press “Begin consultation” on the picture above to start.</p>}
          {answerArea}
          {begun && history.length > 1 && turn.input.kind !== "result" && (
            <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
              <button type="button" onClick={back} className="rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold text-slate-800">← Back</button>
              <button type="button" onClick={restart} className="rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold text-slate-800">↺ Start again</button>
            </div>
          )}
        </section>
      </div>

      <aside aria-labelledby="panel-heading" className="h-fit space-y-3 rounded-2xl border-2 border-slate-200 bg-white p-5 lg:sticky lg:top-4">
        <h2 id="panel-heading" className="text-xl font-bold text-blue-950">What you have told me</h2>
        <p className="text-sm text-slate-600">Only what you told me. Not a diagnosis. Nothing is saved or sent.</p>
        {items.length ? (
          <dl className="space-y-2">
            {items.map((i) => (
              <div key={i.label} className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-600">{i.label}</dt>
                <dd className="text-base text-slate-900">{i.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-slate-700">Your answers will appear here.</p>
        )}
        {turn.input.kind === "result" && (
          <a href="#consult-result" className="block rounded-xl bg-blue-900 px-4 py-3 text-center font-bold text-white hover:bg-blue-800">
            📋 Prepare for Doctor
          </a>
        )}
        <p className="border-t border-slate-200 pt-3 text-sm text-slate-600">
          Need a real doctor? <Link href="/ai-hospital/consult" className="font-semibold text-blue-800 underline">Talk to a doctor live</Link>
        </p>
      </aside>
    </div>
  );
}
