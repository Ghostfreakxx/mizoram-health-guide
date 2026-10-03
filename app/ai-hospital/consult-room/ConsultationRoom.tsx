"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ConsultState, type Turn, BODY_AREAS, chartOf, nextTurn, respond, startConsultation, toAnswers } from "../../lib/consultation";
import { DEMO_SCENARIOS, demoAnswer } from "../../lib/demoScenarios";
import { questionsFor } from "../../lib/safety/triage";
import EmergencyMode from "../components/EmergencyMode";
import ResultView from "../components/ResultView";
import { BigChoice } from "../components/ui";
import BodyMap from "./BodyMap";
import { type Tier, chooseTier, readDevice } from "./capability";
import DemoPanel from "./DemoPanel";
import Doctor2D from "./Doctor2D";
import { type GuideState, STATE_LABEL } from "./doctorMotion";
import HandoffPanel from "./HandoffPanel";
import JourneyBar, { type JourneyStep } from "./JourneyBar";
import PatientChart from "./PatientChart";
import type { RoomStyle } from "./rooms";
import { LipSync, type SpeechOutput, browserSpeech, listenOnDevice, voiceInputSetting } from "./voice";

// The 3D room is only downloaded after the person opens a consultation room.
const Doctor3D = dynamic(() => import("./Doctor3D"), { ssr: false, loading: () => <StageMessage text="Preparing the consultation room…" /> });

function StageMessage({ text }: { text: string }) {
  return <div className="grid h-full place-items-center bg-slate-100 text-lg font-semibold text-slate-700">{text}</div>;
}

// If 3D fails for any reason, show the 2D guide. The consultation never depends on graphics.
class StageBoundary extends Component<{ fallback: ReactNode; onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

type Display = "auto" | "high" | "balanced" | "2d" | "text";
type Line = { who: "guide" | "patient"; text: string };

export const PRIVACY_LINE = "Your consultation information stays on this device unless you choose to share it.";

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-11 rounded-lg border-2 px-3 py-2 text-sm font-semibold ${on ? "border-blue-900 bg-blue-900 text-white" : "border-slate-300 bg-white text-slate-800 hover:border-blue-500"}`}
    >
      {children}
    </button>
  );
}

function answerLabel(t: Turn, value: string | string[]): string {
  const v = Array.isArray(value) ? value : [value];
  const inp = t.input;
  if (inp.kind === "text") return v[0]?.trim() || "(skipped)";
  if (v[0] === "skip") return "(skipped)";
  if (inp.kind === "single" || inp.kind === "body" || inp.kind === "multi") {
    const labels = v.map((x) => inp.options.find((o) => o.id === x)?.label ?? x);
    return labels.length ? labels.join(", ") : "None of these";
  }
  return v.join(", ");
}

export default function ConsultationRoom({ room }: { room: RoomStyle }) {
  const fresh = useCallback(() => startConsultation(room.greeting, room.intro), [room]);
  const [history, setHistory] = useState<ConsultState[]>(() => [fresh()]);
  const state = history[history.length - 1];
  const turn = useMemo(() => nextTurn(state), [state]);
  const chart = useMemo(() => chartOf(state), [state]);

  const [begun, setBegun] = useState(false);
  const [guide, setGuideState] = useState<GuideState>("waiting");
  const guideRef = useRef<GuideState>("waiting");
  const setGuide = useCallback((g: GuideState) => {
    guideRef.current = g;
    setGuideState(g);
  }, []);
  const lips = useRef<LipSync | null>(null);
  const [log, setLog] = useState<Line[]>([]);

  const [voiceOn, setVoiceOn] = useState(true);
  const [subtitles, setSubtitles] = useState(true);
  const [bigText, setBigText] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [display, setDisplay] = useState<Display>("auto");
  const [detected, setDetected] = useState<Tier | null>(null);
  const [failed3d, setFailed3d] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [mic, setMic] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [demo, setDemo] = useState<string | null>(null);
  const speech = useRef<SpeechOutput | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stopMic = useRef<(() => void) | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    speech.current = browserSpeech("en");
    lips.current = new LipSync();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- device checks after mount
    setDetected(chooseTier(readDevice()));
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setDemoMode(new URLSearchParams(window.location.search).has("demo"));
    // Only a cheap setting check here; the browser is not asked anything until the microphone is pressed.
    setMic(voiceInputSetting());
    const t = timers.current;
    return () => {
      speech.current?.stop();
      stopMic.current?.();
      t.forEach(clearTimeout);
    };
  }, []);

  // Which picture to show. Failures always step down: 3D → 2D (→ text by choice).
  const tier: Tier | "none" =
    display === "text"
      ? "none"
      : failed3d || display === "2d"
        ? "lite"
        : display === "high"
          ? detected === "lite" ? "lite" : "full"
          : display === "balanced"
            ? detected === "lite" ? "lite" : "standard"
            : (detected ?? "lite");

  // Speaks lines in order, moving the guide through the matching states.
  const speak = useCallback(
    (lines: { text: string; state: GuideState }[], after: GuideState) => {
      clearTimers();
      speech.current?.stop();
      lips.current?.end();
      const step = (i: number) => {
        if (i >= lines.length) {
          setGuide(after);
          return;
        }
        const l = lines[i];
        setGuide(l.state);
        setLog((g) => [...g, { who: "guide", text: l.text }]);
        if (voiceOn && speech.current?.available) {
          speech.current.speak(l.text, {
            onStart: () => lips.current?.begin(l.text, performance.now() / 1000),
            onWord: (ci) => lips.current?.word(ci, performance.now() / 1000),
            onEnd: () => {
              lips.current?.end();
              step(i + 1);
            },
          });
        } else {
          // Muted: the guide "speaks" through subtitles; lips stay still.
          later(() => step(i + 1), Math.min(5000, 700 + l.text.length * 32));
        }
      };
      step(0);
    },
    [voiceOn, setGuide, clearTimers, later],
  );

  // The guide responds to each new turn.
  const lastKey = useRef("");
  useEffect(() => {
    if (!begun) return;
    const key = `${history.length}:${turn.step}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    if (turn.input.kind === "emergency") {
      // URGENT: immediately, no pause.
      speak([{ text: turn.say, state: "urgent" }], "urgent");
      topRef.current?.scrollIntoView({ block: "start" });
    } else if (turn.input.kind === "result") {
      speak([{ text: turn.say, state: "explaining" }, ...(turn.then ? [{ text: turn.then, state: "handoff" as const }] : [])], "complete");
    } else if (turn.step === "concern") {
      speak([{ text: turn.say, state: "greeting" }], "listening");
    } else {
      // A short, natural pause while the answer is reviewed.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the guide reacts to each new engine turn
      setGuide("thinking");
      clearTimers();
      later(() => speak([{ text: turn.say, state: "asking" }], "listening"), 550);
    }
  }, [begun, turn, history.length, speak, setGuide, clearTimers, later]);

  const answer = useCallback(
    (value: string | string[]) => {
      const next = respond(state, turn.step, value);
      if (next === state) return;
      stopMic.current?.();
      setLog((g) => [...g, { who: "patient", text: answerLabel(turn, value) }]);
      setText("");
      setMulti([]);
      setHistory((h) => [...h, next]);
    },
    [state, turn],
  );

  const back = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  const restart = useCallback(() => {
    clearTimers();
    speech.current?.stop();
    lips.current?.end();
    lastKey.current = "";
    setLog([]);
    setText("");
    setHistory([fresh()]);
    setGuide("waiting");
  }, [fresh, setGuide, clearTimers]);

  // ---------------- Demonstration mode ----------------
  useEffect(() => {
    if (!demo || paused || !begun) return;
    const sc = DEMO_SCENARIOS.find((s) => s.id === demo);
    if (!sc || turn.input.kind === "result" || turn.input.kind === "emergency" || guide !== "listening") return;
    const value = demoAnswer(sc, turn, state);
    if (turn.input.kind === "text" && typeof value === "string" && value) {
      // "Type" the words, then send.
      let i = 0;
      const typeNext = () => {
        i += 2;
        setText(value.slice(0, i));
        if (i < value.length) later(typeNext, 28);
        else later(() => answer(value), 450);
      };
      later(typeNext, 500);
    } else {
      later(() => answer(value), 900);
    }
    return clearTimers;
  }, [demo, paused, begun, guide, turn, state, answer, later, clearTimers]);

  const playDemo = (id: string) => {
    restart();
    setDemo(id);
    setBegun(true);
  };
  const resetDemo = () => {
    setDemo(null);
    restart();
  };

  // ---------------- Controls ----------------
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
      lips.current?.end();
      if (guideRef.current !== "urgent" && guideRef.current !== "complete") setGuide("listening");
    }
    setVoiceOn((v) => !v);
  };
  const replay = () => {
    if (turn.input.kind === "result") speak([{ text: turn.say, state: "explaining" }, ...(turn.then ? [{ text: turn.then, state: "handoff" as const }] : [])], "complete");
    else if (turn.input.kind === "emergency") speak([{ text: turn.say, state: "urgent" }], "urgent");
    else speak([{ text: turn.say, state: "asking" }], "listening");
  };
  const startMic = async () => {
    setMicNote("");
    if (listening) {
      stopMic.current?.();
      return;
    }
    setListening(true);
    stopMic.current = await listenOnDevice({
      onText: (t) => setText(t),
      onEnd: () => {
        setListening(false);
        setMicNote("Check the words, then press Send.");
      },
      onError: (m) => {
        setListening(false);
        setMicNote(m);
      },
    });
  };

  // ---------------- Layout ----------------
  const inp = turn.input;
  const emergency = inp.kind === "emergency";
  const done = inp.kind === "result";
  const journey: JourneyStep = !begun || turn.step === "concern" ? "Consultation" : emergency ? "Triage" : done ? (guide === "complete" ? "Real doctor" : "Visit summary") : "Questions";
  const subtitleText = log.filter((l) => l.who === "guide").at(-1)?.text ?? "";
  const showHeading = tier === "none" || !subtitles || emergency;
  const textSize = bigText ? "text-xl" : "text-lg";

  const guide2d = <Doctor2D state={guideRef} lips={lips} reducedMotion={reducedMotion} paused={paused} room={room} />;
  const caption =
    begun && subtitles && subtitleText && !emergency ? (
      <p aria-hidden className={`rounded-b-2xl bg-slate-900 px-4 py-3 text-center font-semibold leading-snug text-white ${bigText ? "text-xl" : "text-base sm:text-lg"}`}>
        {subtitleText}
      </p>
    ) : null;
  const stage =
    tier === "none" ? null : (
      <div className="overflow-hidden rounded-2xl border border-slate-300 shadow-sm">
      <div className={`relative overflow-hidden bg-slate-100 ${emergency ? "h-56" : "aspect-[4/3] max-h-[60vh] w-full sm:aspect-[16/9]"}`}>
        <div className="h-full w-full" role="img" aria-label={`AI Hospital virtual health guide in the ${room.greeting} consultation room. ${STATE_LABEL[guide]}.`}>
          {tier === "lite" ? (
            guide2d
          ) : (
            <StageBoundary onFail={() => setFailed3d("3D could not start on this device. Showing the simple picture.")} fallback={guide2d}>
              <Doctor3D
                state={guideRef}
                lips={lips}
                reducedMotion={reducedMotion}
                paused={paused}
                tier={tier}
                room={room}
                onAvatarError={() => setFailed3d("The 3D guide could not load. Showing the simple picture instead.")}
                onSlow={() => (tier === "full" ? setDisplay("balanced") : setFailed3d("3D was running slowly on this device. Showing the simple picture."))}
              />
            </StageBoundary>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${emergency ? "bg-red-700 text-white" : "bg-white/90 text-slate-800"}`}>
            <span aria-hidden className={`mr-1.5 inline-block h-2 w-2 rounded-full ${emergency ? "bg-white" : guide === "listening" ? "bg-green-600" : "bg-blue-700"}`} />
            {STATE_LABEL[guide]}
          </span>
          <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white">Virtual guide · not a doctor</span>
        </div>
        {!begun && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-slate-900/60 to-transparent p-3 pt-10">
            <div className="w-full max-w-md rounded-2xl bg-white/95 p-4 text-center shadow-xl">
              <p className="text-lg font-bold text-blue-950">{room.greeting} consultation room</p>
              <p className="mt-1 text-sm text-slate-700">A virtual health guide helps you find the safest next step. It is not a doctor and cannot diagnose.</p>
              <button type="button" onClick={() => setBegun(true)} className="mt-3 w-full rounded-xl bg-blue-900 px-5 py-3 text-lg font-bold text-white hover:bg-blue-800">
                Begin consultation
              </button>
            </div>
          </div>
        )}
      </div>
      {caption}
      </div>
    );

  const privacy = (
    <p className="flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-900">
      <span aria-hidden>🔒</span>
      <span>{PRIVACY_LINE} Camera and location are never used.</span>
    </p>
  );

  const controls = (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Consultation controls">
      <Toggle on={voiceOn} onClick={toggleVoice}>{voiceOn ? "🔊 Voice on" : "🔇 Muted"}</Toggle>
      <button type="button" onClick={replay} disabled={!begun} className="min-h-11 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-40">
        ↻ Replay
      </button>
      <Toggle on={paused} onClick={togglePause}>{paused ? "▶ Resume" : "⏸ Pause"}</Toggle>
      <Toggle on={subtitles} onClick={() => setSubtitles((s) => !s)}>💬 Subtitles</Toggle>
      <Toggle on={bigText} onClick={() => setBigText((s) => !s)}>A+ Larger text</Toggle>
      <Toggle on={reducedMotion} onClick={() => setReducedMotion((s) => !s)}>Reduce motion</Toggle>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        Display
        <select
          value={display}
          onChange={(e) => {
            setFailed3d(null);
            setDisplay(e.target.value as Display);
          }}
          className="min-h-11 rounded-lg border-2 border-slate-300 bg-white px-2 py-2"
        >
          <option value="auto">Automatic</option>
          <option value="high">High quality 3D</option>
          <option value="balanced">Balanced 3D</option>
          <option value="2d">Low data (2D)</option>
          <option value="text">Text only</option>
        </select>
      </label>
    </div>
  );

  // ---------------- Patient answer area ----------------
  let answerArea: ReactNode = null;
  if (!begun) {
    answerArea =
      tier === "none" ? (
        <button type="button" onClick={() => setBegun(true)} className="w-full rounded-xl bg-blue-900 px-5 py-4 text-lg font-bold text-white hover:bg-blue-800">
          Begin consultation
        </button>
      ) : (
        <p className="text-lg text-slate-700">Press “Begin consultation” to start. You can also choose text only (Display → Text only).</p>
      );
  } else if (inp.kind === "text") {
    answerArea = (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim() || inp.optional) answer(text);
        }}
      >
        <label htmlFor="consult-text" className="sr-only">Your answer</label>
        <textarea
          id="consult-text"
          value={text}
          maxLength={inp.maxLength}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          placeholder={inp.placeholder}
          className={`w-full rounded-xl border-2 border-slate-300 px-4 py-3 ${textSize} focus:border-blue-700`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!text.trim()} className="rounded-xl bg-blue-900 px-6 py-3 text-lg font-bold text-white hover:bg-blue-800 disabled:opacity-40">
            Send
          </button>
          {inp.optional && (
            <button type="button" onClick={() => answer("")} className="rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-lg font-semibold text-slate-800">
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={startMic}
            disabled={!mic?.ok}
            aria-pressed={listening}
            className={`rounded-xl border-2 px-5 py-3 text-lg font-semibold ${listening ? "border-red-600 bg-red-50 text-red-800" : "border-slate-300 bg-white text-slate-800"} disabled:opacity-50`}
          >
            🎙️ {listening ? "Listening… tap to stop" : "Speak"}
          </button>
        </div>
        {(micNote || (mic && !mic.ok)) && <p className="text-sm text-slate-600">{micNote || mic?.reason}</p>}
      </form>
    );
  } else if (inp.kind === "single") {
    answerArea = (
      <div className={`grid gap-3 ${inp.options.length <= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {inp.options.map((o) => (
          <BigChoice key={o.id} tone={o.tone === "danger" ? "danger" : "default"} onClick={() => answer(o.id)}>
            {o.label}
          </BigChoice>
        ))}
      </div>
    );
  } else if (inp.kind === "multi") {
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
  } else if (inp.kind === "body") {
    answerArea = <BodyMap options={BODY_AREAS} onPick={(id) => answer(id)} />;
  }

  const safetyAnswers = chart.safety.filter((r) => r.provided && r.label !== "Danger signs at the start").map((r) => (r.value === "No" ? r.label : `${r.label}: ${r.value}`));
  const resultMeta = {
    relation: state.relation,
    sex: state.sex === "unspecified" ? undefined : state.sex,
    specialAsked: state.specialDone,
    concernText: state.concernText,
    medicines: state.medicines,
    allergies: state.allergies,
    conditions: state.conditions,
    location: BODY_AREAS.find((b) => b.id === state.bodyArea)?.label,
    safety: safetyAnswers,
  };

  const chartPanel = (
    <aside aria-label="Patient chart" className="h-fit rounded-2xl border border-slate-300 bg-white p-4 shadow-sm lg:sticky lg:top-4">
      <details open>
        <summary className="cursor-pointer text-base font-bold text-blue-950 lg:pointer-events-none lg:list-none">
          <span className="lg:sr-only">📋 Patient chart (tap to show or hide)</span>
        </summary>
        <div className="mt-3 lg:mt-0">
          <PatientChart chart={chart} />
        </div>
      </details>
    </aside>
  );

  // ---------------- URGENT takeover ----------------
  // Emergency Mode covers the whole screen: only the essential actions remain.
  if (inp.kind === "emergency") {
    return (
      <div ref={topRef} className="space-y-4">
        <JourneyBar current="Triage" />
        <EmergencyMode
          flags={inp.flags}
          notice={turn.say}
          onExit={() => {
            if (demo) resetDemo();
            else answer("exit");
          }}
          exitLabel={demo ? "End demo scenario — reset" : "This is not an emergency — go back"}
        />
      </div>
    );
  }

  return (
    <div ref={topRef} className="space-y-4">
      <JourneyBar current={journey} />
      {demoMode && <DemoPanel active={demo} onPlay={playDemo} onReset={resetDemo} />}
      {failed3d && <p role="status" className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">{failed3d}</p>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {stage}
          <section aria-labelledby="consult-question" className="space-y-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
            {log.length > 1 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-slate-700">Conversation so far ({log.length})</summary>
                <ol className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
                  {log.map((l, i) => (
                    <li key={i} className={l.who === "guide" ? "text-slate-700" : "text-right font-semibold text-blue-900"}>
                      <span className="sr-only">{l.who === "guide" ? "Guide: " : "You: "}</span>
                      {l.text}
                    </li>
                  ))}
                </ol>
              </details>
            )}
            <h2 id="consult-question" aria-live="polite" className={showHeading || !begun ? `${bigText ? "text-3xl" : "text-2xl"} font-bold text-blue-950` : "sr-only"}>
              {begun ? turn.say : `${room.greeting} consultation room`}
            </h2>
            {begun && turn.hint && <p className={`${textSize} text-slate-600`}>{turn.hint}</p>}
            {answerArea}
            {begun && turn.step.startsWith("q:") && (
              <p className="text-sm text-slate-600">
                Question {questionsFor(toAnswers(state).context).filter((q) => q.id in state.answers).length + 1} about this problem. Each answer is checked for warning signs before the next question.
              </p>
            )}
            {begun && history.length > 1 && !done && (
              <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                <button type="button" onClick={back} className="rounded-xl border-2 border-slate-300 px-4 py-2.5 font-semibold text-slate-800">
                  ← Back
                </button>
                <button type="button" onClick={restart} className="rounded-xl border-2 border-slate-300 px-4 py-2.5 font-semibold text-slate-800">
                  ↺ Start again
                </button>
              </div>
            )}
          </section>
          {controls}
          {privacy}
          {done && inp.kind === "result" && (
            <div className="space-y-5">
              <HandoffPanel level={inp.level} />
              <section aria-labelledby="visit-summary" className="space-y-3">
                <h2 id="visit-summary" className="text-2xl font-bold text-blue-950">📋 Patient-prepared visit summary</h2>
                <ResultView
                  answers={toAnswers(state)}
                  meta={resultMeta}
                  onRestart={restart}
                  onEmergency={(flags) => setHistory((h) => [...h, { ...state, emergency: { flags, clear: { kind: "text" } } }])}
                />
              </section>
            </div>
          )}
        </div>
        {chartPanel}
      </div>
    </div>
  );
}
