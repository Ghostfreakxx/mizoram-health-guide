import type { Metadata } from "next";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import TriageFlow from "../components/TriageFlow";
import { BoundaryNote } from "../components/ui";

export const metadata: Metadata = {
  title: `Triage Desk — ${AI_HOSPITAL.name}`,
  description: "Answer simple questions to find out how urgently to seek care and where to go.",
};

export default function TriagePage() {
  return (
    <main className="flex-1">
      <div className="no-print">
        <PageHeader
          title="Triage Desk"
          icon="🛎️"
          intro="Answer simple questions, one at a time. You will find out how urgently to seek care, where to go, and get a summary to show the doctor."
          crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
        />
      </div>
      <section className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
        <div className="no-print">
          <BoundaryNote text={AI_HOSPITAL.shortBoundary} />
        </div>
        <TriageFlow />
      </section>
    </main>
  );
}
