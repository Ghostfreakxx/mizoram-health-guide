import { describe, expect, it } from "vitest";
import { firstAidGuides } from "../../app/ai-hospital/data/firstAid";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";
import { getRedFlag } from "../../app/lib/safety/redFlags";
import { MIN_AGE, SOURCE_IDS as SCREEN_SOURCES, screeningFor } from "../../app/lib/screening";
import { getSource } from "../../app/lib/sources";
import { CHILD_VISITS, PREGNANCY_VACCINES, SOURCE_IDS as VACC_SOURCES, addInterval, childSchedule, isValidDate } from "../../app/lib/vaccines";

describe("vaccination planner", () => {
  it("adds weeks, months and years correctly, including month ends and leap years", () => {
    expect(addInterval("2026-01-01", { weeks: 6 })).toBe("2026-02-12");
    expect(addInterval("2026-01-31", { months: 1 })).toBe("2026-02-28");
    expect(addInterval("2024-02-29", { years: 1 })).toBe("2025-02-28");
    expect(addInterval("2025-11-15", { months: 9 })).toBe("2026-08-15");
    expect(addInterval("2026-03-10", { days: 0 })).toBe("2026-03-10");
  });

  it("rejects bad input instead of guessing", () => {
    expect(childSchedule("", "2026-10-01").ok).toBe(false);
    expect(childSchedule("2026-02-30", "2026-10-01").ok).toBe(false);
    expect(childSchedule("2027-01-01", "2026-10-01").ok).toBe(false);
    expect(childSchedule("2005-01-01", "2026-10-01").ok).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
  });

  it("marks visits past, due now, and upcoming", () => {
    const r = childSchedule("2026-07-01", "2026-08-20"); // 7 weeks old
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const by = Object.fromEntries(r.visits.map((v) => [v.id, v.status]));
    expect(by.birth).toBe("past");
    expect(by["6w"]).toBe("due-now");
    expect(by["10w"]).toBe("upcoming");
    expect(r.visits.filter((v) => v.status === "due-now")).toHaveLength(1);
  });

  it("on the due date itself the visit is due now", () => {
    const r = childSchedule("2026-01-01", "2026-02-12");
    if (!r.ok) throw new Error("expected ok");
    expect(r.visits.find((v) => v.id === "6w")!.status).toBe("due-now");
  });

  it("visits are in age order", () => {
    const dues = CHILD_VISITS.map((v) => addInterval("2026-01-01", v.after));
    expect([...dues].sort()).toEqual(dues);
  });
});

describe("free screening", () => {
  it("is offered from age 30, never estimates risk", () => {
    const young = screeningFor(MIN_AGE - 1, "female");
    expect(young.ok && !young.eligible).toBe(true);
    const man = screeningFor(45, "male");
    expect(man.ok && man.eligible && man.checks.map((c) => c.id)).toEqual(["bp", "sugar", "oral"]);
    const woman = screeningFor(45, "female");
    expect(woman.ok && woman.eligible && woman.checks.map((c) => c.id)).toEqual(["bp", "sugar", "oral", "breast", "cervix"]);
  });
  it("rejects missing or impossible input", () => {
    expect(screeningFor(Number.NaN, "male").ok).toBe(false);
    expect(screeningFor(40, null).ok).toBe(false);
    expect(screeningFor(150, "male").ok).toBe(false);
  });
});

describe("first aid", () => {
  it("emergency guides use exactly the Emergency Mode guidance (one source of truth)", () => {
    for (const g of firstAidGuides.filter((x) => x.emergency)) {
      expect(g.steps).toEqual(getRedFlag(g.id as Parameters<typeof getRedFlag>[0]).guidance);
      expect(g.getHelp.join(" ")).toMatch(/108/);
    }
  });
  it("every guide says when to get help", () => {
    for (const g of firstAidGuides) expect(g.getHelp.length, g.id).toBeGreaterThan(0);
  });
  it("never recommends harmful folk remedies for burns or snake bites", () => {
    const burn = firstAidGuides.find((g) => g.id === "burn")!;
    expect(burn.steps.join(" ")).toMatch(/Do not put ice, toothpaste, oil, or butter/);
    const snake = firstAidGuides.find((g) => g.id === "snakebite")!;
    expect(snake.steps.join(" ")).toMatch(/Do not cut, suck, or tie a tight band/);
  });
});

describe("citizen services are sourced and use safe language", () => {
  const ids = [...VACC_SOURCES, ...SCREEN_SOURCES, ...firstAidGuides.flatMap((g) => g.sourceIds), "who-doing-what-matters", "nhs-nosebleed"];
  it("every cited source exists and is not falsely marked verified", () => {
    for (const id of ids) {
      const s = getSource(id);
      expect(s, id).toBeDefined();
      if (s!.status === "verified") expect(s!.checked).not.toBeNull();
    }
  });
  it("no diagnostic wording", () => {
    const texts = [
      ...CHILD_VISITS.flatMap((v) => [v.age, v.note ?? "", ...v.vaccines]),
      ...PREGNANCY_VACCINES,
      ...firstAidGuides.flatMap((g) => [g.title, ...g.steps, ...g.getHelp]),
    ];
    const s = screeningFor(50, "female");
    if (s.ok && s.eligible) texts.push(...s.checks.flatMap((c) => [c.name, c.what]));
    for (const t of texts) expect(violatesLanguagePolicy(t), t).toBeNull();
  });
});
