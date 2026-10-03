"use client";

import Link from "next/link";
import { useState } from "react";
import { type Sex, screeningFor } from "../../lib/screening";
import { BigChoice } from "../components/ui";

const SEXES: { id: Sex; label: string }[] = [
  { id: "female", label: "Woman" },
  { id: "male", label: "Man" },
  { id: "other", label: "Other / prefer not to say" },
];

export default function ScreeningCheck() {
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [shown, setShown] = useState(false);
  const result = shown ? screeningFor(Number(age), sex) : null;

  return (
    <div className="space-y-6">
      <form
        className="space-y-5 rounded-2xl border-2 border-slate-200 bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setShown(true);
        }}
      >
        <div>
          <label htmlFor="age" className="block text-xl font-bold text-blue-950">Your age</label>
          <input
            id="age"
            inputMode="numeric"
            pattern="[0-9]*"
            value={age}
            onChange={(e) => {
              setAge(e.target.value.replace(/\D/g, "").slice(0, 3));
              setShown(false);
            }}
            className="mt-2 w-32 rounded-xl border-2 border-slate-300 px-4 py-3 text-lg"
          />
        </div>
        <fieldset>
          <legend className="text-xl font-bold text-blue-950">You are a…</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {SEXES.map((s) => (
              <BigChoice key={s.id} selected={sex === s.id} onClick={() => { setSex(s.id); setShown(false); }}>
                {s.label}
              </BigChoice>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="rounded-xl bg-blue-900 px-6 py-4 text-lg font-bold text-white hover:bg-blue-800">
          Show my free check-ups
        </button>
        <p className="text-slate-600">Your answers stay on this page. They are not saved or sent.</p>
      </form>

      <div aria-live="polite">
        {result && !result.ok && <p role="alert" className="text-lg font-semibold text-red-800">{result.error}</p>}
        {result?.ok && !result.eligible && (
          <p className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-lg text-slate-800">{result.message}</p>
        )}
        {result?.ok && result.eligible && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-blue-950">Free check-ups you can ask for</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {result.checks.map((c) => (
                <li key={c.id} className="rounded-2xl border-2 border-green-200 bg-green-50 p-5">
                  <p className="text-xl font-bold text-slate-900"><span aria-hidden>✅ </span>{c.name}</p>
                  <p className="mt-1 text-slate-700">{c.what}</p>
                </li>
              ))}
            </ul>
            {sex === "other" && (
              <p className="text-slate-700">Which checks are right for you depends on your body. The health worker will talk this through with you, in private.</p>
            )}
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 text-lg text-slate-800">
              <p className="font-bold text-blue-950">Where to go</p>
              <p className="mt-1">
                Ask at your nearest Ayushman Arogya Mandir (Health and Wellness Centre), Primary Health Centre, or ASHA worker. Ask
                them how often you should be checked.
              </p>
              <p className="mt-2">
                <Link href="/ai-hospital/hospitals" className="font-semibold text-blue-800 underline">Find a health centre</Link>
                {" · "}
                <Link href="/ai-hospital/follow-up" className="font-semibold text-blue-800 underline">Set a reminder</Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
