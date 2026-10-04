"use client";

import Link from "next/link";
import { useEffect } from "react";
import CallLink from "./components/ui/CallLink";
import { reportFailure } from "./lib/telemetry";

// Any page that fails: emergency numbers first, then a way back. Only the
// kind of failure is reported (when configured), never the error message.
export default function SiteError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    reportFailure("app-error");
  }, []);
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-12">
        <h1 className="text-2xl font-bold text-blue-950">This page could not be shown</h1>
        <p className="text-lg text-slate-700">
          If this is an emergency, call <CallLink id="ambulance-108" /> or <CallLink id="erss-112" /> now.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => unstable_retry()} className="rounded-xl bg-blue-900 px-5 py-3 text-lg font-semibold text-white">
            Try again
          </button>
          <Link href="/" className="rounded-xl border-2 border-slate-300 px-5 py-3 text-lg font-semibold">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
