import type { Metadata } from "next";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import { readConfig } from "../../lib/consult";
import { teleconsultServices } from "../data/teleconsult";
import ConsultLobby from "./ConsultLobby";

export const metadata: Metadata = {
  title: `Consulting Room — ${AI_HOSPITAL.name}`,
  description: "Get ready for a real-time consultation with a real doctor.",
};

export default function ConsultPage() {
  const esanjeevani = teleconsultServices.find((s) => s.id === "esanjeevani")!;
  return (
    <main className="flex-1">
      <PageHeader
        title="Consulting room"
        icon="🩺"
        intro="Talk to a real, registered doctor — in real time. Get your camera, microphone, and summary ready first."
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <ConsultLobby
          liveEnabled={readConfig().enabled}
          esanjeevaniUrl={esanjeevani.officialUrl.value}
          esanjeevaniVerified={esanjeevani.officialUrl.verified}
        />
      </div>
    </main>
  );
}
