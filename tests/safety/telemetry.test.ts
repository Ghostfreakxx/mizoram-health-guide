import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sanitize } from "../../app/lib/metrics";
import { areaOf, telemetryEnabled, track } from "../../app/lib/telemetry";

const day = "2026-10-04";

describe("pilot and failure events carry category codes only", () => {
  it("accepts the allowed events", () => {
    for (const e of [
      { type: "consult_started", day, view: "text", entry: "describe" },
      { type: "consult_completed", day, level: "YELLOW" },
      { type: "consult_abandoned", day, stage: "safety-check" },
      { type: "clarification", day, kind: "help-describe" },
      { type: "display_used", day, view: "2d", reason: "save-data" },
      { type: "failure", day, kind: "3d-load", area: "consultation" },
      { type: "web_vital", day, name: "LCP", rating: "poor", area: "reception" },
    ]) expect(sanitize(e), JSON.stringify(e)).toEqual(e);
  });

  it("rejects words, error messages, paths and anything extra", () => {
    expect(sanitize({ type: "failure", day, kind: "app-error", area: "consultation", message: "Cannot read 'chest pain'" })).toBeNull();
    expect(sanitize({ type: "failure", day, kind: "TypeError: chest pain", area: "consultation" })).toBeNull();
    expect(sanitize({ type: "clarification", day, kind: "I can't breathe" })).toBeNull();
    expect(sanitize({ type: "web_vital", day, name: "LCP", rating: "poor", area: "/ai-hospital/reception?q=x" })).toBeNull();
    expect(sanitize({ type: "consult_started", day, view: "text", entry: "typed", sessionId: "abc" })).toBeNull();
    expect(sanitize({ type: "consult_completed", day: "2026-10-04T10:31:00Z", level: "GREEN" })).toBeNull();
  });

  it("is off by default: nothing is sent without a configured address", () => {
    expect(telemetryEnabled()).toBe(false);
    // track still validates (so mistakes show up in tests) but sends nothing.
    expect(track({ type: "consult_completed", level: "GREEN" })).not.toBeNull();
  });

  it("only the site area is ever reported, never the path", () => {
    expect(areaOf("/ai-hospital/departments/respiratory/room")).toBe("consultation");
    expect(areaOf("/tb")).toBe("library");
    expect(areaOf("/some/unknown/path?x=1")).toBe("other");
  });

  it("the sender never reads error messages, stacks, storage or cookies", () => {
    const src = readFileSync("app/lib/telemetry.ts", "utf8").replace(/\/\/.*$/gm, "");
    expect(src).not.toMatch(/\.message\b|\.stack\b|localStorage|sessionStorage|indexedDB|document\.cookie|credentials: "include"/);
    for (const f of ["app/error.tsx", "app/ai-hospital/error.tsx"]) {
      const e = readFileSync(f, "utf8");
      expect(e, f).not.toMatch(/console\.|error\.message|error\.stack/);
    }
  });
});
