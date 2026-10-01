import type { Metadata } from "next";
import Link from "next/link";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import { departments, getDepartment } from "../data/departments";

export const metadata: Metadata = {
  title: `Departments — ${AI_HOSPITAL.name}`,
  description: "Find the right hospital department for your health problem.",
};

const groups = [
  { id: "emergency", title: "Emergency", slugs: ["emergency"] },
  { id: "general", title: "General and specialist care", slugs: ["general-medicine", "cardiology", "respiratory", "ent", "dental", "dermatology", "orthopaedics", "eye-care"] },
  { id: "mother-child", title: "Mother and child", slugs: ["obstetrics-gynaecology", "paediatrics"] },
  { id: "cancer", title: "Cancer", slugs: ["oncology"] },
  { id: "mental", title: "Mental health and substance use", slugs: ["mental-health", "substance-use"] },
  { id: "hiv-tb", title: "Infections, HIV, and TB", slugs: ["infectious-diseases", "hiv-services", "tb-services"] },
];

export default function DepartmentsPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Find the right department"
        icon="🧭"
        intro={`${departments.length} departments. Each page explains what it handles, what happens on a visit, what to bring, and when to go to Emergency instead.`}
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        <Link href="/ai-hospital/triage" className="flex items-center justify-between gap-4 rounded-2xl bg-blue-900 p-6 text-white hover:bg-blue-800">
          <span>
            <span className="block text-xl font-bold">Not sure which department?</span>
            <span className="block text-blue-100">Answer a few questions and we will suggest one.</span>
          </span>
          <span className="shrink-0 rounded-xl bg-amber-400 px-5 py-3 text-lg font-bold text-blue-950">Start triage →</span>
        </Link>

        {groups.map((g) => (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`} className="scroll-mt-20">
            <h2 id={`${g.id}-h`} className="border-l-4 border-amber-400 pl-3 text-2xl font-bold text-blue-950">{g.title}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.slugs.map(getDepartment).filter((d): d is NonNullable<typeof d> => !!d).map((d) => (
                <Link
                  key={d.slug}
                  href={`/ai-hospital/departments/${d.slug}`}
                  className={`flex gap-4 rounded-2xl border-2 p-5 transition ${d.slug === "emergency" ? "border-red-300 bg-red-50 hover:border-red-500" : "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50"}`}
                >
                  <span aria-hidden className="text-4xl">{d.icon}</span>
                  <span>
                    <span className="block text-xl font-bold text-slate-900">{d.plainName}</span>
                    <span className="block text-sm font-semibold text-slate-600">{d.name}</span>
                    <span className="mt-1 block text-slate-600">{d.summary}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
