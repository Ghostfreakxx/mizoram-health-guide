import Link from "next/link";
import { helplines, importantLinks } from "../site";
import { healthTools } from "../tools";
import { healthTopics } from "../topics";

const policyLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/accessibility", label: "Accessibility Statement" },
  { href: "/sitemap", label: "Sitemap" },
  { href: "/helplines", label: "Help" },
];

// Rendered at build time, so this shows when the site was last published.
const lastUpdated = new Date().toLocaleDateString("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export default function SiteFooter() {
  return (
    <footer className="mt-auto bg-blue-950 text-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <h2 className="font-bold text-white">Health Topics</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {healthTopics.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="hover:text-white hover:underline">{t.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-bold text-white">Self-Check Tools</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/ai-hospital" className="font-semibold text-amber-300 hover:underline">🏥 AI Hospital</Link>
            </li>
            {healthTools.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="hover:text-white hover:underline">{t.title}</Link>
              </li>
            ))}
            <li>
              <Link href="/hospitals" className="hover:text-white hover:underline">Hospital &amp; Help Directory</Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-bold text-white">Helplines</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {helplines.map((h) => (
              <li key={h.tel}>
                {h.label}:{" "}
                <a href={`tel:${h.tel}`} className="font-bold text-amber-300 hover:underline">{h.number}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-bold text-white">Important Links</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {importantLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">
                  {l.label}
                  <span aria-hidden> ↗</span>
                  <span className="sr-only"> (opens external website in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <nav aria-label="Website policies" className="flex flex-wrap justify-center gap-x-1 gap-y-2 text-sm">
            {policyLinks.map((l, i) => (
              <span key={l.href} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden className="text-blue-700">|</span>}
                <Link href={l.href} className="px-2 hover:text-white hover:underline">{l.label}</Link>
              </span>
            ))}
          </nav>
        </div>
      </div>

      <div className="bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row justify-between gap-2 text-xs text-blue-200">
          <p>
            © 2026 Mizoram Health Guide. Content is for public health awareness
            only and does not replace advice from a doctor.
          </p>
          <p>Last updated: {lastUpdated}</p>
        </div>
      </div>
    </footer>
  );
}
