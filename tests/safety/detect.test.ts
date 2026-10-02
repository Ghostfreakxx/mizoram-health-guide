import { describe, expect, it } from "vitest";
import { detectRedFlags } from "../../app/lib/safety/detect";
import type { RedFlagId } from "../../app/lib/safety/redFlags";

function expectFlag(text: string, id: RedFlagId) {
  const d = detectRedFlags(text);
  expect(d.confirmed, `"${text}" should trigger ${id}`).toContain(id);
}

describe("red flags are detected even with reassuring words", () => {
  const cases: [string, RedFlagId][] = [
    ["I have chest pain but I'm only 24.", "chest_pain"],
    ["I think I'm having a stroke but it isn't very painful.", "stroke"],
    ["My baby is difficult to wake.", "infant"],
    ["I overdosed but I feel okay now.", "overdose"],
    ["I'm pregnant and bleeding but it isn't much.", "pregnancy"],
    ["I want to die but don't call anyone.", "suicide"],
    ["chest pain, probably nothing, I'm fit and healthy", "chest_pain"],
    ["he took too many pills but says he's fine", "overdose"],
    ["my face is drooping but no pain at all", "stroke"],
    ["can't breathe properly but I don't want to bother anyone", "breathing"],
    ["I had no fever, but now chest pain", "chest_pain"],
    ["my dad collapsed but he seems ok now", "unconscious"],
    ["I keep thinking of suicide, it's fine though", "suicide"],
    ["snake bite on my leg, small one, no pain", "snakebite"],
    ["she drank pesticide but only a little", "poisoning"],
    ["my lips are swelling but it's just a small allergy", "allergy"],
    ["just gave birth and bleeding a lot, probably normal", "postpartum"],
  ];
  it.each(cases)("%s → %s", (text, id) => expectFlag(text, id));
});

describe("spelling mistakes, case, and informal messages", () => {
  const cases: [string, RedFlagId][] = [
    ["CHEST PAIN!!!", "chest_pain"],
    ["cheast pain", "chest_pain"],
    ["chest pian", "chest_pain"],
    ["i cant breth", "breathing"],
    ["cant breathe", "breathing"],
    ["siezure", "seizure"],
    ["having a seizur", "seizure"],
    ["suicde", "suicide"],
    ["wanna die", "suicide"],
    ["overdozed", "overdose"],
    ["im preg and bleding", "pregnancy"],
    ["baby not feeding", "infant"],
    ["BaBy WoNt WaKe Up", "infant"],
    ["unconcious", "unconscious"],
    ["Heart Attack", "chest_pain"],
    ["took all my tablets", "overdose"],
    ["stroke??", "stroke"],
  ];
  it.each(cases)("%s → %s", (text, id) => expectFlag(text, id));
});

describe("multiple symptoms in one message", () => {
  it("detects every red flag mentioned", () => {
    const d = detectRedFlags("chest pain and can't breathe and I want to die");
    expect(d.confirmed).toEqual(expect.arrayContaining(["chest_pain", "breathing", "suicide"]));
  });
});

describe("negated red flags are never treated as safe", () => {
  it.each([
    ["No chest pain, just a cough", "chest_pain"],
    ["I don't have chest pain but my arm is numb", "chest_pain"],
    ["not having trouble breathing", "breathing"],
  ] as [string, RedFlagId][])("%s → needs confirmation (%s)", (text, id) => {
    const d = detectRedFlags(text);
    expect(d.confirmed).not.toContain(id);
    expect(d.needsConfirmation).toContain(id);
  });

  it.each([
    ["I don't want to die", "suicide"],
    ["I'm not pregnant... wait I am pregnant and bleeding", "pregnancy"],
    ["my baby is not feeding", "infant"],
  ] as [string, RedFlagId][])("non-negatable flag still triggers: %s", (text, id) => {
    expect(detectRedFlags(text).confirmed).toContain(id);
  });
});

describe("contradictory messages keep the red flag", () => {
  it("chest pain mentioned twice, once negated", () => {
    const d = detectRedFlags("no chest pain. actually yes, chest pain now");
    expect(d.confirmed).toContain("chest_pain");
  });
});

describe("ordinary messages do not trigger false emergencies", () => {
  it.each([
    "my baby is not feeling well",
    "I have a mild headache",
    "I've been coughing for three weeks",
    "weight gain",
    "on strike today",
    "how do I quit smoking",
    "what are the signs of diabetes",
    "I feel fit",
  ])("%s", (text) => {
    expect(detectRedFlags(text).confirmed).toEqual([]);
  });
});

describe("robust to odd input", () => {
  it.each(["", "   ", "🙂🙂🙂", "a".repeat(10000), "!!!???"])("does not throw: %s", (text) => {
    expect(() => detectRedFlags(text)).not.toThrow();
  });
  it("handles non-string input safely", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(detectRedFlags(undefined as any)).toEqual({ confirmed: [], needsConfirmation: [] });
  });
});

describe("'OD' on prescriptions means once a day, not overdose", () => {
  it.each(["what does OD mean on my prescription", "tab 1 OD after food", "BD and OD meaning", "Rx: paracetamol OD"])(
    "%s → no emergency",
    (text) => {
      expect(detectRedFlags(text).confirmed).not.toContain("overdose");
    },
  );
  it.each(["he took an OD", "I OD'd last night", "my friend did an od", "she ODd", "took too many tablets, the label says OD"])(
    "%s → overdose",
    (text) => {
      expect(detectRedFlags(text).confirmed).toContain("overdose");
    },
  );
});
