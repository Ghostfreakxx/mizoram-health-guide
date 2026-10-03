// Critical pathways, end to end through the consultation engine, starting
// from the patient's own words (as in a demonstration or real use).
import { describe, expect, it } from "vitest";
import { type ConsultState, type Turn, chartOf, nextTurn, respond, startConsultation, toAnswers } from "../../app/lib/consultation";
import { summarySections } from "../../app/lib/summary";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";
import { complaints, triage } from "../../app/lib/safety/triage";

type Script = { says: string; age?: string; sex?: string; who?: string; complaint?: string; special?: string[]; yes?: string[] };

function consult(sc: Script) {
  let s: ConsultState = startConsultation("General Medicine");
  const turns: Turn[] = [];
  for (let i = 0; i < 200; i++) {
    const t = nextTurn(s);
    turns.push(t);
    if (t.input.kind === "result" || t.input.kind === "emergency") return { s, t, turns };
    let v: string | string[];
    if (t.step === "concern") v = sc.says;
    else if (t.step.startsWith("confirm:")) v = "yes";
    else if (t.step === "check") v = "none";
    else if (t.step === "who") v = sc.who ?? "self";
    else if (t.step === "age") v = sc.age ?? "adult";
    else if (t.step === "sex") v = sc.sex ?? "female";
    else if (t.step === "special") v = sc.special ?? [];
    else if (t.step === "complaint") v = sc.complaint ?? (t.input.kind === "single" ? t.input.options[0].id : "other");
    else if (t.step === "body") v = "skip";
    else if (t.step === "duration") v = "1-3-days";
    else if (t.step === "progression") v = "same";
    else if (t.step === "severity") v = "mild";
    else if (t.input.kind === "text") v = "";
    else if (t.step.startsWith("q:")) v = sc.yes?.includes(t.step.slice(2)) ? "yes" : "no";
    else if (t.input.kind === "single") v = t.input.options[0].id;
    else v = [];
    const next = respond(s, t.step, v);
    if (next === s) throw new Error(`not accepted at ${t.step}`);
    s = next;
  }
  throw new Error("did not finish");
}

const flagsOf = (t: Turn) => (t.input.kind === "emergency" ? t.input.flags : []);

describe("emergencies from the patient's own words stop the consultation immediately", () => {
  it.each([
    ["heart", "I have crushing chest pain spreading to my left arm", "chest_pain"],
    ["stroke", "My father's face is drooping and his speech is slurred", "stroke"],
    ["severe breathing difficulty", "I can't breathe and my lips are turning blue", "breathing"],
    ["overdose", "My brother took too many sleeping pills", "overdose"],
    ["suicidal crisis", "I want to kill myself", "suicide"],
    ["pregnancy emergency", "I'm pregnant and bleeding heavily", "pregnancy"],
  ])("%s", (_name, says, flag) => {
    const { t, turns } = consult({ says });
    expect(t.input.kind).toBe("emergency");
    expect(flagsOf(t)).toContain(flag);
    expect(turns.length).toBeLessThanOrEqual(2); // greeting, then Emergency Mode
  });
});

describe("emergencies reached through the questions", () => {
  it("sick young infant: not feeding → Emergency Mode", () => {
    const { t } = consult({ says: "My baby is unwell", who: "other", age: "young-infant", complaint: "child", yes: ["yi-feeding"] });
    expect(flagsOf(t)).toContain("infant");
  });
  it("pregnancy: severe headache or blurred vision → Emergency Mode", () => {
    const { t } = consult({ says: "I have a headache", age: "adult", sex: "female", special: ["pregnant"], complaint: "pregnancy", yes: ["preg-headache"] });
    expect(t.input.kind).toBe("emergency");
  });
  it("dengue danger sign: bleeding gums with fever → Emergency Mode", () => {
    const { t } = consult({ says: "I have a fever", complaint: "fever", yes: ["fever-bleeding"] });
    expect(t.input.kind).toBe("emergency");
  });
});

describe("urgent pathways route to the right real service", () => {
  it("TB warning: three-week cough → at least YELLOW, TB services suggested", () => {
    const { s, t } = consult({ says: "I've been coughing for three weeks", complaint: "cough" });
    expect(t.input.kind).toBe("result");
    const r = triage(toAnswers(s));
    expect(["ORANGE", "YELLOW"]).toContain(r.level);
    expect(chartOf(s).routing!.find((x) => x.label === "Suggested service")!.value).toMatch(/TB|Tuberculosis/);
  });
  it("dengue warning: fever gone but much weaker → ORANGE now", () => {
    const { s } = consult({ says: "I had a fever", complaint: "fever", yes: ["fever-weaker"] });
    const r = triage(toAnswers(s));
    expect(r.level).toBe("ORANGE");
    expect(r.now).toBe(true);
  });
  it("possible HIV exposure → ORANGE, HIV services suggested", () => {
    const { s } = consult({ says: "I think I was exposed to HIV two days ago", age: "adult", sex: "male", complaint: "hiv" });
    expect(triage(toAnswers(s)).level).toBe("ORANGE");
    expect(chartOf(s).routing!.find((x) => x.label === "Suggested service")!.value).toMatch(/HIV/);
  });
});

describe("nothing the system produces ever diagnoses, prescribes or doses", () => {
  const DOSE = /\b\d+(\.\d+)?\s?(mg|mcg|µg|ml|units?|tablets?|tabs?|caps?)\b/i;
  it("every complaint, every 'yes' answer: lines, chart and summary are clean", () => {
    for (const c of complaints) {
      const { s, turns } = consult({ says: "not well", complaint: c.id });
      const qs = Object.keys(s.answers);
      for (const yes of [[], ...qs.map((q) => [q])]) {
        const run = consult({ says: "not well", complaint: c.id, yes });
        const ch = chartOf(run.s);
        const lines = [
          ...turns.map((t) => t.say),
          ...run.turns.flatMap((t) => [t.say, t.then ?? "", t.hint ?? ""]),
          ...[...ch.reported, ...ch.safety, ...(ch.routing ?? [])].map((r) => `${r.label}: ${r.value}`),
          ...summarySections({ generatedAt: new Date(), mainConcern: run.s.concernText, relevant: ch.reported.map((r) => r.value) }).flatMap((x) => x.lines),
        ];
        for (const l of lines) {
          expect(violatesLanguagePolicy(l), `${c.id}: ${l}`).toBeNull();
          expect(l, `${c.id}: ${l}`).not.toMatch(DOSE);
        }
      }
    }
  });
});
