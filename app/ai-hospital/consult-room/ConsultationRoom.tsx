"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ConsultState, type Turn, BODY_AREAS, chartOf, converse, explainLine, nextTurn, respond, startConsultation, startHelpDescribe, toAnswers, whyLine } from "../../lib/consultation";
import { termsIn } from "../../lib/knowledge/glossary";
import type { EducationAnswer } from "../../lib/education";
import { hasConsent, loadPassport } from "../../lib/storage";
import { DEMO_SCENARIOS, demoAnswer } from "../../lib/demoScenarios";
import { questionsFor } from "../../lib/safety/triage";
import EmergencyMode from "../components/EmergencyMode";
import ResultView, { type SummaryExtra } from "../components/ResultView";
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
import { planReply, planTurn } from "./doctor/director";
import { reportFailure, track } from "../../lib/telemetry";
import JourneyBar, { type JourneyStep } from "./JourneyBar";
import PatientChart from "./PatientChart";
import type { ChartLine } from "./Room3D";
import type { RoomStyle } from "./rooms";
import { type SpeechOutput, VOICE_CONSENT_TEXT, browserSpeech, listen, needsSpeechConfirmation, voiceInputSetting } from "./voice";

// The 3D room is only downloaded once a consultation room is opened (or
// warmed up by preload.ts when the person points at a link to it).
const Doctor3D = dynamic(() => import("./Doctor3D"), { ssr: false, loading: () => <StageMessage text="Preparing the consultation room…" /> });
// Loaded only on request: clinical review mode (?review), and the developer
// debug panel (?debug, development builds only — never shipped to patients).
const ReviewPanel = dynamic(() => import("./ReviewPanel"), { ssr: false });
const DebugPanel = process.env.NODE_ENV === "development" ? dynamic(() => import("./DebugPanel"), { ssr: false }) : null;

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

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g) ?? [text]).map((x) => x.trim()).filter(Boolean);
}
const sentencePause = (rate: number) => Math.round(260 / rate);
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

// Steps where the patient is still describing the problem.
const SYMPTOM_STEPS = new Set(["concern", "concern-more", "complaint", "describe", "body", "side", "simple-pain"]);

const UNSURE_LABEL: Record<string, string> = { "?unsure": "I'm not sure", "?forgot": "I don't remember", "?describe": "I can't describe it" };

function answerLabel(t: Turn, value: string | string[]): string {
  const v = Array.isArray(value) ? value : [value];
  const one = v[0] ?? "";
  if (UNSURE_LABEL[one]) return UNSURE_LABEL[one];
  if (one.startsWith("pain:")) return `Pain ${one.slice(5)} out of 10`;
  if (one.startsWith("temp:")) return one.slice(5);
  if (one.startsWith("words:") && (t.input.kind === "single" || t.input.kind === "body")) return t.input.options.find((o) => o.id === one)?.label ?? one.slice(6);
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

// What the 3D chart monitor in the room shows: what the patient has said so far.
function chartLines(chart: ReturnType<typeof chartOf>): ChartLine[] {
  const rows = [...chart.reported, ...chart.safety, ...(chart.routing ?? [])].filter((r) => r.provided);
  return rows.map((r) => [r.label, r.value]);
}

// What the doctor learned in conversation, for the real doctor's summary.
const UNKNOWN_LABEL: Record<string, string> = {
  duration: "When it started",
  progression: "How it has changed",
  severity: "How bad it is",
  medicines: "Current medicines",
  allergies: "Allergies",
  conditions: "Long-term conditions",
  body: "Where it is",
  side: "Which side",
  describe: "How it feels",
  simplePain: "Whether there is pain",
  pattern: "Whether it comes and goes",
  modifiers: "What makes it better or worse",
  special: "Pregnancy / immune status",
  complaint: "Main problem",
  "c:temp": "Temperature",
};
function summaryExtra(s: ConsultState): SummaryExtra {
  const notes = [
    ...Object.entries(s.unknown).map(([k, v]) => `${UNKNOWN_LABEL[k] ?? k}: ${v.toLowerCase()}`),
    ...s.corrections.map((c) => `Corrected by the patient: ${c}`),
    ...(s.otherConcerns.length ? [`Also mentioned (not assessed in this consultation — please ask): ${s.otherConcerns.join("; ")}`] : []),
    ...(s.temperature && s.complaint !== "fever" ? [`Temperature measured by the patient: ${s.temperature}`] : []),
    ...(s.style.distressed && (!s.medicinesDone || !s.allergiesDone || !s.conditionsDone)
      ? ["Medicines, allergies and long-term conditions were not asked, to keep the consultation short — please ask."]
      : []),
  ];
  return {
    feels: s.description,
    pattern: s.pattern === "constant" ? "All the time" : s.pattern === "comes-and-goes" ? "Comes and goes" : undefined,
    triggers: s.modifiers,
    painScore: s.painScore,
    temperature: s.temperature,
    notes,
    questions: s.doctorQuestions,
  };
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
  // The voice could not play: carry on in captions, say so once.
  const [voiceIssue, setVoiceIssue] = useState(false);
  const voiceFailed = useCallback(() => {
    setVoiceIssue((was) => {
      if (!was) reportFailure("voice-output");
      return true;
    });
  }, []);
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
  const [reviewMode, setReviewMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const demoAsked = useRef(false);
  const demoHoldUntil = useRef(0);
  const counted = useRef({ started: false, ended: false, view: false }); // pilot counts, once per consultation
  const sendWordsRef = useRef<(w: string) => void>(() => {});
  const [fromReception, setFromReception] = useState<string | null>(null);
  const [startDescribe, setStartDescribe] = useState(false); // "I can't explain it" from Reception
  const [education, setEducation] = useState<EducationAnswer | null>(null);
  const [wantsProfessional, setWantsProfessional] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false); // chart bottom sheet (phones/tablets)
  const [heard, setHeard] = useState<string | null>(null); // uncertain speech awaiting confirmation
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [tempValue, setTempValue] = useState("");
  // From the Health Passport — only when the patient has turned saving on.
  const [saved, setSaved] = useState<{ medicines?: string; allergies?: string; conditions?: string }>({});
  const lastSaid = useRef("");
  const activity = useRef(0); // when the patient last typed or spoke (drives listening behaviour)
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
    // Address options carry no health information: demo mode, a starting
    // display (text / simple picture) and "help me describe it".
    const q = new URLSearchParams(window.location.search);
    setDemoMode(q.has("demo"));
    if (q.get("view") === "text") setDisplay("text");
    else if (q.get("view") === "simple") setDisplay("2d");
    setStartDescribe(q.get("start") === "describe");
    setReviewMode(q.has("review"));
    setDebugMode(q.has("debug") && process.env.NODE_ENV === "development");
    setFromReception(takePendingConcern());
    if (hasConsent()) {
      const p = loadPassport();
      if (p) setSaved({ medicines: p.medicines.trim() || undefined, allergies: p.allergies.trim() || undefined, conditions: p.conditions.trim() || undefined });
    }
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
          // Sentence by sentence, with a short natural pause between them —
          // easier to follow, and the doctor can be stopped between sentences.
          const sentences = splitSentences(l.text);
          const say = (j: number) => {
            if (seq.current !== run) return;
            if (j >= sentences.length) {
              lips.current?.end();
              step(i + 1);
              return;
            }
            const text = sentences[j];
            // Some phones never report the end of speech: never wait forever.
            let finished = false;
            const finish = () => {
              if (finished || seq.current !== run) return;
              finished = true;
              lips.current?.end();
              wait(() => say(j + 1), j + 1 < sentences.length ? sentencePause(rate) : 0);
            };
            wait(finish, Math.max(3000, (text.length * 110 * NORMAL_RATE) / rate));
            speech.current!.speak(
              text,
              {
                onStart: () => lips.current?.begin(text, performance.now() / 1000, rate / NORMAL_RATE),
                onWord: (ci) => lips.current?.word(ci, performance.now() / 1000),
                onEnd: finish,
                onFail: voiceFailed,
              },
              rate,
            );
          };
          say(0);
        } else {
          // Muted: the doctor "speaks" through subtitles; lips stay still.
          setSpeaking(false);
          wait(() => step(i + 1), Math.min(5000, 700 + l.text.length * 32));
        }
      };
      if (opts.delay) wait(() => step(0), opts.delay);
      else step(0);
    },
    [setDoctor, cancelSay, voiceFailed],
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

  // Before the consultation: INITIALIZING while the room loads (the doctor is
  // finishing notes at the chart), then IDLE, waiting for the patient.
  useEffect(() => {
    if (started) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the doctor's state follows loading progress
    setDoctor(begun || (is3d && !avatarReady) ? "initializing" : "idle");
  }, [started, begun, is3d, avatarReady, setDoctor]);

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
    setNote("");
    // What the doctor does is decided in one place (doctor/director.ts).
    const plan = planTurn(turn, { first: turn.step === "concern" && history.length === 1, lastSaid: lastSaid.current, reducedMotion });
    if (plan.interrupt) {
      // EMERGENCY: everything else stops; the line is said at once, no pause.
      clearTimers();
      stopMic.current?.();
    }
    turnSpeech.current = { lines: plan.lines, after: plan.after };
    if (plan.before) setDoctor(plan.before);
    speak(plan.lines, plan.after, plan.delayMs ? { delay: plan.delayMs } : {});
    if (plan.scrollTop) topRef.current?.scrollIntoView({ block: "start" });
  }, [started, turn, history.length, speak, setDoctor, clearTimers, reducedMotion]);

  const commit = useCallback(
    (next: ConsultState, said: string) => {
      stopMic.current?.();
      setLog((g) => [...g, { who: "patient", text: said }]);
      lastSaid.current = said;
      setText("");
      setMulti([]);
      setMicNote("");
      setEducation(null);
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

  // The doctor replies without moving the consultation on (an explanation,
  // a reason, education, or "could you say that another way?").
  // Listening → a short thinking pause → clarifying: calm and attentive,
  // never "concerned" just because something was hard to understand.
  const reply = (lines: Said[], noteText?: string) => {
    setNote(noteText ?? "");
    setDoctor("processing");
    speak(lines, "listening", { delay: reducedMotion ? 250 : 650 });
  };
  // Keeps style/memory changes without adding a step to go "Back" to.
  const replaceState = (next: ConsultState) => setHistory((h) => (next === h[h.length - 1] ? h : [...h.slice(0, -1), next]));

  const explainNow = () => {
    stopSpeaking();
    replaceState({ ...state, style: { ...state.style, explained: state.style.explained + 1 } });
    const line = explainLine(turn, state);
    reply([{ text: line, state: "clarifying" }], line);
  };
  const meaningNow = (term: string, meaning: string) => {
    stopSpeaking();
    const line = `“${term.charAt(0).toUpperCase()}${term.slice(1)}” means ${meaning}.`;
    reply([{ text: line, state: "clarifying" }], line);
  };
  const helpMeDescribe = () => {
    stopSpeaking();
    const next = startHelpDescribe(state);
    if (next !== state) {
      track({ type: "clarification", kind: "help-describe" });
      commit(next, "Help me describe it");
    }
  };
  const whyNow = () => {
    stopSpeaking();
    const line = whyLine(turn);
    reply([{ text: line, state: "clarifying" }], line);
  };

  // Typed or spoken words. Safety checks run first inside converse().
  const sendWords = (words: string) => {
    const w = words.trim();
    if (!w) return;
    stopSpeaking();
    const o = converse(state, turn, w);
    if (o.kind === "answered") {
      if (o.state !== state) commit(o.state, w);
      return;
    }
    setLog((g) => [...g, { who: "patient", text: w }]);
    setText("");
    if (o.kind === "repeat") return repeat();
    // Side effects of each kind of reply; the words come from the director.
    if (o.kind === "explain") track({ type: "clarification", kind: "question-explained" });
    if (o.kind === "term") track({ type: "clarification", kind: "word-explained" });
    if (o.kind === "unclear") track({ type: "clarification", kind: "unclear" });
    if (o.kind === "control") setSlowerTo(o.action === "slower");
    if (o.kind === "professional") setWantsProfessional(true);
    if (o.kind === "education") setEducation(o.answer);
    if ("state" in o) replaceState(o.state);
    const plan = planReply(o, turn, "state" in o ? nextTurn(o.state) : turn);
    reply(plan.lines, o.kind === "education" ? "" : o.line);
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

  // "I can't explain it" at Reception: the doctor starts by helping describe it.
  useEffect(() => {
    if (!startDescribe || !started || demo || fromReception || turn.step !== "concern" || doc !== "listening") return;
    const t = setTimeout(() => {
      setStartDescribe(false);
      helpMeDescribe();
    }, 600);
    return () => clearTimeout(t);
  }, [startDescribe, started, demo, fromReception, turn.step, doc]); // eslint-disable-line react-hooks/exhaustive-deps -- helpMeDescribe reads the current state

  const back = () => {
    stopSpeaking();
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  };
  const restart = useCallback(() => {
    clearTimers();
    counted.current = { started: false, ended: false, view: true };
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
    // A scripted health question, typed part-way through (scenario 7).
    if (sc.asks && turn.step === sc.asks.at && !demoAsked.current) {
      const q = sc.asks.question;
      let i = 0;
      const typeQ = () => {
        i += 2;
        setText(q.slice(0, i));
        if (i < q.length) later(typeQ, 28);
        else
          later(() => {
            // Marked only when sent: if this effect re-runs mid-typing, it types again.
            demoAsked.current = true;
            demoHoldUntil.current = Date.now() + 5000; // let the audience read the answer
            sendWordsRef.current(q);
          }, 450);
      };
      later(typeQ, 700);
      return clearTimers;
    }
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
      later(() => answer(value), Math.max(900, demoHoldUntil.current - Date.now()));
    }
    return clearTimers;
  }, [demo, paused, started, doc, turn, state, answer, later, clearTimers]);

  const playDemo = (id: string) => {
    restart();
    demoAsked.current = false;
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
  const setSlowerTo = (next: boolean) => {
    setSlower(next);
    rateRef.current = next ? SLOW_RATE : NORMAL_RATE;
  };
  // The demo types its question through the same path as a patient.
  useEffect(() => {
    sendWordsRef.current = sendWords;
  });

  const toggleSlower = () => {
    const next = !slower;
    setSlowerTo(next);
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
    let heardText = "";
    let heardConfidence: number | undefined;
    stopMic.current = await listen({
      onText: (t, final, confidence) => {
        activity.current = performance.now() / 1000;
        setText(t);
        heardText = t;
        if (final) heardConfidence = confidence;
      },
      onEnd: () => {
        setListening(false);
        stopMic.current = null;
        // Uncertain recognition is never used silently: the patient confirms it.
        if (needsSpeechConfirmation(heardText, heardConfidence)) {
          setHeard(heardText);
          setMicNote("");
        } else setMicNote(heardText ? "Check the words, then press Send. You can correct them first." : "");
      },
      onError: (m) => {
        reportFailure("voice-input");
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
  // Typing interrupts the doctor: she stops and listens (and nods along).
  const onTyping = (value: string) => {
    activity.current = performance.now() / 1000;
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

  // ---------------- Pilot counts (category codes only; off unless configured) ----------------
  const view = tier === "none" ? "text" : tier === "fallback" ? "2d" : "3d";
  useEffect(() => {
    if (!started || counted.current.started) return;
    counted.current.started = true;
    track({ type: "consult_started", view, entry: demo ? "demo" : fromReception ? "typed" : startDescribe ? "describe" : "direct" });
  }, [started, view, demo, fromReception, startDescribe, turn.step]); // turn.step: counts a restarted consultation too
  useEffect(() => {
    if (tier === null || counted.current.view) return;
    counted.current.view = true;
    const saveData = detected === "fallback" && display === "auto";
    track({ type: "display_used", view, reason: failed3d ? "fallback" : display !== "auto" ? "chosen" : saveData ? "save-data" : "auto" });
  }, [tier, view, display, detected, failed3d]);
  useEffect(() => {
    if (failed3d) reportFailure("3d-load");
  }, [failed3d]);
  useEffect(() => {
    if (counted.current.ended) return;
    if (inp.kind === "emergency") {
      counted.current.ended = true;
      for (const flag of inp.flags) track({ type: "emergency_shown", flag });
    } else if (inp.kind === "result") {
      counted.current.ended = true;
      track({ type: "consult_completed", level: inp.level });
    }
  }, [inp]);
  // Leaving part-way: only the stage is counted, never the answers.
  const stageRef = useRef<"start" | "safety-check" | "questions" | "details" | "summary">("start");
  useEffect(() => {
    stageRef.current = turn.step === "concern" ? "start" : turn.step === "check" || turn.step.startsWith("confirm:") ? "safety-check" : ["medicines", "allergies", "conditions"].includes(turn.step) ? "details" : "questions";
  }, [turn.step]);
  useEffect(() => {
    const leave = () => {
      if (counted.current.started && !counted.current.ended) track({ type: "consult_abandoned", stage: stageRef.current });
    };
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, []);

  const doctor2d = <Doctor2D state={docRef} since={since} lips={lips} activity={activity} reducedMotion={reducedMotion} paused={paused} room={room} />;
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
                  activity={activity}
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
                {!avatarReady && (
                  <button type="button" onClick={() => setDisplay("2d")} className="mt-3 min-h-11 w-full rounded-xl border-2 border-blue-900 px-4 py-2 font-semibold text-blue-900 hover:bg-blue-50">
                    Continue in lightweight mode
                  </button>
                )}
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
      onExplain={explainNow}
      onBack={back}
      canBack={started && history.length > 1 && !done}
      aboveSheet={!emergency}
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

  // Ways to answer when the patient doesn't know, or doesn't understand.
  const chip = "min-h-11 rounded-full border-2 border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 hover:border-blue-500";
  const helpRow =
    started && !done && !emergency ? (
      <div className="flex flex-wrap gap-2" role="group" aria-label="Help with this question">
        {SYMPTOM_STEPS.has(turn.step) && !state.helpDescribe && (
          <button type="button" className={`${chip} border-blue-900 text-blue-950`} onClick={helpMeDescribe}>
            🧭 Help me describe it
          </button>
        )}
        {turn.step === "concern" ? null : (
          turn.unsure && (
            <button type="button" className={chip} onClick={() => answer(turn.step === "describe" || turn.step === "concern-more" ? "?describe" : "?unsure")}>
              🤷 I&apos;m not sure
            </button>
          )
        )}
        {(turn.step === "medicines" || turn.step === "duration") && (
          <button type="button" className={chip} onClick={() => answer("?forgot")}>
            💭 I don&apos;t remember
          </button>
        )}
        {turn.step !== "concern" && (
          <button type="button" className={chip} onClick={explainNow}>
            ❓ What does this mean?
          </button>
        )}
        {turn.step !== "concern" && turn.step !== "concern-more" && (
          <button type="button" className={chip} onClick={whyNow}>
            💬 Why do you ask?
          </button>
        )}
        {/* Hard words in the question get their own "what does … mean?" */}
        {termsIn(turn.question ?? turn.say, { hardOnly: true, max: 2 }).map((g) => (
          <button key={g.id} type="button" className={chip} onClick={() => meaningNow(g.term, g.meaning)}>
            📖 What does “{g.term}” mean?
          </button>
        ))}
      </div>
    ) : null;

  // "I heard: … Is that correct?" — uncertain speech is confirmed first.
  const heardPanel = heard ? (
    <div role="group" aria-labelledby="heard-title" className="space-y-3 rounded-2xl border-2 border-amber-500 bg-amber-50 p-4">
      <p id="heard-title" className="font-semibold text-amber-950">I heard:</p>
      <p className="text-lg text-slate-900">“{heard}”</p>
      <p className="font-semibold text-amber-950">Is that correct?</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-h-12 rounded-xl bg-blue-900 px-5 font-bold text-white" onClick={() => { const h = heard; setHeard(null); sendWords(h); }}>
          Yes
        </button>
        <button type="button" className={chip} onClick={() => { setHeard(null); setText(""); void startListening(); }}>
          🎙️ Try again
        </button>
        <button type="button" className={chip} onClick={() => { setHeard(null); answerBox.current?.focus(); }}>
          ✏️ Edit
        </button>
      </div>
    </div>
  ) : null;

  // The patient asked for a real professional: always respected.
  const professionalCard = wantsProfessional ? (
    <div className="space-y-2 rounded-2xl border-2 border-blue-900 bg-blue-50 p-4">
      <p className="font-bold text-blue-950">Talking with a real doctor or health worker</p>
      <p className="text-slate-800">You can see the ways to reach one now. Your visit summary so far is in the chart, and it will be ready to take with you.</p>
      <div className="flex flex-wrap gap-2">
        <a href="/ai-hospital/doctor" className="inline-flex min-h-12 items-center rounded-xl bg-blue-900 px-5 font-bold text-white">See ways to talk to a real doctor</a>
        <button type="button" className={chip} onClick={() => setWantsProfessional(false)}>Carry on with the questions</button>
      </div>
    </div>
  ) : null;

  // Showing, not just telling: a 0–10 pain scale and a measured temperature.
  // These are what the patient reports — nothing here examines anyone.
  const extraEntry =
    !started || done || emergency ? null : turn.entry === "pain" ? (
      <fieldset className="space-y-2">
        <legend className="text-base font-semibold text-slate-800">Or choose a number: 0 = no pain, 10 = worst pain you can imagine</legend>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              onClick={() => answer(`pain:${n}`)}
              aria-label={`Pain ${n} out of 10`}
              className={`min-h-12 rounded-xl border-2 text-lg font-bold ${n >= 7 ? "border-red-300 bg-red-50 text-red-900" : n >= 4 ? "border-amber-300 bg-amber-50 text-amber-950" : "border-emerald-300 bg-emerald-50 text-emerald-950"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>
    ) : turn.entry === "temperature" ? (
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = tempValue.trim();
          if (v) answer(`temp:${v}${tempUnit}`);
        }}
      >
        <label className="block text-base font-semibold text-slate-800">
          Measured temperature
          <input
            inputMode="decimal"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value.replace(/[^0-9.,]/g, ""))}
            placeholder={tempUnit === "C" ? "e.g. 38.5" : "e.g. 101.3"}
            className="mt-1 block w-32 rounded-xl border-2 border-slate-300 px-3 py-2.5 text-lg"
          />
        </label>
        <label className="block text-base font-semibold text-slate-800">
          Unit
          <select value={tempUnit} onChange={(e) => setTempUnit(e.target.value as "C" | "F")} className="mt-1 block min-h-12 rounded-xl border-2 border-slate-300 bg-white px-3">
            <option value="C">°C</option>
            <option value="F">°F</option>
          </select>
        </label>
        <button type="submit" disabled={!tempValue.trim()} className="min-h-12 rounded-xl bg-blue-900 px-5 font-bold text-white disabled:opacity-40">
          Use this
        </button>
      </form>
    ) : (turn.step === "medicines" || turn.step === "allergies" || turn.step === "conditions") && saved[turn.step] ? (
      <button type="button" className={chip} onClick={() => answer(saved[turn.step as "medicines"]!)}>
        🗂️ Use what is saved in my Health Passport: {saved[turn.step as "medicines"]}
      </button>
    ) : null;

  const educationCard = education ? (
    <section aria-labelledby="edu-heading" className="space-y-2 rounded-2xl border-2 border-teal-700 bg-teal-50 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-teal-900">Health information · general, not an assessment of you</p>
      <h3 id="edu-heading" className="text-lg font-bold text-teal-950">{education.question}</h3>
      {education.text.map((t) => (
        <p key={t} className="text-slate-900">{t}</p>
      ))}
      <p className="text-sm text-slate-700">
        From the reviewed page{" "}
        <a href={education.topic.href} className="font-semibold text-teal-900 underline" target="_blank" rel="noreferrer">
          {education.topic.title}
        </a>{" "}
        · Sources: {education.sources.join("; ")}
      </p>
      <button type="button" onClick={() => setEducation(null)} className="min-h-11 rounded-lg border-2 border-teal-700 bg-white px-4 font-semibold text-teal-900">
        Back to my consultation
      </button>
    </section>
  ) : null;

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
            <BigChoice key={o.id} tone={o.tone === "danger" ? "danger" : "default"} onClick={() => (o.id === "words:other" ? answerBox.current?.focus() : answer(o.id))}>
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
        <BodyMap options={inp.options} onPick={(id) => answer(id)} />
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
    location: (() => {
      const where = chart.reported.find((r) => r.label === "Where");
      return where?.provided ? where.value : BODY_AREAS.find((b) => b.id === state.bodyArea)?.label;
    })(),
    safety: safetyAnswers,
    extra: summaryExtra(state),
  };

  // Desktop: a side panel. Phones and tablets: a bottom sheet that peeks
  // ("Visit chart · 5 noted") and opens over the page when tapped.
  const noted = [...chart.reported, ...chart.safety].filter((r) => r.provided).length;
  const chartPanel = (
    <aside
      aria-label="Patient chart"
      className="h-fit rounded-2xl border border-slate-300 bg-white p-4 shadow-sm lg:sticky lg:top-4 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:rounded-b-none max-lg:border-x-0 max-lg:border-b-0 max-lg:p-0 max-lg:shadow-[0_-8px_24px_rgba(15,23,42,0.18)]"
    >
      <button
        type="button"
        onClick={() => setSheetOpen((o) => !o)}
        aria-expanded={sheetOpen}
        aria-controls="chart-sheet"
        className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3 text-left lg:hidden"
      >
        <span className="font-bold text-blue-950">
          📋 Visit chart <span className="font-semibold text-slate-600">· {noted} noted</span>
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">{sheetOpen ? "Hide ▼" : "Show ▲"}</span>
      </button>
      <div id="chart-sheet" className={sheetOpen ? "max-lg:max-h-[70vh] max-lg:overflow-y-auto max-lg:border-t max-lg:border-slate-200 max-lg:px-4 max-lg:py-3" : "max-lg:max-h-0 max-lg:overflow-hidden"}>
        <PatientChart chart={chart} />
      </div>
    </aside>
  );

  // One layout for every state, so the doctor is never reloaded. During an
  // emergency the emergency guidance comes first (left, or top on a phone)
  // and the concerned doctor stays visible beside it.
  return (
    <div ref={topRef} className={`space-y-4 ${emergency ? "" : "max-lg:pb-16"}`}>
      <JourneyBar current={journey} />
      {demoMode && !emergency && <DemoPanel active={demo} onPlay={playDemo} onReset={resetDemo} />}
      {reviewMode && <ReviewPanel state={state} turn={turn} />}
      {debugMode && DebugPanel && <DebugPanel state={state} turn={turn} doctor={doc} speaking={speaking} listening={listening} tier={String(tier)} voiceIssue={voiceIssue} />}
      {fromReception && !emergency && (
        <p className="rounded-xl bg-blue-50 px-4 py-2 text-blue-950">
          From Reception: <q>{fromReception}</q> — this will be your first answer.
        </p>
      )}
      {failed3d && <p role="status" className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">{failed3d}</p>}
      {voiceIssue && voiceOn && (
        <p role="status" className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
          Voice isn&apos;t available right now. The doctor&apos;s words are shown as text — you can keep going by reading and typing.
        </p>
      )}
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
              {heardPanel}
              {professionalCard}
              {educationCard}
              {consent}
              {answerArea}
              {extraEntry}
              {helpRow}
              {started && turn.step.startsWith("q:") && (
                <p className="text-sm text-slate-600">
                  Question {questionsFor(toAnswers(state).context).filter((q) => q.id in state.answers).length + 1} about this problem. Each answer is checked for warning signs before the next question.
                </p>
              )}
              {started && history.length > 1 && !done && (
                <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
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
