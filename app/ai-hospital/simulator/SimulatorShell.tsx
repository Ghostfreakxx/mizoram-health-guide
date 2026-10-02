"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import ReadAloud from "../../components/ReadAloud";
import type { Simulation } from "../data/simulator";

// The 3D scene is only downloaded when the person chooses to start it.
const Scene3D = dynamic(() => import("./Scene3D"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-lg font-semibold text-blue-900">Loading 3D view…</div>
  ),
});

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function SimulatorShell({ simulation, departmentHref }: { simulation: Simulation; departmentHref: string }) {
  const [active, setActive] = useState(0);
  const [started, setStarted] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playing, setPlaying] = useState(false);
  const steps = simulation.stations;
  const step = steps[active];
  const last = active === steps.length - 1;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability checks after mount
    setWebgl(hasWebGL());
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => {
      if (last) setPlaying(false);
      else setActive((a) => a + 1);
    }, 6000);
    return () => clearTimeout(id);
  }, [playing, active, last]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* 3D view */}
      <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100">
        <div className="relative h-[340px] sm:h-[460px]">
          {started && webgl ? (
            <div
              role="img"
              aria-label={`3D view of a typical ${simulation.name} visit. Step ${active + 1} of ${steps.length}: ${step.title}.`}
              className="h-full w-full"
            >
              <Scene3D simulation={simulation} active={active} reducedMotion={reducedMotion} />
            </div>
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-blue-100 to-slate-200 p-6 text-center">
              {webgl === false ? (
                <p className="max-w-sm text-lg text-slate-700">
                  3D is not available on this device. You can follow every step of the visit in the list beside it.
                </p>
              ) : (
                <div>
                  <p className="text-6xl" aria-hidden>🏥</p>
                  <p className="mt-3 text-lg text-slate-700">Walk through a typical visit in 3D.</p>
                  <button
                    type="button"
                    onClick={() => setStarted(true)}
                    disabled={webgl === null}
                    className="mt-4 rounded-xl bg-blue-900 px-6 py-4 text-xl font-bold text-white hover:bg-blue-800 disabled:opacity-60"
                  >
                    ▶ Start 3D tour
                  </button>
                  <p className="mt-2 text-sm text-slate-600">Uses about 1 MB of data.</p>
                </div>
              )}
            </div>
          )}
        </div>
        {started && webgl && (
          <p className="border-t border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
            Drag left or right to look around. The figure shows the patient.
          </p>
        )}
      </div>

      {/* Steps (works with or without 3D, and with screen readers) */}
      <section aria-labelledby="tour-heading" className="space-y-4">
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-600">
            Step {active + 1} of {steps.length}
          </p>
          <h2 id="tour-heading" className="mt-1 text-2xl font-bold text-blue-950">{step.title}</h2>
          <p className="mt-2 text-lg leading-relaxed text-slate-800" aria-live="polite">{step.text}</p>
          <ReadAloud text={`${step.title}. ${step.text}`} className="mt-3" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setPlaying(false); setActive((a) => Math.max(0, a - 1)); }}
              disabled={active === 0}
              className="rounded-xl border-2 border-slate-300 px-4 py-3 text-lg font-semibold text-slate-800 disabled:opacity-40"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => { setPlaying(false); setActive((a) => Math.min(steps.length - 1, a + 1)); }}
              disabled={last}
              className="rounded-xl bg-blue-900 px-4 py-3 text-lg font-bold text-white disabled:opacity-40"
            >
              Next →
            </button>
          </div>
          <button
            type="button"
            onClick={() => { if (last) setActive(0); setPlaying((p) => !p); }}
            className="mt-3 w-full rounded-xl border-2 border-blue-900 px-4 py-3 text-lg font-semibold text-blue-900"
          >
            {playing ? "❚❚ Pause tour" : "▶ Play the whole tour"}
          </button>
        </div>

        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                aria-current={i === active ? "step" : undefined}
                onClick={() => { setPlaying(false); setActive(i); }}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-lg ${
                  i === active ? "border-blue-700 bg-blue-50 font-bold text-blue-950" : "border-slate-200 bg-white text-slate-800 hover:border-blue-300"
                }`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-900 text-base font-bold text-white">{i + 1}</span>
                {s.title}
              </button>
            </li>
          ))}
        </ol>

        <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
          This is a typical visit. Every hospital is different, and this is not a model of a specific hospital.
        </p>
        <div className="grid gap-2">
          <Link href={departmentHref} className="rounded-xl border-2 border-slate-300 px-4 py-3 text-center text-lg font-semibold text-slate-800 hover:bg-slate-50">
            ← Back to the department
          </Link>
          <Link href="/ai-hospital/prepare" className="rounded-xl bg-amber-400 px-4 py-3 text-center text-lg font-bold text-blue-950 hover:bg-amber-300">
            📋 Prepare for my visit
          </Link>
        </div>
      </section>
    </div>
  );
}
