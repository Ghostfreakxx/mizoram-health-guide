"use client";

import CallLink from "../components/ui/CallLink";

// Fail-safe: if anything in AI Hospital breaks, never fall back to casual
// advice. Direct the person to human healthcare. (Errors are not logged here
// because they may contain health information.)
export default function AiHospitalError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-12">
        <div className="rounded-2xl border-2 border-orange-400 bg-orange-50 p-6 text-orange-950">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-lg">
            If you feel very unwell or think this may be an emergency, call 108 or 112 now. Otherwise, please see a doctor or
            health worker.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <CallLink id="ambulance-108" className="rounded-xl bg-red-700 px-6 py-3 text-lg font-bold text-white">📞 Call 108</CallLink>
            <CallLink id="erss-112" className="rounded-xl border-2 border-red-700 px-6 py-3 text-lg font-bold text-red-800">📞 Call 112</CallLink>
          </div>
        </div>
        <button type="button" onClick={() => unstable_retry()} className="rounded-xl border-2 border-slate-300 px-5 py-3 text-lg font-semibold">
          Try again
        </button>
      </div>
    </main>
  );
}
