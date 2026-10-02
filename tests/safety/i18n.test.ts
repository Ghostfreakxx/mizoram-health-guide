import { describe, expect, it } from "vitest";
import { catalog, catalogByKey } from "../../app/i18n/catalog";
import { type Translations, coverage, effectiveLocale, isUsable, lus, protectedTokens, surfaceReady, translate } from "../../app/i18n";
import { redFlags } from "../../app/lib/safety/redFlags";

const reviewed = (text: string) => ({ text, status: "reviewed" as const, reviewer: "Test Reviewer", reviewedOn: "2026-10-02" });

describe("translation catalogue", () => {
  it("keys are unique and every entry has English text", () => {
    expect(new Set(catalog.map((e) => e.key)).size).toBe(catalog.length);
    for (const e of catalog) expect(e.text.trim(), e.key).not.toBe("");
  });
  it("covers every emergency sign and its first-response steps", () => {
    for (const f of redFlags) {
      expect(catalogByKey.has(`redflag.${f.id}.label`)).toBe(true);
      f.guidance.forEach((_, i) => expect(catalogByKey.has(`redflag.${f.id}.guidance.${i}`)).toBe(true));
    }
  });
});

describe("shipped Mizo translations are valid", () => {
  it("every translation key exists in the catalogue", () => {
    for (const k of Object.keys(lus)) expect(catalogByKey.has(k), k).toBe(true);
  });
  it("reviewed translations name a reviewer and a date, and keep emergency numbers", () => {
    for (const [k, t] of Object.entries(lus)) {
      if (t.status !== "reviewed") continue;
      expect(t.reviewer, k).toBeTruthy();
      expect(t.reviewedOn, k).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const n of protectedTokens(catalogByKey.get(k)!.text)) expect(t.text, `${k} must keep ${n}`).toContain(n);
    }
  });
});

describe("the Mizo safety gate", () => {
  it("draft or unattributed translations are never shown", () => {
    const t: Translations = {
      "emergency.ambulance": { text: "X", status: "draft" },
      "emergency.national": { text: "Y", status: "reviewed" },
    };
    expect(translate("lus", "emergency.ambulance", t)).toBe("Ambulance");
    expect(translate("lus", "emergency.national", t)).toBe("National emergency number");
  });

  it("a translation that drops an emergency number is rejected", () => {
    expect(isUsable("emergency.call108", reviewed("Call now"))).toBe(false);
    expect(isUsable("emergency.call108", reviewed("108 call"))).toBe(true);
  });

  it("a surface stays fully English until 100% of its safety-critical strings are reviewed", () => {
    const partial: Translations = Object.fromEntries(
      catalog.filter((e) => e.surface === "emergency").slice(0, 5).map((e) => [e.key, reviewed(`${e.text} [lus]`)]),
    );
    expect(surfaceReady("emergency", partial)).toBe(false);
    expect(effectiveLocale("lus", "emergency", partial)).toBe("en");

    const full: Translations = Object.fromEntries(
      catalog.filter((e) => e.surface === "emergency").map((e) => [e.key, reviewed(`${e.text} [lus]`)]),
    );
    expect(coverage("emergency", full).percent).toBe(100);
    expect(effectiveLocale("lus", "emergency", full)).toBe("lus");
    expect(translate("lus", "emergency.call108", full)).toBe("Call 108 [lus]");
    // Emergency being ready does not switch triage.
    expect(effectiveLocale("lus", "triage", full)).toBe("en");
  });

  it("English is always the default", () => {
    expect(effectiveLocale("en", "emergency")).toBe("en");
  });
});
