"use client";

import { useEffect, useState } from "react";

// Slow breathing: in for 4 seconds, out for 6. Runs only while the person
// chooses, and shows the count as text so it works without the animation.
const PHASES = [
  { name: "Breathe in slowly", seconds: 4, scale: 1 },
  { name: "Breathe out slowly", seconds: 6, scale: 0.6 },
];
const ROUNDS = 6;

function Breathing() {
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0); // seconds since start

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTick((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const cycle = PHASES.reduce((a, p) => a + p.seconds, 0);
  const done = tick >= cycle * ROUNDS;
  const inCycle = tick % cycle;
  const phase = inCycle < PHASES[0].seconds ? PHASES[0] : PHASES[1];
  const left = phase === PHASES[0] ? PHASES[0].seconds - inCycle : cycle - inCycle;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stop the timer once the last round ends
    if (done) setRunning(false);
  }, [done]);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex h-56 w-56 items-center justify-center" aria-hidden>
        <div
          className="flex h-56 w-56 items-center justify-center rounded-full bg-teal-100 motion-safe:transition-transform ease-in-out"
          style={{
            transform: `scale(${running ? phase.scale : 0.8})`,
            transitionDuration: `${running ? phase.seconds : 0.3}s`,
          }}
        >
          <span className="text-5xl">🌿</span>
        </div>
      </div>
      <p role="status" className="min-h-16 text-2xl font-bold text-teal-900">
        {running ? <>{phase.name}… <span className="tabular-nums">{left}</span></> : done ? "Well done. Notice how you feel now." : "Press start when you are ready."}
      </p>
      <button
        type="button"
        onClick={() => {
          if (running) setRunning(false);
          else {
            setTick(0);
            setRunning(true);
          }
        }}
        className="rounded-xl bg-teal-800 px-6 py-4 text-lg font-bold text-white hover:bg-teal-700"
      >
        {running ? "Stop" : done ? "Again" : "Start (1 minute)"}
      </button>
    </div>
  );
}

const GROUNDING = [
  "Slowly push your feet down into the floor.",
  "Slowly straighten your back and sit up.",
  "Slowly press your hands together.",
  "Notice your breathing — in, and out.",
  "Look around. Name 5 things you can see.",
  "Listen. Name 3 things you can hear.",
  "Notice where you are and what you are doing right now.",
];

function Grounding() {
  const [step, setStep] = useState(0);
  const last = step === GROUNDING.length - 1;
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-600">Step {step + 1} of {GROUNDING.length}</p>
      <p aria-live="polite" className="min-h-20 text-2xl font-bold text-slate-900">{GROUNDING[step]}</p>
      <div className="flex gap-3">
        <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-lg font-semibold disabled:opacity-40">
          Back
        </button>
        <button type="button" onClick={() => setStep((s) => (last ? 0 : s + 1))} className="rounded-xl bg-blue-900 px-5 py-3 text-lg font-bold text-white hover:bg-blue-800">
          {last ? "Start again" : "Next"}
        </button>
      </div>
    </div>
  );
}

export default function CalmTools() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="breathe" className="rounded-2xl border-2 border-teal-200 bg-white p-6">
        <h2 id="breathe" className="text-2xl font-bold text-blue-950">Slow breathing</h2>
        <p className="mt-1 text-slate-700">Breathing out slowly can help your body calm down.</p>
        <div className="mt-6"><Breathing /></div>
      </section>
      <section aria-labelledby="ground" className="rounded-2xl border-2 border-slate-200 bg-white p-6">
        <h2 id="ground" className="text-2xl font-bold text-blue-950">Ground yourself</h2>
        <p className="mt-1 text-slate-700">When thoughts and feelings are strong, come back to the present moment.</p>
        <div className="mt-6"><Grounding /></div>
      </section>
    </div>
  );
}
