"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { openChat } from "./openChat";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#topics", label: "Health Topics" },
  { href: "/tools", label: "Self-Check Tools" },
  { href: "/#survey", label: "Survey" },
  { href: "/hospitals", label: "Hospitals" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-red-700 text-white text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
          <span className="hidden sm:inline">For awareness only — not a substitute for medical advice.</span>
          <a href="tel:108" className="font-semibold underline underline-offset-2">
            Medical emergency? Call 108
          </a>
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-lg bg-teal-700 text-lg font-black text-white"
            >
              +
            </span>
            <span className="leading-tight">
              <span className="block font-bold text-slate-900">Mizoram Health Guide</span>
              <span className="block text-xs text-slate-500">Public health awareness</span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = link.href === pathname;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-teal-50 text-teal-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={openChat}
              className="ml-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Ask a Question
            </button>
          </nav>

          <button
            type="button"
            className="lg:hidden rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {menuOpen && (
          <nav
            id="mobile-nav"
            aria-label="Main"
            className="lg:hidden border-t border-slate-200 px-4 py-3 space-y-1"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                openChat();
              }}
              className="w-full rounded-lg bg-teal-700 px-3 py-2 text-left font-semibold text-white"
            >
              Ask the Health Assistant
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
