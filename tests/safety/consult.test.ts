import { describe, expect, it } from "vitest";
import { DOCTOR_CHECKLIST, PATIENT_CONSENT, canJoin, isValidRoomId, newRoomId, readConfig } from "../../app/lib/consult";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";

describe("live consultation is off until a real video server is configured", () => {
  it("disabled by default", () => {
    expect(readConfig(undefined)).toEqual({ enabled: false, domain: null });
    expect(readConfig("")).toEqual({ enabled: false, domain: null });
  });
  it("rejects malformed domains and public demo servers", () => {
    for (const d of ["not a domain", "http://x.com", "localhost", "meet.jit.si", "javascript:alert(1)"]) {
      expect(readConfig(d).enabled, d).toBe(false);
    }
  });
  it("accepts a proper self-hosted domain", () => {
    expect(readConfig("consult.health.mizoram.gov.in")).toEqual({ enabled: true, domain: "consult.health.mizoram.gov.in" });
  });
});

describe("room codes carry no personal information", () => {
  it("new room codes are valid and random", () => {
    const a = newRoomId();
    const b = newRoomId();
    expect(isValidRoomId(a)).toBe(true);
    expect(a).not.toBe(b);
  });
  it("rejects anything else (including names or symptoms)", () => {
    for (const r of ["", "mhg-short", "mhg-chestpain-ramdinpuii", "MHG-AAAAAAAAAAAAAAAAAAAA", "../../etc", "mhg-aaaaaaaaaaaaaaaaaaaa?x=1"]) {
      expect(isValidRoomId(r), r).toBe(false);
    }
  });
});

describe("consent and doctor safeguards", () => {
  it("joining requires every consent box", () => {
    expect(canJoin(PATIENT_CONSENT.map(() => true))).toBe(true);
    expect(canJoin(PATIENT_CONSENT.map((_, i) => i !== 1))).toBe(false);
    expect(canJoin([])).toBe(false);
  });
  it("consent says it is not for emergencies and names 108/112", () => {
    expect(PATIENT_CONSENT.join(" ")).toMatch(/not for emergencies/);
    expect(PATIENT_CONSENT.join(" ")).toMatch(/108|112/);
  });
  it("doctor checklist requires identification, consent, and emergency redirection", () => {
    const all = DOCTOR_CHECKLIST.join(" ");
    expect(all).toMatch(/registration number/);
    expect(all).toMatch(/agrees/);
    expect(all).toMatch(/108 or 112/);
    for (const t of [...PATIENT_CONSENT, ...DOCTOR_CHECKLIST]) expect(violatesLanguagePolicy(t), t).toBeNull();
  });
});
