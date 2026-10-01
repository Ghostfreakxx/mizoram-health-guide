"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SIZES = [87.5, 100, 112.5, 125];
const DEFAULT_SIZE = 1;

function load(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); settings then last for this visit only.
  }
}

export default function AccessibilityBar() {
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    const savedSize = Number(load("a11y-size"));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring saved settings after hydration
    if (savedSize >= 0 && savedSize < SIZES.length && load("a11y-size") !== null) setSize(savedSize);
    if (load("a11y-contrast") === "1") setContrast(true);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${SIZES[size]}%`;
    save("a11y-size", String(size));
  }, [size]);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", contrast);
    save("a11y-contrast", contrast ? "1" : "0");
  }, [contrast]);

  const btn =
    "min-w-8 rounded px-2 py-1 text-xs font-semibold hover:bg-white/15 disabled:opacity-40";

  return (
    <div className="bg-slate-950 text-slate-200 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <a href="#main-content" className="hover:underline">Skip to main content</a>
          <span aria-hidden className="text-slate-600">|</span>
          <Link href="/accessibility" className="hover:underline">Screen reader access</Link>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-1 hidden sm:inline">Text size:</span>
          <button type="button" className={btn} aria-label="Decrease text size" disabled={size === 0} onClick={() => setSize((s) => s - 1)}>
            A-
          </button>
          <button type="button" className={btn} aria-label="Reset text size" onClick={() => setSize(DEFAULT_SIZE)}>
            A
          </button>
          <button type="button" className={btn} aria-label="Increase text size" disabled={size === SIZES.length - 1} onClick={() => setSize((s) => s + 1)}>
            A+
          </button>

          <span aria-hidden className="mx-1 text-slate-600">|</span>

          <button
            type="button"
            className={btn}
            aria-pressed={contrast}
            onClick={() => setContrast((c) => !c)}
          >
            <span aria-hidden>◐</span> High contrast
          </button>

          <span aria-hidden className="mx-1 text-slate-600">|</span>

          <label htmlFor="language" className="sr-only">Language</label>
          <select
            id="language"
            defaultValue="en"
            className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-100"
          >
            <option value="en">English</option>
            <option value="lus" disabled>Mizo (coming soon)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
