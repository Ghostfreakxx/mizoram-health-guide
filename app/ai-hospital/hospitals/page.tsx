import type { Metadata } from "next";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import HospitalNavigator from "../components/HospitalNavigator";

export const metadata: Metadata = {
  title: `Find a Hospital — ${AI_HOSPITAL.name}`,
  description: "Hospitals in Mizoram, showing only verified information.",
};

export default function HospitalsNavigatorPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Find a hospital"
        icon="🏥"
        intro="Hospitals in Mizoram by district. We only show details that have been confirmed from an official source."
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <HospitalNavigator />
      </div>
    </main>
  );
}
