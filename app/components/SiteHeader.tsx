"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AREAS, SITE } from "../config";
import AccessibilityBar from "./AccessibilityBar";

const active = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

// One simple header: identity, five areas, search, and an Emergency button
// that is always visible. On phones the areas move to a bottom bar.
export default function SiteHeader() {
  const pathname = usePathname() ?? "/";
  return (
    <header>
      <AccessibilityBar />
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-900 text-2xl font-black text-white">
              +
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-base leading-tight font-bold text-blue-950 sm:text-xl sm:leading-snug">{SITE.name}</span>
              <span className="block truncate text-xs text-slate-600 sm:text-sm">
                {SITE.tagline} · <span className="font-semibold text-amber-800">{SITE.status}</span>
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {AREAS.map((a) => (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    aria-current={active(pathname, a.href) ? "page" : undefined}
                    className={`rounded-lg px-3 py-2 font-semibold ${active(pathname, a.href) ? "bg-blue-50 text-blue-900" : "text-slate-700 hover:bg-slate-100 hover:text-blue-900"}`}
                  >
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link href="/search" aria-label="Search" className="hidden min-h-11 items-center rounded-lg px-3 font-semibold text-slate-700 hover:bg-slate-100 sm:flex">
              <span aria-hidden>🔍</span>
              <span className="ml-1.5 hidden xl:inline">Search</span>
            </Link>
            <Link href="/ai-hospital/emergency" className="flex min-h-11 items-center gap-1.5 rounded-lg bg-red-700 px-3 font-bold text-white hover:bg-red-800 sm:px-4">
              <span aria-hidden>🚨</span> Emergency
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

// Phones and tablets: the five areas within thumb reach. Hidden inside a
// consultation room, which has its own controls at the bottom.
export function BottomNav() {
  const pathname = usePathname() ?? "/";
  if (/\/room(\/|$)/.test(pathname)) return null;
  return (
    <>
      <div aria-hidden className="h-16 lg:hidden" />
      <nav aria-label="Main (bottom)" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white lg:hidden">
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {AREAS.map((a) => (
            <li key={a.href}>
              <Link
                href={a.href}
                aria-current={active(pathname, a.href) ? "page" : undefined}
                className={`flex min-h-15 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${active(pathname, a.href) ? "text-blue-900" : "text-slate-600"}`}
              >
                <span aria-hidden className="text-lg">{a.icon}</span>
                {a.short}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
