"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { DOCTOR_CHECKLIST } from "../../../../lib/consult";

const LiveCall = dynamic(() => import("../../../consult/LiveCall"), { ssr: false });

export default function DoctorRoom({ domain, room }: { domain: string; room: string }) {
  const [name, setName] = useState("");
  const [reg, setReg] = useState("");
  const [joined, setJoined] = useState(false);
  const [done, setDone] = useState<boolean[]>(DOCTOR_CHECKLIST.map(() => false));
  const [peers, setPeers] = useState(0);
  const onPeers = useCallback((n: number) => setPeers(n), []);
  const onEnd = useCallback(() => setJoined(false), []);

  if (!joined) {
    return (
      <form
        className="space-y-4 rounded-2xl border-2 border-slate-200 bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && reg.trim()) setJoined(true);
        }}
      >
        <h2 className="text-2xl font-bold text-blue-950">Join as the doctor</h2>
        <label className="block text-lg font-semibold">Your name<input required value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="mt-1 w-full rounded-xl border-2 border-slate-300 px-4 py-3" /></label>
        <label className="block text-lg font-semibold">Medical registration number<input required value={reg} onChange={(e) => setReg(e.target.value)} maxLength={30} className="mt-1 w-full rounded-xl border-2 border-slate-300 px-4 py-3" /></label>
        <p className="text-sm text-slate-600">Shown to the patient as your display name. Not stored by AI Hospital.</p>
        <button type="submit" className="w-full rounded-xl bg-blue-900 px-6 py-4 text-xl font-bold text-white">🎥 Join</button>
      </form>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="h-[520px] overflow-hidden rounded-2xl border-2 border-slate-200">
        <LiveCall domain={domain} room={room} displayName={`Dr ${name.trim()} (Reg. ${reg.trim()})`} onPeers={onPeers} onEnd={onEnd} />
      </div>
      <aside className="space-y-3 rounded-2xl border-2 border-slate-200 bg-white p-5">
        <p aria-live="polite" className="font-semibold text-blue-950">{peers > 0 ? "✓ Patient connected" : "Waiting for the patient…"}</p>
        <h2 className="text-xl font-bold text-blue-950">Checklist</h2>
        {DOCTOR_CHECKLIST.map((c, i) => (
          <label key={c} className="flex items-start gap-3">
            <input type="checkbox" checked={done[i]} onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))} className="mt-1 h-5 w-5 shrink-0 accent-blue-800" />
            <span>{c}</span>
          </label>
        ))}
      </aside>
    </div>
  );
}
