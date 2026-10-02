import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AI_HOSPITAL } from "../../../../config";
import PageHeader from "../../../../components/PageHeader";
import { isValidRoomId, readConfig } from "../../../../lib/consult";
import LiveConsult from "../../LiveConsult";

export const metadata: Metadata = {
  title: `Live consultation — ${AI_HOSPITAL.name}`,
  robots: { index: false, follow: false },
};

export default async function LiveConsultPage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  if (!isValidRoomId(room)) notFound();
  return (
    <main className="flex-1">
      <PageHeader
        title="Live consultation"
        icon="🎥"
        intro="A real-time video consultation with a registered doctor."
        crumbs={[
          { href: "/ai-hospital", label: AI_HOSPITAL.name },
          { href: "/ai-hospital/consult", label: "Consulting room" },
        ]}
      />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <LiveConsult domain={readConfig().domain} room={room} />
      </div>
    </main>
  );
}
