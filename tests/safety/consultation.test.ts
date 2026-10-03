import { describe, expect, it } from "vitest";
import { chooseTier } from "../../app/ai-hospital/consult-room/capability";
import {
  type ConsultState,
  EMERGENCY_LINE,
  FIXED_LINES,
  type Turn,
  nextTurn,
  chartOf,
  panelItems,
  respond,
  startConsultation,
  toAnswers,
} from "../../app/lib/consultation";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";
import { complaints, triage } from "../../app/lib/safety/triage";

const start = () => startConsultation("General Medicine");

// Answers every turn with `pick` until the result or Emergency Mode.
function run(s: ConsultState, pick: (t: Turn, s: ConsultState) => string | string[], max = 200) {
  const said: Turn[] = [];
  for (let i = 0; i < max; i++) {
    const t = nextTurn(s);
    said.push(t);
    if (t.input.kind === "result" || t.input.kind === "emergency") return { s, t, said };
    const next = respond(s, t.step, pick(t, s));
    if (next === s) throw new Error(`answer not accepted at ${t.step}`);
    s = next;
  }
  throw new Error("did not finish");
}

// A calm, low-urgency path: "no" to everything, first option otherwise.
const calm = (complaint: string) => (t: Turn, ...rest: [ConsultState?]): string | string[] => {
  void rest;
  if (t.step === "check") return "none";
  if (t.step === "who") return "self";
  if (t.step === "age") return "adult";
  if (t.step === "sex") return "male";
  if (t.step === "special") return [];
  if (t.step === "complaint") return complaint;
  if (t.step.startsWith("confirm:")) return "no";
  if (t.step === "duration") return "1-3-days";
  if (t.step === "body") return "skip";
  if (t.step === "progression") return "better";
  if (t.step === "severity") return "mild";
  if (t.input.kind === "text") return "";
  if (t.input.kind === "single" && t.input.options.some((o) => o.id === "no")) return "no";
  if (t.input.kind === "single") return t.input.options[0].id;
  return [];
};

describe("the virtual guide never diagnoses or prescribes", () => {
  it("catches the phrases the guide must never say", () => {
    for (const bad of ["You have pneumonia.", "You definitely have cancer.", "I diagnose you with malaria.", "Take 500 mg twice a day.", "You don't need a real doctor."]) {
      expect(violatesLanguagePolicy(bad), bad).not.toBeNull();
    }
    expect(violatesLanguagePolicy("Do you have diabetes?")).toBeNull();
  });

  it("every line said in every complaint path passes the language policy", () => {
    for (const c of complaints) {
      const s = respond(start(), "concern", "I am not feeling well");
      const { said } = run(s, calm(c.id));
      for (const t of said) {
        expect(violatesLanguagePolicy(t.say), `${c.id}: ${t.say}`).toBeNull();
        if (t.hint) expect(violatesLanguagePolicy(t.hint)).toBeNull();
        if (t.input.kind === "single") for (const o of t.input.options) expect(violatesLanguagePolicy(o.label), o.label).toBeNull();
      }
    }
    for (const l of [...FIXED_LINES, nextTurn(start()).say]) expect(violatesLanguagePolicy(l)).toBeNull();
  });

  it("introduces itself as a virtual guide, never as a doctor", () => {
    const t = nextTurn(start());
    expect(t.say).toBe(
      "Hello. I'm your virtual health guide for this General Medicine consultation. I'll ask a few questions to help determine what kind of care may be appropriate. If anything you tell me suggests an emergency, I'll tell you immediately. What brought you here today?",
    );
    expect(t.hint).toMatch(/I am not a doctor/);
  });
});

describe("the safety engine stays authoritative", () => {
  it("an emergency in the person's own words stops the consultation at once", () => {
    const s = respond(start(), "concern", "my father has crushing chest pain and is sweating");
    const t = nextTurn(s);
    expect(t.input.kind).toBe("emergency");
    expect(t.say).toBe(EMERGENCY_LINE);
    expect(t.mood).toBe("serious");
  });

  it("negated danger words are asked about directly, never assumed safe", () => {
    const s = respond(start(), "concern", "No chest pain, just a cough");
    const t = nextTurn(s);
    expect(t.step).toBe("confirm:chest_pain");
    expect(nextTurn(respond(s, t.step, "yes")).input.kind).toBe("emergency");
    expect(nextTurn(respond(s, t.step, "unsure")).input.kind).toBe("emergency");
    const cleared = respond(s, t.step, "no");
    expect(cleared.pendingFlags).toEqual([]);
    expect(nextTurn(cleared).input.kind).not.toBe("emergency");
  });

  it("overdose in the person's words goes straight to Emergency Mode", () => {
    expect(nextTurn(respond(start(), "concern", "I took too many tablets")).input.kind).toBe("emergency");
  });

  it("a danger sign chosen at the check stops everything", () => {
    let s = respond(start(), "concern", "headache");
    s = respond(s, "check", "breathing");
    expect(nextTurn(s).input.kind).toBe("emergency");
    // "Not an emergency" goes back to the check, not past it: it is asked again.
    s = respond(s, "emergency", "exit");
    expect(s.checkDone).toBe(false);
    while (!["check", "result", "emergency"].includes(nextTurn(s).step)) {
      const t = nextTurn(s);
      s = respond(s, t.step, t.input.kind === "single" || t.input.kind === "body" ? t.input.options[0].id : t.input.kind === "multi" ? [] : "x");
    }
    expect(nextTurn(s).step).toBe("check");
  });

  it("a red-flag answer to any question stops routine questions", () => {
    let found = false;
    for (const c of complaints) {
      let s = respond(start(), "concern", "unwell");
      for (let i = 0; i < 100; i++) {
        const t = nextTurn(s);
        if (t.input.kind === "result") break;
        if (t.step.startsWith("q:")) {
          const yes = respond(s, t.step, "yes");
          if (nextTurn(yes).input.kind === "emergency") {
            found = true;
            const back = respond(yes, "emergency", "exit");
            expect(back.answers[t.step.slice(2)]).toBeUndefined();
            break;
          }
        }
        s = respond(s, t.step, calm(c.id)(t, s));
      }
    }
    expect(found).toBe(true);
  });

  it("danger words in the medicines box also raise an emergency", () => {
    const s = respond(start(), "concern", "cough");
    const { s: end } = run(s, (t, st) => (t.step === "medicines" ? "I took 30 sleeping pills to end my life" : calm("cough")(t, st)));
    expect(nextTurn(end).input.kind).toBe("emergency");
  });

  it("the result is exactly the triage engine's result", () => {
    for (const c of complaints) {
      const { s, t } = run(respond(start(), "concern", "not well"), calm(c.id));
      const r = triage(toAnswers(s));
      if (r.level === "RED") expect(t.input.kind).toBe("emergency");
      else expect(t.input.kind).toBe("result");
    }
  });

  it("ignores answers that are not on offer", () => {
    const s = respond(start(), "concern", "fever");
    expect(respond(s, "check", "not-a-flag")).toBe(s);
    expect(respond(s, "age", "35")).toBe(s);
  });
});

describe("the information panel shows only what the person said", () => {
  it("never shows an urgency level or a diagnosis", () => {
    const { s } = run(respond(start(), "concern", "cough for a week"), (t, st) =>
      t.step === "medicines" ? "Salbutamol inhaler" : t.step === "allergies" ? "penicillin" : calm("cough")(t, st),
    );
    const items = panelItems(s);
    const text = items.map((i) => `${i.label} ${i.value}`).join(" ");
    expect(text).toMatch(/cough for a week/);
    expect(text).toMatch(/Salbutamol inhaler/);
    expect(text).toMatch(/penicillin/);
    expect(text).not.toMatch(/\b(RED|ORANGE|YELLOW|GREEN|urgent|emergency|diagnos)/i);
    // Routing information is kept separate, and only appears once the engine has decided.
    const c = chartOf(s);
    expect(c.routing).not.toBeNull();
    expect(c.routing!.map((r) => r.label)).toEqual(["Navigation urgency", "Suggested service"]);
  });
});

describe("works on every phone", () => {
  it("chooses the right presentation", () => {
    expect(chooseTier({ webgl: false })).toBe("fallback");
    expect(chooseTier({ webgl: true, saveData: true })).toBe("fallback");
    expect(chooseTier({ webgl: true, effectiveType: "2g" })).toBe("fallback");
    expect(chooseTier({ webgl: true, deviceMemory: 1, cores: 4 })).toBe("fallback");
    expect(chooseTier({ webgl: true, effectiveType: "3g", deviceMemory: 4, cores: 8 })).toBe("low");
    expect(chooseTier({ webgl: true, mobile: true, deviceMemory: 4, cores: 4 })).toBe("low");
    expect(chooseTier({ webgl: true, mobile: true, deviceMemory: 4, cores: 8 })).toBe("medium");
    expect(chooseTier({ webgl: true, mobile: false, deviceMemory: 8, cores: 8 })).toBe("high");
  });
});

describe("department rooms share one engine", () => {
  it("every room greets as a virtual guide, passes the language policy, and has a valid focus list", async () => {
    const { ROOMS } = await import("../../app/ai-hospital/consult-room/rooms");
    const { getComplaint } = await import("../../app/lib/safety/triage");
    for (const r of Object.values(ROOMS)) {
      expect(r.intro, r.slug).toMatch(/virtual health guide/);
      expect(r.intro).not.toMatch(/\bI am a doctor\b|\bI'm a doctor\b/i);
      expect(violatesLanguagePolicy(r.intro), r.slug).toBeNull();
      for (const c of r.focus) expect(getComplaint(c), `${r.slug}: ${c}`).toBeDefined();
      // The room's focus problems are offered first when the words are unclear
      // "not well" is vague: the doctor asks for more first; "not sure" moves on.
      const first = respond(startConsultation(r.greeting, r.intro, r.focus), "concern", "not well");
      expect(nextTurn(first).step).toBe("concern-more");
      const s = respond(respond(first, "concern-more", "?unsure"), "check", "none");
      const t = nextTurn(s);
      expect(t.step).toBe("complaint");
      if (t.input.kind === "single") expect(t.input.options[0].id).toBe(r.focus[0]);
    }
  });
});
