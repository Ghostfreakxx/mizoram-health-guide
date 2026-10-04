"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { LEVEL_TEXT } from "../lib/safety/language";
import type { Level } from "../lib/safety/triage";
import { getServerVisit, getVisit, subscribeVisit } from "../lib/visit";

// "What type of care should I look for?" — the four navigation levels, in the
// same reviewed wording the consultation uses. If this tab has a visit, its
// level is highlighted. Clinical routing only: no facility is recommended
// here, and nothing commercial.

const ORDER: Level[] = ["RED", "ORANGE", "YELLOW", "GREEN"];
const STYLE: Record<Level, string> = {
  RED: "border-red-300 bg-red-50 text-red-950",
  ORANGE: "border-orange-300 bg-orange-50 text-orange-950",
  YELLOW: "border-amber-300 bg-amber-50 text-amber-950",
  GREEN: "border-emerald-300 bg-emerald-50 text-emerald-950",
};

export default function CareTypeGuide() {
  const visit = useSyncExternalStore(subscribeVisit, getVisit, getServerVisit);
  const mine = (visit?.level ?? null) as Level | null;
  return (
    <div className="space-y-3">
      {mine && (
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-blue-950" role="status">
          From your consultation in this tab: <strong>{LEVEL_TEXT[mine].title}</strong>.{" "}
          <Link href="/my-visit" className="font-semibold underline">
            Open My Visit
          </Link>
        </p>
      )}
      <ol className="grid gap-3 md:grid-cols-2">
        {ORDER.map((l) => (
          <li key={l} className={`rounded-2xl border-2 p-4 ${STYLE[l]} ${mine === l ? "ring-4 ring-blue-700" : ""}`} aria-current={mine === l ? "true" : undefined}>
            <p className="text-lg font-bold">
              <span aria-hidden>{LEVEL_TEXT[l].icon}</span> {LEVEL_TEXT[l].title}
              {mine === l && <span className="ml-2 rounded-full bg-blue-900 px-2 py-0.5 text-xs font-bold text-white">Your result</span>}
            </p>
            <p className="mt-1">{LEVEL_TEXT[l].message.replace(/^Based on the information you provided, /, "").replace(/^./, (c) => c.toUpperCase())}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
