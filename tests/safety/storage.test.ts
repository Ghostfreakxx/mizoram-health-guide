import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EMPTY_PASSPORT, addReminders, deleteAll, grantConsent, hasConsent, loadPassport, savePassport, saveSummary } from "../../app/lib/storage";

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    _map: m,
  };
}

describe("Health Passport storage requires explicit consent", () => {
  it("stores nothing without consent", () => {
    const s = fakeStorage();
    expect(hasConsent(s)).toBe(false);
    expect(savePassport({ ...EMPTY_PASSPORT, allergies: "penicillin" }, s)).toBe(false);
    expect(saveSummary("summary", s)).toBe(false);
    expect(addReminders([{ id: "1", kind: "test", title: "x", date: "2026-10-10" }], s)).toBe(false);
    expect(loadPassport(s)).toBeNull();
    expect(s._map.size).toBe(0);
  });

  it("stores and loads after consent", () => {
    const s = fakeStorage();
    expect(grantConsent(s)).toBe(true);
    expect(savePassport({ ...EMPTY_PASSPORT, allergies: "penicillin" }, s)).toBe(true);
    expect(saveSummary("my summary", s)).toBe(true);
    const p = loadPassport(s)!;
    expect(p.allergies).toBe("penicillin");
    expect(p.summaries[0].text).toBe("my summary");
  });

  it("deleteAll removes every AI Hospital key, including consent, and nothing else", () => {
    const s = fakeStorage();
    s.setItem("a11y-size", "2");
    grantConsent(s);
    savePassport({ ...EMPTY_PASSPORT, conditions: "asthma" }, s);
    deleteAll(s);
    expect(hasConsent(s)).toBe(false);
    expect(loadPassport(s)).toBeNull();
    expect(s.getItem("a11y-size")).toBe("2");
  });

  it("survives corrupted saved data", () => {
    const s = fakeStorage();
    grantConsent(s);
    s.setItem("aih:passport", "{not json");
    expect(loadPassport(s)).toEqual(EMPTY_PASSPORT);
  });
});

describe("browser storage is only used by the consent-gated module", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(p)) files.push(p);
    }
  };
  walk("app");
  // The accessibility bar stores only text size and contrast (not health data).
  const allowed = ["app/lib/storage.ts", "app/components/AccessibilityBar.tsx"];

  it("no other file touches localStorage, sessionStorage, or IndexedDB", () => {
    for (const f of files) {
      if (allowed.includes(f)) continue;
      expect(readFileSync(f, "utf8"), f).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    }
  });
});
