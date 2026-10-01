"use client";

import Link from "next/link";
import { useState } from "react";
import ShareButton from "../../components/ShareButton";

const habits = [
  { id: "smoke", label: "Cigarettes / bidi", icon: "🚬" },
  { id: "kuhva", label: "Kuhva / paan", icon: "🌿" },
  { id: "smokeless", label: "Khaini / gutkha / other tobacco", icon: "🫙" },
];

const presets = [10, 20, 50, 100];

function rupees(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function TobaccoCostCalculator() {
  const [spend, setSpend] = useState<Record<string, number>>({});
  const [daysPerWeek, setDaysPerWeek] = useState(7);

  const perDay = Object.values(spend).reduce((a, b) => a + (b || 0), 0);
  const perYear = (perDay * daysPerWeek * 365) / 7;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">How much do you spend in a day?</h2>
        <p className="mt-1 text-sm text-slate-500">Fill in only the ones you use.</p>

        <div className="mt-5 space-y-5">
          {habits.map((h) => (
            <div key={h.id}>
              <label htmlFor={h.id} className="flex items-center gap-2 font-medium text-slate-800">
                <span aria-hidden>{h.icon}</span> {h.label}
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-lg border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
                  <span className="pl-3 text-slate-500">₹</span>
                  <input
                    id={h.id}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={10000}
                    placeholder="0"
                    value={spend[h.id] || ""}
                    onChange={(e) =>
                      setSpend((s) => ({
                        ...s,
                        [h.id]: Math.min(10000, Math.max(0, Number(e.target.value) || 0)),
                      }))
                    }
                    className="w-24 rounded-lg px-2 py-2 text-slate-900 outline-none"
                  />
                  <span className="pr-3 text-sm text-slate-500">/ day</span>
                </div>
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSpend((s) => ({ ...s, [h.id]: p }))}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      spend[h.id] === p
                        ? "border-blue-600 bg-blue-50 text-blue-800"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    ₹{p}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <label htmlFor="days" className="font-medium text-slate-800">
              Days per week: <span className="text-blue-700">{daysPerWeek}</span>
            </label>
            <input
              id="days"
              type="range"
              min={1}
              max={7}
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Number(e.target.value))}
              className="mt-2 block w-full accent-blue-700"
            />
          </div>
        </div>
      </div>

      {perDay > 0 ? (
        <div aria-live="polite" className="rounded-2xl bg-slate-900 p-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">The real cost</p>

          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ["Every month", perYear / 12],
              ["Every year", perYear],
              ["In 5 years", perYear * 5],
              ["In 10 years", perYear * 10],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl bg-white/10 p-4">
                <dt className="text-sm text-slate-300">{label}</dt>
                <dd className="mt-1 text-2xl font-bold">{rupees(value as number)}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-lg leading-relaxed">
            Cutting down by half would save you{" "}
            <strong className="text-blue-300">{rupees(perYear / 2)}</strong> every
            year. Quitting completely saves{" "}
            <strong className="text-blue-300">{rupees(perYear * 10)}</strong>{" "}
            over
            10 years — money for your family, your children&apos;s education, or
            your home.
          </p>
          <p className="mt-3 text-slate-300">
            And the health cost is bigger: tobacco and betel nut are major causes
            of mouth cancer in Mizoram.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href="tel:1800112356"
              className="rounded-lg bg-blue-500 px-5 py-3 text-center font-semibold text-slate-950 hover:bg-blue-400"
            >
              Call free Quitline: 1800-11-2356
            </a>
            <ShareButton text="I calculated how much tobacco and kuhva really cost. Try it:" />
          </div>
        </div>
      ) : (
        <p className="text-center text-slate-500">Enter an amount to see your total.</p>
      )}

      <p className="text-center text-sm">
        <Link href="/tobacco" className="font-semibold text-blue-700 hover:underline">
          Learn about tobacco &amp; oral health →
        </Link>
      </p>
    </div>
  );
}
