import type { Metadata } from "next";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import PassportApp from "./PassportApp";

export const metadata: Metadata = {
  title: `Health Passport — ${AI_HOSPITAL.name}`,
  description: "Keep your allergies, medicines, conditions, emergency contact, and visit summaries on your own phone.",
};

export default function PassportPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="My Health Passport"
        icon="🗂️"
        intro="Keep important health information ready for doctors and emergencies. You control it: it is saved only on your phone if you choose, and you can delete it at any time."
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <PassportApp />
      </div>
    </main>
  );
}
