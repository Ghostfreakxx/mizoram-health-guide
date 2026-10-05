"use client";

import { useMemo } from "react";
import { type ConsultState, type Turn, chartOf } from "../../lib/consultation";
import { basisOf } from "../../lib/consultBasis";
import { reviewRegistry } from "../../lib/review/registry";
import { getSource } from "../../lib/sources";

// Clinical review mode (open a room with ?review). For a clinician checking the
// logic during a test consultation: what was asked, why, which reviewed rule
// it comes from, its source, and its review status. Uses only the current
// (test) consultation in this tab; nothing is stored or sent.

const STATUS: Record<string, string> = {
  verified: "Verified",
  "needs-clinician-review": "Needs clinician review",
  "needs-government-verification": "Needs government verification",
  deprecated: "Deprecated",
};
const FACT: Record<string, string> = { confirmed: "confirmed", "from-words": "from patient's words", uncertain: "uncertain", "not-provided": "not provided" };

export default function ReviewPanel({ state, turn }: { state: ConsultState; turn: Turn }) {
  const registry = useMemo(() => new Map(reviewRegistry().map((i) => [i.id, i])), []);
  const b = basisOf(state, turn);
  const facts = chartOf(state).reported.filter((r) => r.provided);
  return (
    <section aria-labelledby="review-title" className="rounded-2xl border-2 border-teal-700 bg-teal-50 p-4 text-sm text-teal-950">
      <h2 id="review-title" className="text-base font-bold">Clinical review mode</h2>
      <p className="mt-0.5 text-xs">For reviewers testing the logic. Use made-up details only.</p>
      <dl className="mt-3 space-y-2">
        <div>
          <dt className="font-semibold">Current step</dt>
          <dd>
            <code>{turn.step}</code> — {b.kind.replace("-", " ")}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Why it is asked (as the patient hears it)</dt>
          <dd>{b.purpose}</dd>
        </div>
        {b.detail && (
          <div>
            <dt className="font-semibold">What the answer does</dt>
            <dd>{b.detail}</dd>
          </div>
        )}
        <div>
          <dt className="font-semibold">Rule(s)</dt>
          <dd>
            {b.ruleIds.length ? (
              <ul className="space-y-1">
                {b.ruleIds.slice(0, 8).map((id) => {
                  const it = registry.get(id);
                  return (
                    <li key={id}>
                      <code>{id}</code> — {it ? STATUS[it.status] : "not in the review list"}
                      {it && <span className="block text-xs text-teal-900">{it.title}</span>}
                    </li>
                  );
                })}
                {b.ruleIds.length > 8 && <li>…and {b.ruleIds.length - 8} more</li>}
              </ul>
            ) : (
              "Not a clinical rule (conversation step)"
            )}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Sources</dt>
          <dd>
            {b.sourceIds.length ? (
              <ul className="list-disc space-y-0.5 pl-5">
                {b.sourceIds.slice(0, 6).map((id) => {
                  const src = getSource(id);
                  return (
                    <li key={id}>
                      {src ? `${src.title} — ${src.organisation}` : id} ({src?.status === "verified" ? `checked ${src.checked}` : "not yet checked"})
                    </li>
                  );
                })}
              </ul>
            ) : (
              "None"
            )}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Recorded so far</dt>
          <dd>
            <ul className="space-y-0.5">
              {facts.map((f) => (
                <li key={f.label}>
                  {f.label}: {f.value} <span className="text-xs">[{FACT[f.status]}]</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </section>
  );
}
