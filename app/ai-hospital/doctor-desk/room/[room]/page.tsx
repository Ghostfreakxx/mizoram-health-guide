import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AI_HOSPITAL } from "../../../../config";
import PageHeader from "../../../../components/PageHeader";
import { isValidRoomId, readConfig } from "../../../../lib/consult";
import DoctorRoom from "./DoctorRoom";

export const metadata: Metadata = {
  title: `Consultation — Doctor's Desk — ${AI_HOSPITAL.name}`,
  robots: { index: false, follow: false },
};

export default async function DoctorRoomPage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const { domain } = readConfig();
  if (!isValidRoomId(room) || !domain) notFound();
  return (
    <main className="flex-1">
      <PageHeader title="Consultation" icon="🎥" crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }, { href: "/ai-hospital/doctor-desk", label: "Doctor's Desk" }]} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <DoctorRoom domain={domain} room={room} />
      </div>
    </main>
  );
}
