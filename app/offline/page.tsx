import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "You are offline" };

// Shown by the service worker when there is no connection and the page
// was not saved. Works without JavaScript.
export default function OfflinePage() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <h1 className="text-3xl font-bold text-blue-950">📶 You are offline</h1>
        <p className="text-lg text-slate-700">This page has not been saved on your phone yet. Emergency numbers still work without internet:</p>
        <div className="grid gap-3">
          <a href="tel:108" className="rounded-2xl bg-red-700 px-6 py-5 text-3xl font-black text-white">🚑 Call 108</a>
          <a href="tel:112" className="rounded-2xl border-4 border-red-700 px-6 py-4 text-2xl font-black text-red-800">📞 Call 112</a>
          <a href="tel:14416" className="rounded-2xl bg-violet-800 px-6 py-4 text-xl font-bold text-white">Tele-MANAS 14416</a>
        </div>
        <p className="text-lg text-slate-700">These pages are saved and work offline:</p>
        <ul className="grid gap-2 text-lg">
          <li><Link href="/ai-hospital/emergency" className="font-semibold text-blue-800 underline">Emergency Mode</Link></li>
          <li><Link href="/helplines" className="font-semibold text-blue-800 underline">Helplines</Link></li>
          <li><Link href="/ai-hospital" className="font-semibold text-blue-800 underline">AI Hospital</Link></li>
          <li><Link href="/ai-hospital/triage" className="font-semibold text-blue-800 underline">Triage Desk</Link></li>
          <li>…and any page you opened before while online.</li>
        </ul>
      </div>
    </main>
  );
}
