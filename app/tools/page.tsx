import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import { healthTools } from "../tools";

export const metadata: Metadata = { title: "Self-Check Tools" };

export default function ToolsPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Self-Check Tools"
        intro="Quick, private tools to understand your health risks. Nothing you enter is saved or sent anywhere — everything stays on your phone."
      />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-5">
        {healthTools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <div aria-hidden className="text-4xl">{tool.icon}</div>
            <h2 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-blue-800">
              {tool.title}
            </h2>
            <p className="mt-2 text-slate-600">{tool.text}</p>
            <p className="mt-4 text-sm font-semibold text-blue-700">Start · {tool.time} →</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
