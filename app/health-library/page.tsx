import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import { Notice, Section } from "../components/ui";
import { coverage } from "../lib/knowledge";
import { healthTopics } from "../topics";

export const metadata: Metadata = {
  title: "Health Library",
  description: "Simple, sourced health guides: heart and blood pressure, diabetes, cancer, TB, HIV, malaria and dengue, mental wellbeing, mother and child, and more.",
};

const topic = (href: string) => healthTopics.find((t) => t.href === href)!;

const GROUPS: { title: string; items: { href: string; icon: string; title: string; text: string }[] }[] = [
  { title: "Long-term conditions", items: ["/heart", "/diabetes", "/cancer"].map(topic) },
  { title: "Infections", items: ["/tb", "/hiv", "/malaria"].map(topic) },
  { title: "Mind and habits", items: ["/mental", "/drugs", "/tobacco"].map(topic) },
  {
    title: "Family health",
    items: [
      topic("/mother-child"),
      { href: "/ai-hospital/vaccinations", icon: "💉", title: "Child vaccination planner", text: "When each free vaccine is usually due, from your child's date of birth." },
      { href: "/ai-hospital/screening", icon: "🩺", title: "Free health check-ups", text: "Free checks for blood pressure, diabetes and common cancers (30+)." },
    ],
  },
  {
    title: "Practical guides",
    items: [
      { href: "/ai-hospital/first-aid", icon: "⛑️", title: "First aid", text: "Simple steps until a health worker takes over. Works offline." },
      { href: "/ai-hospital/medicines", icon: "💊", title: "Understand your medicines", text: "What a prescription says, and safe use of common medicines." },
      { href: "/ai-hospital/lab-reports", icon: "🧪", title: "Understand a lab report", text: "What common tests measure, and what to ask your doctor." },
      { href: "/tools/diabetes-risk", icon: "🩸", title: "Diabetes risk check", text: "A validated 4-question score (IDRS). Not a diagnosis." },
      { href: "/ai-hospital/calm", icon: "🌿", title: "Calm corner", text: "Short breathing and grounding exercises for stress." },
    ],
  },
];

export default function HealthLibrary() {
  const cov = coverage();
  const covered = cov.filter((c) => c.passages > 0);
  const waiting = cov.filter((c) => c.passages === 0);
  return (
    <main className="flex-1 bg-slate-50">
      <PageHeader title="Health Library" icon="📚" intro="Simple guides you can read any time. Every guide lists its sources." />
      {GROUPS.map((g) => (
        <Section key={g.title} id={g.title.toLowerCase().replace(/\W+/g, "-")} title={g.title} className="py-6 sm:py-6">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="flex h-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-500 hover:bg-blue-50">
                  <span aria-hidden className="text-3xl">
                    {t.icon}
                  </span>
                  <span>
                    <span className="block font-bold text-blue-950">{t.title}</span>
                    <span className="mt-0.5 block text-sm text-slate-600">{t.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ))}

      <Section id="ask" title="Ask the virtual doctor" intro="You can ask health questions during a consultation — for example “What is TB?” or “How does HIV spread?”.">
        <Notice tone="info">
          <p>
            Answers come only from the reviewed guides above, word for word, with their sources. If something is not covered yet, the doctor says
            so — it does not guess.
          </p>
          <p className="mt-2 text-sm">
            <strong>Covered now:</strong> {covered.map((c) => c.label).join(", ")}.
            {waiting.length > 0 && (
              <>
                {" "}
                <strong>Awaiting reviewed content:</strong> {waiting.map((c) => c.label).join(", ")}.
              </>
            )}
          </p>
        </Notice>
      </Section>
    </main>
  );
}
