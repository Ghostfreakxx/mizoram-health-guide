import { describe, expect, it } from "vitest";
import { receive } from "../../app/lib/safety/reception";
import { triage } from "../../app/lib/safety/triage";

describe("Digital Receptionist", () => {
  it("my mother has been coughing for three weeks → other person, cough, over 2 weeks, TB pre-filled", () => {
    const r = receive("My mother has been coughing for three weeks.");
    expect(r.detection.confirmed).toEqual([]);
    expect(r.complaintIds[0]).toBe("cough");
    expect(r.who).toBe("other");
    expect(r.relation).toBe("mother");
    expect(r.duration).toBe("over-2-weeks");
    expect(r.prefill["cough-2weeks"]).toBe("yes");
  });

  it("I've been coughing for three weeks → TB pathway at least YELLOW", () => {
    const r = receive("I've been coughing for three weeks.");
    const t = triage({
      context: { who: "self", age: "adult", special: [], complaint: r.complaintIds[0] },
      emergencyChecklist: [],
      answers: r.prefill,
      choices: {},
      duration: r.duration,
      progression: "same",
      severity: "mild",
    });
    expect(["RED", "ORANGE", "YELLOW"]).toContain(t.level);
    expect(t.departments).toContain("tb-services");
  });

  it("I had possible HIV exposure yesterday → HIV, 72-hour question pre-filled yes → ORANGE now", () => {
    const r = receive("I had possible HIV exposure yesterday");
    expect(r.complaintIds[0]).toBe("hiv");
    expect(r.prefill["hiv-72h"]).toBe("yes");
    const t = triage({
      context: { who: "self", age: "adult", special: [], complaint: "hiv" },
      emergencyChecklist: [],
      answers: r.prefill,
      choices: {},
      duration: r.duration ?? "1-3-days",
      progression: "same",
      severity: "mild",
    });
    expect(t.level).toBe("ORANGE");
    expect(t.now).toBe(true);
  });

  it("My fever disappeared but now I feel much weaker → fever, dengue warning pre-filled → ORANGE now", () => {
    const r = receive("My fever disappeared but now I feel much weaker");
    expect(r.complaintIds[0]).toBe("fever");
    expect(r.prefill["fever-weaker"]).toBe("yes");
    const t = triage({
      context: { who: "self", age: "adult", special: [], complaint: "fever" },
      emergencyChecklist: [],
      answers: r.prefill,
      choices: {},
      duration: "4-14-days",
      progression: "better",
      severity: "mild",
    });
    expect(t.level).toBe("ORANGE");
    expect(t.now).toBe(true);
  });

  it("emergency messages are detected before anything else", () => {
    expect(receive("I have chest pain but I'm only 24").detection.confirmed).toContain("chest_pain");
    expect(receive("my baby is difficult to wake").detection.confirmed).toContain("infant");
    expect(receive("I want to die but don't call anyone").detection.confirmed).toContain("suicide");
  });

  it("recognises special situations", () => {
    expect(receive("I am pregnant and have a headache").special).toContain("pregnant");
    expect(receive("I am pregnant and have a headache").complaintIds[0]).toBe("headache");
    expect(receive("I have HIV and a fever").special).toContain("immunocompromised");
    expect(receive("my 3 week old baby has a fever").ageHint).toBe("young-infant");
    expect(receive("my grandmother feels dizzy").ageHint).toBe("older");
  });

  it("never pre-fills a 'no' answer", () => {
    for (const msg of ["coughing 3 weeks", "fever gone, feel weak", "hiv exposure today", "headache"]) {
      for (const v of Object.values(receive(msg).prefill)) expect(v).not.toBe("no");
    }
  });

  it("unknown messages give no complaint rather than a guess", () => {
    expect(receive("hello").complaintIds).toEqual([]);
  });
});
