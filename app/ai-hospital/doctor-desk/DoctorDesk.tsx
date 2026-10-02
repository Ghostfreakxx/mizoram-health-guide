"use client";

import Link from "next/link";
import { useState } from "react";
import { newRoomId, whatsappInvite } from "../../lib/consult";

export default function DoctorDesk() {
  const [room, setRoom] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const link = room ? `${typeof window !== "undefined" ? window.location.origin : ""}/ai-hospital/consult/live/${room}` : "";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-6 text-lg text-blue-950">
        <p className="font-bold">For registered medical practitioners.</p>
        <p className="mt-1">
          You will be asked to sign in on the Health Department&apos;s video server. The patient link contains only a random code —
          no names or health details.
        </p>
      </div>

      {!room ? (
        <button type="button" onClick={() => { setRoom(newRoomId()); setCopied(false); }} className="w-full rounded-2xl bg-blue-900 px-6 py-5 text-xl font-bold text-white hover:bg-blue-800">
          ➕ Start a new consultation
        </button>
      ) : (
        <div className="space-y-4 rounded-2xl border-2 border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-blue-950">Send this link to the patient</h2>
          <p className="break-all rounded-xl bg-slate-100 px-4 py-3 font-mono text-lg">{link}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              className="rounded-xl border-2 border-slate-300 px-4 py-3 text-lg font-semibold"
            >
              {copied ? "✓ Copied" : "📄 Copy link"}
            </button>
            <a
              href={whatsappInvite(link)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[#1a7f45] px-4 py-3 text-center text-lg font-semibold text-white"
            >
              Send on WhatsApp
            </a>
            <Link href={`/ai-hospital/doctor-desk/room/${room}`} className="rounded-xl bg-blue-900 px-4 py-3 text-center text-lg font-bold text-white">
              🎥 Open consultation
            </Link>
          </div>
          <button type="button" onClick={() => setRoom(null)} className="text-blue-700 underline">Start a different consultation</button>
        </div>
      )}
    </div>
  );
}
