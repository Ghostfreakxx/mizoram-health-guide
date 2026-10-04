import Link from "next/link";
import { SITE } from "../config";
import { helpline } from "../lib/helplines";

const links = [
  { href: "/ai-hospital/emergency", label: "Emergency" },
  { href: "/about", label: "About" },
  { href: "/disclaimer", label: "Safety & disclaimer" },
  { href: "/privacy", label: "Privacy" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/ai-hospital/sources", label: "Sources" },
  { href: "/sitemap", label: "All pages" },
];

// A short footer: emergency numbers, the essential pages, and what this is.
export default function SiteFooter() {
  const urgent = [helpline("ambulance-108"), helpline("erss-112"), helpline("telemanas")];
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="font-bold text-white">In an emergency:</p>
          {urgent.map((h) => (
            <a key={h.id} href={`tel:${h.tel}`} className="text-lg font-bold text-amber-300 hover:underline">
              {h.number} <span className="text-sm font-normal text-slate-300">{h.name.replace(/^\d+\s*/, "")}</span>
            </a>
          ))}
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} prefetch={false} className="hover:text-white hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="max-w-4xl text-sm leading-relaxed text-slate-400">
          {SITE.name} is an independent {SITE.status.toLowerCase()}, not an official Government of Mizoram service. {SITE.boundary} Only qualified
          healthcare professionals can diagnose or prescribe.
        </p>
      </div>
    </footer>
  );
}
