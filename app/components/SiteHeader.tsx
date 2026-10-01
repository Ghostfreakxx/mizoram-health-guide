"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import AccessibilityBar from "./AccessibilityBar";
import NewsTicker from "./NewsTicker";
import { openChat } from "./openChat";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/ai-hospital", label: "AI Hospital" },
  { href: "/#topics", label: "Health Topics" },
  { href: "/tools", label: "Self-Check Tools" },
  { href: "/hospitals", label: "Hospitals" },
  { href: "/helplines", label: "Helplines" },
  { href: "/#survey", label: "Survey" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header>
        <AccessibilityBar />

        {/* Masthead */}
        <div className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
              <span
                aria-hidden
                className="grid h-14 w-14 place-items-center rounded-full border-4 border-blue-900 bg-white text-3xl font-black text-red-600"
              >
                +
              </span>
              <span className="leading-tight">
                <span className="block text-xl sm:text-2xl font-bold text-blue-950">
                  Mizoram Health Guide
                </span>
                <span className="block text-sm text-slate-600">
                  Citizen Health Awareness Portal
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <form action="/search" role="search" className="hidden md:flex">
                <label htmlFor="site-search" className="sr-only">Search this website</label>
                <input
                  id="site-search"
                  name="q"
                  type="search"
                  placeholder="Search health topics…"
                  className="w-56 rounded-l-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-700"
                />
                <button
                  type="submit"
                  className="rounded-r-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Search
                </button>
              </form>

              <a
                href="tel:108"
                className="flex items-center gap-2 rounded-md border-2 border-red-600 px-3 py-1.5 text-red-700 hover:bg-red-50"
              >
                <span aria-hidden className="text-xl">🚑</span>
                <span className="leading-tight">
                  <span className="block text-[11px] font-semibold uppercase">Emergency</span>
                  <span className="block text-lg font-bold">108</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main navigation */}
      <div className="sticky top-0 z-40 bg-blue-900 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <nav aria-label="Main" className="hidden lg:flex">
            {navLinks.map((link) => {
              const active = link.href === pathname;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`border-b-4 px-4 py-3 text-sm font-semibold transition ${
                    active ? "border-amber-400 bg-blue-950" : "border-transparent hover:bg-blue-800"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            className="lg:hidden py-3 text-sm font-semibold"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "✕ Close menu" : "☰ Menu"}
          </button>

          <button
            type="button"
            onClick={openChat}
            className="my-1.5 rounded bg-amber-400 px-4 py-1.5 text-sm font-bold text-blue-950 hover:bg-amber-300"
          >
            Ask a Question
          </button>
        </div>

        {menuOpen && (
          <nav id="mobile-nav" aria-label="Main" className="lg:hidden border-t border-blue-800 px-4 py-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded px-3 py-2 hover:bg-blue-800"
              >
                {link.label}
              </Link>
            ))}
            <form action="/search" role="search" className="mt-2 flex pb-2">
              <label htmlFor="site-search-mobile" className="sr-only">Search this website</label>
              <input
                id="site-search-mobile"
                name="q"
                type="search"
                placeholder="Search health topics…"
                className="flex-1 rounded-l-md bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />
              <button type="submit" className="rounded-r-md bg-amber-400 px-4 text-sm font-semibold text-blue-950">
                Search
              </button>
            </form>
          </nav>
        )}
      </div>

      <NewsTicker />
    </>
  );
}
