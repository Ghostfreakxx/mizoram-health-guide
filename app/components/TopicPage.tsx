import Link from "next/link";
import type { TopicContent } from "../content/types";
import { helplines } from "../site";
import { healthTopics } from "../topics";
import AskAIButton from "./AskAIButton";
import PageHeader from "./PageHeader";
import ShareButton from "./ShareButton";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "signs", label: "Warning signs" },
  { id: "risks", label: "Who is at risk" },
  { id: "prevention", label: "What you can do" },
  { id: "get-help", label: "When to get help" },
  { id: "myths", label: "Myths & facts" },
  { id: "faqs", label: "Common questions" },
  { id: "sources", label: "Sources" },
];

function SectionTitle({ id, number, children }: { id: string; number: number; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-20 flex items-center gap-3 text-2xl font-bold text-blue-950">
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-900 text-sm font-bold text-white">
        {number}
      </span>
      {children}
    </h2>
  );
}

const helpLevels = [
  {
    key: "urgent" as const,
    title: "Call 108 or go to hospital now",
    icon: "🚨",
    style: "border-red-300 bg-red-50",
    head: "bg-red-700 text-white",
  },
  {
    key: "soon" as const,
    title: "See a doctor within a few days",
    icon: "⚠️",
    style: "border-amber-300 bg-amber-50",
    head: "bg-amber-400 text-amber-950",
  },
  {
    key: "routine" as const,
    title: "Regular check-up",
    icon: "✅",
    style: "border-emerald-300 bg-emerald-50",
    head: "bg-emerald-700 text-white",
  },
];

function RiskList({ items }: { items: TopicContent["risks"]["fixed"] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((r) => (
        <li key={r.title} className="flex gap-3 px-5 py-4">
          <span aria-hidden className="text-2xl">{r.icon}</span>
          <span>
            <span className="block font-semibold text-slate-900">{r.title}</span>
            <span className="block text-sm text-slate-600">{r.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function TopicPage({ content: c }: { content: TopicContent }) {
  const related = healthTopics.filter((t) => c.related.includes(t.href));

  return (
    <main className="flex-1">
      <PageHeader
        title={c.title}
        intro={c.intro}
        icon={c.icon}
        crumbs={[{ href: "/#topics", label: "Health Topics" }]}
      />

      {/* Key facts */}
      <section aria-label="Key facts" className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {c.facts.map((f) => (
            <li key={f.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-md">
              <span className="block text-3xl font-bold text-blue-900">{f.value}</span>
              <span className="mt-1 block text-slate-700 leading-snug">{f.label}</span>
              <span className="mt-2 block text-xs text-slate-600">Source: {f.source}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid lg:grid-cols-[1fr_300px] gap-10">
        <article className="min-w-0 space-y-14">
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>⏱ {c.readingTime} read</span>
            <span>📖 Written in simple English</span>
          </p>

          {/* 1. Overview */}
          <section>
            <SectionTitle id="overview" number={1}>Overview</SectionTitle>
            <div className="mt-5 space-y-4 text-lg text-slate-700 leading-relaxed">
              {c.overview.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            {c.local && (
              <div className="mt-6 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-5">
                <p className="font-bold text-amber-950">📍 {c.local.title}</p>
                <p className="mt-2 text-amber-950/90 leading-relaxed">{c.local.text}</p>
              </div>
            )}
          </section>

          {/* 2. Signs */}
          <section>
            <SectionTitle id="signs" number={2}>{c.signsTitle}</SectionTitle>
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {c.signs.map((s) => (
                <li key={s.text} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-50 text-2xl">
                    {s.icon}
                  </span>
                  <span className="font-medium text-slate-800">{s.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-lg bg-slate-100 p-4 text-slate-700">
              <strong>Remember:</strong> {c.signsNote}
            </p>
          </section>

          {/* 3. Risks */}
          <section>
            <SectionTitle id="risks" number={3}>Who is at risk</SectionTitle>
            <div className="mt-6 grid md:grid-cols-2 gap-5">
              <div className="rounded-lg border border-emerald-200 bg-white overflow-hidden">
                <h3 className="bg-emerald-50 px-5 py-3 font-bold text-emerald-900">✓ Things you can change</h3>
                <RiskList items={c.risks.changeable} />
              </div>
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <h3 className="bg-slate-100 px-5 py-3 font-bold text-slate-800">Things you cannot change</h3>
                <RiskList items={c.risks.fixed} />
                <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
                  If these apply to you, regular check-ups are even more important.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Prevention */}
          <section>
            <SectionTitle id="prevention" number={4}>What you can do</SectionTitle>
            <ol className="mt-6 space-y-3">
              {c.prevention.map((p, i) => (
                <li key={p.title} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-400 text-lg font-bold text-blue-950">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-lg font-semibold text-slate-900">{p.title}</span>
                    <span className="mt-1 block text-slate-600 leading-relaxed">{p.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {c.tool && (
            <Link
              href={c.tool.href}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 p-6 text-white shadow-md hover:from-blue-950"
            >
              <span>
                <span className="block text-sm font-semibold uppercase tracking-wide text-amber-300">Try the self-check tool</span>
                <span className="mt-1 block text-2xl font-bold">{c.tool.title}</span>
                <span className="mt-1 block text-blue-100">{c.tool.text}</span>
              </span>
              <span className="shrink-0 rounded bg-amber-400 px-5 py-3 text-center font-bold text-blue-950">Start now →</span>
            </Link>
          )}

          {/* 5. When to get help */}
          <section>
            <SectionTitle id="get-help" number={5}>When to get help</SectionTitle>
            <div className="mt-6 space-y-4">
              {helpLevels.map((level) => (
                <div key={level.key} className={`rounded-lg border-2 overflow-hidden ${level.style}`}>
                  <h3 className={`flex items-center gap-2 px-5 py-3 font-bold ${level.head}`}>
                    <span aria-hidden>{level.icon}</span> {level.title}
                  </h3>
                  <ul className="px-5 py-4 space-y-2">
                    {c.help[level.key].map((item) => (
                      <li key={item} className="flex gap-2 text-slate-800">
                        <span aria-hidden>•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  {level.key === "urgent" && (
                    <div className="px-5 pb-4">
                      <a href="tel:108" className="inline-block rounded bg-red-700 px-5 py-2 font-bold text-white hover:bg-red-800">
                        📞 Call 108
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 6. Myths */}
          <section>
            <SectionTitle id="myths" number={6}>Myths &amp; facts</SectionTitle>
            <div className="mt-6 space-y-3">
              {c.myths.map((m) => (
                <div key={m.myth} className="grid sm:grid-cols-2 rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <p className="bg-red-50 p-5 text-slate-800">
                    <span className="block text-xs font-bold uppercase tracking-wide text-red-700">✗ Myth</span>
                    <span className="mt-1 block">{m.myth}</span>
                  </p>
                  <p className="bg-emerald-50 p-5 text-slate-800">
                    <span className="block text-xs font-bold uppercase tracking-wide text-emerald-700">✓ Fact</span>
                    <span className="mt-1 block">{m.fact}</span>
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 7. FAQs */}
          <section>
            <SectionTitle id="faqs" number={7}>Common questions</SectionTitle>
            <div className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {c.faqs.map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden className="text-2xl leading-none text-blue-800 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="px-5 pb-5 text-slate-700 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-slate-600">
              Have another question?
              <AskAIButton className="rounded bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                Ask the Health Assistant
              </AskAIButton>
            </div>
          </section>

          {/* 8. Sources */}
          <section>
            <SectionTitle id="sources" number={8}>Sources</SectionTitle>
            <ul className="mt-5 space-y-2 text-sm text-slate-600">
              {c.sources.map((s) => (
                <li key={s.label} className="flex gap-2">
                  <span aria-hidden>📄</span>
                  {s.href ? (
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                      {s.label}
                      <span className="sr-only"> (opens external website in a new tab)</span>
                    </a>
                  ) : (
                    s.label
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-600">
              This page is for awareness only and does not replace advice from a doctor.
            </p>
          </section>

          {related.length > 0 && (
            <section aria-labelledby="related-heading" className="border-t border-slate-200 pt-10">
              <h2 id="related-heading" className="text-xl font-bold text-blue-950">Related topics</h2>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                {related.map((t) => (
                  <Link key={t.href} href={t.href} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow">
                    <span aria-hidden className="text-3xl">{t.icon}</span>
                    <span>
                      <span className="block font-bold text-slate-900">{t.title}</span>
                      <span className="block text-sm text-slate-600">{t.text}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-16 lg:self-start">
          <nav aria-label="On this page" className="hidden lg:block rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">On this page</h2>
            <ol className="mt-3 space-y-1">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex gap-3 rounded px-2 py-1.5 text-slate-700 hover:bg-blue-50 hover:text-blue-900">
                    <span className="w-4 text-right text-slate-400">{i + 1}</span>
                    {s.id === "signs" ? c.signsTitle : s.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="rounded-lg border border-red-200 bg-white overflow-hidden shadow-sm">
            <h2 className="bg-red-700 px-5 py-3 font-bold text-white">Need help?</h2>
            <ul className="divide-y divide-slate-100 text-sm">
              {helplines.map((h) => (
                <li key={h.tel} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-slate-700">{h.label}</span>
                  <a href={`tel:${h.tel}`} className={`font-bold hover:underline ${h.urgent ? "text-red-700" : "text-blue-800"}`}>
                    {h.number}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Share this page</h2>
            <p className="mt-1 text-sm text-slate-600">Help your family and friends stay informed.</p>
            <ShareButton text={`${c.title} — simple health information for Mizoram:`} className="mt-3 w-full" />
          </div>
        </aside>
      </div>
    </main>
  );
}
