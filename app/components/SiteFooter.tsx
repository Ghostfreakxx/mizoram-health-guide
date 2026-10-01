import Link from "next/link";
import { healthTopics } from "../topics";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <h2 className="font-bold text-slate-900">Mizoram Health Guide</h2>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            A digital public health awareness platform with simple, accessible,
            citizen-friendly health information for Mizoram.
          </p>
        </div>

        <div>
          <h2 className="font-bold text-slate-900">Health Topics</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {healthTopics.map((topic) => (
              <li key={topic.href}>
                <Link href={topic.href} className="text-slate-600 hover:text-teal-700">
                  {topic.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-bold text-slate-900">Get Help</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              Ambulance:{" "}
              <a href="tel:108" className="font-semibold text-teal-700">108</a>
            </li>
            <li>
              National emergency:{" "}
              <a href="tel:112" className="font-semibold text-teal-700">112</a>
            </li>
            <li>
              <Link href="/hospitals" className="hover:text-teal-700">
                Hospital &amp; help directory
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <p className="max-w-7xl mx-auto px-4 sm:px-6 py-5 text-xs text-slate-500">
          © 2026 Mizoram Health Guide. Information on this site is for awareness
          only and does not replace advice from a doctor.
        </p>
      </div>
    </footer>
  );
}
