import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MIN_COUNT, aggregate, sanitize } from "../../app/lib/metrics";
import { demoEvents } from "./metricsFixtures";

const ok = { type: "triage_result", day: "2026-09-01", complaint: "fever", level: "YELLOW", ageGroup: "adult" };

describe("dashboard events carry category codes only", () => {
  it("accepts a well-formed event", () => {
    expect(sanitize(ok)).toEqual(ok);
    expect(sanitize({ ...ok, district: "Lunglei" })).toEqual({ ...ok, district: "Lunglei" });
    expect(sanitize({ type: "emergency_shown", day: "2026-09-01", flag: "chest_pain" })).not.toBeNull();
    expect(sanitize({ type: "department_view", day: "2026-09-01", slug: "cardiology" })).not.toBeNull();
  });

  it("rejects any extra field (names, phones, text, device or session IDs, exact times)", () => {
    for (const extra of [
      { name: "Lalremruati" },
      { phone: "9876543210" },
      { text: "chest pain since morning" },
      { symptoms: ["fever"] },
      { deviceId: "abc" },
      { sessionId: "abc" },
      { ip: "10.0.0.1" },
      { timestamp: "2026-09-01T10:31:00Z" },
      { village: "Zemabawk" },
    ]) {
      expect(sanitize({ ...ok, ...extra }), JSON.stringify(extra)).toBeNull();
    }
  });

  it("rejects unknown codes and free text in code fields", () => {
    expect(sanitize({ ...ok, complaint: "I have chest pain" })).toBeNull();
    expect(sanitize({ ...ok, level: "PURPLE" })).toBeNull();
    expect(sanitize({ ...ok, ageGroup: "34" })).toBeNull();
    expect(sanitize({ ...ok, district: "Ramhlun North" })).toBeNull();
    expect(sanitize({ type: "emergency_shown", day: "2026-09-01", flag: "something" })).toBeNull();
    expect(sanitize({ type: "department_view", day: "2026-09-01", slug: "../admin" })).toBeNull();
    expect(sanitize({ type: "page_view", day: "2026-09-01" })).toBeNull();
  });

  it("dates are day-level only and must be real dates", () => {
    for (const day of ["2026-09-01T10:00", "2026-13-01", "2026-02-30", "yesterday", 20260901]) {
      expect(sanitize({ ...ok, day }), String(day)).toBeNull();
    }
  });

  it("rejects non-objects and missing fields", () => {
    for (const bad of [null, undefined, "x", 1, [], [ok], { type: "triage_result", day: "2026-09-01" }]) {
      expect(sanitize(bad)).toBeNull();
    }
  });
});

describe("small numbers are hidden", () => {
  const ev = (complaint: string, n: number, level = "YELLOW") =>
    Array.from({ length: n }, () => ({ ...ok, complaint, level }));

  it("counts below the threshold are suppressed", () => {
    const a = aggregate([...ev("fever", 12), ...ev("cough", 4)]);
    const by = Object.fromEntries(a.complaints.map((c) => [c.key, c.count]));
    expect(by.fever).toBe(12);
    expect(by.cough).toBeNull();
  });

  it("a single hidden cell cannot be worked out from the total", () => {
    const a = aggregate([...ev("fever", 20, "GREEN"), ...ev("fever", 9, "YELLOW"), ...ev("fever", 2, "RED")]);
    const by = Object.fromEntries(a.levels.map((c) => [c.key, c.count]));
    expect(by.RED).toBeNull();
    // ORANGE is 0 → hidden too, so RED is not the only hidden cell here.
    const b = aggregate([...ev("fever", 20, "GREEN"), ...ev("fever", 9, "YELLOW"), ...ev("fever", 7, "ORANGE"), ...ev("fever", 2, "RED")]);
    const hidden = b.levels.filter((c) => c.count === null);
    expect(hidden.length).toBeGreaterThanOrEqual(2);
  });

  it("the threshold can be raised but never lowered below the floor", () => {
    expect(aggregate([], { minCount: 1 }).minCount).toBe(MIN_COUNT);
    expect(aggregate([], { minCount: 10 }).minCount).toBe(10);
    expect(aggregate(ev("fever", 4)).triageTotal).toBeNull();
  });

  it("invalid events are ignored, not counted", () => {
    const a = aggregate([...ev("fever", 6), { ...ok, name: "x" }, { ...ok, complaint: "bad" }]);
    expect(a.triageTotal).toBe(6);
  });

  it("no cell anywhere shows a count below the threshold", () => {
    const a = aggregate(demoEvents());
    const all = [a.levels, a.complaints, a.ageGroups, a.districts, a.emergencies, a.departments].flat();
    for (const c of all) if (c.count !== null) expect(c.count).toBeGreaterThanOrEqual(MIN_COUNT);
    for (const d of a.daily) if (d.count !== null) expect(d.count).toBeGreaterThanOrEqual(MIN_COUNT);
  });
});

describe("generated events and collection", () => {
  it("generated events are deterministic and passes the same rules", () => {
    const a = demoEvents();
    expect(demoEvents()).toEqual(a);
    expect(a.every((e) => sanitize(e) !== null)).toBe(true);
  });

  it("the metrics module never sends or stores anything", () => {
    const src = readFileSync("app/lib/metrics.ts", "utf8");
    expect(src).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie/);
  });
});
