import type { Metadata } from "next";
import Link from "next/link";
import { healthTools } from "../tools";

export const metadata: Metadata = { title: "Self-Check Tools" };

export default function ToolsPage() {
  return (
    <main className="flex-1">
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
            <Link href="/" className="hover:text-teal-700">Home</Link>
          </nav>
          <h1 className="mt-6 text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Self-Check Tools
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-slate-600 leading-relaxed">
            Quick, private tools to understand your health risks. Nothing you
            enter is saved or sent anywhere — everything stays on your phone.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-5">
        {healthTools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-300 hover:shadow-md"
          >
            <div aria-hidden className="text-4xl">{tool.icon}</div>
            <h2 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-teal-800">
              {tool.title}
            </h2>
            <p className="mt-2 text-slate-600">{tool.text}</p>
            <p className="mt-4 text-sm font-semibold text-teal-700">Start · {tool.time} →</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
