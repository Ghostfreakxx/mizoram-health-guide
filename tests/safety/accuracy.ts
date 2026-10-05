// Conversation accuracy: does the doctor record what the patient MEANT?
//
// Each simulated patient knows their intended answer (an option id) and says
// it in one of many realistic phrasings — plain, casual, hedged, misspelt,
// long-winded, Indian English. After each answer the recorded value is
// compared with the intent:
//   correct      — recorded exactly what was meant
//   asked again  — not understood; the doctor asked another way (a cost, not a danger)
//   WRONG        — recorded something the patient did not mean
//   UNSAFE       — a "yes"/"not sure" to a danger-sign question was not recorded as such
// Not clinical validation: it measures the language layer at scale. Phrasings
// are English only; Mizo needs reviewed phrase lists from qualified translators.

import { type ConsultState, type Turn, converse, nextTurn, respond, startConsultation } from "../../app/lib/consultation";
import { questionsFor, complaints } from "../../app/lib/safety/triage";

export const PHRASES: Record<string, Record<string, string[]>> = {
  yesno: {
    yes: ["yes", "yeah", "yes it is", "ya", "yep", "yes I have that", "I think so", "yes, since morning", "yess", "yes doctor", "yes, a little", "it is there", "sure, yes", "correct", "true"],
    no: ["no", "nope", "not really", "nah", "no I don't", "not at all", "no, nothing like that", "I don't think so", "never", "no no", "noo", "not that I know of", "no doctor", "none", "it's not there"],
    unsure: ["not sure", "maybe", "I don't know", "dunno", "can't say", "I'm not certain", "hard to say", "possibly", "idk", "no idea"],
  },
  duration: {
    today: ["it started today", "this morning", "since today", "just today", "a few hours ago", "since this afternoon"],
    "1-3-days": ["since yesterday", "two days", "2 days", "day before yesterday", "for 3 days", "since 2 days"],
    "4-14-days": ["about a week", "since last week", "10 days", "5 days", "one week", "for a week now"],
    "over-2-weeks": ["a month", "three weeks", "since 2 months", "for months", "more than two weeks", "since last year"],
  },
  progression: {
    better: ["getting better", "improving", "a bit better now", "it's better", "better than before"],
    same: ["same", "no change", "about the same", "it's the same as before", "not changing"],
    worse: ["worse", "getting worse", "it is increasing", "worse than before", "worse day by day"],
  },
  severity: {
    mild: ["mild", "not too bad", "I can still work", "a little", "it's mild"],
    moderate: ["moderate", "quite bad", "it's hard to work", "medium"],
    severe: ["very bad", "severe", "I can't do anything", "terrible", "I can hardly get up"],
  },
  who: {
    self: ["me", "myself", "for me", "it's me", "it is for myself"],
    other: ["my son", "for my mother", "someone else", "my friend", "my husband"],
  },
  age: {
    "young-infant": ["my baby is 3 weeks old", "1 month old", "a newborn"],
    "child-under-5": ["she is 3", "2 years old", "he is 4 years"],
    child: ["12 years", "he is 10", "she's 15"],
    adult: ["I'm 34", "45 years", "25", "I am 50 years old"],
    older: ["65", "I'm 70 years old", "my age is 82", "over 60"],
  },
  side: {
    left: ["left side", "on the left", "left"],
    right: ["right side", "on the right", "right"],
    both: ["both sides", "both"],
    middle: ["in the middle", "middle", "centre"],
  },
  "c:temp": {
    "not-measured": ["I didn't check", "not measured", "no thermometer"],
    "below-38": ["37.5", "it was 37 degrees"],
    "38-39": ["38.5", "it was 38", "38.2 degrees"],
    "39-plus": ["39.5", "40 degrees", "it was 39"],
  },
};

// Held-out set A — first measured untuned (85.7% understood, 0 unsafe,
// 9 wrong → fixed), then its misses were added to the vocabulary. It is now
// effectively training data.
export const HELD_OUT_A: Record<string, Record<string, string[]>> = {
  yesno: {
    yes: ["yes I do", "yeah it is", "yup", "definitely", "absolutely", "yes, quite a lot", "a bit, yes", "uh huh", "yes sometimes", "I do have that", "that's right", "of course"],
    no: ["no I haven't", "nothing like that", "no, not at all", "not that I noticed", "no it doesn't", "not really no", "nah not really", "i haven't noticed that", "no sir", "negative"],
    unsure: ["I'm not too sure", "i cant tell", "difficult to say", "i honestly don't know", "not sure really", "might be", "could be"],
  },
  duration: {
    today: ["started a few hours back", "only since this evening", "from today morning"],
    "1-3-days": ["since 2 days back", "for the last two days", "three days now", "from yesterday"],
    "4-14-days": ["almost a week", "around 10 days", "since about a week", "for 6 days"],
    "over-2-weeks": ["more than a month", "around 3 weeks", "it's been 2 months", "for a long time now"],
  },
  progression: {
    better: ["it's improving slowly", "a little better", "better now"],
    same: ["still the same", "it's not improving or worse", "same same"],
    worse: ["it's getting bad to worse", "it has increased", "becoming worse"],
  },
  severity: {
    mild: ["just a little", "slight", "it's manageable"],
    moderate: ["it's quite bad actually", "difficult to work", "fairly bad"],
    severe: ["really really bad", "unbearable", "I can't even get out of bed"],
  },
};

// Held-out set B — written after the fixes above and NEVER used to tune the
// engine. Its numbers are the honest estimate. When it is used for tuning,
// record its score, rename it, and write a new set (ideally from real
// phrasings collected with consent in a pilot).
export const HELD_OUT_B: Record<string, Record<string, string[]>> = {
  yesno: {
    yes: ["yes there is", "yes I have it", "I have", "yes yes", "it happens yes", "mostly yes", "yes, two times", "it was there yesterday also", "yeah sometimes", "exactly"],
    no: ["no doctor, nothing", "no I don't think so", "not at all doctor", "I didn't notice anything like that", "no, it's fine", "nothing of that sort", "no not like that", "none of that", "it hasn't happened"],
    unsure: ["I am not sure doctor", "not sure about that", "don't know exactly", "maybe a little, not sure", "i can't remember", "I didn't check"],
  },
  duration: {
    today: ["since few hours", "it began today itself", "this morning only"],
    "1-3-days": ["2 days back", "last 3 days", "since day before yesterday"],
    "4-14-days": ["one week back", "last one week", "about 8 days"],
    "over-2-weeks": ["one month back", "since 3 weeks", "many weeks", "almost 2 months"],
  },
  progression: {
    better: ["slightly better", "going down now", "it is reducing"],
    same: ["no improvement", "it's constant", "like before only"],
    worse: ["more painful now", "it's getting more", "worsening"],
  },
  severity: {
    mild: ["very little", "bearable", "it's okay mostly"],
    moderate: ["it bothers me a lot", "it's hard to sleep", "kind of bad"],
    severe: ["I can't walk", "extreme", "very very painful"],
  },
};

const DANGER = (() => {
  const ids = new Set<string>();
  for (const q of [...complaints.flatMap((c) => c.questions), ...questionsFor({ who: "self", age: "adult", special: [], complaint: "other" })])
    if ("emergency" in q.yes || ("level" in q.yes && (q.yes.level === "ORANGE" || q.yes.now))) ids.add(q.id);
  return ids;
})();

function bankFor(step: string, phrases: Record<string, Record<string, string[]>>): Record<string, string[]> | null {
  if (step.startsWith("q:")) return phrases.yesno ?? null;
  return phrases[step] ?? null;
}

function recorded(s: ConsultState, step: string): string | undefined {
  if (step.startsWith("q:")) return s.answers[step.slice(2)];
  if (step === "side") return s.bodySide;
  if (step === "c:temp") return s.choices.temp;
  return (s as unknown as Record<string, string | undefined>)[step];
}

export type Tally = { correct: number; again: number; wrong: number; unsafe: number; byStep: Record<string, { n: number; correct: number; again: number; wrong: number }>; failures: string[]; missed: Record<string, number> };

function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const OPENINGS = ["I've been coughing for three weeks", "fever since yesterday", "my stomach hurts", "I have a rash on my arm", "my child has a fever", "I have a headache", "it burns when I pass urine", "my eye is red", "my back hurts", "my knee is swollen", "pain in my chest on the left", "I feel dizzy"];

// Runs `n` seeded patients; each answers every question it can in words.
export function measure(n: number, phrases = PHRASES): Tally {
  const tally: Tally = { correct: 0, again: 0, wrong: 0, unsafe: 0, byStep: {}, failures: [], missed: {} };
  for (let seed = 1; seed <= n; seed++) {
    const r = rng(seed);
    let s = startConsultation("General Medicine");
    for (let i = 0; i < 80; i++) {
      const t: Turn = nextTurn(s);
      if (t.input.kind === "emergency" || t.input.kind === "result") break;
      if (t.step === "concern") {
        const o = converse(s, t, OPENINGS[Math.floor(r() * OPENINGS.length)]);
        s = "state" in o ? o.state : s;
        continue;
      }
      const opts = "options" in t.input ? t.input.options.map((o) => o.id) : [];
      const bank = bankFor(t.step, phrases);
      const intents = bank ? opts.filter((o) => bank[o]) : [];
      if (!bank || !intents.length || recorded(s, t.step) !== undefined) {
        // Not measured here: answer by button and move on.
        const v = t.input.kind === "multi" ? [] : t.input.kind === "text" ? "" : t.step === "check" ? "none" : opts.includes("no") ? "no" : opts[0];
        const next = respond(s, t.step, v);
        if (next === s) break;
        s = next;
        continue;
      }
      // Mostly "no" on yes/no questions (as in real visits), so consultations run long.
      const intent = t.step.startsWith("q:") && r() < 0.6 ? "no" : intents[Math.floor(r() * intents.length)];
      const words = bank[intent][Math.floor(r() * bank[intent].length)];
      const o = converse(s, t, words);
      const after = "state" in o ? o.state : s;
      const got = recorded(after, t.step);
      const st = (tally.byStep[t.step.startsWith("q:") ? "q (yes/no)" : t.step] ??= { n: 0, correct: 0, again: 0, wrong: 0 });
      st.n++;
      const emergencyOpened = !s.emergency && !!after.emergency;
      if (got === intent || (emergencyOpened && intent !== "no")) {
        tally.correct++;
        st.correct++;
      } else if (got === undefined && !emergencyOpened) {
        tally.again++;
        st.again++;
        const key = `${t.step.startsWith("q:") ? "q" : t.step}: "${words}"`;
        tally.missed[key] = (tally.missed[key] ?? 0) + 1;
      } else {
        tally.wrong++;
        st.wrong++;
        const unsafe = t.step.startsWith("q:") && DANGER.has(t.step.slice(2)) && intent !== "no" && got === "no";
        if (unsafe) tally.unsafe++;
        if (tally.failures.length < 60) tally.failures.push(`${unsafe ? "UNSAFE " : ""}${t.step}: meant ${intent}, said "${words}", recorded ${got ?? (emergencyOpened ? "EMERGENCY" : "-")}`);
      }
      if (got === undefined && !emergencyOpened) {
        // Not understood: the patient then taps the button they meant.
        const next = respond(after, t.step, intent);
        s = next === after ? after : next;
      } else s = after;
    }
  }
  return tally;
}
