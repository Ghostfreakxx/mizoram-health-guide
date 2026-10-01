"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const slides = [
  {
    tag: "Cancer Awareness",
    title: "Found early, cancer is easier to treat.",
    text: "A wound that does not heal, a lump, or unusual bleeding? Do not wait for pain. Visit a doctor early.",
    cta: { href: "/cancer", label: "Know the warning signs" },
    bg: "from-blue-950 via-blue-900 to-blue-700",
    icon: "🎗️",
  },
  {
    tag: "Tobacco-Free Mizoram",
    title: "Kuhva and tobacco cost more than money.",
    text: "Betel nut and tobacco are major causes of mouth cancer. See what your habit really costs — and get free help to quit.",
    cta: { href: "/tools/tobacco-cost", label: "Calculate the cost" },
    bg: "from-red-900 via-red-800 to-orange-700",
    icon: "🚭",
  },
  {
    tag: "Diabetes",
    title: "Many people have diabetes and do not know it.",
    text: "Answer 4 simple questions to check your risk of type 2 diabetes. It takes 1 minute.",
    cta: { href: "/tools/diabetes-risk", label: "Check your risk" },
    bg: "from-emerald-900 via-emerald-800 to-teal-700",
    icon: "🩺",
  },
];

const INTERVAL = 7000;

export default function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- respect the user's motion setting on load
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL);
    return () => clearInterval(id);
  }, [playing]);

  const go = (i: number) => setIndex((i + slides.length) % slides.length);

  return (
    <section aria-roledescription="carousel" aria-label="Health campaigns" className="relative overflow-hidden">
      {slides.map((s, i) => (
        <div
          key={s.title}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${slides.length}`}
          hidden={i !== index}
          className={`bg-gradient-to-r ${s.bg} text-white`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20 grid md:grid-cols-[1fr_auto] items-center gap-8">
            <div className="max-w-2xl">
              <p className="inline-block rounded bg-white/15 px-3 py-1 text-sm font-semibold uppercase tracking-wide">
                {s.tag}
              </p>
              <h2 className="mt-4 text-3xl md:text-5xl font-bold leading-tight">{s.title}</h2>
              <p className="mt-4 text-lg text-white/90 leading-relaxed">{s.text}</p>
              <Link
                href={s.cta.href}
                className="mt-7 inline-block rounded bg-amber-400 px-6 py-3 font-bold text-blue-950 hover:bg-amber-300"
              >
                {s.cta.label} →
              </Link>
            </div>
            <span aria-hidden className="hidden md:grid h-48 w-48 place-items-center rounded-full bg-white/10 text-8xl ring-8 ring-white/10">
              {s.icon}
            </span>
          </div>
        </div>
      ))}

      <div className="absolute bottom-4 left-0 right-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2">
          <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="grid h-8 w-8 place-items-center rounded-full bg-black/30 text-white hover:bg-black/50">
            ‹
          </button>
          {slides.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className={`h-2.5 rounded-full transition-all ${i === index ? "w-8 bg-amber-400" : "w-2.5 bg-white/60 hover:bg-white"}`}
            />
          ))}
          <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="grid h-8 w-8 place-items-center rounded-full bg-black/30 text-white hover:bg-black/50">
            ›
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause slideshow" : "Play slideshow"}
            className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-black/30 text-xs text-white hover:bg-black/50"
          >
            {playing ? "❚❚" : "▶"}
          </button>
        </div>
      </div>
    </section>
  );
}
