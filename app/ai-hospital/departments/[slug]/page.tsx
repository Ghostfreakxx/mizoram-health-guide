import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AI_HOSPITAL } from "../../../config";
import PageHeader from "../../../components/PageHeader";
import { getService } from "../../../lib/services";
import { healthTopics } from "../../../topics";
import { departments, getDepartment } from "../../data/departments";
import { BoundaryNote } from "../../components/ui";

export const dynamicParams = false;

export function generateStaticParams() {
  return departments.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = getDepartment((await params).slug);
  return d ? { title: `${d.plainName} — ${AI_HOSPITAL.name}`, description: d.summary } : {};
}

function Box({ title, icon, children, tone = "default" }: { title: string; icon: string; children: React.ReactNode; tone?: "default" | "danger" }) {
  return (
    <section className={`rounded-2xl border-2 p-6 ${tone === "danger" ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
      <h2 className={`flex items-center gap-2 text-xl font-bold ${tone === "danger" ? "text-red-900" : "text-blue-950"}`}>
        <span aria-hidden>{icon}</span> {title}
      </h2>
      <div className={`mt-3 text-lg ${tone === "danger" ? "text-red-950" : "text-slate-700"}`}>{children}</div>
    </section>
  );
}

export default async function DepartmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = getDepartment((await params).slug);
  if (!d) notFound();
  const topics = healthTopics.filter((t) => d.topics.includes(t.href));
  const services = d.services.map(getService).filter((s): s is NonNullable<typeof s> => !!s);

  return (
    <main className="flex-1">
      <PageHeader
        title={d.plainName}
        icon={d.icon}
        intro={`${d.name}. ${d.summary}`}
        crumbs={[
          { href: "/ai-hospital", label: AI_HOSPITAL.name },
          { href: "/ai-hospital/departments", label: "Departments" },
        ]}
      />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <BoundaryNote text="This page describes what this kind of department usually handles. Services differ between hospitals — check with the hospital." />

          {d.emergencyInstead.length > 0 && (
            <Box title="Go to Emergency instead if…" icon="🚨" tone="danger">
              <ul className="space-y-1">
                {d.emergencyInstead.map((t) => <li key={t}>• {t}</li>)}
              </ul>
              <a href="tel:108" className="mt-4 inline-block rounded-xl bg-red-700 px-6 py-3 font-bold text-white">📞 Call 108</a>
            </Box>
          )}

          <Box title="Common reasons people come here" icon="🩺">
            <ul className="grid gap-1 sm:grid-cols-2">
              {d.commonReasons.map((t) => <li key={t}>• {t}</li>)}
            </ul>
          </Box>

          <div className="grid gap-6 md:grid-cols-2">
            <Box title="Go in person for" icon="🏥">
              <ul className="space-y-1">{d.goInPerson.map((t) => <li key={t}>• {t}</li>)}</ul>
            </Box>
            <Box title="Online consultation" icon="💻">
              <p>{d.online}</p>
              {d.slug !== "emergency" && (
                <Link href="/ai-hospital/doctor" className="mt-3 inline-block font-semibold text-blue-700 underline">Talk to a real doctor →</Link>
              )}
            </Box>
          </div>

          <Box title="What usually happens on a visit" icon="🚶">
            <ol className="space-y-3">
              {d.expect.map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-900 text-base font-bold text-white">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </Box>

          <Box title="What to bring" icon="🎒">
            <ul className="space-y-1">{d.bring.map((t) => <li key={t}>☐ {t}</li>)}</ul>
          </Box>

          {services.length > 0 && (
            <Box title="Government services" icon="💰">
              <ul className="space-y-2">
                {services.map((s) => (
                  <li key={s.id}>
                    <strong>{s.name}</strong> — {s.description}
                    {s.phone && <> <a href={`tel:${s.phone.tel}`} className="font-bold text-blue-800 underline">{s.phone.display}</a></>}
                  </li>
                ))}
              </ul>
            </Box>
          )}

          {topics.length > 0 && (
            <Box title="Health guides" icon="📚">
              <div className="grid gap-3 sm:grid-cols-2">
                {topics.map((t) => (
                  <Link key={t.href} href={t.href} className="flex items-center gap-3 rounded-xl border-2 border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50">
                    <span aria-hidden className="text-2xl">{t.icon}</span>
                    <span className="font-semibold text-blue-900">{t.title}</span>
                  </Link>
                ))}
              </div>
            </Box>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          <Link href={`/ai-hospital/departments/${d.slug}/simulator`} className="block rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 hover:border-amber-500">
            <span className="block text-xl font-bold text-blue-950">🧊 Take the 3D tour</span>
            <span className="mt-1 block text-slate-700">See what usually happens on a visit, step by step.</span>
          </Link>
          <Link href="/ai-hospital/triage" className="block rounded-2xl bg-blue-900 p-6 text-white hover:bg-blue-800">
            <span className="block text-xl font-bold">Check how urgent it is</span>
            <span className="mt-1 block text-blue-100">The Triage Desk takes about 2 minutes.</span>
            <span className="mt-4 block rounded-xl bg-amber-400 px-4 py-3 text-center text-lg font-bold text-blue-950">Start triage →</span>
          </Link>
          <Link href="/ai-hospital/prepare" className="block rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-blue-400">
            <span className="block text-xl font-bold text-blue-950">📋 Prepare for your visit</span>
            <span className="mt-1 block text-slate-600">Make a one-page summary for the doctor.</span>
          </Link>
          <a href="tel:108" className="block rounded-2xl border-2 border-red-300 bg-red-50 p-6 text-red-900">
            <span className="block font-bold">🚨 Emergency?</span>
            <span className="block text-3xl font-black">Call 108</span>
          </a>
          <Link href="/ai-hospital/departments" className="block text-center font-semibold text-blue-700 underline">All departments</Link>
        </aside>
      </div>
    </main>
  );
}
