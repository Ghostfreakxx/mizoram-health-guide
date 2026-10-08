// The doctor's "brain" for behaviour: turns what the consultation engine
// decided into what the doctor does — which lines, in which state, after what
// pause, and what she says on what she did. Pure functions, so the rules a
// patient relies on are tested:
//
//   - an emergency is said at once (no thinking pause, interrupts everything)
//   - a non-emergency answer gets a short, natural pause before the reply
//   - while a visual tool is shown, the doctor "shows" (glances at it)
//   - reactions match the event: correction → acknowledge; second problem →
//     reassure and carry on; education → educate, then back to the question
//
// The director never decides anything medical. It only reads the engine's
// Turn and Outcome.

import type { Outcome, Turn } from "../../../lib/consultation";
import type { Level } from "../../../lib/safety/triage";
import type { DoctorState } from "./state";

export type Spoken = { text: string; state: DoctorState };
export type Plan = {
  lines: Spoken[];
  after: DoctorState; // the state to rest in when the lines are said
  delayMs: number; // a natural pause before speaking (0 for emergencies)
  before?: DoctorState; // the state during the pause
  interrupt: boolean; // stop everything else first (emergency)
  scrollTop?: boolean;
};

// A short pause while an answer is checked: longer answers take a little
// longer to "read" (0.6–1.4 s). Never used for an emergency.
export const thinkMs = (words: string) => Math.min(900, 350 + words.length * 6);

export const resultState = (level: Level): DoctorState => (level === "RED" || level === "ORANGE" ? "concerned" : level === "GREEN" ? "reassuring" : "explaining");

export function planTurn(turn: Turn, ctx: { first: boolean; lastSaid: string; reducedMotion: boolean }): Plan {
  if (turn.input.kind === "emergency") {
    return { lines: [{ text: turn.say, state: "emergency" }], after: "emergency", delayMs: 0, interrupt: true, scrollTop: true };
  }
  if (turn.input.kind === "result") {
    const lines: Spoken[] = [{ text: turn.say, state: resultState(turn.input.level) }];
    if (turn.then) lines.push({ text: turn.then, state: "summarizing" });
    return { lines, after: "complete", delayMs: thinkMs(ctx.lastSaid), before: "processing", interrupt: false };
  }
  if (turn.step === "concern" && ctx.first) {
    // Noticing the patient (a glance up from the chart), then hello.
    return { lines: [{ text: turn.say, state: "greeting" }], after: "listening", delayMs: ctx.reducedMotion ? 0 : 700, before: "greeting", interrupt: false };
  }
  // Two answers differ: the doctor checks calmly with the patient.
  const state: DoctorState = turn.input.kind === "body" ? "showing" : turn.step === "recheck" ? "checking" : "asking";
  return { lines: [{ text: turn.say, state }], after: "listening", delayMs: thinkMs(ctx.lastSaid), before: "processing", interrupt: false };
}

// What the doctor says back when the patient's words did not move the
// consultation on. `current` is the open question; `next` is the question after
// a correction (which may differ).
export function planReply(o: Exclude<Outcome, { kind: "answered" | "repeat" }>, current: Turn, next: Turn): Plan {
  const q = (t: Turn) => t.question ?? t.say;
  const quick = (lines: Spoken[]): Plan => ({ lines, after: "listening", delayMs: 0, before: "processing", interrupt: false });
  switch (o.kind) {
    case "corrected":
      return quick([{ text: o.line, state: "acknowledging" }, { text: q(next), state: next.input.kind === "body" ? "showing" : "asking" }]);
    case "noted":
      return quick([{ text: o.line, state: "acknowledging" }]);
    case "control":
      return quick([{ text: o.line, state: "reassuring" }, { text: q(current), state: "asking" }]);
    case "professional":
      return quick([{ text: o.line, state: "reassuring" }]);
    case "education": {
      // Same verified words; only how much is said changes.
      const first = o.answer.text[0] ?? "";
      const body =
        o.depth === "short"
          ? (first.match(/^[^.!?]+[.!?]/)?.[0] ?? first)
          : o.depth === "more"
            ? o.answer.text.join(" ")
            : first;
      const lead = o.depth === "more" ? "Here is more of the general health information." : o.depth === "short" ? "In short:" : "Here is some general health information. It is not an assessment of you.";
      return quick([
        { text: `${lead} ${body}`, state: "educating" },
        { text: `Now, back to your consultation. ${q(current)}`, state: "asking" },
      ]);
    }
    case "explain":
    case "why":
    case "term":
    case "needs-professional":
    case "unclear":
      return quick([{ text: o.line, state: "clarifying" }]);
  }
}
