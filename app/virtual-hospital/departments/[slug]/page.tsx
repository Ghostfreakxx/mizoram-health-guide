import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import { healthTopics } from "../../../topics";
import { departmentBySlug, departments } from "../../departments";

export const dynamicParams = false;

export function generateStaticParams() {
  return departments.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = departmentBySlug(slug);
  return d ? { title: `${d.name} — Virtual Hospital`, description: d.summary } : {};
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-blue-950">
        <span aria-hidden>{icon}</span> {title}
      </h2>
      <div className="mt-3 text-slate-700">{children}</div>
    </section>
  );
}

export default async function DepartmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = departmentBySlug(slug);
  if (!d) notFound();

  const topics = healthTopics.filter((t) => d.topics.includes(t.href));
  const others = departments.filter((o) => o.slug !== d.slug);

  return (
    <main className="flex-1">
      <PageHeader
        title={d.name}
        icon={d.icon}
        intro={d.summary}
        crumbs={[{ href: "/virtual-hospital", label: "Virtual Hospital" }]}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-6">
          <p className="inline-block rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">📍 {d.floor}</p>

          <Card title="What this department treats" icon="🩺">
            <ul className="grid sm:grid-cols-2 gap-2">
              {d.treats.map((t) => <li key={t} className="flex gap-2"><span aria-hidden className="text-blue-700">✓</span>{t}</li>)}
            </ul>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card title="Go in person for" icon="🏥">
              <ul className="space-y-2">
                {d.goInPerson.map((t) => <li key={t}>• {t}</li>)}
              </ul>
            </Card>
            <Card title="Online consultation" icon="💻">
              <p>{d.online}</p>
              {d.slug !== "emergency" && (
                <Link href="/virtual-hospital/doctor" className="mt-3 inline-block font-semibold text-blue-700 underline">
                  How to see a doctor online, free →
                </Link>
              )}
            </Card>
          </div>

          <Card title="What happens on your visit" icon="🚶">
            <ol className="space-y-3">
              {d.expect.map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-900 text-sm font-bold text-white">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card title="What to bring" icon="🎒">
              <ul className="space-y-2">
                {d.bring.map((t) => <li key={t}>☐ {t}</li>)}
              </ul>
            </Card>
            <Card title="Free services" icon="💰">
              <ul className="space-y-2">
                {d.free.map((t) => <li key={t}>• {t}</li>)}
              </ul>
            </Card>
          </div>

          {topics.length > 0 && (
            <Card title="Read the health guides" icon="📚">
              <div className="grid sm:grid-cols-2 gap-3">
                {topics.map((t) => (
                  <Link key={t.href} href={t.href} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50">
                    <span aria-hidden className="text-2xl">{t.icon}</span>
                    <span className="font-semibold text-blue-900">{t.title}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-16 lg:self-start">
          <div className="rounded-lg bg-blue-900 p-6 text-white shadow">
            <p className="text-lg font-bold">Not sure where to go?</p>
            <p className="mt-1 text-blue-100">The Triage Desk tells you how urgent it is and which department fits.</p>
            <Link href="/virtual-hospital/triage" className="mt-4 block rounded bg-amber-400 px-4 py-2 text-center font-bold text-blue-950 hover:bg-amber-300">
              Start triage →
            </Link>
          </div>
          <a href="tel:108" className="block rounded-lg border-2 border-red-300 bg-red-50 p-5 text-red-900 hover:border-red-500">
            <span className="block font-bold">🚨 Emergency?</span>
            <span className="block text-2xl font-bold">Call 108</span>
          </a>
          <nav aria-label="Other departments" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Other departments</h2>
            <ul className="mt-3 space-y-1">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={`/virtual-hospital/departments/${o.slug}`} className="flex items-center gap-2 rounded px-2 py-1.5 text-slate-700 hover:bg-blue-50 hover:text-blue-900">
                    <span aria-hidden>{o.icon}</span> {o.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </main>
  );
}
