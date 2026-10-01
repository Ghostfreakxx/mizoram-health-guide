"use client";

import Link from "next/link";
import { useState } from "react";
import ShareButton from "../../components/ShareButton";

const questions = [
  {
    statement: "Kuhva (betel nut) is safe if you chew it without tobacco.",
    fact: false,
    explain:
      "Betel nut on its own is known to cause cancer. It can cause mouth cancer and a stiff mouth that cannot open fully. Adding tobacco makes it even more dangerous.",
  },
  {
    statement: "A mouth ulcer that lasts more than 2 weeks should be checked by a doctor.",
    fact: true,
    explain:
      "Most ulcers heal within 2 weeks. One that does not heal can be an early sign of mouth cancer, which is much easier to treat when found early.",
  },
  {
    statement: "Khaini and gutkha are safer than smoking.",
    fact: false,
    explain:
      "Smokeless tobacco also causes mouth, throat, and food-pipe cancer, as well as heart disease. No form of tobacco is safe.",
  },
  {
    statement: "High blood pressure always gives you a headache or other symptoms.",
    fact: false,
    explain:
      "High blood pressure usually has no symptoms at all. That is why it is called a 'silent killer'. The only way to know is to check it.",
  },
  {
    statement: "Cancer always means death.",
    fact: false,
    explain:
      "Many cancers can be treated successfully, especially when found early. Early check-up saves lives.",
  },
  {
    statement: "Adults should aim for at least 150 minutes of physical activity every week.",
    fact: true,
    explain:
      "That is about 30 minutes of brisk walking on 5 days a week. It lowers the risk of diabetes, heart disease, and some cancers.",
  },
  {
    statement: "Only older people get diabetes.",
    fact: false,
    explain:
      "Type 2 diabetes is now common in younger adults too, especially with less physical activity, more sugary food, and extra weight around the waist.",
  },
  {
    statement: "Depression is a sign of a weak mind.",
    fact: false,
    explain:
      "Depression is a real health condition, like diabetes or high blood pressure. It can happen to anyone, and it can be treated. Tele-MANAS (14416) offers free support.",
  },
];

export default function MythFactQuiz() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const done = index >= questions.length;

  function answer(choice: boolean) {
    if (picked !== null) return;
    setPicked(choice);
    if (choice === questions[index].fact) setScore((s) => s + 1);
  }

  function next() {
    setPicked(null);
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setPicked(null);
    setScore(0);
  }

  if (done) {
    const message =
      score === questions.length
        ? "Perfect score! You know your health facts."
        : score >= 6
        ? "Great job! You know most of the facts."
        : score >= 4
        ? "Good effort. A few common myths caught you."
        : "Many people believe these myths. Now you know the facts!";

    return (
      <div aria-live="polite" className="rounded-2xl border border-blue-200 bg-blue-50 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Your score</p>
        <p className="mt-2 text-6xl font-bold text-blue-900">
          {score}/{questions.length}
        </p>
        <p className="mt-4 text-lg text-blue-950">{message}</p>
        <p className="mt-2 text-blue-900/80">
          Share the quiz with your family and friends — they may believe some of these myths too.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <ShareButton text={`I scored ${score}/${questions.length} on the Myth or Fact health quiz. Can you beat me?`} />
          <button
            type="button"
            onClick={restart}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
          >
            Play again
          </button>
        </div>
        <p className="mt-6 text-sm">
          <Link href="/tools" className="font-semibold text-blue-700 hover:underline">
            Try another self-check tool →
          </Link>
        </p>
      </div>
    );
  }

  const q = questions[index];
  const correct = picked !== null && picked === q.fact;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <span>Score: {score}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100" aria-hidden>
        <div
          className="h-2 rounded-full bg-blue-600 transition-all"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>

      <p className="mt-8 text-2xl font-bold leading-snug text-slate-900">“{q.statement}”</p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {[
          { value: false, label: "Myth", base: "border-red-300 text-red-800 hover:bg-red-50" },
          { value: true, label: "Fact", base: "border-blue-300 text-blue-800 hover:bg-blue-50" },
        ].map((opt) => {
          const isAnswer = picked !== null && opt.value === q.fact;
          const isWrongPick = picked === opt.value && !isAnswer;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => answer(opt.value)}
              disabled={picked !== null}
              className={`rounded-xl border-2 py-4 text-lg font-bold transition ${
                isAnswer
                  ? "border-blue-600 bg-blue-600 text-white"
                  : isWrongPick
                  ? "border-red-600 bg-red-600 text-white"
                  : picked !== null
                  ? "border-slate-200 text-slate-400"
                  : opt.base
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div aria-live="polite" className="mt-6">
          <p className={`text-lg font-bold ${correct ? "text-blue-700" : "text-red-700"}`}>
            {correct ? "Correct!" : "Not quite."} It&apos;s a {q.fact ? "fact" : "myth"}.
          </p>
          <p className="mt-2 text-slate-700 leading-relaxed">{q.explain}</p>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="mt-6 w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            {index + 1 === questions.length ? "See my score" : "Next question →"}
          </button>
        </div>
      )}
    </div>
  );
}
