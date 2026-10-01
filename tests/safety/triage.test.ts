import { describe, expect, it } from "vitest";
import {
  type Answer,
  type Answers,
  type Context,
  type Level,
  LEVEL_ORDER,
  complaints,
  emergencyFrom,
  questionsFor,
  triage,
} from "../../app/lib/safety/triage";

const rank = (l: Level) => LEVEL_ORDER.indexOf(l);

function ctx(partial: Partial<Context> = {}): Context {
  return { who: "self", age: "adult", special: [], complaint: "other", ...partial };
}

type Input = Omit<Partial<Answers>, "context"> & { context?: Partial<Context> };

function answers(partial: Input = {}): Answers {
  return {
    emergencyChecklist: [],
    answers: {},
    choices: {},
    duration: "today",
    progression: "better",
    severity: "mild",
    ...partial,
    context: ctx(partial.context),
  };
}

describe("emergency override", () => {
  it("any emergency checklist item gives RED, even if mild, improving, and started today", () => {
    for (const id of ["chest_pain", "stroke", "breathing", "unconscious", "seizure", "bleeding", "allergy", "overdose", "suicide", "pregnancy", "infant"] as const) {
      const r = triage(answers({ emergencyChecklist: [id] }));
      expect(r.level, id).toBe("RED");
      expect(r.emergency).toContain(id);
      expect(r.teleconsultSuitable).toBe(false);
    }
  });

  it("every emergency question answered yes gives RED in every complaint", () => {
    for (const c of complaints) {
      const context = ctx({ complaint: c.id });
      for (const q of questionsFor(context)) {
        if (!emergencyFrom(q, "yes")) continue;
        const r = triage(answers({ context, answers: { [q.id]: "yes" } }));
        expect(r.level, `${c.id}/${q.id}`).toBe("RED");
      }
    }
  });

  it("population emergency questions trigger RED for infants, pregnancy, and postpartum", () => {
    const groups: Partial<Context>[] = [
      { age: "young-infant", complaint: "child" },
      { age: "child-under-5", complaint: "child" },
      { special: ["pregnant"], complaint: "headache" },
      { special: ["postpartum"], complaint: "other" },
    ];
    for (const g of groups) {
      const context = ctx(g);
      const emergencyQs = questionsFor(context).filter((q) => emergencyFrom(q, "yes"));
      expect(emergencyQs.length, JSON.stringify(g)).toBeGreaterThan(0);
      for (const q of emergencyQs) {
        expect(triage(answers({ context, answers: { [q.id]: "yes" } })).level).toBe("RED");
      }
    }
  });

  it("reassuring course-of-illness answers can never cancel a RED answer", () => {
    const r = triage(
      answers({ context: { complaint: "heart" }, answers: { "heart-now": "yes" }, severity: "mild", progression: "better", duration: "today" }),
    );
    expect(r.level).toBe("RED");
  });
});

describe("named emergency scenarios", () => {
  const scenarios: [string, Input][] = [
    ["heart attack warning signs", { context: { complaint: "heart" }, answers: { "heart-spread": "yes" } }],
    ["stroke warning signs", { context: { complaint: "headache" }, answers: { "head-stroke": "yes" } }],
    ["overdose", { context: { complaint: "substance" }, answers: { "sub-overdose": "yes" } }],
    ["suicidal crisis", { context: { complaint: "mental" }, answers: { "mental-suicide": "yes" } }],
    ["pregnancy emergency", { context: { complaint: "pregnancy", special: ["pregnant"] }, answers: { "preg-bleeding": "yes" } }],
    ["sick infant", { context: { complaint: "child", age: "young-infant" }, answers: { "yi-feeding": "yes" } }],
    ["severe breathing difficulty", { context: { complaint: "cough" }, answers: { "cough-severe": "yes" } }],
    ["dengue severe bleeding", { context: { complaint: "fever" }, answers: { "fever-bleeding": "yes" } }],
  ];
  it.each(scenarios)("%s → RED", (_name, a) => {
    expect(triage(answers(a)).level).toBe("RED");
  });

  it("suicidal crisis: 'not sure' still triggers RED", () => {
    expect(triage(answers({ context: { complaint: "mental" }, answers: { "mental-suicide": "unsure" } })).level).toBe("RED");
  });
});

describe("urgent (non-emergency) scenarios", () => {
  it("TB warning sign: cough for 3 weeks → at least YELLOW, TB services", () => {
    const r = triage(answers({ context: { complaint: "cough" }, answers: { "cough-2weeks": "yes" }, duration: "over-2-weeks", progression: "same" }));
    expect(rank(r.level)).toBeLessThanOrEqual(rank("YELLOW"));
    expect(r.departments).toContain("tb-services");
    expect(r.services).toContain("ntep");
  });

  it("dengue warning: fever gone but much weaker → ORANGE now", () => {
    const r = triage(answers({ context: { complaint: "fever" }, answers: { "fever-weaker": "yes" } }));
    expect(r.level).toBe("ORANGE");
    expect(r.now).toBe(true);
  });

  it("any fever in Mizoram is never GREEN", () => {
    const r = triage(answers({ context: { complaint: "fever" } }));
    expect(r.level).toBe("ORANGE");
  });

  it("HIV exposure within 72 hours → ORANGE now (PEP)", () => {
    const r = triage(answers({ context: { complaint: "hiv" }, answers: { "hiv-72h": "yes" } }));
    expect(r.level).toBe("ORANGE");
    expect(r.now).toBe(true);
    expect(r.services).toContain("naco-ictc");
  });

  it("not sure about an emergency sign → ORANGE now (uncertainty principle), not GREEN", () => {
    const r = triage(answers({ context: { complaint: "heart" }, answers: { "heart-now": "unsure" } }));
    expect(r.level).toBe("ORANGE");
    expect(r.now).toBe(true);
  });

  it("animal bite → ORANGE now", () => {
    const r = triage(answers({ context: { complaint: "injury" }, answers: { "inj-animal": "yes" } }));
    expect(r.level).toBe("ORANGE");
    expect(r.now).toBe(true);
  });
});

describe("special populations never receive GREEN", () => {
  const groups: Partial<Context>[] = [
    { age: "young-infant" },
    { age: "child-under-5" },
    { age: "older" },
    { special: ["pregnant"] },
    { special: ["postpartum"] },
    { special: ["immunocompromised"] },
  ];
  it.each(groups.map((g) => [JSON.stringify(g), g] as const))("%s", (_n, g) => {
    for (const c of complaints) {
      const r = triage(answers({ context: { ...g, complaint: c.id } }));
      expect(r.level, c.id).not.toBe("GREEN");
    }
  });

  it("babies under 2 months are always at least ORANGE", () => {
    for (const c of complaints) {
      const r = triage(answers({ context: { age: "young-infant", complaint: c.id } }));
      expect(rank(r.level)).toBeLessThanOrEqual(rank("ORANGE"));
    }
  });

  it("immunocompromised with fever → ORANGE now", () => {
    const r = triage(answers({ context: { special: ["immunocompromised"], complaint: "cough" }, answers: { "immuno-fever": "yes" } }));
    expect(r.level).toBe("ORANGE");
    expect(r.now).toBe(true);
  });
});

describe("GREEN is only given with complete, low-risk information", () => {
  it("mild, improving, recent, no flags, low-risk adult → GREEN for self-care complaints", () => {
    const r = triage(answers({ context: { complaint: "cough" } }));
    expect(r.level).toBe("GREEN");
  });

  it("missing duration/severity/progression never gives GREEN", () => {
    const r = triage({ context: ctx({ complaint: "cough" }), emergencyChecklist: [], answers: {}, choices: {} });
    expect(r.level).not.toBe("GREEN");
  });

  it("'Something else' with no specific questions is not GREEN", () => {
    expect(triage(answers({ context: { complaint: "other" } })).level).toBe("YELLOW");
  });

  it("severe → at least ORANGE; worse → at least YELLOW; over 2 weeks → at least YELLOW", () => {
    expect(triage(answers({ context: { complaint: "cough" }, severity: "severe" })).level).toBe("ORANGE");
    expect(triage(answers({ context: { complaint: "cough" }, progression: "worse" })).level).toBe("YELLOW");
    expect(triage(answers({ context: { complaint: "cough" }, duration: "over-2-weeks" })).level).toBe("YELLOW");
  });
});

describe("monotonic: changing a 'no' to 'yes' or 'not sure' never lowers urgency", () => {
  // Deterministic pseudo-random generator so failures are reproducible.
  let seed = 42;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

  it("holds for 2000 random answer sets", () => {
    for (let i = 0; i < 2000; i++) {
      const c = complaints[Math.floor(rand() * complaints.length)];
      const ages = ["young-infant", "child-under-5", "child", "adult", "older"] as const;
      const context = ctx({ complaint: c.id, age: ages[Math.floor(rand() * ages.length)] });
      const qs = questionsFor(context);
      const base: Record<string, Answer> = {};
      for (const q of qs) base[q.id] = rand() < 0.15 ? "yes" : "no";
      const before = triage(answers({ context, answers: base }));
      // Change one "no" answer to "yes" or "not sure" (adding information).
      const noAnswers = qs.filter((q) => base[q.id] === "no");
      const target = noAnswers[Math.floor(rand() * noAnswers.length)];
      if (!target) continue;
      for (const a of ["yes", "unsure"] as const) {
        const after = triage(answers({ context, answers: { ...base, [target.id]: a } }));
        expect(rank(after.level), `${c.id}/${target.id}=${a}`).toBeLessThanOrEqual(rank(before.level));
      }
    }
  });
});

describe("fail-safe", () => {
  it("invalid input returns a fail-safe result, never GREEN", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = triage(null as any);
    expect(r.failsafe).toBe(true);
    expect(r.level).not.toBe("GREEN");
  });

  it("unknown complaint falls back to 'Something else' (YELLOW), not GREEN", () => {
    const r = triage(answers({ context: { complaint: "does-not-exist" } }));
    expect(r.level).not.toBe("GREEN");
  });
});

describe("every rule is traceable to a source", () => {
  it("every question has at least one sourceId", () => {
    for (const c of complaints) {
      for (const q of questionsFor(ctx({ complaint: c.id, age: "young-infant", special: ["pregnant", "postpartum", "immunocompromised"] }))) {
        expect(q.sourceIds.length, q.id).toBeGreaterThan(0);
      }
    }
  });
  it("every result reason carries sources", () => {
    const r = triage(answers({ context: { complaint: "fever", age: "older" }, answers: { "fever-vomit": "yes" }, severity: "severe" }));
    for (const reason of r.reasons) expect(reason.sourceIds.length, reason.text).toBeGreaterThan(0);
  });
});
