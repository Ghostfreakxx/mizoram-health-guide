// The English source text for everything that must be translated before a
// screen can be shown in Mizo. Keys are stable; English text is the source.
//
// Surfaces: a whole surface switches language at once, and only when 100% of
// its safety-critical strings have a REVIEWED translation.

import { redFlags } from "../lib/safety/redFlags";
import { FAILSAFE_MESSAGE, LEVEL_TEXT, SAFETY_NET } from "../lib/safety/language";
import { AGE_GROUPS, DURATIONS, PROGRESSIONS, SEVERITIES, complaints, populationQuestions } from "../lib/safety/triage";

export type Surface = "emergency" | "triage";
export type Entry = { key: string; text: string; surface: Surface; critical: boolean; context?: string };

export const EMERGENCY_UI: Record<string, string> = {
  "emergency.heading": "Emergency — act now",
  "emergency.heading.crisis": "Help is available now",
  "emergency.crisis.talk": "Talk to someone now — free, 24 hours",
  "emergency.crisis.telemanas": "Tele-MANAS 14416",
  "emergency.ambulance": "Ambulance",
  "emergency.call108": "Call 108",
  "emergency.national": "National emergency number",
  "emergency.call112": "Call 112",
  "emergency.nearby": "Ask someone nearby to help you. If you cannot call, ask them to call. Or go to the nearest hospital emergency now.",
  "emergency.waiting": "While waiting for help",
  "emergency.what": "What is happening? (optional)",
  "emergency.what.hint": "Tap one to see what to do while waiting for help.",
  "emergency.note.open": "Prepare information for the ambulance or doctor (optional)",
  "emergency.note.title": "Information for responders",
  "emergency.note.private": "This stays on this screen only. It is not saved or sent.",
  "emergency.note.time": "Note the time it started (now)",
  "emergency.note.timeNoted": "Time noted:",
  "emergency.note.happened": "What happened",
  "emergency.note.medicines": "Medicines they take",
  "emergency.note.allergies": "Allergies",
  "emergency.note.show": "Show this to the responders",
  "emergency.exit": "This is not an emergency — go back",
};

function build(): Entry[] {
  const out: Entry[] = [];
  const add = (key: string, text: string | undefined, surface: Surface, critical = true, context?: string) => {
    if (text && text.trim()) out.push({ key, text, surface, critical, context });
  };

  for (const [k, v] of Object.entries(EMERGENCY_UI)) add(k, v, "emergency", true, "Emergency Mode screen");
  for (const f of redFlags) {
    add(`redflag.${f.id}.label`, f.label, "emergency", true, "Emergency checklist item");
    add(`redflag.${f.id}.title`, f.title, "emergency", true, "Emergency Mode heading");
    f.guidance.forEach((g, i) => add(`redflag.${f.id}.guidance.${i}`, g, "emergency", true, "First-response step"));
  }

  for (const [level, t] of Object.entries(LEVEL_TEXT)) {
    add(`level.${level}.label`, t.label, "triage");
    add(`level.${level}.title`, t.title, "triage");
    add(`level.${level}.message`, t.message, "triage");
    add(`level.${level}.nowMessage`, t.nowMessage, "triage");
  }
  add("triage.failsafe", FAILSAFE_MESSAGE, "triage");
  SAFETY_NET.forEach((s, i) => add(`triage.safetynet.${i}`, s, "triage"));
  for (const g of AGE_GROUPS) add(`age.${g.id}`, g.label, "triage");
  for (const d of DURATIONS) add(`duration.${d.id}`, d.label, "triage");
  for (const p of PROGRESSIONS) add(`progression.${p.id}`, p.label, "triage");
  for (const s of SEVERITIES) {
    add(`severity.${s.id}`, s.label, "triage");
    add(`severity.${s.id}.hint`, s.hint, "triage");
  }
  for (const q of populationQuestions) {
    add(`question.${q.id}.text`, q.text, "triage", true, "Triage question (yes / no / not sure)");
    add(`question.${q.id}.help`, q.help, "triage");
  }
  for (const c of complaints) {
    add(`complaint.${c.id}.label`, c.label, "triage");
    for (const q of c.questions) {
      add(`question.${q.id}.text`, q.text, "triage", true, `Triage question for: ${c.label}`);
      add(`question.${q.id}.help`, q.help, "triage");
    }
  }
  return out;
}

export const catalog: Entry[] = build();
export const catalogByKey = new Map(catalog.map((e) => [e.key, e]));
