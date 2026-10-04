"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Button, ButtonLink, EmptyState, Notice } from "../components/ui";
import CallLink from "../components/ui/CallLink";
import { SUMMARY_LABEL } from "../lib/summary";
import { clearVisit, getServerVisit, getVisit, subscribeVisit } from "../lib/visit";

export default function MyVisit() {
  const visit = useSyncExternalStore(subscribeVisit, getVisit, getServerVisit);
  const [copied, setCopied] = useState(false);

  if (!visit) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
        <EmptyState title="No visit yet in this tab">
          When you finish a consultation or make a summary, it appears here until you close the tab.
        </EmptyState>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/ai-hospital/reception">Tell us what&apos;s wrong</ButtonLink>
          <ButtonLink href="/ai-hospital/prepare" tone="secondary">
            Prepare for a visit
          </ButtonLink>
        </div>
      </div>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(visit!.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: "Patient-prepared visit summary", text: visit!.text });
      else await copy();
    } catch {
      // Cancelled.
    }
  }

  const time = new Date(visit.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
      {visit.recommendation && (
        <Notice tone={visit.level === "ORANGE" ? "warn" : "info"} title="What to do next">
          {visit.recommendation}
          {visit.departments && visit.departments.length > 0 && <p className="mt-1">Where: {visit.departments.join(", ")}.</p>}
          <p className="mt-1 text-sm">
            If things get worse, call <CallLink id="ambulance-108" /> or <CallLink id="erss-112" />.
          </p>
        </Notice>
      )}

      <article className="print-area rounded-2xl border-2 border-slate-300 bg-white p-6 text-slate-900">
        <h2 className="text-xl font-bold">Patient-prepared visit summary</h2>
        <p className="text-sm text-slate-600">
          {SUMMARY_LABEL} Updated {time}.
        </p>
        <div className="mt-4 space-y-4">
          {visit.sections.map((s) => (
            <div key={s.heading}>
              <h3 className="font-bold text-blue-950">{s.heading}</h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {s.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </article>

      <div className="no-print grid gap-3 sm:grid-cols-3">
        <Button onClick={() => window.print()}>🖨️ Print / Save as PDF</Button>
        <Button tone="secondary" onClick={copy}>
          {copied ? "✓ Copied" : "📄 Copy"}
        </Button>
        <Button tone="secondary" onClick={share}>
          ↗ Share
        </Button>
      </div>
      <p role="status" className="sr-only">
        {copied ? "Summary copied" : ""}
      </p>

      <div className="no-print flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
        <ButtonLink href="/find-care" tone="secondary">
          📍 Find care
        </ButtonLink>
        <Link href="/ai-hospital/follow-up" className="font-semibold text-blue-800 underline">
          Set a reminder
        </Link>
        <Button tone="quiet" onClick={clearVisit} className="ml-auto">
          Clear this visit
        </Button>
      </div>
    </div>
  );
}
