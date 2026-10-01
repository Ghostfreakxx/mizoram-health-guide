"use client";

import Link from "next/link";
import { useState } from "react";
import { whatsNew } from "../site";

export default function NewsTicker() {
  const [paused, setPaused] = useState(false);

  // The list is rendered twice so the scroll loops without a gap.
  const items = [...whatsNew, ...whatsNew];

  return (
    <div className={`border-b border-amber-200 bg-amber-50 ${paused ? "ticker-paused" : ""}`}>
      <div className="max-w-7xl mx-auto flex items-stretch">
        <span className="shrink-0 bg-red-700 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wide text-white">
          What&apos;s New
        </span>

        <div className="relative flex-1 overflow-hidden">
          <ul className="ticker-track flex w-max gap-10 whitespace-nowrap py-2 pl-6 text-sm">
            {items.map((item, i) => (
              <li key={i} aria-hidden={i >= whatsNew.length ? true : undefined}>
                <Link
                  href={item.href}
                  tabIndex={i >= whatsNew.length ? -1 : undefined}
                  className="text-blue-900 hover:underline"
                >
                  <span aria-hidden className="mr-2 text-red-600">●</span>
                  {item.text}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play news ticker" : "Pause news ticker"}
          className="shrink-0 border-l border-amber-200 px-3 text-blue-900 hover:bg-amber-100"
        >
          {paused ? "▶" : "❚❚"}
        </button>
      </div>
    </div>
  );
}
