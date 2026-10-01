"use client";

import Link from "next/link";
import { useState } from "react";
import ShareButton from "../../components/ShareButton";

// Indian Diabetes Risk Score (Mohan V et al., J Assoc Physicians India, 2005).
type Option = { label: string; points: number };
type Question = { id: string; question: string; help?: string; options: Option[] };

const questions: Question[] = [
  {
    id: "age",
    question: "How old are you?",
    options: [
      { label: "Under 35 years", points: 0 },
      { label: "35 to 49 years", points: 20 },
      { label: "50 years or older", points: 30 },
    ],
  },
  {
    id: "waist",
    question: "What is your waist size?",
    help: "Measure around your belly at the level of your navel. 80 cm ≈ 31.5 inches, 90 cm ≈ 35.5 inches, 100 cm ≈ 39.5 inches.",
    options: [
      { label: "Women under 80 cm · Men under 90 cm", points: 0 },
      { label: "Women 80–89 cm · Men 90–99 cm", points: 10 },
      { label: "Women 90 cm or more · Men 100 cm or more", points: 20 },
    ],
  },
  {
    id: "activity",
    question: "How physically active are you?",
    options: [
      { label: "Regular exercise AND physical work (e.g. farming, construction)", points: 0 },
      { label: "Regular exercise OR physical work", points: 20 },
      { label: "No regular exercise and mostly sitting at work", points: 30 },
    ],
  },
  {
    id: "family",
    question: "Do your parents have diabetes?",
    options: [
      { label: "Neither parent", points: 0 },
      { label: "One parent", points: 10 },
      { label: "Both parents", points: 20 },
    ],
  },
];

function riskLevel(score: number) {
  if (score >= 60)
    return {
      level: "High risk",
      style: "border-red-200 bg-red-50 text-red-950",
      bar: "bg-red-600",
      advice:
        "Your score suggests a high risk of type 2 diabetes. Please get a blood sugar test at a hospital, health centre, or Health & Wellness Centre soon. Diabetes found early is much easier to control.",
    };
  if (score >= 30)
    return {
      level: "Moderate risk",
      style: "border-amber-200 bg-amber-50 text-amber-950",
      bar: "bg-amber-500",
      advice:
        "Your score suggests a moderate risk. A blood sugar test is a good idea, especially if you are over 30. Being more active and reducing your waist size can lower your risk.",
    };
  return {
    level: "Low risk",
    style: "border-blue-200 bg-blue-50 text-blue-950",
    bar: "bg-blue-600",
    advice:
      "Your score suggests a low risk right now. Keep it that way with regular activity, balanced food, and fewer sugary drinks. Check again every few years.",
  };
}

export default function DiabetesRiskCheck() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const answeredAll = questions.every((q) => q.id in answers);
  const score = Object.values(answers).reduce((a, b) => a + b, 0);
  const result = riskLevel(score);

  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <fieldset key={q.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <legend className="sr-only">{q.question}</legend>
          <p className="text-sm font-semibold text-blue-700">Question {i + 1} of {questions.length}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{q.question}</p>
          {q.help && <p className="mt-1 text-sm text-slate-600">{q.help}</p>}

          <div className="mt-4 space-y-2">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.points;
              return (
                <label
                  key={opt.label}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                    selected
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={selected}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.points }))}
                    className="h-4 w-4 accent-blue-700"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {answeredAll ? (
        <div aria-live="polite" className={`rounded-2xl border p-6 ${result.style}`}>
          <p className="text-sm font-semibold uppercase tracking-wide">Your result</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-bold">{result.level}</span>
            <span className="opacity-80">Score {score} / 100</span>
          </div>
          <div className="mt-4 h-3 rounded-full bg-white/70" aria-hidden>
            <div className={`h-3 rounded-full ${result.bar}`} style={{ width: `${score}%` }} />
          </div>
          <p className="mt-4 leading-relaxed">{result.advice}</p>
          <p className="mt-4 text-sm opacity-80">
            This is a screening tool, not a diagnosis. Only a blood test can
            confirm diabetes.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/diabetes"
              className="rounded-lg bg-white px-5 py-3 text-center font-semibold text-slate-800 border border-slate-300 hover:bg-slate-50"
            >
              Learn about diabetes
            </Link>
            <ShareButton text="I checked my diabetes risk in 1 minute. Check yours:" />
            <button
              type="button"
              onClick={() => setAnswers({})}
              className="rounded-lg px-5 py-3 font-semibold underline underline-offset-2"
            >
              Start again
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-slate-600">
          Answer all {questions.length} questions to see your result.
        </p>
      )}
    </div>
  );
}
