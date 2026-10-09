import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nextTurn, respond, startConsultation } from "../../app/lib/consultation";
import { BANNED_PATTERNS, LEVEL_TEXT, violatesLanguagePolicy } from "../../app/lib/safety/language";
import { redFlags } from "../../app/lib/safety/redFlags";
import { services } from "../../app/lib/services";
import { AUTHORITATIVE_DOMAINS, getSource, sources } from "../../app/lib/sources";
import { complaints, populationQuestions } from "../../app/lib/safety/triage";

describe("source registry", () => {
  it("every source has the required fields", () => {
    for (const s of sources) {
      expect(s.id).toBeTruthy();
      expect(s.title, s.id).toBeTruthy();
      expect(s.organisation, s.id).toBeTruthy();
      expect(s.supports.length, s.id).toBeGreaterThan(0);
      expect(["verified", "awaiting-verification"]).toContain(s.status);
      if (s.status === "verified") expect(s.checked, `${s.id} is verified but has no checked date`).toBeTruthy();
    }
  });

  it("source ids are unique", () => {
    expect(new Set(sources.map((s) => s.id)).size).toBe(sources.length);
  });

  it("clinical source URLs are from authoritative domains only", () => {
    for (const s of sources) {
      if (!s.url) continue;
      const host = new URL(s.url).hostname;
      expect(AUTHORITATIVE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`)), `${s.id}: ${host}`).toBe(true);
    }
  });

  it("every sourceId referenced by rules exists", () => {
    const ids = [
      ...redFlags.flatMap((f) => f.sourceIds),
      ...populationQuestions.flatMap((q) => q.sourceIds),
      ...complaints.flatMap((c) => [...c.questions.flatMap((q) => q.sourceIds), ...(c.baseReason?.sourceIds ?? []), ...c.selfCare.flatMap((s) => s.sourceIds)]),
      ...services.map((s) => s.sourceId),
    ];
    for (const id of ids) expect(getSource(id), id).toBeDefined();
  });

  it("every red flag has guidance and a source", () => {
    for (const f of redFlags) {
      expect(f.guidance.length, f.id).toBeGreaterThan(0);
      expect(f.sourceIds.length, f.id).toBeGreaterThan(0);
    }
  });
});

describe("language policy: never diagnose, never give doses", () => {
  it("the banned-pattern checker catches diagnostic wording", () => {
    expect(violatesLanguagePolicy("You probably have dengue.")).not.toBeNull();
    expect(violatesLanguagePolicy("You have a lung infection")).not.toBeNull();
    expect(violatesLanguagePolicy("This is definitely a heart attack")).not.toBeNull();
    expect(violatesLanguagePolicy("There is a 70% chance of malaria")).not.toBeNull();
    expect(violatesLanguagePolicy("Take 500 mg twice a day")).not.toBeNull();
    expect(violatesLanguagePolicy("Based on the information you provided, seeking urgent medical assessment is recommended.")).toBeNull();
  });

  it("all fixed result messages pass", () => {
    for (const l of Object.values(LEVEL_TEXT)) {
      for (const text of [l.message, l.nowMessage ?? "", l.title, l.label]) {
        expect(violatesLanguagePolicy(text), text).toBeNull();
      }
    }
  });

  it("all triage wording passes", () => {
    const texts = [
      ...redFlags.flatMap((f) => [f.label, f.title, ...f.guidance]),
      ...populationQuestions.flatMap((q) => [q.text, q.positive, q.negative, q.help ?? ""]),
      ...complaints.flatMap((c) => [c.label, c.baseReason?.text ?? "", ...c.selfCare.map((s) => s.text), ...c.questions.flatMap((q) => [q.text, q.positive, q.negative, q.help ?? ""])]),
    ];
    for (const t of texts) expect(violatesLanguagePolicy(t), t).toBeNull();
  });

  it("has banned patterns defined", () => {
    expect(BANNED_PATTERNS.length).toBeGreaterThan(5);
  });
});

// The separate "Ask a Question" chatbot was merged into the Virtual Doctor
// (one assistant). The same messages must still open the emergency pathway.
describe("the single assistant (Reception + Virtual Doctor) uses the shared emergency detector", () => {
  it.each([
    "I have chest pain but I'm only 24.",
    "I think I'm having a stroke but it isn't very painful.",
    "My baby is difficult to wake.",
    "I overdosed but I feel okay now.",
    "I'm pregnant and bleeding but it isn't much.",
    "I want to die but don't call anyone.",
    "cheast pian",
  ])("%s → emergency (or an immediate safety question)", (q) => {
    const s = respond(startConsultation("General Medicine"), "concern", q);
    const t = nextTurn(s);
    expect(t.input.kind === "emergency" || t.step.startsWith("confirm:"), q).toBe(true);
  });

  it("suicidal messages open the crisis pathway (Tele-MANAS 14416 is on the emergency screen)", () => {
    const s = respond(startConsultation("General Medicine"), "concern", "I want to die");
    const t = nextTurn(s);
    expect(t.input.kind).toBe("emergency");
    if (t.input.kind === "emergency") expect(t.input.flags).toContain("suicide");
  });

  it("negated red flags are asked about, not dismissed", () => {
    const t = nextTurn(respond(startConsultation("General Medicine"), "concern", "no chest pain, just a cough"));
    expect(t.step).toBe("confirm:chest_pain");
  });

  it("ordinary questions are not emergencies", () => {
    const t = nextTurn(respond(startConsultation("General Medicine"), "concern", "how do I quit smoking"));
    expect(t.input.kind).not.toBe("emergency");
  });
});

describe("privacy by default (static checks)", () => {
  const roots = ["app/lib/safety", "app/ai-hospital"];
  const files: string[] = [];
  const walk = (dir: string) => {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(p)) files.push(p);
    }
  };
  roots.forEach(walk);

  it("found files to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // The one exception: the doctor's natural voice (when the site has one),
  // which sends the doctor's own sentences — never the patient's words
  // (lib/doctorVoice.ts; tests/safety/natural-voice.test.ts).
  const VOICE = join("app", "ai-hospital", "consult-room", "naturalVoice.ts");
  it("no health data in browser storage, console logs, analytics, or network calls", () => {
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src, `${f}: localStorage`).not.toMatch(/localStorage|sessionStorage|indexedDB/);
      expect(src, `${f}: console`).not.toMatch(/console\.(log|info|debug|warn)\(/);
      if (f !== VOICE) expect(src, `${f}: network`).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon/);
      expect(src, `${f}: analytics`).not.toMatch(/gtag\(|analytics/i);
    }
  });
  it("the natural voice talks only to this site's /api/voice, and filters out the patient's words", () => {
    expect(files).toContain(VOICE);
    const src = readFileSync(VOICE, "utf8");
    expect(src.match(/\bfetch\(/g)?.length).toBe(2); // availability check + the audio request
    expect(src.match(/\bfetch\(([^,)]+)/g)?.every((c) => c.includes("VOICE_PATH"))).toBe(true);
    expect(src).not.toMatch(/XMLHttpRequest|sendBeacon|https?:\/\//);
    expect(src.match(/patientWordsIn\(/g)?.length).toBeGreaterThanOrEqual(2); // when speaking and when fetching ahead
  });

  it("symptoms are never put in URLs (no query strings built from answers)", () => {
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/router\.push\([^)]*\?/);
      expect(src, f).not.toMatch(/href=\{`[^`]*\?[^`]*\$\{/);
    }
  });
});

describe("the doctor's voice stays on the device", () => {
  const v = (name: string, lang: string, localService: boolean) => ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;
  it("never picks an online (cloud) voice, even a better-sounding one", async () => {
    const { pickVoice } = await import("../../app/ai-hospital/consult-room/voice");
    expect(pickVoice([v("Google English (India) Online", "en-IN", false), v("Local English", "en-US", true)])?.name).toBe("Local English");
    expect(pickVoice([v("Microsoft Neerja Online (Natural)", "en-IN", false)])).toBeNull();
    expect(pickVoice([])).toBeNull();
  });
});
