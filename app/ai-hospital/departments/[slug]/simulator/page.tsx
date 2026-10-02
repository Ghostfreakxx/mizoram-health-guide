import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AI_HOSPITAL } from "../../../../config";
import PageHeader from "../../../../components/PageHeader";
import { departments, getDepartment } from "../../../data/departments";
import { getSimulation } from "../../../data/simulator";
import SimulatorShell from "../../../simulator/SimulatorShell";

export const dynamicParams = false;

export function generateStaticParams() {
  return departments.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = getDepartment((await params).slug);
  return d ? { title: `3D tour: ${d.plainName} — ${AI_HOSPITAL.name}`, description: `Walk through a typical ${d.plainName.toLowerCase()} visit in 3D.` } : {};
}

export default async function SimulatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = getDepartment(slug);
  const sim = getSimulation(slug);
  if (!d || !sim) notFound();

  return (
    <main className="flex-1">
      <PageHeader
        title={`3D tour: ${d.plainName}`}
        icon={d.icon}
        intro="See what usually happens during a visit, step by step, so you know what to expect before you go."
        crumbs={[
          { href: "/ai-hospital", label: AI_HOSPITAL.name },
          { href: "/ai-hospital/departments", label: "Departments" },
          { href: `/ai-hospital/departments/${d.slug}`, label: d.plainName },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SimulatorShell simulation={sim} departmentHref={`/ai-hospital/departments/${d.slug}`} />
      </div>
    </main>
  );
}
