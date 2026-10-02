import type { Metadata } from "next";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import LabExplainer from "./LabExplainer";

export const metadata: Metadata = {
  title: `Lab Report Explainer — ${AI_HOSPITAL.name}`,
  description: "Understand what common lab tests measure and prepare questions for your doctor.",
};

export default function LabReportsPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Lab report explainer"
        icon="🧪"
        intro="Understand what common tests on your report measure, what a reference range is, and what to ask your doctor."
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <LabExplainer />
      </div>
    </main>
  );
}
