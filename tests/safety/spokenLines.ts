// Every line the director gives to the voice: consultations through every
// room (button answers), detours at each step (why / meaning / health and
// professional questions / asking for a doctor), results, and an emergency.
// Shared by the lip-sync and review-traceability tests.

import { type ConsultState, type Outcome, type Turn, converse, nextTurn, respond, startConsultation } from "../../app/lib/consultation";
import { planReply, planTurn } from "../../app/ai-hospital/consult-room/doctor/director";
import { ROOMS } from "../../app/ai-hospital/consult-room/rooms";

const OPENINGS = ["I've been coughing for three weeks", "fever since yesterday", "my stomach hurts", "I have a rash on my arm", "my child has a fever", "my temperature was 39°C", "I have a headache", "my baby has diarrhoea", "it burns when I pass urine", "I feel weird"];
const ASIDES = ["why do you ask", "what does that mean", "how does TB spread?", "can I take paracetamol?", "I already told you", "what disease do I have?", "do I need a blood test?", "is it serious?", "I want to talk to a real doctor", "what is the cure for xyzzy disease?"];
const RED = /^(breathing|chest_pain|stroke|unconscious|seizure|bleeding|allergy|severe_infection|overdose|poisoning|snakebite|injury|suicide|pregnancy|postpartum|infant)$/;

export function spokenLines(): string[] {
  const lines = new Set<string>();
  const say = (t: Turn, first: boolean) => planTurn(t, { first, lastSaid: "", reducedMotion: false }).lines.forEach((l) => lines.add(l.text));
  const reply = (o: Outcome, s: ConsultState, t: Turn) => {
    if (o.kind === "answered" || o.kind === "repeat") return;
    const next = nextTurn("state" in o ? o.state : s);
    planReply(o, t, next).lines.forEach((l) => lines.add(l.text));
  };
  const rooms = [{ greeting: "General Medicine", intro: undefined, focus: undefined }, ...Object.values(ROOMS)];
  for (const room of rooms) {
    for (const [k, opening] of OPENINGS.entries()) {
      let s = startConsultation(room.greeting, room.intro, room.focus);
      for (let i = 0; i < 60; i++) {
        const t = nextTurn(s);
        say(t, i === 0);
        if (t.input.kind === "emergency" || t.input.kind === "result") break;
        if (i >= 1 && i <= 4) reply(converse(s, t, ASIDES[(k + i) % ASIDES.length]), s, t);
        if (t.step === "concern") {
          const o = converse(s, t, opening);
          s = "state" in o ? o.state : s;
          continue;
        }
        const opts = "options" in t.input ? t.input.options.map((o) => o.id) : [];
        const value = t.input.kind === "multi" ? [] : t.input.kind === "text" ? "" : t.step === "check" ? "none" : opts.includes("no") ? "no" : (opts.find((o) => !RED.test(o)) ?? opts[0] ?? "");
        const next = respond(s, t.step, value);
        if (next === s) break;
        s = next;
      }
    }
  }
  // The emergency, spoken mid-visit.
  let s = startConsultation("General Medicine");
  const t = nextTurn(s);
  const o = converse(s, t, "my chest feels crushed and I can't breathe");
  s = "state" in o ? o.state : s;
  say(nextTurn(s), false);
  return [...lines].filter(Boolean);
}

