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
