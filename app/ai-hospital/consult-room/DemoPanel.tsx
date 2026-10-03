"use client";

import { DEMO_SCENARIOS } from "../../lib/demoScenarios";

// Government demonstration mode (open the room with ?demo). Scenarios play
// the PATIENT's side only; every response comes from the real engine.

export default function DemoPanel({ active, onPlay, onReset }: { active: string | null; onPlay: (id: string) => void; onReset: () => void }) {
  return (
    <section aria-labelledby="demo-title" className="rounded-2xl border-2 border-violet-300 bg-violet-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="demo-title" className="text-lg font-bold text-violet-950">Demonstration mode</h2>
        <button type="button" onClick={onReset} className="rounded-lg border-2 border-violet-700 bg-white px-3 py-1.5 text-sm font-bold text-violet-900">
          ↺ Reset demo
        </button>
      </div>
      <p className="mt-1 text-sm text-violet-950">Scripted patient answers. Every result comes from the real safety and triage engine.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {DEMO_SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={active === s.id}
            onClick={() => onPlay(s.id)}
            className={`rounded-xl border-2 px-3 py-2 text-left text-sm ${active === s.id ? "border-violet-800 bg-violet-800 text-white" : "border-violet-200 bg-white text-violet-950 hover:border-violet-500"}`}
          >
            <span className="block font-bold">{s.letter}. {s.title}</span>
            <span className={`block truncate ${active === s.id ? "text-violet-100" : "text-violet-800"}`}>“{s.says}”</span>
          </button>
        ))}
      </div>
    </section>
  );
}
