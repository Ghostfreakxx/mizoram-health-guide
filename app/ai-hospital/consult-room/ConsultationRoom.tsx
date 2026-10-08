"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { type Chart, type ConsultState, type Turn, BODY_AREAS, chartOf, converse, explainLine, nextTurn, reopen, respond, startConsultation, startHelpDescribe, toAnswers, whyLine } from "../../lib/consultation";
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
import DemoPanel from "./DemoPanel";
import { LipSync } from "./doctor/lipsync";
import { type DoctorState, STATE_LABEL } from "./doctor/state";
import Doctor2D from "./Doctor2D";
import HandoffPanel from "./HandoffPanel";
import { takePendingConcern } from "./handoff";
import { planReply, planTurn } from "./doctor/director";
import { reportFailure, track } from "../../lib/telemetry";
import MyVisit, { EDIT_STEP } from "./MyVisit";
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

// Desktop / large tablet landscape: the full-bleed scene with floating panels.
// Phones and portrait tablets: the doctor on top, the conversation below.
const WIDE = "(min-width: 1024px)";
const subscribeWide = (cb: () => void) => {
  const m = window.matchMedia(WIDE);
  m.addEventListener("change", cb);
  window.addEventListener("resize", cb);
  return () => {
    m.removeEventListener("change", cb);
    window.removeEventListener("resize", cb);
  };
};
const useWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
const useViewWidth = () => useSyncExternalStore(subscribeWide, () => window.innerWidth, () => 1280);
const useViewHeight = () => useSyncExternalStore(subscribeWide, () => window.innerHeight, () => 800);

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
    ...(s.symptoms.length ? [`Symptoms the patient mentioned (in their words): ${s.symptoms.join(", ")}`] : []),
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

export type DepartmentInfo = { name: string; icon: string; href: string };

export default function ConsultationRoom({ room, department }: { room: RoomStyle; department: DepartmentInfo }) {
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
  const [sheetOpen, setSheetOpen] = useState(false); // My Visit bottom sheet (phones/tablets)
  const wide = useWide();
  const viewW = useViewWidth();
  const viewH = useViewHeight();
  const [visitOpen, setVisitOpen] = useState(true); // My Visit panel (desktop)
  const [confirmRestart, setConfirmRestart] = useState(false);
  const historyRef = useRef<HTMLOListElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [seenNotices, setSeenNotices] = useState<string[]>([]); // notices already shown for a few seconds
  const [bodyDismissed, setBodyDismissed] = useState(false); // phones: "say it in words instead"
  const dockRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLFormElement>(null);
  const [inputH, setInputH] = useState(140);
  const [visitOverTool, setVisitOverTool] = useState(false); // My Visit opened over a tool
  const [shellH, setShellH] = useState(0); // phones, keyboard open: fit the room above the keyboard
  const [shellTop, setShellTop] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false); // on-screen keyboard (phones): the doctor area shrinks
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
    const view = q.get("view");
    if (view === "text") setDisplay("text");
    else if (view === "simple") setDisplay("2d");
    else if (view === "high" || view === "medium" || view === "low") setDisplay(view);
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

  // Text only: the newest line of the conversation is always in view.
  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  // The room never scrolls as a whole. "overflow: clip" prevents it in
  // current browsers; older ones can still scroll a hidden-overflow box when
  // a text box takes focus, which pushed the top bar (with Emergency) off
  // the screen. Any such scroll is undone at once.
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const onScroll = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLElement && t.dataset.pin !== undefined && (t.scrollTop || t.scrollLeft)) {
        t.scrollTop = 0;
        t.scrollLeft = 0;
      }
    };
    el.addEventListener("scroll", onScroll, true);
    return () => el.removeEventListener("scroll", onScroll, true);
  }, []);

  // Phones: when the on-screen keyboard opens, the doctor area shrinks, the
  // question is written just above the answer box and the control bar stops
  // floating, so the question and the answer box stay in view together.
  // Newer browsers shrink only the visual viewport; older Android browsers
  // shrink the whole window, so the tallest height seen in this orientation
  // is remembered. Only while a text box has focus, so pinch-zoom or a
  // shorter desktop window is not mistaken for a keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let width = window.innerWidth;
    let tall = window.innerHeight;
    const inBox = () => {
      const el = document.activeElement;
      return el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type !== "checkbox" && el.type !== "radio");
    };
    const check = () => {
      if (window.innerWidth !== width) {
        width = window.innerWidth; // rotated: start again for this orientation
        tall = window.innerHeight;
      }
      tall = Math.max(tall, window.innerHeight);
      const open = inBox() && tall - vv.height * vv.scale > 150;
      setKeyboardOpen(open);
      // The room is fixed to the screen: while the keyboard is open it is
      // fitted to the part of the screen above the keyboard.
      setShellH(open ? Math.round(vv.height) : 0);
      setShellTop(open ? Math.round(vv.offsetTop) : 0);
    };
    // Focus moving to a button is checked a moment later: re-laying out
    // mid-tap would move the button being pressed (and lose the tap).
    let later: ReturnType<typeof setTimeout> | undefined;
    const focusMoved = () => {
      clearTimeout(later);
      if (inBox()) check();
      else later = setTimeout(check, 300);
    };
    vv.addEventListener("resize", check);
    vv.addEventListener("scroll", check);
    document.addEventListener("focusin", focusMoved);
    document.addEventListener("focusout", focusMoved);
    return () => {
      clearTimeout(later);
      vv.removeEventListener("resize", check);
      vv.removeEventListener("scroll", check);
      document.removeEventListener("focusin", focusMoved);
      document.removeEventListener("focusout", focusMoved);
    };
  }, []);

  // A notice is shown for 8 seconds, then retired (Settings still shows the display used).
  useEffect(() => {
    const keys = [failed3d ?? "", voiceIssue ? "voice" : ""].filter((k) => k && !seenNotices.includes(k));
    if (!keys.length) return;
    const t = setTimeout(() => setSeenNotices((n) => [...n, ...keys]), 8000);
    return () => clearTimeout(t);
  }, [failed3d, voiceIssue, seenNotices]);
  // Phones: the full-screen body map stops above the answer box, so the
  // patient can always say it in words instead.
  useEffect(() => {
    const el = inputRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setInputH(Math.round(el.getBoundingClientRect().height)));
    ro.observe(el);
    return () => ro.disconnect();
  });
  // Each new question shows its tool again (even if the last one was hidden).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset per question
    setBodyDismissed(false);
  }, [turn.step, history.length]);
  // My Visit starts open where there is room for it beside the doctor.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- screen size is known only after mount
    setVisitOpen(window.innerWidth >= 1280);
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
              : (slowTier ?? display); // a chosen level can still step down if the device can't hold it
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

  // Background tab: the doctor stops talking (nothing is lost — the rest goes
  // into the conversation), the microphone closes, and 3D rendering pauses.
  // On return nothing replays by itself; Repeat says the question again.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onVis = () => {
      const h = document.visibilityState === "hidden";
      setHidden(h);
      if (h) {
        stopSpeaking();
        stopMic.current?.();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [stopSpeaking]);

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
      setVisitOverTool(false);
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
    if (o.kind === "control" && (o.action === "slower" || o.action === "faster")) setSlowerTo(o.action === "slower");
    if (o.kind === "professional") setWantsProfessional(true);
    if (o.kind === "education") setEducation(o.answer);
    if ("state" in o) replaceState(o.state);
    const plan = planReply(o, turn, "state" in o ? nextTurn(o.state) : turn);
    // The question is already the heading: the note shows only what is new.
    const q = turn.question ?? turn.say;
    const shown = o.kind === "education" ? "" : o.line.endsWith(q) && o.line.length > q.length ? o.line.slice(0, -q.length).trim() : o.line;
    reply(plan.lines, shown);
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
  const subtitleText = log.filter((l) => l.who === "guide").at(-1)?.text ?? "";
  const textSize = bigText ? "text-xl" : "text-lg";
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

  const chip = "min-h-11 rounded-full border-2 border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 hover:border-blue-500";
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

  const safetyAnswers = chart.safety.filter((r) => r.provided && r.label !== "Danger signs at the start").map((r) => (r.value === "No" ? r.label : `${r.label}: ${r.value}`));
  const resultMeta = {
    relation: state.relation,
    sex: state.sex === "unspecified" ? undefined : state.sex,
    specialAsked: state.specialDone,
    concernText: state.concernText,
    // Merged with what the patient mentioned along the way (My Visit rows).
    medicines: chartValue(chart, "Current medicines"),
    allergies: chartValue(chart, "Known allergies"),
    conditions: chartValue(chart, "Existing conditions")?.replace(/;?\s*Weak immune system$/, "") || undefined,
    location: (() => {
      const where = chart.reported.find((r) => r.label === "Where");
      return where?.provided ? where.value : BODY_AREAS.find((b) => b.id === state.bodyArea)?.label;
    })(),
    safety: safetyAnswers,
    extra: summaryExtra(state),
  };

  const noted = [...chart.reported, ...chart.safety].filter((r) => r.provided).length;

  const displaySelect = (
    <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
      Display
      <select
        value={display}
        onChange={(e) => {
          setFailed3d(null);
          setSlowTier(null);
          setAvatarReady(false);
          setDisplay(e.target.value as Display);
        }}
        className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 py-1.5"
      >
        <option value="auto">Automatic</option>
        <option value="high">High quality 3D</option>
        <option value="medium">Balanced 3D</option>
        <option value="low">Light 3D</option>
        <option value="2d">Simple picture (low data)</option>
        <option value="text">Text only</option>
      </select>
    </label>
  );

  // ================= Presentation: an immersive consultation =================
  // One full-screen scene. The 3D room fills the screen (desktop) or the top
  // of it (phones); the HUD shows only what matters now: the doctor's
  // question, the ways to answer, the tool she is using with you, and My Visit.

  const phase = !begun
    ? "Ready when you are"
    : emergency
      ? "Emergency guidance"
      : done
        ? "Visit summary"
        : !started
          ? "Preparing"
          : turn.step === "check" || turn.step.startsWith("confirm:")
            ? "Safety check"
            : SYMPTOM_STEPS.has(turn.step)
              ? "Describing the problem"
              : ["medicines", "allergies", "conditions"].includes(turn.step)
                ? "Health details"
                : "Questions";
  // "Speaking" only when a voice is actually heard; with no voice the words
  // are written, so the label says so.
  const statusText = listening ? "Listening to you…" : speaking ? (voiceIssue || !voiceOn ? "Writing" : "Speaking") : doc === "processing" ? "Thinking…" : started && canAnswer ? "Your turn" : STATE_LABEL[doc];
  const statusDot = listening ? "bg-red-500 motion-safe:animate-pulse" : speaking ? "bg-sky-400" : doc === "processing" ? "bg-amber-400" : "bg-emerald-400";

  // What the doctor shows: a tool beside her, or answers under her question.
  const longList = inp.kind === "single" && inp.options.length > 5;
  const toolKind: "body" | "list" | "multi" | "entry" | null =
    !started || done || emergency
      ? null
      : inp.kind === "body"
        ? "body"
        : inp.kind === "multi"
          ? "multi"
          : longList
            ? "list"
            : extraEntryKind(turn, saved)
                ? "entry"
                : null;
  const toolTitle = toolKind === "body" ? "Show me where" : toolKind === "multi" ? "Tap all that apply" : toolKind === "list" ? (turn.step === "check" ? "Happening right now?" : "Choose the closest") : turn.entry === "pain" ? "How strong is it?" : turn.entry === "temperature" ? "Your measured temperature" : "From your Health Passport";

  // ---- Layout measurements (desktop): the camera frames the doctor in the
  // free space between the panels.
  const sidePanel = wide && (emergency || (done && inp.kind === "result"));
  const toolShown = wide && !!toolKind;
  // Wide screens: the conversation is a column on the right, tools and My
  // Visit on the left, and the doctor is framed, unobstructed, in between.
  // The entry card uses the same column, so the framing never jumps.
  const leftPanel = toolShown || demoMode || reviewMode || (!!education && !emergency);
  const visitShown = wide && !emergency && !done && begun && (leftPanel ? visitOverTool : visitOpen);
  const colW = Math.min(480, Math.max(400, Math.round(viewW * 0.34)));
  const frame = wide
    ? {
        l: leftPanel ? 448 : visitShown ? 352 : 0,
        r: sidePanel ? Math.min(640, Math.round(viewW * 0.46)) + 24 : tier === "none" ? 0 : colW + 40,
        t: 64,
        b: 24,
      }
    : { l: 0, r: 0, t: 0, b: 18 };

  const doctor2d = (
    <div className="h-full w-full" style={{ background: room.wall, paddingLeft: frame.l, paddingRight: frame.r, paddingTop: frame.t, paddingBottom: frame.b }}>
      <Doctor2D state={docRef} since={since} lips={lips} activity={activity} reducedMotion={reducedMotion} paused={paused || hidden} room={room} />
    </div>
  );

  const stage =
    tier === "none" ? (
      <div aria-hidden className="h-full w-full bg-[radial-gradient(ellipse_at_top,#f7f5f0,#e6ebef)]" />
    ) : (
      <div className="relative h-full w-full" data-tier={tier ?? "loading"} role="img" aria-label={`Virtual health guide in the ${room.greeting} consultation room. ${STATE_LABEL[doc]}.`}>
        {tier === null ? (
          <div className="h-full w-full" style={{ background: room.wall }} />
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
              paused={paused || hidden}
              tier={tier}
              room={room}
              attire={room.attire}
              chart={lines3d}
              frame={frame}
              onProgress={setProgress}
              onAvatarReady={() => setAvatarReady(true)}
              onAvatarError={(e) => {
                const lost = e instanceof Error && /context lost/i.test(e.message);
                // The graphics chip gave up: try a lighter level before the picture.
                const next = lost ? stepDown(tier) : "fallback";
                if (next === "fallback") setFailed3d("The 3D doctor could not load. Showing the simple picture instead.");
                else {
                  setAvatarReady(false);
                  setSlowTier(next);
                }
              }}
              onSlow={() => {
                // A level the patient chose is respected; "Automatic" adapts.
                if (display !== "auto") return;
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
        {/* A soft vignette: the eye goes to the doctor, not the bright walls. */}
        {tier !== null && <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_75%_at_50%_42%,transparent_55%,rgba(15,23,42,0.22))]" />}
        {/* The situation changed: the room quietly recedes so the guidance leads. */}
        <div aria-hidden className={`pointer-events-none absolute inset-0 bg-slate-900 transition-opacity duration-700 ${emergency ? "opacity-25" : done ? "opacity-10" : "opacity-0"}`} />
      </div>
    );

  // ---------------- Top bar ----------------
  const btnGhost = "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-slate-800 hover:bg-slate-900/5 focus-visible:bg-slate-900/5";
  const topBar = (
    <header className={`relative z-40 flex h-14 shrink-0 items-center gap-2 px-3 sm:px-4 ${wide ? "absolute inset-x-0 top-0 bg-gradient-to-b from-white/90 to-white/60 backdrop-blur-md" : "border-b border-slate-200 bg-white"} ${emergency ? "border-b-2 border-red-700" : ""}`}>
      <a href={department.href} className={btnGhost} aria-label="Leave the consultation">
        <span aria-hidden>←</span>
        <span className="hidden sm:inline">Leave</span>
      </a>
      <div className="min-w-0 flex-1 leading-tight">
        <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base">
          <span aria-hidden className="mr-1.5">{department.icon}</span>
          {department.name}
          <span className="hidden font-semibold text-slate-500 sm:inline"> · Virtual consultation</span>
        </h1>
        <p className="truncate text-xs text-slate-600">
          <span className="hidden sm:inline">Virtual health guide · not a doctor · </span>
          {phase}
        </p>
      </div>
      {begun && (
        <p role="status" aria-live="polite" className="hidden items-center gap-2 rounded-full bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-white md:flex">
          <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${emergency ? "bg-red-400" : statusDot}`} />
          {emergency ? "Urgent" : statusText}
        </p>
      )}
      {begun && !emergency && !done && (
        <button type="button" onClick={() => (!wide ? setSheetOpen((o) => !o) : leftPanel ? setVisitOverTool((o) => !o) : setVisitOpen((o) => !o))} aria-expanded={wide ? visitShown : sheetOpen} aria-controls="my-visit" className={`${btnGhost} ${(wide ? visitShown : sheetOpen) ? "bg-blue-900/10 text-blue-950" : ""}`}>
          <span aria-hidden>📋</span>
          <span className="hidden min-[380px]:inline">My Visit</span>
          <span className="sr-only min-[380px]:hidden">My Visit</span>
          {noted > 0 && <span className="rounded-full bg-blue-900 px-1.5 text-[11px] font-bold text-white">{noted}</span>}
        </button>
      )}
      <button type="button" onClick={() => setSettingsOpen((o) => !o)} aria-expanded={settingsOpen} aria-controls="room-settings" className={btnGhost} aria-label="Settings">
        <span aria-hidden>⚙️</span>
        <span className="hidden lg:inline">Settings</span>
      </button>
      <a href="/ai-hospital/emergency" className="inline-flex min-h-10 items-center gap-1 rounded-full border-2 border-red-700 bg-white px-3 text-sm font-bold text-red-800 hover:bg-red-50">
        <span aria-hidden>🚨</span> <span className="hidden sm:inline">Emergency</span>
        <span className="sm:hidden">108</span>
      </a>
    </header>
  );

  const settings = settingsOpen ? (
    <div id="room-settings" role="group" aria-label="Consultation settings" className="absolute right-3 top-16 z-50 w-[min(360px,calc(100vw-24px))] space-y-3 rounded-2xl bg-white p-4 text-sm shadow-[0_24px_60px_-20px_rgba(15,23,42,.5)] ring-1 ring-slate-900/10">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-900">Display and sound</p>
        <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-full px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100">
          Close
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Toggle on={voiceOn} onClick={toggleVoice}>{voiceOn ? "🔊 Voice on" : "🔇 Muted"}</Toggle>
        <Toggle on={slower} onClick={toggleSlower}>🐢 Slower</Toggle>
        <Toggle on={paused} onClick={togglePause}>{paused ? "▶ Resume" : "⏸ Pause"}</Toggle>
        <Toggle on={bigText} onClick={() => setBigText((v) => !v)}>A+ Larger text</Toggle>
        <Toggle on={reducedMotion} onClick={() => setReducedMotion((v) => !v)}>Reduce motion</Toggle>
      </div>
      {displaySelect}
      {started && history.length > 2 && !done && !emergency && (
        <div className="border-t border-slate-200 pt-3">
          {confirmRestart ? (
            <div className="space-y-2" role="group" aria-label="Start again?">
              <p className="font-semibold text-slate-900">Start again? Everything you told me in this visit will be cleared.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setConfirmRestart(false); setSettingsOpen(false); restart(); }} className="min-h-10 rounded-xl bg-slate-900 px-4 font-semibold text-white">
                  Yes, start again
                </button>
                <button type="button" onClick={() => setConfirmRestart(false)} className="min-h-10 rounded-xl border border-slate-300 px-4 font-semibold text-slate-800">
                  Keep my answers
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmRestart(true)} className="min-h-10 rounded-xl px-2 font-semibold text-slate-700 hover:bg-slate-100">
              ↺ Start the consultation again…
            </button>
          )}
        </div>
      )}
      {privacy}
    </div>
  ) : null;

  // ---------------- Notices ----------------
  // Short, and gone after a few seconds: the consultation carries on either way.
  const noticeOn = (key: string) => !!key && !seenNotices.includes(key);
  const notices = (
    <>
      {fromReception && !emergency && (
        <p className="rounded-full bg-white/95 px-4 py-1.5 text-sm text-blue-950 shadow ring-1 ring-slate-900/5">
          From Reception: <q>{fromReception}</q> — this will be your first answer.
        </p>
      )}
      {failed3d && noticeOn(failed3d) && (
        <p role="status" className="rounded-full bg-white/95 px-4 py-1.5 text-sm font-semibold text-slate-800 shadow ring-1 ring-slate-900/10">
          {failed3d}
        </p>
      )}
      {voiceIssue && voiceOn && tier !== "none" && noticeOn("voice") && (
        <p role="status" className="rounded-full bg-white/95 px-4 py-1.5 text-sm font-semibold text-slate-800 shadow ring-1 ring-slate-900/10">
          Voice is off on this device — the doctor&apos;s words are written here.
        </p>
      )}
    </>
  );

  // ---------------- Entry: the room prepares; healthcare never waits for it ----------------
  const loadingSteps = [
    { label: `Preparing ${room.greeting}`, done: tier !== null },
    { label: "Loading the consultation room", done: !is3d || progress > 0.02 || avatarReady },
    { label: "Preparing your virtual health guide", done: !is3d || avatarReady },
  ];
  const entry = !begun ? (
    <div className="pointer-events-auto w-full max-w-[460px] rounded-[24px] bg-white/95 p-5 shadow-[0_30px_80px_-30px_rgba(15,23,42,.55)] ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-800">Virtual consultation</p>
      <p className="mt-1 text-2xl font-bold leading-tight text-slate-900">{room.greeting}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-700">Your virtual health guide will ask about the problem and help you find the safest next step. It is not a doctor and cannot diagnose.</p>
      {is3d && (
        <ol className="mt-4 space-y-1.5" aria-label="Preparing the room">
          {loadingSteps.map((st) => (
            <li key={st.label} className="flex items-center gap-2 text-sm text-slate-700">
              <span aria-hidden className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${st.done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>{st.done ? "✓" : "·"}</span>
              <span className={st.done ? "" : "text-slate-500"}>{st.label}{!st.done && st.label.startsWith("Preparing your") && progress > 0.02 ? ` · ${pct}%` : ""}</span>
            </li>
          ))}
        </ol>
      )}
      <button type="button" onClick={() => setBegun(true)} className="mt-5 w-full rounded-2xl bg-blue-900 px-5 py-3.5 text-lg font-bold text-white shadow-lg shadow-blue-900/20 hover:bg-blue-800">
        Begin consultation
      </button>
      {is3d && !avatarReady && (
        <button type="button" onClick={() => setDisplay("2d")} className="mt-2 w-full rounded-2xl px-5 py-2.5 text-sm font-semibold text-blue-900 hover:bg-blue-50">
          Continue without 3D (faster)
        </button>
      )}
      <div className="mt-4 border-t border-slate-100 pt-3">{displaySelect}</div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">🔒 {PRIVACY_LINE} The microphone is only used if you press Talk.</p>
    </div>
  ) : null;

  // ---------------- The answer tools ----------------
  const chipBtn = "min-h-11 rounded-full border border-slate-300 bg-white px-4 py-2 text-[15px] font-semibold text-slate-900 shadow-sm hover:border-blue-600 hover:bg-blue-50 focus-visible:border-blue-600";
  const helpChip = "min-h-9 rounded-full px-3 py-1.5 text-sm font-semibold text-blue-900 hover:bg-blue-50 focus-visible:bg-blue-50";

  const choices =
    started && inp.kind === "single" && !longList ? (
      <div className="flex flex-wrap gap-2" role="group" aria-label="Answers">
        {inp.options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => (o.id === "words:other" ? answerBox.current?.focus() : answer(o.id))}
            className={`${chipBtn} ${o.tone === "danger" ? "border-red-300 text-red-900 hover:border-red-600 hover:bg-red-50" : ""} ${inp.options.length <= 3 ? "min-w-[96px] px-6" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    ) : null;

  const toolBody =
    toolKind === "body" && inp.kind === "body" ? (
      <BodyMap options={inp.options} onPick={(id) => answer(id)} />
    ) : toolKind === "list" && inp.kind === "single" && turn.step === "check" ? (
      // The safety check: every danger sign stays visible (compact, two
      // columns where there is room); "None of these" stays in reach.
      <div className="space-y-3">
        <div className="grid gap-1.5 sm:grid-cols-2" role="group" aria-label="Answers">
          {inp.options
            .filter((o) => o.id !== "none")
            .map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => answer(o.id)}
                className="flex min-h-11 items-start gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-left text-[15px] font-semibold leading-snug text-red-950 hover:border-red-400 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700"
              >
                <span aria-hidden className="mt-0.5 text-red-700">⚠</span>
                <span>{o.label}</span>
              </button>
            ))}
        </div>
        <button type="button" onClick={() => answer("none")} className="sticky bottom-0 w-full rounded-2xl bg-blue-900 px-6 py-3 text-lg font-bold text-white shadow-lg hover:bg-blue-800">
          None of these — continue
        </button>
      </div>
    ) : toolKind === "list" && inp.kind === "single" ? (
      <div className="grid gap-2" role="group" aria-label="Answers">
        {inp.options.map((o) => (
          <BigChoice key={o.id} tone={o.tone === "danger" ? "danger" : "default"} onClick={() => (o.id === "words:other" ? answerBox.current?.focus() : answer(o.id))}>
            {o.label}
          </BigChoice>
        ))}
      </div>
    ) : toolKind === "multi" && inp.kind === "multi" ? (
      <div className="space-y-3">
        <div className="grid gap-2">
          {inp.options.map((o) => (
            <BigChoice key={o.id} selected={multi.includes(o.id)} onClick={() => setMulti((m) => (m.includes(o.id) ? m.filter((x) => x !== o.id) : [...m, o.id]))}>
              <span className="block">{o.label}</span>
              {o.hint && <span className="mt-1 block text-base font-normal text-slate-600">{o.hint}</span>}
            </BigChoice>
          ))}
        </div>
        <button type="button" onClick={() => answer(multi)} className="sticky bottom-0 w-full rounded-2xl bg-blue-900 px-6 py-3.5 text-lg font-bold text-white shadow-lg hover:bg-blue-800">
          {multi.length ? inp.doneLabel : inp.noneLabel}
        </button>
      </div>
    ) : toolKind === "entry" ? (
      extraEntry
    ) : null;

  const tool = toolKind ? (
    <section aria-labelledby="tool-title" className="space-y-3">
      <h2 id="tool-title" className="text-[13px] font-bold uppercase tracking-[0.12em] text-blue-800">
        {toolTitle}
      </h2>
      {toolBody}
    </section>
  ) : null;

  // ---------------- The dock: the doctor's words, then the ways to answer ----------------
  const kind: "main" | "other" = inp.kind === "text" ? "main" : "other";
  const roomyInput = wide && tier === "none";
  const inputRow = (
    <form
      ref={inputRef}
      className="sticky bottom-0 z-10 -mx-4 mt-auto space-y-2 border-t border-slate-100 bg-white/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-5 sm:px-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) sendWords(text);
        else if (inp.kind === "text" && inp.optional) answer("");
      }}
    >
      <label htmlFor="consult-text" className="sr-only">
        {kind === "main" ? "Your answer" : "Or answer in your own words"}
      </label>
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={onTalk}
          disabled={!canAnswer || !talk.available}
          aria-pressed={listening}
          title={talk.available ? "Speak your answer" : talk.reason}
          className={`inline-flex h-12 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full text-[15px] font-bold text-white shadow-md disabled:opacity-40 ${roomyInput ? "px-4" : "w-12"} ${listening ? "bg-red-700" : "bg-blue-900 hover:bg-blue-800"}`}
        >
          <span aria-hidden>🎙️</span>
          {/* The answer box needs the width: the label is shown only where there is room. */}
          <span className={roomyInput ? "" : "sr-only"}> {listening ? "Stop listening" : "Talk"}</span>
        </button>
        {kind === "main" ? (
          <textarea
            id="consult-text"
            ref={answerBox}
            value={text}
            maxLength={inp.kind === "text" ? inp.maxLength : 300}
            rows={1}
            disabled={!canAnswer}
            onChange={(e) => onTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (text.trim()) sendWords(text);
              }
            }}
            placeholder={inp.kind === "text" && wide && tier === "none" ? inp.placeholder : "Type your answer"}
            className={`min-h-12 w-full min-w-0 resize-none rounded-[22px] border border-slate-300 bg-slate-50 px-4 py-3 ${textSize} leading-snug focus:border-blue-700 focus:bg-white`}
          />
        ) : (
          <input
            id="consult-text"
            ref={answerBox}
            value={text}
            maxLength={300}
            disabled={!canAnswer}
            onChange={(e) => onTyping(e.target.value)}
            placeholder={roomyInput ? "Or type your answer" : "Or type here"}
            className={`min-h-12 w-full min-w-0 rounded-full border border-slate-300 bg-slate-50 px-4 py-2.5 ${textSize} focus:border-blue-700 focus:bg-white`}
          />
        )}
        <button type="submit" disabled={!text.trim()} className="h-12 shrink-0 rounded-full bg-blue-900 px-4 text-[15px] font-bold text-white shadow-md hover:bg-blue-800 disabled:bg-slate-300 disabled:shadow-none">
          Send
        </button>
      </div>
      {inp.kind === "text" && inp.optional && canAnswer && (
        <button type="button" onClick={() => answer("")} className={helpChip}>
          Skip
        </button>
      )}
      {micNote && (
        <p role="status" className="text-sm text-slate-700">
          {micNote}
        </p>
      )}
      {!talk.available && talk.reason && canAnswer && <p className="text-xs text-slate-500">{talk.reason}</p>}
      <p className="text-xs text-slate-500">
        🔒 Your consultation information stays on this device. {listening ? "The microphone is on now." : "The microphone is only used if you press Talk."}
      </p>
    </form>
  );

  const helpers =
    started && !done && !emergency ? (
      <div className="-mx-1 flex flex-wrap gap-0.5" role="group" aria-label="Help with this question">
        {SYMPTOM_STEPS.has(turn.step) && !state.helpDescribe && (
          <button type="button" className={`${helpChip} bg-blue-50`} onClick={helpMeDescribe}>
            🧭 Help me describe it
          </button>
        )}
        {turn.step !== "concern" && turn.unsure && (
          <button type="button" className={helpChip} onClick={() => answer(turn.step === "describe" || turn.step === "concern-more" ? "?describe" : "?unsure")}>
            🤷 I&apos;m not sure
          </button>
        )}
        {(turn.step === "medicines" || turn.step === "duration") && (
          <button type="button" className={helpChip} onClick={() => answer("?forgot")}>
            💭 I don&apos;t remember
          </button>
        )}
        {turn.step !== "concern" && (
          <button type="button" className={helpChip} onClick={explainNow}>
            ❓ What does this mean?
          </button>
        )}
        {turn.step !== "concern" && turn.step !== "concern-more" && (
          <button type="button" className={helpChip} onClick={whyNow}>
            💬 Why do you ask?
          </button>
        )}
        {termsIn(turn.question ?? turn.say, { hardOnly: true, max: 2 }).map((g) => (
          <button key={g.id} type="button" className={helpChip} onClick={() => meaningNow(g.term, g.meaning)}>
            📖 What does “{g.term}” mean?
          </button>
        ))}
      </div>
    ) : null;

  const qNumber = started && turn.step.startsWith("q:") ? questionsFor(toAnswers(state).context).filter((q) => q.id in state.answers).length + 1 : 0;
  const miniBtn = "min-h-9 whitespace-nowrap rounded-full px-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-35 sm:px-3";
  const dockHeader = (
    <div className="flex items-center justify-between gap-1">
      <p className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-slate-600">
        <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusDot}`} />
        <span className="hidden sm:inline">Health guide ·</span>
        <span className="truncate">{statusText}</span>
        {qNumber > 0 && <span className="hidden text-slate-400 md:inline">· question {qNumber}</span>}
      </p>
      <div className="flex shrink-0 items-center">
        <button type="button" onClick={repeat} disabled={!started || emergency} className={miniBtn} aria-label="Repeat">
          ↻<span className="hidden min-[360px]:inline"> Repeat</span>
        </button>
        <button type="button" onClick={stopSpeaking} disabled={!speaking} className={miniBtn} aria-label="Stop">
          ■<span className="hidden min-[360px]:inline"> Stop</span>
        </button>
        <button type="button" onClick={back} disabled={!(started && history.length > 1 && !done)} className={miniBtn} aria-label="Back">
          ←<span className="hidden min-[360px]:inline"> Back</span>
        </button>
      </div>
    </div>
  );

  const dockBody = (
    <>
      {dockHeader}
      {note && (
        <p role="status" className="rounded-2xl bg-sky-50 px-4 py-2.5 text-[15px] leading-relaxed text-slate-800">
          {note}
        </p>
      )}
      <h2 id="consult-question" aria-live="polite" className={`${bigText ? "text-[28px]" : keyboardOpen ? "text-lg" : "text-[21px] sm:text-[23px]"} font-semibold leading-snug tracking-[-0.01em] text-slate-900`}>
        {started ? turn.say : `Your health guide will be with you in a moment…`}
      </h2>
      {started && turn.hint && !keyboardOpen && <p className={`${bigText ? "text-lg" : "text-[15px]"} leading-relaxed text-slate-600`}>{turn.hint}</p>}
      {heardPanel}
      {consent}
      {professionalCard}
      {choices}
      {/* Phones: health information and the tool (body map aside) sit under the question. */}
      {!wide && educationCard}
      {!wide && toolKind && toolKind !== "body" && tool}
      {helpers}
      {inputRow}
    </>
  );

  // ---------------- My Visit ----------------
  const editAnswer = (label: string) => {
    const step = EDIT_STEP[label];
    if (!step) return;
    stopSpeaking();
    const next = reopen(state, step);
    if (next !== state) commit(next, `Change: ${label.toLowerCase()}`);
    setSheetOpen(false);
  };
  const visitPanel = (
    <aside id="my-visit" aria-label="My Visit" className="space-y-3">
      <MyVisit chart={chart} onEdit={canAnswer ? editAnswer : undefined} />
    </aside>
  );

  // ---------------- Emergency and summary panels ----------------
  const emergencyPanel = emergency ? (
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
  ) : null;

  const summaryPanel =
    done && inp.kind === "result" ? (
      <div className="space-y-5">
        <p className="rounded-2xl bg-slate-900 px-5 py-4 text-[17px] leading-relaxed text-white">{subtitleText || turn.say}</p>
        <HandoffPanel level={inp.level} />
        <section aria-labelledby="visit-summary" className="space-y-3">
          <h2 id="visit-summary" className="text-2xl font-bold text-blue-950">
            📋 Patient-prepared visit summary
          </h2>
          <p className="text-sm text-slate-600">Please check that I recorded this correctly.</p>
          <ResultView
            answers={toAnswers(state)}
            meta={resultMeta}
            onRestart={restart}
            onEmergency={(flags) => setHistory((h) => [...h, { ...state, emergency: { flags, clear: { kind: "text" } } }])}
          />
        </section>
        <div className="no-print rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-slate-700">
            {state.otherConcerns.length ? `You also mentioned ${state.otherConcerns.join(" and ")}. ` : ""}Another problem, or for someone else? Your summary stays in My Visit until you close this tab.
          </p>
          <button type="button" onClick={restart} className="mt-3 min-h-11 rounded-xl border-2 border-blue-900 px-4 py-2.5 font-semibold text-blue-900 hover:bg-blue-50">
            ↺ Start a new consultation
          </button>
        </div>
      </div>
    ) : null;

  const devPanels = (
    <>
      {demoMode && !emergency && <DemoPanel active={demo} onPlay={playDemo} onReset={resetDemo} />}
      {reviewMode && <ReviewPanel state={state} turn={turn} />}
      {debugMode && DebugPanel && <DebugPanel state={state} turn={turn} doctor={doc} speaking={speaking} listening={listening} tier={String(tier)} voiceIssue={voiceIssue} />}
    </>
  );

  const glass = "pointer-events-auto rounded-[22px] bg-white/93 shadow-[0_24px_70px_-28px_rgba(15,23,42,.55)] ring-1 ring-slate-900/5 backdrop-blur-xl";

  // The stage keeps the same place in the tree in every layout, so the 3D
  // doctor is never reloaded by a resize, a rotation or a change of state.
  // Phones: the face and upper body lead; taller screens give the doctor more.
  const tall = viewH >= 900 ? 50 : viewH < 700 ? 36 : 42;
  const stageHeight = wide ? undefined : tier === "none" ? 0 : keyboardOpen ? "17dvh" : emergency ? "14dvh" : done ? "24dvh" : !begun ? `${tall + 8}dvh` : `${tall}dvh`;

  return (
    <div
      ref={topRef}
      data-layout={wide ? "wide" : "narrow"}
      data-pin=""
      className={`fixed inset-x-0 top-0 z-40 flex flex-col overflow-clip bg-[#e8ecef] text-slate-900 ${bigText ? "text-lg" : ""}`}
      style={{ height: shellH ? `${shellH}px` : "100dvh", transform: shellTop ? `translateY(${shellTop}px)` : undefined }}
    >
      {topBar}
      {settings}
      <div data-pin="" className={`relative min-h-0 flex-1 overflow-clip ${wide ? "" : "flex flex-col"}`}>
        <div data-pin="" className={wide ? "absolute inset-0" : "relative shrink-0 overflow-clip transition-[height] duration-300"} style={stageHeight !== undefined ? { height: stageHeight } : undefined}>
          {stage}
        </div>

        {wide ? (
          <>
            {!emergency && tier !== "none" && (
              <div className="pointer-events-none absolute inset-x-0 top-[68px] z-30 flex flex-col items-center gap-2 px-4" style={{ paddingLeft: frame.l + 16, paddingRight: frame.r + 16 }}>
                {notices}
              </div>
            )}
            {(toolShown || demoMode || reviewMode || debugMode || (education && !emergency)) && (
              <div className={`${glass} absolute bottom-6 left-6 top-[72px] z-20 w-[400px] space-y-4 overflow-y-auto p-5`}>
                {devPanels}
                {!emergency && educationCard}
                {toolShown && tool}
              </div>
            )}
            <div className={`${glass} absolute left-6 top-[72px] ${leftPanel ? "z-30" : "z-20"} max-h-[calc(100%-96px)] w-[320px] overflow-y-auto p-5 ${visitShown ? "" : "hidden"}`}>
              {leftPanel && (
                <button type="button" onClick={() => setVisitOverTool(false)} className="float-right -mr-2 -mt-1 rounded-full px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                  Close
                </button>
              )}
              {visitPanel}
            </div>
            {sidePanel && (
              <div
                className={`${glass} absolute bottom-6 top-[72px] z-20 overflow-y-auto p-5 ${tier === "none" ? "left-1/2 -translate-x-1/2" : "right-6"}`}
                style={{ width: tier === "none" ? Math.min(760, viewW - 48) : Math.min(640, Math.round(viewW * 0.46)) }}
              >
                {emergencyPanel}
                {summaryPanel}
              </div>
            )}
            {!begun && (
              <div className="pointer-events-none absolute bottom-6 right-6 top-[72px] z-20 flex items-center" style={{ width: colW }}>
                {entry}
              </div>
            )}
            {/* The conversation column: what was said so far (also the
                subtitles), then the current question and the ways to answer. */}
            {begun && !sidePanel && tier !== "none" && (
              <div className="pointer-events-none absolute bottom-6 right-6 top-[72px] z-20 flex flex-col justify-end gap-3" style={{ width: colW }}>
                {log.length > 1 && (
                  <ol
                    ref={historyRef}
                    aria-label="Conversation so far"
                    className="pointer-events-auto flex min-h-0 flex-col gap-1.5 overflow-y-auto px-1 [mask-image:linear-gradient(to_bottom,transparent,black_48px)]"
                  >
                    {log.slice(0, -1).slice(-10).map((l, i) => (
                      <li
                        key={i}
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug shadow-sm ${l.who === "guide" ? "self-start bg-white/88 text-slate-800 ring-1 ring-slate-900/5" : "self-end bg-blue-900/90 text-white"}`}
                      >
                        <span className="sr-only">{l.who === "guide" ? "Guide: " : "You: "}</span>
                        {l.text}
                      </li>
                    ))}
                  </ol>
                )}
                <section ref={dockRef} aria-labelledby="consult-question" className={`${glass} flex max-h-[80%] w-full shrink-0 flex-col gap-3 overflow-y-auto px-5 pt-4`}>
                  {dockBody}
                </section>
              </div>
            )}
            {begun && !sidePanel && tier === "none" && (
              <div
                className={`pointer-events-none absolute inset-x-0 bottom-6 z-20 flex flex-col items-center justify-end gap-3 px-6 ${tier === "none" ? "top-[72px]" : ""}`}
                style={{ paddingLeft: frame.l ? frame.l + 8 : 24, paddingRight: frame.r ? frame.r + 8 : 24 }}
              >
                {/* Text only: the conversation itself fills the space the picture would. */}
                {tier === "none" && !emergency && <div className="pointer-events-auto flex w-full max-w-[760px] flex-col items-center gap-2">{notices}</div>}
                {tier === "none" && log.length > 1 && (
                  <ol ref={historyRef} aria-label="Conversation so far" className="pointer-events-auto flex min-h-0 w-full max-w-[760px] flex-col gap-2 overflow-y-auto px-1">
                    {log.slice(0, -1).slice(-14).map((l, i) => (
                      <li key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${l.who === "guide" ? "self-start bg-white text-slate-800 shadow-sm ring-1 ring-slate-900/5" : "self-end bg-blue-900 text-white"}`}>
                        <span className="sr-only">{l.who === "guide" ? "Guide: " : "You: "}</span>
                        {l.text}
                      </li>
                    ))}
                  </ol>
                )}
                <section ref={dockRef} aria-labelledby="consult-question" className={`${glass} flex max-h-[58vh] w-full max-w-[760px] shrink-0 flex-col gap-3 overflow-y-auto px-5 pt-4`}>
                  {dockBody}
                </section>
              </div>
            )}
          </>
        ) : (
          <div className="relative z-20 -mt-4 flex min-h-0 flex-1 flex-col rounded-t-[22px] bg-white shadow-[0_-10px_30px_-12px_rgba(15,23,42,.25)]">
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4">
              {!emergency && <div className="flex flex-col gap-2">{notices}</div>}
              {devPanels}
              {!begun ? (
                entry
              ) : emergency ? (
                emergencyPanel
              ) : done ? (
                summaryPanel
              ) : (
                <section aria-labelledby="consult-question" className="flex flex-1 flex-col gap-3">
                  {dockBody}
                </section>
              )}
            </div>
            {/* My Visit: a bottom sheet over the conversation. */}
            {(
              <div className={`absolute inset-x-0 bottom-0 z-30 max-h-[78dvh] overflow-y-auto rounded-t-[22px] bg-white px-4 pb-6 pt-3 transition-transform duration-300 ${sheetOpen ? "translate-y-0 shadow-[0_-16px_40px_-10px_rgba(15,23,42,.35)]" : "pointer-events-none invisible translate-y-full"}`} aria-hidden={!sheetOpen}>
                <div className="mb-2 flex justify-between">
                  <span aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
                </div>
                <button type="button" onClick={() => setSheetOpen(false)} className="absolute right-3 top-2 rounded-full px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                  Close
                </button>
                {visitPanel}
              </div>
            )}
            {/* Phones: the body map is a full-screen tool while it is needed. */}
            {toolKind === "body" && !bodyDismissed && (
              <div className="fixed inset-x-0 top-14 z-50 flex flex-col border-b border-slate-200 bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,.3)]" style={{ bottom: inputH }}>
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-blue-800">Show me where</p>
                  <p className="mt-1 text-lg font-semibold leading-snug text-slate-900">{turn.say}</p>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {toolBody}
                  <button type="button" onClick={() => setBodyDismissed(true)} className="mt-3 w-full rounded-full px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                    Hide the picture
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {!begun && tier === "none" && wide && null}
    </div>
  );
}

function chartValue(chart: Chart, label: string) {
  const r = chart.reported.find((x) => x.label === label);
  return r?.provided ? r.value : undefined;
}

function extraEntryKind(turn: Turn, saved: { medicines?: string; allergies?: string; conditions?: string }) {
  if (turn.entry === "pain" || turn.entry === "temperature") return true;
  return (turn.step === "medicines" || turn.step === "allergies" || turn.step === "conditions") && !!saved[turn.step];
}
