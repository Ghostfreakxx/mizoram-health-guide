"use client";

import { DEMO_SCENARIOS, type DemoScenario } from "../../lib/demoScenarios";

// Demonstration mode (open the room with ?demo). Scenarios play the
// PATIENT's side only; every response comes from the real engine.

function Choice({ s, active, onPlay }: { s: DemoScenario; active: boolean; onPlay: (id: string) => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onPlay(s.id)}
      className={`rounded-xl border-2 px-3 py-2 text-left text-sm ${active ? "border-violet-800 bg-violet-800 text-white" : "border-violet-200 bg-white text-violet-950 hover:border-violet-500"}`}
    >
      <span className="block font-bold">
        {s.letter}. {s.title}
      </span>
      <span className={`block ${active ? "text-violet-100" : "text-violet-800"}`}>{s.shows}</span>
    </button>
  );
}

export default function DemoPanel({ active, onPlay, onReset }: { active: string | null; onPlay: (id: string) => void; onReset: () => void }) {
  const core = DEMO_SCENARIOS.filter((s) => s.group === "core");
  const more = DEMO_SCENARIOS.filter((s) => s.group === "more");
  const current = DEMO_SCENARIOS.find((s) => s.id === active);
  return (
    <section aria-labelledby="demo-title" className="rounded-2xl border-2 border-violet-300 bg-violet-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="demo-title" className="text-lg font-bold text-violet-950">Demonstration mode</h2>
        <button type="button" onClick={onReset} className="rounded-lg border-2 border-violet-700 bg-white px-3 py-1.5 text-sm font-bold text-violet-900">
          ↺ End demo scenario — reset
        </button>
      </div>
      <p className="mt-1 text-sm text-violet-950">The patient&apos;s side is scripted. Every reply, question and result comes from the real safety and consultation engine.</p>
      {current && (
        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-violet-950" role="status">
          Playing {current.letter}: “{current.says}”
        </p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {core.map((s) => (
          <Choice key={s.id} s={s} active={active === s.id} onPlay={onPlay} />
        ))}
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-violet-900">More scenarios</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {more.map((s) => (
            <Choice key={s.id} s={s} active={active === s.id} onPlay={onPlay} />
          ))}
        </div>
      </details>
    </section>
  );
}
