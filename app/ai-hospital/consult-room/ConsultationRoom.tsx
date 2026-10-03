"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ConsultState, type Turn, BODY_AREAS, UNCLEAR_LINE, chartOf, nextTurn, respond, respondText, startConsultation, toAnswers } from "../../lib/consultation";
import { DEMO_SCENARIOS, demoAnswer } from "../../lib/demoScenarios";
import type { Level } from "../../lib/safety/triage";
import { questionsFor } from "../../lib/safety/triage";
import EmergencyMode from "../components/EmergencyMode";
import ResultView from "../components/ResultView";
import { BigChoice } from "../components/ui";
import BodyMap from "./BodyMap";
import { type Tier, chooseTier, readDevice, stepDown } from "./capability";
import ConversationControls, { type MicStatus } from "./ConversationControls";
import DemoPanel from "./DemoPanel";
import { LipSync } from "./doctor/lipsync";
import { type DoctorState, STATE_LABEL } from "./doctor/state";
import Doctor2D from "./Doctor2D";
import HandoffPanel from "./HandoffPanel";
import { takePendingConcern } from "./handoff";
import JourneyBar, { type JourneyStep } from "./JourneyBar";
import PatientChart from "./PatientChart";
import type { ChartLine } from "./Room3D";
import type { RoomStyle } from "./rooms";
import { type SpeechOutput, VOICE_CONSENT_TEXT, browserSpeech, listen, voiceInputSetting } from "./voice";

// The 3D room is only downloaded once a consultation room is opened (or
// warmed up by preload.ts when the person points at a link to it).
const Doctor3D = dynamic(() => import("./Doctor3D"), { ssr: false, loading: () => <StageMessage text="Preparing the consultation room…" /> });

function StageMessage({ text }: { text: string }) {
  return <div className="grid h-full place-items-center bg-slate-100 text-lg font-semibold text-slate-700">{text}</div>;
}

// If 3D fails for any reason, show the 2D doctor. The consultation never depends on graphics.
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

type Display = "auto" | "high" | "medium" | "low" | "2d" | "text";
type Line = { who: "guide" | "patient"; text: string };
type Said = { text: string; state: DoctorState };

export const PRIVACY_LINE = "Your consultation information stays on this device unless you choose to share it.";

const NORMAL_RATE = 0.92;
const SLOW_RATE = 0.78;
const THINK_MS = 550; // a short, natural pause while an answer is checked
const MAX_WAIT_FOR_3D_MS = 8000; // never hold the consultation for graphics

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

// How the doctor delivers a result: concern for urgent care, calm reassurance
// for self-care, plain explanation otherwise. The level comes from the engine.
const resultState = (level: Level): DoctorState => (level === "RED" || level === "ORANGE" ? "concerned" : level === "GREEN" ? "reassuring" : "explaining");

// What the 3D chart monitor in the room shows: what the patient has said so far.
function chartLines(chart: ReturnType<typeof chartOf>): ChartLine[] {
  const rows = [...chart.reported, ...chart.safety, ...(chart.routing ?? [])].filter((r) => r.provided);
  return rows.map((r) => [r.label, r.value]);
}

export default function ConsultationRoom({ room }: { room: RoomStyle }) {
  const fresh = useCallback(() => startConsultation(room.greeting, room.intro, room.focus), [room]);
  const [history, setHistory] = useState<ConsultState[]>(() => [fresh()]);
  const state = history[history.length - 1];
  const turn = useMemo(() => nextTurn(state), [state]);
  const chart = useMemo(() => chartOf(state), [state]);
  const lines3d = useMemo(() => chartLines(chart), [chart]);

  // ---------------- The doctor's state (one state machine) ----------------
  const [begun, setBegun] = useState(false);
  const [started, setStarted] = useState(false); // the room is ready and the doctor has noticed the patient
  const [doc, setDocState] = useState<DoctorState>("idle");
  const docRef = useRef<DoctorState>("idle");
  const since = useRef(0);
  const setDoctor = useCallback((s: DoctorState) => {
    if (docRef.current !== s) since.current = performance.now() / 1000;
    docRef.current = s;
    setDocState(s);
  }, []);
  const lips = useRef<LipSync | null>(null);
  const [log, setLog] = useState<Line[]>([]);
  const [note, setNote] = useState("");

  // ---------------- Settings ----------------
  const [voiceOn, setVoiceOn] = useState(true);
  const voiceRef = useRef(true);
  const [slower, setSlower] = useState(false);
  const rateRef = useRef(NORMAL_RATE);
  const [subtitles, setSubtitles] = useState(true);
  const [bigText, setBigText] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [display, setDisplay] = useState<Display>("auto");
  const [detected, setDetected] = useState<Tier | null>(null);
  const [slowTier, setSlowTier] = useState<Tier | null>(null);
  const [failed3d, setFailed3d] = useState<string | null>(null);
  const [avatarReady, setAvatarReady] = useState(false);
  const [progress, setProgress] = useState(0);

  // ---------------- Answers and voice input ----------------
  const [text, setText] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState("");
  const [consented, setConsented] = useState(false); // in memory only; asked again next visit
  const [askConsent, setAskConsent] = useState(false);
  const [talk, setTalk] = useState<{ available: boolean; reason?: string }>({ available: false });
  const [demoMode, setDemoMode] = useState(false);
  const [demo, setDemo] = useState<string | null>(null);
  const [fromReception, setFromReception] = useState<string | null>(null);
  const speech = useRef<SpeechOutput | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]); // demo timers
  const sayTimers = useRef<ReturnType<typeof setTimeout>[]>([]); // speech sequence timers
  const stopMic = useRef<(() => void) | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const answerBox = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    speech.current = browserSpeech();
    lips.current = new LipSync();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- device checks after mount
    setDetected(chooseTier(readDevice()));
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setDemoMode(new URLSearchParams(window.location.search).has("demo"));
    setFromReception(takePendingConcern());
    // Only a cheap setting check here; the browser is not asked anything until Talk is pressed.
    const v = voiceInputSetting();
    setTalk(v.ok ? { available: true } : { available: false, reason: v.reason });
    const t = timers.current;
    const s = sayTimers.current;
    return () => {
      speech.current?.stop();
      stopMic.current?.();
      t.forEach(clearTimeout);
      s.forEach(clearTimeout);
    };
  }, []);

  // ---------------- Quality ----------------
  // Failures always step down: high → medium → low → 2D (→ text by choice).
  const tier: Tier | "none" | null =
    display === "text"
      ? "none"
      : failed3d || display === "2d"
        ? "fallback"
        : detected === null
          ? null
          : detected === "fallback"
            ? "fallback"
            : display === "auto"
              ? (slowTier ?? detected)
              : display;
  const is3d = tier === "high" || tier === "medium" || tier === "low";

  // ---------------- Speaking ----------------
  // A sequence of lines, each with the doctor's state while saying it; then
  // the state to rest in. Any new sequence, STOP, typing or Talk cancels it.
  const seq = useRef(0);
  const active = useRef<{ lines: Said[]; after: DoctorState; logged: number } | null>(null);
  const turnSpeech = useRef<{ lines: Said[]; after: DoctorState } | null>(null);

  const cancelSay = useCallback(() => {
    seq.current += 1;
    sayTimers.current.forEach(clearTimeout);
    sayTimers.current = [];
    speech.current?.stop();
    lips.current?.end();
  }, []);

  const speak = useCallback(
    (lines: Said[], after: DoctorState, opts: { delay?: number; quietFirst?: boolean } = {}) => {
      cancelSay();
      const run = seq.current;
      const a = { lines, after, logged: 0 };
      active.current = a;
      const wait = (fn: () => void, ms: number) => sayTimers.current.push(setTimeout(fn, ms));
      const step = (i: number) => {
        if (seq.current !== run) return;
        if (i >= lines.length) {
          active.current = null;
          setSpeaking(false);
          setDoctor(after);
          return;
        }
        const l = lines[i];
        setDoctor(l.state);
        if (!(opts.quietFirst && i === 0)) setLog((g) => [...g, { who: "guide", text: l.text }]);
        a.logged = i + 1;
        const rate = rateRef.current;
        if (voiceRef.current && speech.current?.available) {
          setSpeaking(true);
          // Some phones never report the end of speech: never wait forever.
          let finished = false;
          const finish = () => {
            if (finished || seq.current !== run) return;
            finished = true;
            lips.current?.end();
            step(i + 1);
          };
          wait(finish, Math.max(4000, (l.text.length * 110 * NORMAL_RATE) / rate));
          speech.current.speak(
            l.text,
            {
              onStart: () => lips.current?.begin(l.text, performance.now() / 1000, rate / NORMAL_RATE),
              onWord: (ci) => lips.current?.word(ci, performance.now() / 1000),
              onEnd: finish,
            },
            rate,
          );
        } else {
          // Muted: the doctor "speaks" through subtitles; lips stay still.
          setSpeaking(false);
          wait(() => step(i + 1), Math.min(5000, 700 + l.text.length * 32));
        }
      };
      if (opts.delay) wait(() => step(0), opts.delay);
      else step(0);
    },
    [setDoctor, cancelSay],
  );

  // Stops the doctor mid-sentence. Anything not yet said is still written
  // down, so nothing the patient needs is lost.
  const stopSpeaking = useCallback(() => {
    const a = active.current;
    cancelSay();
    active.current = null;
    setSpeaking(false);
    if (!a) return;
    const rest = a.lines.slice(a.logged);
    if (rest.length) setLog((g) => [...g, ...rest.map((l) => ({ who: "guide" as const, text: l.text }))]);
    setDoctor(a.after);
  }, [setDoctor, cancelSay]);

  // ---------------- Starting: the waiting-room transition ----------------
  useEffect(() => {
    if (!begun || started) return;
    const t = setTimeout(() => setStarted(true), !is3d ? 0 : avatarReady ? 400 : MAX_WAIT_FOR_3D_MS);
    return () => clearTimeout(t);
  }, [begun, started, is3d, avatarReady]);

  // ---------------- The doctor responds to each new turn ----------------
  const lastKey = useRef("");
  useEffect(() => {
    if (!started) return;
    const key = `${history.length}:${turn.step}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    /* eslint-disable react-hooks/set-state-in-effect -- the doctor reacts to each new engine turn (once per turn, guarded by lastKey) */
    setNote("");
    if (turn.input.kind === "emergency") {
      // EMERGENCY: everything else stops; the line is said at once, no pause.
      clearTimers();
      stopMic.current?.();
      const s = { lines: [{ text: turn.say, state: "emergency" as const }], after: "emergency" as const };
      turnSpeech.current = s;
      speak(s.lines, s.after);
      topRef.current?.scrollIntoView({ block: "start" });
    } else if (turn.input.kind === "result") {
      const s = { lines: [{ text: turn.say, state: resultState(turn.input.level) }, ...(turn.then ? [{ text: turn.then, state: "handoff" as const }] : [])], after: "complete" as const };
      turnSpeech.current = s;
      setDoctor("processing");
      speak(s.lines, s.after, { delay: THINK_MS });
    } else if (turn.step === "concern" && history.length === 1) {
      // The doctor notices the patient (a glance up from the chart), then speaks.
      const s = { lines: [{ text: turn.say, state: "greeting" as const }], after: "listening" as const };
      turnSpeech.current = s;
      setDoctor("greeting");
      speak(s.lines, s.after, { delay: reducedMotion ? 0 : 700 });
    } else {
      const s = { lines: [{ text: turn.say, state: "asking" as const }], after: "listening" as const };
      turnSpeech.current = s;
      setDoctor("processing");
      speak(s.lines, s.after, { delay: THINK_MS });
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [started, turn, history.length, speak, setDoctor, clearTimers, reducedMotion]);

  const commit = useCallback(
    (next: ConsultState, said: string) => {
      stopMic.current?.();
      setLog((g) => [...g, { who: "patient", text: said }]);
      setText("");
      setMulti([]);
      setMicNote("");
      setHistory((h) => [...h, next]);
    },
    [],
  );

  // A button answer.
  const answer = useCallback(
    (value: string | string[]) => {
      const next = respond(state, turn.step, value);
      if (next === state) return;
      commit(next, answerLabel(turn, value));
    },
    [state, turn, commit],
  );

  // Typed or spoken words. Safety checks run first inside respondText.
  const sendWords = (words: string) => {
    const w = words.trim();
    if (!w) return;
    stopSpeaking();
    const r = respondText(state, turn, w);
    if (r.understood || r.state !== state) {
      commit(r.state, w);
      return;
    }
    setLog((g) => [...g, { who: "patient", text: w }]);
    setText("");
    setNote(UNCLEAR_LINE);
    speak([{ text: UNCLEAR_LINE, state: "asking" }], "listening");
  };

  // Words typed at Reception are sent as the first answer, once, after the greeting.
  useEffect(() => {
    if (!fromReception || !started || demo || turn.step !== "concern" || doc !== "listening") return;
    const t = setTimeout(() => {
      answer(fromReception);
      setFromReception(null);
    }, 600);
    return () => clearTimeout(t);
  }, [fromReception, started, demo, turn.step, doc, answer]);

  const back = () => {
    stopSpeaking();
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  };
  const restart = useCallback(() => {
    clearTimers();
    cancelSay();
    active.current = null;
    stopMic.current?.();
    setSpeaking(false);
    lastKey.current = "";
    setLog([]);
    setText("");
    setNote("");
    setHistory([fresh()]);
    setDoctor("idle");
  }, [fresh, setDoctor, clearTimers, cancelSay]);

  // ---------------- Demonstration mode (the real engine, scripted answers) ----------------
  useEffect(() => {
    if (!demo || paused || !started) return;
    const sc = DEMO_SCENARIOS.find((s) => s.id === demo);
    if (!sc || turn.input.kind === "result" || turn.input.kind === "emergency" || doc !== "listening") return;
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
  }, [demo, paused, started, doc, turn, state, answer, later, clearTimers]);

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
      const now = performance.now() / 1000;
      if (p) {
        speech.current?.resume();
        lips.current?.resume(now);
      } else {
        speech.current?.pause();
        lips.current?.pause(now);
      }
      return !p;
    });
  };
  const toggleVoice = () => {
    if (voiceOn) stopSpeaking();
    voiceRef.current = !voiceOn;
    setVoiceOn((v) => !v);
  };
  const repeat = () => {
    const s = turnSpeech.current;
    if (s) speak(s.lines, s.after);
  };
  const toggleSlower = () => {
    const next = !slower;
    setSlower(next);
    rateRef.current = next ? SLOW_RATE : NORMAL_RATE;
    // Say the current sentence again at the new pace.
    const a = active.current;
    if (a && speaking) speak(a.lines.slice(Math.max(0, a.logged - 1)), a.after, { quietFirst: true });
  };
  const typeInstead = () => {
    stopSpeaking();
    stopMic.current?.();
    answerBox.current?.focus();
  };
  const startListening = async () => {
    stopSpeaking();
    setDoctor("listening");
    setMicNote("");
    setListening(true);
    stopMic.current = await listen({
      onText: (t) => setText(t),
      onEnd: () => {
        setListening(false);
        stopMic.current = null;
        setMicNote("Check the words, then press Send. You can correct them first.");
      },
      onError: (m) => {
        setListening(false);
        stopMic.current = null;
        setMicNote(m);
      },
    });
  };
  const onTalk = () => {
    if (listening) {
      stopMic.current?.();
      return;
    }
    const v = voiceInputSetting();
    if (!v.ok) {
      setMicNote(v.reason);
      return;
    }
    if (v.needsConsent && !consented) {
      stopSpeaking();
      setAskConsent(true);
      return;
    }
    void startListening();
  };
  // Typing interrupts the doctor: she stops and listens.
  const onTyping = (value: string) => {
    if (active.current) stopSpeaking();
    setText(value);
  };

  // ---------------- Layout ----------------
  const inp = turn.input;
  const emergency = inp.kind === "emergency";
  const done = inp.kind === "result";
  const canAnswer = started && !emergency && !done;
  const journey: JourneyStep = !begun || turn.step === "concern" ? "Consultation" : emergency ? "Triage" : done ? (doc === "complete" ? "Real doctor" : "Visit summary") : "Questions";
  const subtitleText = log.filter((l) => l.who === "guide").at(-1)?.text ?? "";
  const showHeading = tier === "none" || !subtitles || emergency;
  const textSize = bigText ? "text-xl" : "text-lg";
  const status: MicStatus = listening ? "listening" : speaking ? "speaking" : doc === "processing" ? "processing" : "ready";
  const preparing = begun && !started && is3d;
  const pct = Math.round(progress * 100);

  const doctor2d = <Doctor2D state={docRef} since={since} lips={lips} reducedMotion={reducedMotion} paused={paused} room={room} />;
  const caption =
    begun && subtitles && subtitleText && !emergency ? (
      <p aria-hidden className={`bg-slate-900 px-4 py-3 text-center font-semibold leading-snug text-white ${bigText ? "text-xl" : "text-base sm:text-lg"}`}>
        {subtitleText}
      </p>
    ) : null;

  const stage =
    tier === "none" ? null : (
      <div className="overflow-hidden rounded-2xl border border-slate-300 shadow-sm">
        <div className={`relative overflow-hidden bg-slate-100 ${emergency ? "aspect-[4/3] max-h-64 w-full lg:max-h-none" : "aspect-[3/4] max-h-[62vh] w-full sm:aspect-[16/10] lg:aspect-[16/9]"}`}>
          <div className="h-full w-full" role="img" aria-label={`Virtual health guide in the ${room.greeting} consultation room. ${STATE_LABEL[doc]}.`}>
            {tier === null ? (
              <StageMessage text="Preparing the consultation room…" />
            ) : tier === "fallback" ? (
              doctor2d
            ) : (
              <StageBoundary onFail={() => setFailed3d("3D could not start on this device. Showing the simple picture.")} fallback={doctor2d}>
                <Doctor3D
                  key={tier}
                  state={docRef}
                  since={since}
                  lips={lips}
                  reducedMotion={reducedMotion}
                  paused={paused}
                  tier={tier}
                  room={room}
                  attire={room.attire}
                  chart={lines3d}
                  onProgress={setProgress}
                  onAvatarReady={() => setAvatarReady(true)}
                  onAvatarError={() => setFailed3d("The 3D doctor could not load. Showing the simple picture instead.")}
                  onSlow={() => {
                    const next = stepDown(tier);
                    if (next === "fallback") setFailed3d("3D was running slowly on this device. Showing the simple picture.");
                    else {
                      setAvatarReady(false);
                      setSlowTier(next);
                    }
                  }}
                />
              </StageBoundary>
            )}
          </div>
          <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${emergency ? "bg-red-700 text-white" : "bg-white/90 text-slate-800"}`}>
              <span aria-hidden className={`mr-1.5 inline-block h-2 w-2 rounded-full ${emergency ? "bg-white" : doc === "listening" ? "bg-green-600" : "bg-blue-700"}`} />
              {STATE_LABEL[doc]}
            </span>
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white">Virtual guide · not a doctor</span>
          </div>
          {preparing && (
            <div className="absolute inset-0 grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl bg-white p-4 text-center shadow-xl">
                <p className="text-lg font-bold text-blue-950">Preparing your consultation…</p>
                <p className="mt-1 text-sm text-slate-700">{avatarReady ? "The doctor is ready." : progress < 0.02 ? "Preparing room…" : `Loading doctor… ${pct}%`}</p>
                <div role="progressbar" aria-label="Preparing your consultation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={avatarReady ? 100 : pct} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-blue-800 transition-[width] duration-300" style={{ width: `${avatarReady ? 100 : Math.max(4, pct)}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-600">You can type your answers as soon as the doctor speaks.</p>
              </div>
            </div>
          )}
          {!begun && (
            <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-slate-900/60 to-transparent p-3 pt-10">
              <div className="w-full max-w-md rounded-2xl bg-white/95 p-3 text-center shadow-xl sm:p-4">
                <p className="text-base font-bold text-blue-950 sm:text-lg">{room.greeting} consultation room</p>
                <p className="mt-1 hidden text-sm text-slate-700 sm:block">A virtual health guide helps you find the safest next step. It is not a doctor and cannot diagnose.</p>
                <button type="button" onClick={() => setBegun(true)} className="mt-2 w-full rounded-xl bg-blue-900 px-5 py-2.5 text-lg font-bold text-white hover:bg-blue-800 sm:mt-3 sm:py-3">
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
      <span>
        {PRIVACY_LINE} Camera and location are never used.{" "}
        {listening
          ? "The microphone is on now — your browser's speech service is turning your words into text."
          : consented
            ? "When you press Talk, your browser's speech service turns your words into text; AI Hospital does not keep the audio."
            : "The microphone is only used if you press Talk."}
      </span>
    </p>
  );

  const consent = askConsent ? (
    <div role="dialog" aria-modal="false" aria-labelledby="consent-title" className="space-y-3 rounded-2xl border-2 border-blue-900 bg-blue-50 p-4">
      <h2 id="consent-title" className="text-lg font-bold text-blue-950">Speak your answers?</h2>
      <p className="text-slate-800">{VOICE_CONSENT_TEXT}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setConsented(true);
            setAskConsent(false);
            void startListening();
          }}
          className="min-h-12 rounded-xl bg-blue-900 px-5 py-2 text-base font-bold text-white"
        >
          I agree — start listening
        </button>
        <button
          type="button"
          onClick={() => {
            setAskConsent(false);
            answerBox.current?.focus();
          }}
          className="min-h-12 rounded-xl border-2 border-slate-300 bg-white px-5 py-2 text-base font-semibold text-slate-800"
        >
          No, I&apos;ll type
        </button>
      </div>
    </div>
  ) : null;

  const conversationControls = begun ? (
    <ConversationControls
      status={status}
      talk={{ available: talk.available, listening, reason: talk.reason }}
      canAnswer={canAnswer}
      speaking={speaking}
      slower={slower}
      onTalk={onTalk}
      onType={typeInstead}
      onRepeat={repeat}
      onStop={stopSpeaking}
      onSlower={toggleSlower}
    />
  ) : null;

  const settings = (
    <details className="rounded-2xl border border-slate-200 bg-white p-3 text-sm" open>
      <summary className="cursor-pointer font-semibold text-slate-800">Display and sound</summary>
      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Consultation settings">
        <Toggle on={voiceOn} onClick={toggleVoice}>{voiceOn ? "🔊 Voice on" : "🔇 Muted"}</Toggle>
        <Toggle on={paused} onClick={togglePause}>{paused ? "▶ Resume" : "⏸ Pause"}</Toggle>
        <Toggle on={subtitles} onClick={() => setSubtitles((s) => !s)}>💬 Subtitles</Toggle>
        <Toggle on={bigText} onClick={() => setBigText((s) => !s)}>A+ Larger text</Toggle>
        <Toggle on={reducedMotion} onClick={() => setReducedMotion((s) => !s)}>Reduce motion</Toggle>
        <label className="flex items-center gap-2 font-semibold text-slate-800">
          Display
          <select
            value={display}
            onChange={(e) => {
              setFailed3d(null);
              setSlowTier(null);
              setAvatarReady(false);
              setDisplay(e.target.value as Display);
            }}
            className="min-h-11 rounded-lg border-2 border-slate-300 bg-white px-2 py-2"
          >
            <option value="auto">Automatic</option>
            <option value="high">High quality 3D</option>
            <option value="medium">Balanced 3D</option>
            <option value="low">Light 3D</option>
            <option value="2d">Low data (2D)</option>
            <option value="text">Text only</option>
          </select>
        </label>
      </div>
    </details>
  );

  // ---------------- Patient answer area ----------------
  const kind: "main" | "other" = inp.kind === "text" ? "main" : "other";
  const wordsForm = (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) sendWords(text);
        else if (inp.kind === "text" && inp.optional) answer("");
      }}
    >
      <label htmlFor="consult-text" className={kind === "main" ? "sr-only" : "block text-base font-semibold text-slate-800"}>
        {kind === "main" ? "Your answer" : "Or answer in your own words"}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        {kind === "main" ? (
          <textarea
            id="consult-text"
            ref={answerBox}
            value={text}
            maxLength={inp.kind === "text" ? inp.maxLength : 300}
            rows={2}
            onChange={(e) => onTyping(e.target.value)}
            placeholder={inp.kind === "text" ? inp.placeholder : undefined}
            className={`w-full rounded-xl border-2 border-slate-300 px-4 py-3 ${textSize} focus:border-blue-700`}
          />
        ) : (
          <input
            id="consult-text"
            ref={answerBox}
            value={text}
            maxLength={300}
            onChange={(e) => onTyping(e.target.value)}
            placeholder="Type or press Talk"
            className={`w-full rounded-xl border-2 border-slate-300 px-4 py-2.5 ${textSize} focus:border-blue-700`}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!text.trim()} className="min-h-12 rounded-xl bg-blue-900 px-6 py-2.5 text-lg font-bold text-white hover:bg-blue-800 disabled:opacity-40">
          Send
        </button>
        {inp.kind === "text" && inp.optional && (
          <button type="button" onClick={() => answer("")} className="min-h-12 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-lg font-semibold text-slate-800">
            Skip
          </button>
        )}
      </div>
      {micNote && <p role="status" className="text-sm text-slate-700">{micNote}</p>}
    </form>
  );

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
  } else if (!started) {
    answerArea = <p className="text-lg text-slate-700">The doctor will be with you in a moment…</p>;
  } else if (inp.kind === "text") {
    answerArea = wordsForm;
  } else if (inp.kind === "single") {
    answerArea = (
      <div className="space-y-4">
        <div className={`grid gap-3 ${inp.options.length <= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {inp.options.map((o) => (
            <BigChoice key={o.id} tone={o.tone === "danger" ? "danger" : "default"} onClick={() => answer(o.id)}>
              {o.label}
            </BigChoice>
          ))}
        </div>
        {wordsForm}
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
        {wordsForm}
      </div>
    );
  } else if (inp.kind === "body") {
    answerArea = (
      <div className="space-y-4">
        <BodyMap options={BODY_AREAS} onPick={(id) => answer(id)} />
        {wordsForm}
      </div>
    );
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

  // One layout for every state, so the doctor is never reloaded. During an
  // emergency the emergency guidance comes first (left, or top on a phone)
  // and the concerned doctor stays visible beside it.
  return (
    <div ref={topRef} className="space-y-4">
      <JourneyBar current={journey} />
      {demoMode && !emergency && <DemoPanel active={demo} onPlay={playDemo} onReset={resetDemo} />}
      {fromReception && !emergency && (
        <p className="rounded-xl bg-blue-50 px-4 py-2 text-blue-950">
          From Reception: <q>{fromReception}</q> — this will be your first answer.
        </p>
      )}
      {failed3d && <p role="status" className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">{failed3d}</p>}
      <div className={emergency ? "" : "grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"}>
        <div className={emergency ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start" : "space-y-4"}>
          {emergency && (
            <EmergencyMode
              inline
              flags={inp.flags}
              notice={turn.say}
              onExit={() => {
                if (demo) resetDemo();
                else answer("exit");
              }}
              exitLabel={demo ? "End demo scenario — reset" : "This is not an emergency — go back"}
            />
          )}
          <div className={emergency ? "space-y-3 lg:sticky lg:top-4" : "space-y-4"}>
            {stage}
            {conversationControls}
          </div>
          {!emergency && (
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
              <h2 id="consult-question" aria-live="polite" className={showHeading || !started ? `${bigText ? "text-3xl" : "text-2xl"} font-bold text-blue-950` : "sr-only"}>
                {started ? turn.say : `${room.greeting} consultation room`}
              </h2>
              {note && (
                <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-950">
                  {note}
                </p>
              )}
              {started && turn.hint && <p className={`${textSize} text-slate-600`}>{turn.hint}</p>}
              {consent}
              {answerArea}
              {started && turn.step.startsWith("q:") && (
                <p className="text-sm text-slate-600">
                  Question {questionsFor(toAnswers(state).context).filter((q) => q.id in state.answers).length + 1} about this problem. Each answer is checked for warning signs before the next question.
                </p>
              )}
              {started && history.length > 1 && !done && (
                <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                  <button type="button" onClick={back} className="min-h-11 rounded-xl border-2 border-slate-300 px-4 py-2.5 font-semibold text-slate-800">
                    ← Back
                  </button>
                  <button type="button" onClick={restart} className="min-h-11 rounded-xl border-2 border-slate-300 px-4 py-2.5 font-semibold text-slate-800">
                    ↺ Start again
                  </button>
                </div>
              )}
            </section>
          )}
          {!emergency && settings}
          {!emergency && privacy}
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
        {!emergency && chartPanel}
      </div>
    </div>
  );
}
