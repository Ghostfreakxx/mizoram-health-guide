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
  says: string; // the patient's opening words
  who: "self" | "other";
  age: string; // AGE_GROUPS id
  sex: "female" | "male" | "unspecified";
  special?: string[];
  answers?: Record<string, string>; // step id → answer, overriding the defaults
  medicines?: string;
  allergies?: string;
  conditions?: string;
  // What a presenter should expect to see (checked by tests against the engine)
  expect: { kind: "emergency"; flag: string } | { kind: "result"; levels: string[] };
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "fever",
    letter: "A",
    title: "Routine fever",
    says: "I've had a fever and body ache since yesterday.",
    who: "self",
    age: "adult",
    sex: "male",
    expect: { kind: "result", levels: ["ORANGE", "YELLOW"] },
  },
  {
    id: "cough",
    letter: "B",
    title: "Persistent cough",
    says: "I've been coughing for about three weeks.",
    who: "self",
    age: "adult",
    sex: "female",
    medicines: "None",
    allergies: "None known",
    expect: { kind: "result", levels: ["ORANGE", "YELLOW"] },
  },
  {
    id: "pregnancy",
    letter: "C",
    title: "Pregnancy warning sign",
    says: "I'm seven months pregnant and I'm bleeding.",
    who: "self",
    age: "adult",
    sex: "female",
    expect: { kind: "emergency", flag: "pregnancy" },
  },
  {
    id: "heart",
    letter: "D",
    title: "Possible heart emergency",
    says: "My chest feels very tight and I'm struggling to breathe.",
    who: "self",
    age: "older",
    sex: "male",
    expect: { kind: "emergency", flag: "chest_pain" },
  },
  {
    id: "stroke",
    letter: "E",
    title: "Possible stroke",
    says: "My mother's face is drooping on one side and her speech is slurred.",
    who: "other",
    age: "older",
    sex: "female",
    expect: { kind: "emergency", flag: "stroke" },
  },
  {
    id: "child",
    letter: "F",
    title: "Child illness",
    says: "My 3 year old son has had a fever for two days.",
    who: "other",
    age: "child-under-5",
    sex: "male",
    expect: { kind: "result", levels: ["ORANGE", "YELLOW"] },
  },
  {
    id: "hiv",
    letter: "G",
    title: "Possible HIV exposure",
    says: "I think I was exposed to HIV two days ago.",
    who: "self",
    age: "adult",
    sex: "male",
    expect: { kind: "result", levels: ["ORANGE"] },
  },
  {
    id: "crisis",
    letter: "H",
    title: "Mental-health crisis",
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
