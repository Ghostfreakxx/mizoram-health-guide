"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type RedFlagId, getRedFlag } from "../../lib/safety/redFlags";
import { type Reception, receive } from "../../lib/safety/reception";
import { AGE_GROUPS, DURATIONS, getComplaint } from "../../lib/safety/triage";
import { getService } from "../../lib/services";
import { getDepartment } from "../data/departments";
import EmergencyMode from "../components/EmergencyMode";
import { roomForDepartments, setPendingConcern } from "../consult-room/handoff";
import { preloadConsultation } from "../consult-room/preload";
import { roomFor } from "../consult-room/rooms";
import { BigChoice, StepTitle } from "../components/ui";
import { track } from "../../lib/telemetry";

// Reception: the patient's own words → an immediate safety check → a short
// "here is what I understood" → the consultation. It never diagnoses and
// never asks the patient to pick a medical category.

const EXAMPLES = [
  "I don't feel well.",
  "I have been coughing for three weeks.",
  "My child has a fever.",
  "My mother has been having chest pain.",
];

type Stage =
  | { kind: "ask" }
  | { kind: "confirm"; flags: RedFlagId[]; reception: Reception }
  | { kind: "understood"; reception: Reception };

export default function ReceptionDesk() {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "ask" });
  const [emergency, setEmergency] = useState<RedFlagId[] | null>(null);
  const router = useRouter();

  function submit(message: string) {
    const r = receive(message);
    if (r.detection.confirmed.length > 0) {
      for (const flag of r.detection.confirmed) track({ type: "emergency_shown", flag });
      setEmergency(r.detection.confirmed);
      return;
    }
    if (r.detection.needsConfirmation.length > 0) {
      setStage({ kind: "confirm", flags: r.detection.needsConfirmation, reception: r });
      return;
    }
    setStage({ kind: "understood", reception: r });
  }

  // The words go to the consultation in memory (never in the address).
  function consult(r: Reception | null, view?: "text") {
    const c = r?.complaintIds[0] ? getComplaint(r.complaintIds[0]) : undefined;
    const slug = roomForDepartments(c?.departments ?? [], (d) => !!roomFor(d));
    if (r) setPendingConcern(text);
    const q = view ? `?view=${view}` : r ? "" : "?start=describe";
    router.push(`/ai-hospital/departments/${slug}/room${q}`);
  }

  if (emergency) {
    return <EmergencyMode flags={emergency} onExit={() => { setEmergency(null); setStage({ kind: "ask" }); }} />;
  }

  if (stage.kind === "confirm") {
    const titles = stage.flags.map((f) => getRedFlag(f).title.toLowerCase()).join(" or ");
    return (
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <StepTitle hint="You mentioned this, so we need to check.">Is anyone having {titles} right now?</StepTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <BigChoice
            tone="danger"
            onClick={() => {
              for (const flag of stage.flags) track({ type: "emergency_shown", flag });
              setEmergency(stage.flags);
            }}
          >
            Yes, or I am not sure
          </BigChoice>
          <BigChoice onClick={() => setStage({ kind: "understood", reception: stage.reception })}>No, not right now</BigChoice>
        </div>
      </div>
    );
  }

  if (stage.kind === "understood") {
    const r = stage.reception;
    const c = r.complaintIds[0] ? getComplaint(r.complaintIds[0]) : undefined;
    const dept = c ? getDepartment(c.departments[0]) : undefined;
    const service = (c?.services ?? []).map(getService).find((s) => !!s);
    const age = AGE_GROUPS.find((g) => g.id === r.ageHint)?.label;
    const duration = DURATIONS.find((d) => d.id === r.duration)?.label;
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <StepTitle>Here is what I understood</StepTitle>
          <dl className="mt-5 grid gap-4 text-lg sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold text-slate-600">You said</dt>
              <dd>“{text.trim()}”</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-slate-600">For</dt>
              <dd>{r.who === "other" ? `Someone else${r.relation ? ` (${r.relation})` : ""}` : r.who === "self" ? "You" : "Not sure yet — the doctor will ask"}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-slate-600">Main concern</dt>
              <dd>{c ? `${c.icon} ${c.label}` : "Not clear yet — that's fine, the doctor will help you describe it"}</dd>
            </div>
            {age && (
              <div>
                <dt className="text-sm font-semibold text-slate-600">Age</dt>
                <dd>{age} (the doctor will confirm)</dd>
              </div>
            )}
            {duration && (
              <div>
                <dt className="text-sm font-semibold text-slate-600">How long</dt>
                <dd>{duration}</dd>
              </div>
            )}
            {dept && (
              <div>
                <dt className="text-sm font-semibold text-slate-600">Usually seen by</dt>
                <dd>
                  {dept.icon} {dept.plainName}
                </dd>
              </div>
            )}
          </dl>
          {service && (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-slate-700">
              A free government service that may help: <strong>{service.name}</strong> — {service.description}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-blue-900 p-6 text-white">
          <p className="text-lg">Next, the virtual doctor asks a few questions, one at a time, to find out how urgent this is and prepare a summary for a real doctor or nurse.</p>
          <button
            type="button"
            onPointerEnter={preloadConsultation}
            onFocus={preloadConsultation}
            onClick={() => consult(r)}
            className="mt-4 w-full rounded-xl bg-amber-400 px-6 py-4 text-xl font-bold text-blue-950"
          >
            Start the consultation →
          </button>
          <button type="button" onClick={() => consult(r, "text")} className="mt-3 w-full rounded-xl border-2 border-white/70 px-6 py-3 text-lg font-semibold text-white">
            Text only — lighter, for slow internet
          </button>
        </div>
        <button type="button" onClick={() => setStage({ kind: "ask" })} className="text-lg text-blue-700 underline">
          ← Change what I wrote
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) submit(text);
        }}
      >
        <label htmlFor="reception-text" className="block text-2xl font-bold text-blue-950">
          What is the problem?
        </label>
        <p className="mt-1 text-lg text-slate-600">In your own words. Simple words are fine — for example who is unwell, what is wrong, and since when.</p>
        <textarea
          id="reception-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={500}
          className="mt-4 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-xl text-slate-900 outline-none focus:border-blue-700"
          placeholder="My mother has been coughing for three weeks"
        />
        <button type="submit" disabled={!text.trim()} className="mt-4 w-full rounded-xl bg-blue-900 px-6 py-4 text-xl font-bold text-white hover:bg-blue-800 disabled:opacity-50">
          Continue →
        </button>
        <p className="mt-3 text-sm text-slate-600">What you write stays in this browser tab. It is not saved or sent anywhere.</p>
      </form>

      <button
        type="button"
        onPointerEnter={preloadConsultation}
        onClick={() => consult(null)}
        className="flex w-full items-center gap-4 rounded-2xl border-2 border-blue-900 bg-white p-5 text-left hover:bg-blue-50"
      >
        <span aria-hidden className="text-4xl">🧍</span>
        <span>
          <span className="block text-xl font-bold text-blue-950">I can&apos;t explain it — help me describe it</span>
          <span className="block text-slate-600">Show where it is on a body picture, then answer simple questions.</span>
        </span>
      </button>

      <div>
        <p className="text-lg font-semibold text-slate-700">Or tap an example:</p>
        <div className="mt-2 grid gap-2">
          {EXAMPLES.map((e) => (
            <BigChoice
              key={e}
              onClick={() => {
                setText(e);
                submit(e);
              }}
            >
              “{e}”
            </BigChoice>
          ))}
        </div>
      </div>
    </div>
  );
}
