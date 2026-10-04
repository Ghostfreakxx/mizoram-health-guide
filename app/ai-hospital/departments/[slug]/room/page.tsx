import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AI_HOSPITAL } from "../../../../config";
import PageHeader from "../../../../components/PageHeader";
import ConsultationRoom from "../../../consult-room/ConsultationRoom";
import { ROOMS, roomFor } from "../../../consult-room/rooms";
import { getDepartment } from "../../../data/departments";

// Prototype: only departments with a designed room get a page.
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ROOMS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = getDepartment((await params).slug);
  return d ? { title: `${d.plainName} consultation room — ${AI_HOSPITAL.name}`, description: `Sit down with the virtual guide for ${d.plainName.toLowerCase()}. It helps you find the safest next step; it does not diagnose.` } : {};
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = getDepartment(slug);
  const room = roomFor(slug);
  if (!d || !room) notFound();

  return (
    <main className="flex-1">
      <PageHeader
        title={`${d.plainName} consultation room`}
        icon={d.icon}
        intro="The virtual doctor asks about the problem, keeps a note of what you say, and shows you the safest next step. It does not diagnose — a real health professional does."
        crumbs={[
          { href: "/ai-hospital", label: AI_HOSPITAL.name },
          { href: "/ai-hospital/departments", label: "Departments" },
          { href: `/ai-hospital/departments/${d.slug}`, label: d.plainName },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <ConsultationRoom room={room} />
      </div>
    </main>
  );
}
