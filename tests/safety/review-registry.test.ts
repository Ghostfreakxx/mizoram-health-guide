import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reviewCsv, reviewMarkdown } from "../../app/lib/review/export";
import { SIGN_OFFS, reviewRegistry, reviewSummary } from "../../app/lib/review/registry";
import { complaints, POLICY_RULES } from "../../app/lib/safety/triage";
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
