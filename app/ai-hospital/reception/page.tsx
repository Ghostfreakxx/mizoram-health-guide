import type { Metadata } from "next";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import { BoundaryNote } from "../components/ui";
import ReceptionDesk from "./ReceptionDesk";

export const metadata: Metadata = {
  title: `Reception — ${AI_HOSPITAL.name}`,
  description: "Tell us what is wrong in your own words, and we will guide you to the right care.",
};

export default function ReceptionPage() {
  return (
    <main className="flex-1">
      <div className="no-print">
        <PageHeader
          title="Reception"
          icon="🛎️"
          intro="Tell us in your own words what is wrong. We will help you find out how urgent it is and where to go."
          crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
        />
      </div>
      <section className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
        <div className="no-print">
          <BoundaryNote text={`${AI_HOSPITAL.shortBoundary} The receptionist does not decide urgency on its own — fixed safety rules do.`} />
        </div>
        <ReceptionDesk />
      </section>
    </main>
  );
}
