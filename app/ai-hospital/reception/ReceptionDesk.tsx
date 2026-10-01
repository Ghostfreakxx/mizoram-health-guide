"use client";

import { useState } from "react";
import { type RedFlagId, getRedFlag } from "../../lib/safety/redFlags";
import { type Reception, receive } from "../../lib/safety/reception";
import { AGE_GROUPS, DURATIONS, complaints, getComplaint } from "../../lib/safety/triage";
import { getService } from "../../lib/services";
import { getDepartment } from "../data/departments";
import EmergencyMode from "../components/EmergencyMode";
import TriageFlow from "../components/TriageFlow";
import { BigChoice, StepTitle } from "../components/ui";

const EXAMPLES = [
  "My mother has been coughing for three weeks",
  "I have had a fever since yesterday",
  "My baby is not feeding well",
  "I feel sad all the time",
  "I had possible HIV exposure yesterday",
];

type Stage =
  | { kind: "ask" }
  | { kind: "confirm"; flags: RedFlagId[]; reception: Reception }
  | { kind: "understood"; reception: Reception; complaint?: string }
  | { kind: "triage"; reception: Reception; complaint: string };

export default function ReceptionDesk() {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "ask" });
  const [emergency, setEmergency] = useState<RedFlagId[] | null>(null);

  function submit(message: string) {
    const r = receive(message);
    if (r.detection.confirmed.length > 0) {
      setEmergency(r.detection.confirmed);
      return;
    }
    if (r.detection.needsConfirmation.length > 0) {
      setStage({ kind: "confirm", flags: r.detection.needsConfirmation, reception: r });
      return;
    }
    setStage({ kind: "understood", reception: r, complaint: r.complaintIds[0] });
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
          <BigChoice tone="danger" onClick={() => setEmergency(stage.flags)}>Yes, or I am not sure</BigChoice>
          <BigChoice onClick={() => setStage({ kind: "understood", reception: stage.reception, complaint: stage.reception.complaintIds[0] })}>
            No, not right now
          </BigChoice>
        </div>
      </div>
    );
  }

  if (stage.kind === "triage") {
    const r = stage.reception;
    return (
      <TriageFlow
        start={{
          who: r.who,
          relation: r.relation,
          age: r.ageHint,
          special: r.special,
          complaint: stage.complaint,
          prefill: stage.complaint === r.complaintIds[0] ? r.prefill : {},
          duration: r.duration,
          concernText: text.trim().slice(0, 200),
        }}
      />
    );
  }

  if (stage.kind === "understood") {
    const r = stage.reception;
    const c = stage.complaint ? getComplaint(stage.complaint) : undefined;
    const dept = c ? getDepartment(c.departments[0]) : undefined;
    const services = (c?.services ?? []).map(getService).filter((s): s is NonNullable<typeof s> => !!s);
    const age = AGE_GROUPS.find((g) => g.id === r.ageHint)?.label;
    const duration = DURATIONS.find((d) => d.id === r.duration)?.label;
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <StepTitle>Here is what I understood</StepTitle>
          <dl className="mt-5 grid gap-4 text-lg sm:grid-cols-2">
            <div><dt className="text-sm font-semibold text-slate-600">For</dt><dd>{r.who === "other" ? `Someone else${r.relation ? ` (${r.relation})` : ""}` : r.who === "self" ? "You" : "Not sure yet"}</dd></div>
            <div><dt className="text-sm font-semibold text-slate-600">Main concern</dt><dd>{c ? `${c.icon} ${c.label}` : "Not sure yet — please choose below"}</dd></div>
            {age && <div><dt className="text-sm font-semibold text-slate-600">Age</dt><dd>{age} (please confirm)</dd></div>}
            {duration && <div><dt className="text-sm font-semibold text-slate-600">How long</dt><dd>{duration}</dd></div>}
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h3 className="text-xl font-bold text-blue-950">{c ? "Is this the main concern? You can change it." : "Choose the main concern"}</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {complaints.map((x) => (
              <BigChoice key={x.id} selected={stage.complaint === x.id} onClick={() => setStage({ ...stage, complaint: x.id })} className="flex items-center gap-3">
                <span aria-hidden className="text-2xl">{x.icon}</span> {x.label}
              </BigChoice>
            ))}
          </div>
        </div>

        {c && (
          <div className="grid gap-4 sm:grid-cols-2">
            {dept && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-600">Likely department</p>
                <p className="mt-1 text-xl font-bold text-blue-900">{dept.icon} {dept.plainName}</p>
              </div>
            )}
            {services.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-600">Government service that may help</p>
                <p className="mt-1 text-lg font-bold text-blue-900">{services[0].name}</p>
                <p className="text-slate-600">{services[0].description}</p>
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl bg-blue-900 p-6 text-white">
          <p className="text-lg">To decide how urgent this is and whether an online consultation is suitable, I need to ask a few quick questions.</p>
          <button
            type="button"
            disabled={!stage.complaint}
            onClick={() => stage.complaint && setStage({ kind: "triage", reception: r, complaint: stage.complaint })}
            className="mt-4 w-full rounded-xl bg-amber-400 px-6 py-4 text-xl font-bold text-blue-950 disabled:opacity-50"
          >
            Continue to quick questions →
          </button>
        </div>
        <button type="button" onClick={() => setStage({ kind: "ask" })} className="text-lg text-blue-700 underline">← Change what I wrote</button>
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
        <p className="mt-1 text-lg text-slate-600">Write a short sentence. For example: who is unwell, what is wrong, and since when.</p>
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
        <p className="mt-3 text-sm text-slate-600">What you write stays on this page. It is not saved or sent anywhere.</p>
      </form>

      <div>
        <p className="text-lg font-semibold text-slate-700">Or tap an example:</p>
        <div className="mt-2 grid gap-2">
          {EXAMPLES.map((e) => (
            <BigChoice key={e} onClick={() => { setText(e); submit(e); }}>
              “{e}”
            </BigChoice>
          ))}
        </div>
      </div>
    </div>
  );
}
