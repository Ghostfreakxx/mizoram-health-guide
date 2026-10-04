// Demonstration scenarios for presentations.
//
// A scenario is ONLY the patient's side of the conversation: what they type
// and which buttons they press. Every outcome comes from the real
// consultation and triage engine — nothing here decides or fakes a result.
// tests/safety/demo.test.ts checks each scenario against the engine.

import type { ConsultState, Turn } from "./consultation";

export type DemoScenario = {
  id: string;
  letter: string;
  title: string;
  shows: string; // what the presenter is demonstrating
  group: "core" | "more";
  says: string; // the patient's opening words
  who: "self" | "other";
  age: string; // AGE_GROUPS id
  sex: "female" | "male" | "unspecified";
  special?: string[];
  answers?: Record<string, string>; // step id → answer, overriding the defaults
  medicines?: string;
  allergies?: string;
  conditions?: string;
  // A general health question the patient asks part-way through, typed as
  // words: it goes through the same engine (verified passages only).
  asks?: { at: string; question: string; expectId: string };
  // What a presenter should expect to see (checked by tests against the engine)
  expect: { kind: "emergency"; flag: string } | { kind: "result"; levels: string[] };
};

// The eight core scenarios, in presentation order, then a few more.
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "describe",
    letter: "1",
    title: "Can't explain the problem",
    shows: "Help me describe it: body map, side, feeling, timing — no handoff for unclear words",
    group: "core",
    says: "I can't explain it. It just hurts here.",
    who: "self",
    age: "adult",
    sex: "female",
    answers: { body: "upper-abdomen|right", modifiers: "Worse after eating" },
    expect: { kind: "result", levels: ["ORANGE", "YELLOW", "GREEN"] },
  },
  {
    id: "cough",
    letter: "2",
    title: "Persistent cough",
    shows: "Memory (three weeks is not asked again), TB pathway, free government service",
    group: "core",
    says: "I've been coughing for about three weeks.",
    who: "self",
    age: "adult",
    sex: "female",
    medicines: "None",
    allergies: "None known",
    expect: { kind: "result", levels: ["ORANGE", "YELLOW"] },
  },
  {
    id: "routine",
    letter: "3",
    title: "Routine illness",
    shows: "Self-care with clear warning signs — and no unnecessary referral",
    group: "core",
    says: "I've had a runny nose and sneezing for two days.",
    who: "self",
    age: "adult",
    sex: "male",
    expect: { kind: "result", levels: ["GREEN", "YELLOW"] },
  },
  {
    id: "heart",
    letter: "4",
    title: "Possible emergency",
    shows: "A red flag stops everything at once: 108 / 112 and what to do while waiting",
    group: "core",
    says: "My chest feels very tight and I'm struggling to breathe.",
    who: "self",
    age: "older",
    sex: "male",
    expect: { kind: "emergency", flag: "chest_pain" },
  },
  {
    id: "pregnancy",
    letter: "5",
    title: "Pregnancy concern",
    shows: "Pregnancy danger sign → emergency, with pregnancy-specific guidance",
    group: "core",
    says: "I'm seven months pregnant and I'm bleeding.",
    who: "self",
    age: "adult",
    sex: "female",
    expect: { kind: "emergency", flag: "pregnancy" },
  },
  {
    id: "child",
    letter: "6",
    title: "Child concern",
    shows: "Child danger-sign questions; young children are never told self-care",
    group: "core",
    says: "My 3 year old son has had a fever for two days.",
    who: "other",
    age: "child-under-5",
    sex: "male",
    expect: { kind: "result", levels: ["ORANGE", "YELLOW"] },
  },
  {
    id: "education",
    letter: "7",
    title: "Health education question",
    shows: "A question mid-consultation is answered from the verified Health Library, then the consultation continues",
    group: "core",
    says: "I've had a cough for a week.",
    who: "self",
    age: "adult",
    sex: "male",
    asks: { at: "check", question: "How does TB spread?", expectId: "tb-spread" },
    expect: { kind: "result", levels: ["ORANGE", "YELLOW", "GREEN"] },
  },
  {
    id: "summary",
    letter: "8",
    title: "Visit summary",
    shows: "Medicines, allergies and conditions in the patient-prepared summary; print, copy, share, My Visit",
    group: "core",
    says: "I've had headaches on and off for a week.",
    who: "self",
    age: "adult",
    sex: "female",
    medicines: "Amlodipine (from my doctor)",
    allergies: "Penicillin",
    conditions: "High blood pressure",
    expect: { kind: "result", levels: ["ORANGE", "YELLOW", "GREEN"] },
  },
  {
    id: "fever",
    letter: "A",
    title: "Fever in Mizoram",
    shows: "Local rule: fever needs a same-day malaria test",
    group: "more",
    says: "I've had a fever and body ache since yesterday.",
    who: "self",
    age: "adult",
    sex: "male",
    expect: { kind: "result", levels: ["ORANGE", "YELLOW"] },
  },
  {
    id: "stroke",
    letter: "B",
    title: "Possible stroke (someone else)",
    shows: "Emergency for a family member",
    group: "more",
    says: "My mother's face is drooping on one side and her speech is slurred.",
    who: "other",
    age: "older",
    sex: "female",
    expect: { kind: "emergency", flag: "stroke" },
  },
  {
    id: "hiv",
    letter: "C",
    title: "Possible HIV exposure",
    shows: "Time-critical, stigma-free routing to free services",
    group: "more",
    says: "I think I was exposed to HIV two days ago.",
    who: "self",
    age: "adult",
    sex: "male",
    expect: { kind: "result", levels: ["ORANGE"] },
  },
  {
    id: "crisis",
    letter: "D",
    title: "Mental-health crisis",
    shows: "Crisis support (Tele-MANAS) before anything else",
    group: "more",
    says: "I don't want to live anymore.",
    who: "self",
    age: "adult",
    sex: "female",
    expect: { kind: "emergency", flag: "suicide" },
  },
];

// The patient's answer to a turn, for a scenario. Defaults: "no" to symptom
// questions, the first option for measurements, "about the same", "mild",
// and the guide's first suggestion for the main problem.
export function demoAnswer(sc: DemoScenario, turn: Turn, _s?: ConsultState): string | string[] {
  void _s;
  if (sc.answers && turn.step in sc.answers) return sc.answers[turn.step];
  const inp = turn.input;
  switch (turn.step) {
    case "concern":
      return sc.says;
    case "check":
      return "none";
    case "who":
      return sc.who;
    case "age":
      return sc.age;
    case "sex":
      return sc.sex;
    case "special":
      return sc.special ?? [];
    case "body":
      return "skip";
    case "progression":
      return "same";
    case "severity":
      return "mild";
    case "medicines":
      return sc.medicines ?? "";
    case "allergies":
      return sc.allergies ?? "";
    case "conditions":
      return sc.conditions ?? "";
  }
  if (turn.step.startsWith("confirm:")) return "yes";
  if (inp.kind === "single") return inp.options.some((o) => o.id === "no") ? "no" : inp.options[0].id;
  return "";
}
