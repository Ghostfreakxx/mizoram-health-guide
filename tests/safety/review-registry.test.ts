import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { spokenLines } from "./spokenLines";
import { reviewCsv, reviewMarkdown } from "../../app/lib/review/export";
import { SIGN_OFFS, reviewRegistry, reviewSummary } from "../../app/lib/review/registry";
import { complaints, POLICY_RULES, populationQuestions } from "../../app/lib/safety/triage";
import { redFlags } from "../../app/lib/safety/redFlags";

describe("clinical review registry", () => {
  const items = reviewRegistry();

  it("the committed review files are current (run `npm run review:export`)", () => {
    expect(readFileSync("docs/CLINICAL_REVIEW.md", "utf8")).toBe(reviewMarkdown(items));
    expect(readFileSync("docs/review/review-items.csv", "utf8")).toBe(reviewCsv(items));
  });

  it("every rule the engine uses is listed, with a unique ID", () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of redFlags) expect(ids).toContain(`RF-${f.id}`);
    for (const c of complaints) for (const q of c.questions) expect(ids).toContain(`TQ-${q.id}`);
    for (const q of populationQuestions) expect(ids).toContain(`TQ-${q.id}`);
    for (const r of Object.values(POLICY_RULES)) expect(ids).toContain(r.id);
  });

  it("no rule cites a source that does not exist", () => {
    expect(reviewSummary(items).missingSources).toEqual([]);
  });

  it("every red flag and triage question cites at least one source", () => {
    for (const i of items.filter((x) => ["red-flag", "triage-question", "triage-policy"].includes(x.kind))) expect(i.sourceIds.length, i.id).toBeGreaterThan(0);
  });

  it("nothing is marked verified without a recorded sign-off or checked data", () => {
    for (const i of items.filter((x) => x.status === "verified")) {
      if (i.reviewer === "clinician") expect(i.signOff?.decision, i.id).toBe("approved");
    }
    for (const s of SIGN_OFFS) expect(items.some((i) => i.id === s.itemId), s.itemId).toBe(true);
  });
});

describe("curated health answers", () => {
  it("each curated question gets its own answer, not a neighbour's", async () => {
    const { EDUCATION_IDS, findEducation } = await import("../../app/lib/education");
    const src = readFileSync("app/lib/education.ts", "utf8");
    for (const id of EDUCATION_IDS) {
      const q = new RegExp(`id: "${id}", question: "([^"]+)"`).exec(src)![1];
      expect(findEducation(q)?.id, q).toBe(id);
    }
  });
});

describe("every question the doctor asks can be traced", () => {
  it("each turn of many consultations maps to rule IDs that exist in the review list", async () => {
    const { basisOf } = await import("../../app/lib/consultBasis");
    const { nextTurn, respond, startConsultation, converse } = await import("../../app/lib/consultation");
    const ids = new Set(reviewRegistry().map((i) => i.id));
    for (const opening of ["I've been coughing for three weeks", "fever since yesterday", "my child has diarrhoea", "I'm pregnant and my feet are swollen", "my back hurts", "I can't explain it", "chest pain"]) {
      let s = startConsultation("General Medicine");
      const o = converse(s, nextTurn(s), opening);
      if ("state" in o) s = o.state;
      for (let i = 0; i < 60; i++) {
        const t = nextTurn(s);
        const b = basisOf(s, t);
        for (const r of b.ruleIds) expect(ids.has(r), `${opening} / ${t.step} → ${r}`).toBe(true);
        if (b.kind === "safety" || b.kind === "triage-question") expect(b.sourceIds.length, t.step).toBeGreaterThan(0);
        if (["result", "emergency"].includes(t.step)) break;
        const opts = "options" in t.input ? t.input.options.map((x) => x.id) : [];
        const v = t.step === "check" ? "none" : t.input.kind === "multi" ? [] : t.input.kind === "text" ? "" : opts.includes("no") ? "no" : opts[0];
        s = respond(s, t.step, v);
      }
    }
  });
});

describe("everything the doctor says about urgency, emergencies, medicines or diagnosis is on the review list", () => {
  it("every such spoken sentence comes from a registered review item", () => {
    const rules = reviewRegistry().map((r) => r.rule).join("\n");
    const SAFETY = /\b(108|112|emergency|urgent|urgently|immediately|prescribe|medicines?|doses?|diagnos\w*|tests?|serious)\b/i;
    // Not advice: the greeting (its department name and promise), the recap of
    // the patient's own words, and history questions about medicines taken.
    const NOT_ADVICE = /^(I'm your virtual health guide for [A-Z][\w &]+\.|If anything you tell me suggests an emergency, I'll tell you immediately\.|You told me about\b|Do you know what medicines|Does the patient have any allergies to medicines|Do you have any allergies to medicines)/;
    const missing = new Set<string>();
    for (const line of spokenLines())
      for (const sentence of line.split(/(?<=[.!?])\s+/))
        if (SAFETY.test(sentence) && !NOT_ADVICE.test(sentence) && !rules.includes(sentence.trim())) missing.add(sentence.trim());
    expect([...missing]).toEqual([]);
  });
});
