import { describe, expect, it } from "vitest";
import { departments, getDepartment } from "../../app/ai-hospital/data/departments";
import { type Hospital, displayable, hospitals, verificationStatus } from "../../app/ai-hospital/data/hospitals";
import { publicFacts, teleconsultServices } from "../../app/ai-hospital/data/teleconsult";
import { AI_HOSPITAL } from "../../app/config";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";
import { complaints, getComplaint } from "../../app/lib/safety/triage";
import { getService } from "../../app/lib/services";
import { SUMMARY_LABEL, summarySections, summaryText } from "../../app/lib/summary";

describe("AI Hospital identity", () => {
  it("name and subtitle are configured centrally", () => {
    expect(AI_HOSPITAL.name).toBe("AI Hospital");
    expect(AI_HOSPITAL.subtitle).toBe("Digital Front Door to Healthcare");
  });
  it("never claims to diagnose, prescribe, or replace a doctor", () => {
    expect(AI_HOSPITAL.boundary).toMatch(/does not diagnose, prescribe, or replace a doctor/);
    const all = Object.values(AI_HOSPITAL).join(" ");
    expect(all).not.toMatch(/first in (india|the world)/i);
    expect(all).not.toMatch(/replaces? (your|a) doctor\b(?!.*not)/i);
  });
});

describe("virtual departments", () => {
  it("has the 17 required departments", () => {
    const required = [
      "emergency", "general-medicine", "paediatrics", "obstetrics-gynaecology", "oncology", "cardiology", "respiratory",
      "mental-health", "ent", "dental", "dermatology", "orthopaedics", "eye-care", "infectious-diseases", "hiv-services",
      "tb-services", "substance-use",
    ];
    expect(departments).toHaveLength(17);
    for (const slug of required) expect(getDepartment(slug), slug).toBeDefined();
  });

  it("every department has the required content and valid links", () => {
    for (const d of departments) {
      expect(d.commonReasons.length, d.slug).toBeGreaterThan(0);
      expect(d.expect.length, d.slug).toBeGreaterThan(0);
      expect(d.bring.length, d.slug).toBeGreaterThan(0);
      expect(d.online, d.slug).toBeTruthy();
      if (d.slug !== "emergency") expect(d.emergencyInstead.length, d.slug).toBeGreaterThan(0);
      for (const s of d.services) expect(getService(s), `${d.slug}: ${s}`).toBeDefined();
      if (d.triageComplaint) expect(getComplaint(d.triageComplaint), d.slug).toBeDefined();
    }
  });

  it("every triage complaint routes to existing departments", () => {
    for (const c of complaints) for (const slug of c.departments) expect(getDepartment(slug), `${c.id} → ${slug}`).toBeDefined();
  });

  it("department wording never diagnoses or gives doses", () => {
    for (const d of departments) {
      for (const t of [d.summary, d.online, ...d.commonReasons, ...d.emergencyInstead, ...d.goInPerson, ...d.expect, ...d.bring]) {
        expect(violatesLanguagePolicy(t), `${d.slug}: ${t}`).toBeNull();
      }
    }
  });
});

describe("hospital navigator: verified information only", () => {
  const evidence = { sourceTitle: "Test source", organisation: "Test org", checked: "2026-10-01" };

  it("seed hospitals are NEEDS VERIFICATION and show no contact details", () => {
    for (const h of hospitals) {
      expect(verificationStatus(h)).toBe("NEEDS VERIFICATION");
      const d = displayable(h);
      expect(d.phone).toBeUndefined();
      expect(d.address).toBeUndefined();
      expect(d.emergency).toBeUndefined();
      expect(d.services).toBeUndefined();
    }
  });

  it("a field without evidence is never displayed", () => {
    const h: Hospital = {
      id: "x",
      name: { value: "X" },
      district: { value: "Aizawl" },
      type: { value: "Public" },
      phone: { value: "000" },
      emergency: { value: true },
      lastVerified: null,
    };
    expect(displayable(h).phone).toBeUndefined();
    expect(displayable(h).emergency).toBeUndefined();
  });

  it("VERIFIED only when every required field has evidence and lastVerified is set", () => {
    const full: Hospital = {
      id: "y",
      name: { value: "Y", evidence },
      district: { value: "Aizawl", evidence },
      type: { value: "Public", evidence },
      address: { value: "Somewhere", evidence },
      phone: { value: "000", evidence },
      emergency: { value: true, evidence },
      lastVerified: "2026-10-01",
    };
    expect(verificationStatus(full)).toBe("VERIFIED");
    expect(verificationStatus({ ...full, lastVerified: null })).toBe("NEEDS VERIFICATION");
    expect(verificationStatus({ ...full, phone: { value: "000" } })).toBe("NEEDS VERIFICATION");
  });
});

describe("eSanjeevani / teleconsult: no unverified facts are published", () => {
  it("public facts only include checked facts", () => {
    for (const s of teleconsultServices) {
      for (const f of publicFacts(s)) expect(f.checked).toBeTruthy();
    }
  });
  it("eSanjeevani is currently unverified, so no workflow facts are public", () => {
    const e = teleconsultServices.find((s) => s.id === "esanjeevani")!;
    expect(e.officialUrl.verified).toBe(false);
    expect(publicFacts(e)).toEqual([]);
  });
});

describe("doctor summary contains only what the patient supplied", () => {
  const generatedAt = new Date("2026-10-01T10:30:00+05:30");

  it("always carries the label and generation time", () => {
    const text = summaryText({ generatedAt });
    expect(text).toContain(SUMMARY_LABEL);
    expect(text).toContain("Generated:");
  });

  it("an empty summary invents nothing", () => {
    expect(summarySections({ generatedAt })).toEqual([]);
  });

  it("includes supplied fields and omits missing ones", () => {
    const s = summarySections({
      generatedAt,
      mainConcern: "Cough",
      medicines: "Metformin",
      allergies: "  ",
      negatives: ["No fever"],
    });
    const headings = s.map((x) => x.heading);
    expect(headings).toContain("Main concern");
    expect(headings).toContain("Current medicines");
    expect(headings).toContain("Asked about and reported as NOT present");
    expect(headings).not.toContain("Known allergies");
    expect(headings).not.toContain("Existing health conditions");
  });

  it("the navigation result is labelled as guidance, not a diagnosis", () => {
    const text = summaryText({ generatedAt, triage: { level: "YELLOW — Consultation recommended", recommendation: "See a doctor", departments: [] } });
    expect(text).toMatch(/not a diagnosis/i);
    expect(violatesLanguagePolicy(text)).toBeNull();
  });
});

describe("3D department simulators", () => {
  // Imported lazily so the test file stays readable.
  it("every department has a simulation built only from department content", async () => {
    const { simulations, getSimulation } = await import("../../app/ai-hospital/data/simulator");
    expect(simulations).toHaveLength(17);
    for (const d of departments) {
      const sim = getSimulation(d.slug)!;
      expect(sim, d.slug).toBeDefined();
      expect(sim.stations.length, d.slug).toBeGreaterThanOrEqual(d.expect.length + 2);
      // Every visit step in the department page appears in the tour, unchanged.
      for (const step of d.expect) expect(sim.stations.some((s) => s.text === step), `${d.slug}: ${step}`).toBe(true);
      for (const s of sim.stations) {
        expect(s.equipment.length + (s.id === "wait" || s.id === "leave" ? 1 : 0), `${d.slug}/${s.id}`).toBeGreaterThan(0);
        expect(violatesLanguagePolicy(s.text), s.text).toBeNull();
      }
    }
  });

  it("the emergency tour tells people to call 108/112 and skips the waiting step", async () => {
    const { getSimulation } = await import("../../app/ai-hospital/data/simulator");
    const sim = getSimulation("emergency")!;
    expect(sim.stations[0].text).toMatch(/108|112/);
    expect(sim.stations.some((s) => s.id === "wait")).toBe(false);
  });
});

describe("medicine information never prescribes or doses", () => {
  it("has no dose instructions and every entry is sourced", async () => {
    const { medicines, generalSafety, labelTerms } = await import("../../app/ai-hospital/data/medicines");
    const { getSource } = await import("../../app/lib/sources");
    for (const m of medicines) {
      for (const t of [m.usedFor, ...m.keyPoints, ...m.getHelp]) {
        expect(violatesLanguagePolicy(t), t).toBeNull();
        expect(t, t).not.toMatch(/\b\d+(\.\d+)?\s?(mg|mcg|g|ml|units?|tablets?|puffs?)\b/i);
      }
      expect(m.sourceIds.length, m.id).toBeGreaterThan(0);
      for (const s of m.sourceIds) expect(getSource(s), `${m.id}: ${s}`).toBeDefined();
    }
    for (const p of generalSafety.points) expect(violatesLanguagePolicy(p)).toBeNull();
    expect(labelTerms.length).toBeGreaterThan(5);
  });
});

describe("lab report explainer never interprets results", () => {
  it("preserves values, units, and ranges exactly as typed", async () => {
    const { preserveEntry } = await import("../../app/ai-hospital/data/labTests");
    const e = { value: " 9.80 ", unit: "g/dL", range: "12.0 - 15.5" };
    expect(preserveEntry(e)).toEqual(e);
  });

  it("test explanations contain no judgement words about a result", async () => {
    const { labTests, RANGE_EXPLANATION } = await import("../../app/ai-hospital/data/labTests");
    expect(RANGE_EXPLANATION).toMatch(/Only your doctor can say/);
    for (const t of labTests) {
      for (const text of [t.measures, t.whyDone, ...t.notes]) {
        expect(violatesLanguagePolicy(text), text).toBeNull();
        expect(text, text).not.toMatch(/\byour (result|value) (is|shows) (high|low|normal|abnormal)\b/i);
      }
    }
  });

  it("the explainer component does not compare or label results", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("app/ai-hospital/lab-reports/LabExplainer.tsx", "utf8");
    expect(src).not.toMatch(/parseFloat|Number\(|\bhigh\b.*\blow\b|abnormal/i);
  });
});
