// Conversation accuracy: what the patient meant vs what the doctor recorded.
// See accuracy.ts for the method; `npm run quality:report` writes the
// numbers to docs/quality/CONVERSATION_ACCURACY.md.

import { describe, expect, it } from "vitest";
import { type Turn, interpretText } from "../../app/lib/consultation";
import { HELD_OUT_A, HELD_OUT_B, PHRASES, measure } from "./accuracy";

const pct = (t: ReturnType<typeof measure>) => t.correct / (t.correct + t.again + t.wrong);

describe("the doctor records what the patient meant", () => {
  for (const [name, phrases, floor] of [
    ["training phrasings", PHRASES, 0.99],
    ["held-out set A (now tuned against)", HELD_OUT_A, 0.97],
    ["held-out set B (never tuned against — the honest estimate)", HELD_OUT_B, 0.85],
  ] as const)
    it(`${name}: never a wrong or unsafe recording; understood ≥ ${floor * 100}%`, () => {
      const t = measure(400, phrases);
      expect(t.failures).toEqual([]);
      expect(t.unsafe).toBe(0);
      expect(t.wrong).toBe(0);
      expect(pct(t)).toBeGreaterThanOrEqual(floor);
    }, 30_000);
});

describe("bugs this harness found (pinned)", () => {
  const q = { step: "q:head-worst", say: "Is this the worst headache you have ever had?", input: { kind: "single", options: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }, { id: "unsure", label: "Not sure" }] } } as unknown as Turn;
  const one = (step: string, ids: string[]) => ({ step, say: "", input: { kind: "single", options: ids.map((id) => ({ id, label: id })) } }) as unknown as Turn;
  it("'I'm not certain' is not sure — it was recorded as no", () => expect(interpretText(q, "I'm not certain")).toBe("unsure"));
  it("'I didn't check' / 'I can't remember' is not sure — it was recorded as no", () => {
    expect(interpretText(q, "I didn't check")).toBe("unsure");
    expect(interpretText(q, "I can't remember")).toBe("unsure");
    expect(interpretText(q, "I didn't notice anything like that")).toBe("no");
  });
  it("a hedged yes ('I think so', 'probably') is a yes — it was recorded as not sure", () => {
    expect(interpretText(q, "I think so")).toBe("yes");
    expect(interpretText(q, "probably")).toBe("yes");
    expect(interpretText(q, "I don't think so")).toBe("no");
  });
  it("'more than two weeks' is over 2 weeks — it was recorded as 4 days to 2 weeks", () =>
    expect(interpretText(one("duration", ["today", "1-3-days", "4-14-days", "over-2-weeks"]), "more than two weeks")).toBe("over-2-weeks"));
  it("'not improving or worse' is the same — it was recorded as better", () => {
    const p = one("progression", ["better", "same", "worse"]);
    expect(interpretText(p, "it's not improving or worse")).toBe("same");
    expect(interpretText(p, "not getting better")).toBeNull(); // same or worse: asked, not guessed
  });
});
