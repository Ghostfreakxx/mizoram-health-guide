// The consultation state machine as the doctor performs it. The screen, the
// voice and the 3D/2D doctor all derive their behaviour from this one state.
// The state never decides anything medical: the safety and triage engines do,
// and the consultation screen sets the state to show their result.

export type DoctorState =
  | "initializing" // the room is loading; the doctor finishes notes at the chart
  | "idle" // waiting for the patient to begin
  | "greeting" // noticing the patient and saying hello
  | "listening" // the patient is answering (typing or speaking)
  | "processing" // an answer arrived; the engine is checking it
  | "asking" // saying the next approved question
  | "showing" // asking while a visual tool (the body map) is on screen
  | "explaining" // saying the triage result
  | "reassuring" // a calm closing line
  | "concerned" // an urgent (not emergency) result
  | "emergency" // the safety engine found a red flag
  | "handoff" // the summary for a real healthcare professional
  | "clarifying" // re-saying a question simply, or saying why it is asked
  | "educating" // general health information (not about this patient)
  | "complete"; // finished, waiting quietly

export type Expression = "neutral" | "welcoming" | "listening" | "thinking" | "reassuring" | "concerned" | "urgent" | "helpful";
export type GazePolicy = "patient" | "notice" | "steady" | "review" | "conversational" | "explaining" | "preparing" | "showing";

export type Performance = {
  expression: Expression;
  gaze: GazePolicy;
  gesture: number; // 0 hands still … 1 explaining with small gestures
  head: number; // how much the head moves (0 still … 1 conversational)
  lean: number; // 0 upright … 1 leaning in attentively
  nods: boolean; // occasional small nods while the patient talks
};

export const PERFORMANCE: Record<DoctorState, Performance> = {
  initializing: { expression: "neutral", gaze: "preparing", gesture: 0, head: 0.4, lean: 0.25, nods: false },
  idle: { expression: "neutral", gaze: "conversational", gesture: 0, head: 0.5, lean: 0.15, nods: false },
  greeting: { expression: "welcoming", gaze: "notice", gesture: 0.35, head: 0.8, lean: 0.25, nods: false },
  listening: { expression: "listening", gaze: "patient", gesture: 0, head: 0.3, lean: 0.45, nods: true },
  processing: { expression: "thinking", gaze: "review", gesture: 0, head: 0.4, lean: 0.35, nods: false },
  asking: { expression: "listening", gaze: "conversational", gesture: 0.35, head: 0.8, lean: 0.35, nods: false },
  showing: { expression: "helpful", gaze: "showing", gesture: 0.45, head: 0.7, lean: 0.35, nods: false },
  explaining: { expression: "neutral", gaze: "explaining", gesture: 0.6, head: 0.9, lean: 0.3, nods: false },
  reassuring: { expression: "reassuring", gaze: "conversational", gesture: 0.45, head: 0.8, lean: 0.3, nods: false },
  concerned: { expression: "concerned", gaze: "steady", gesture: 0.35, head: 0.5, lean: 0.55, nods: false },
  emergency: { expression: "urgent", gaze: "steady", gesture: 0, head: 0.2, lean: 0.7, nods: false },
  handoff: { expression: "reassuring", gaze: "review", gesture: 0.5, head: 0.8, lean: 0.3, nods: false },
  clarifying: { expression: "helpful", gaze: "conversational", gesture: 0.4, head: 0.6, lean: 0.4, nods: false },
  educating: { expression: "neutral", gaze: "explaining", gesture: 0.45, head: 0.7, lean: 0.25, nods: false },
  complete: { expression: "reassuring", gaze: "conversational", gesture: 0, head: 0.5, lean: 0.2, nods: false },
};

export const STATE_LABEL: Record<DoctorState, string> = {
  initializing: "Preparing",
  idle: "Ready",
  greeting: "Greeting you",
  listening: "Listening",
  processing: "Checking your answer…",
  asking: "Doctor speaking",
  showing: "Doctor speaking",
  explaining: "Doctor speaking",
  reassuring: "Doctor speaking",
  concerned: "Doctor speaking",
  emergency: "Urgent",
  handoff: "Preparing your summary",
  clarifying: "Explaining",
  educating: "Health information",
  complete: "Consultation complete",
};

export const isSpeakingState = (s: DoctorState) =>
  s === "greeting" || s === "asking" || s === "showing" || s === "explaining" || s === "reassuring" || s === "concerned" || s === "handoff" || s === "clarifying" || s === "educating";

// What every part of the consultation does in each state — one table, so the
// screen, voice, microphone, captions and the doctor can never disagree.
export type Effects = {
  routine: boolean; // ordinary questions may continue
  talk: boolean; // the patient may press Talk
  caption: "doctor" | "listening" | "thinking" | "urgent" | "none";
  speaks: boolean; // the doctor's voice may play (lip-sync follows the audio)
};

export const EFFECTS: Record<DoctorState, Effects> = {
  initializing: { routine: false, talk: false, caption: "none", speaks: false },
  idle: { routine: false, talk: false, caption: "none", speaks: false },
  greeting: { routine: true, talk: true, caption: "doctor", speaks: true },
  listening: { routine: true, talk: true, caption: "listening", speaks: false },
  processing: { routine: true, talk: true, caption: "thinking", speaks: false },
  asking: { routine: true, talk: true, caption: "doctor", speaks: true },
  showing: { routine: true, talk: true, caption: "doctor", speaks: true },
  clarifying: { routine: true, talk: true, caption: "doctor", speaks: true },
  educating: { routine: true, talk: true, caption: "doctor", speaks: true },
  explaining: { routine: false, talk: false, caption: "doctor", speaks: true },
  reassuring: { routine: true, talk: true, caption: "doctor", speaks: true },
  concerned: { routine: false, talk: false, caption: "doctor", speaks: true },
  // Emergency: routine questions stop, Talk is off (the emergency screen leads),
  // only the verified emergency line is spoken.
  emergency: { routine: false, talk: false, caption: "urgent", speaks: true },
  handoff: { routine: false, talk: false, caption: "doctor", speaks: true },
  complete: { routine: false, talk: false, caption: "none", speaks: false },
};
