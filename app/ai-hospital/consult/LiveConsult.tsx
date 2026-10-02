"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";
import { PATIENT_CONSENT, canJoin } from "../../lib/consult";
import SummaryPicker from "./SummaryPicker";

const ConsultRoom3D = dynamic(() => import("./ConsultRoom3D"), { ssr: false });
const LiveCall = dynamic(() => import("./LiveCall"), { ssr: false });

const TIPS = [
  "Tell the doctor your main problem first, and when it started.",
  "Show or read out your summary.",
  "Tell the doctor about your medicines and allergies.",
  "Ask your questions. It is fine to ask the doctor to repeat or explain.",
  "Before you finish: ask what to do next, and when to come back.",
];

export default function LiveConsult({ domain, room }: { domain: string | null; room: string }) {
  const [consents, setConsents] = useState(PATIENT_CONSENT.map(() => false));
  const [name, setName] = useState("");
  const [stage, setStage] = useState<"consent" | "call" | "ended">("consent");
  const [peers, setPeers] = useState(0);
  const onPeers = useCallback((n: number) => setPeers(n), []);
  const onEnd = useCallback(() => setStage("ended"), []);

  if (!domain) {
    return (
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-lg text-amber-950">
        <p className="text-xl font-bold">Live consultations are not available yet.</p>
        <p className="mt-2">The Health Department&apos;s video service has not been set up. Please use the other options in the consulting room.</p>
        <Link href="/ai-hospital/consult" className="mt-4 inline-block rounded-xl bg-blue-900 px-5 py-3 font-bold text-white">Back to the consulting room</Link>
      </div>
    );
  }

  if (stage === "ended") {
    return (
      <div className="space-y-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 text-lg text-emerald-950">
        <p className="text-2xl font-bold">Your consultation has ended</p>
        <p>Follow what the doctor told you. If you get worse, or a warning sign appears, get help — call 108 or 112 in an emergency.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/ai-hospital/follow-up" className="rounded-xl bg-blue-900 px-5 py-3 text-center font-bold text-white">🔔 Set follow-up reminders</Link>
          <Link href="/ai-hospital/passport" className="rounded-xl border-2 border-blue-900 px-5 py-3 text-center font-bold text-blue-900">🗂️ Update my Health Passport</Link>
        </div>
      </div>
    );
  }

  if (stage === "consent") {
    return (
      <div className="space-y-5 rounded-2xl border-2 border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-bold text-blue-950">Before you join</h2>
        <fieldset className="space-y-2">
          <legend className="text-lg font-semibold text-slate-800">Please confirm:</legend>
          {PATIENT_CONSENT.map((c, i) => (
            <label key={c} className="flex items-start gap-3 rounded-xl border-2 border-slate-200 px-4 py-3 text-lg">
              <input
                type="checkbox"
                checked={consents[i]}
                onChange={() => setConsents((x) => x.map((v, j) => (j === i ? !v : v)))}
                className="mt-1 h-5 w-5 shrink-0 accent-blue-800"
              />
              {c}
            </label>
          ))}
        </fieldset>
        <label className="block text-lg font-semibold text-slate-800">
          Your first name (shown to the doctor)
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="mt-1 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-lg" />
        </label>
        <button
          type="button"
          disabled={!canJoin(consents)}
          onClick={() => setStage("call")}
          className="w-full rounded-xl bg-blue-900 px-6 py-4 text-xl font-bold text-white disabled:opacity-50"
        >
          🎥 Join the consultation
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <div className="relative h-[420px] overflow-hidden rounded-2xl border-2 border-slate-200 sm:h-[520px]">
          {/* The 3D room is the setting; the real doctor appears on the live video. */}
          <div aria-hidden className="absolute inset-0 opacity-60">
            <ConsultRoom3D doctorPresent={peers > 0} screenText={peers > 0 ? "A doctor has joined" : "Waiting for the doctor to join…"} />
          </div>
          <div className="absolute inset-3 top-12 overflow-hidden rounded-xl shadow-2xl sm:inset-8 sm:top-14">
            <LiveCall domain={domain} room={room} displayName={name.trim() || "Patient"} onPeers={onPeers} onEnd={onEnd} />
          </div>
        </div>
        <p aria-live="polite" className="text-lg font-semibold text-blue-950">
          {peers > 0 ? "✓ A doctor has joined. Please ask the doctor to confirm their name and registration number." : "Waiting for the doctor to join…"}
        </p>
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-blue-950">During the consultation</h2>
          <ul className="mt-2 space-y-2 text-lg text-slate-800">{TIPS.map((t) => <li key={t}>• {t}</li>)}</ul>
        </div>
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-blue-950">Your summary</h2>
          <div className="mt-2"><SummaryPicker /></div>
        </div>
        <a href="tel:108" className="block rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-lg font-bold text-red-900">🚨 Emergency? Call 108</a>
      </aside>
    </div>
  );
}
