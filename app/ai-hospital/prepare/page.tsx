import type { Metadata } from "next";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import PrepareForm from "./PrepareForm";

export const metadata: Metadata = {
  title: `Prepare for a Visit — ${AI_HOSPITAL.name}`,
  description: "Make a one-page summary to show the doctor. Nothing is saved.",
};

export default function PreparePage() {
  return (
    <main className="flex-1">
      <div className="no-print">
        <PageHeader
          title="Prepare for a hospital visit"
          icon="📋"
          intro="Answer a few simple questions to make a one-page summary for the doctor. You will not have to explain everything again from the start. Nothing is saved."
          crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
        />
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <PrepareForm />
      </div>
    </main>
  );
}
