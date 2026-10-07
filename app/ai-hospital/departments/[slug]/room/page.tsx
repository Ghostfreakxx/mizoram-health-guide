import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AI_HOSPITAL } from "../../../../config";
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

  // The room is a full-screen mode of its own (no site header or footer);
  // it carries its own top bar with Leave and Emergency.
  return (
    <main className="flex-1">
      <ConsultationRoom room={room} department={{ name: d.plainName, icon: d.icon, href: `/ai-hospital/departments/${d.slug}` }} />
    </main>
  );
}
