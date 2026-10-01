import type { Metadata } from "next";
import PageHeader from "../../components/PageHeader";
import TriageDesk from "./TriageDesk";

export const metadata: Metadata = {
  title: "Triage Desk — Virtual Hospital",
  description: "Answer a few questions to find out how urgently you need care and where to go.",
};

export default function TriagePage() {
  return (
    <main className="flex-1">
      <div className="no-print">
        <PageHeader
          title="Triage Desk"
          icon="🛎️"
          intro="Answer a few simple questions. You will find out how urgently you need care, which department to go to, and how to prepare. It takes about 2 minutes."
          crumbs={[{ href: "/virtual-hospital", label: "Virtual Hospital" }]}
        />
      </div>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <TriageDesk />
      </section>
    </main>
  );
}
