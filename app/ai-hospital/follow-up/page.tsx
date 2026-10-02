import type { Metadata } from "next";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import FollowUpApp from "./FollowUpApp";

export const metadata: Metadata = {
  title: `Follow-up Reminders — ${AI_HOSPITAL.name}`,
  description: "Add appointment, test, vaccination, follow-up, and prescribed-medicine reminders to your phone's calendar.",
};

export default function FollowUpPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Follow-up reminders"
        icon="🔔"
        intro="After seeing a doctor, add reminders for appointments, tests, vaccinations, follow-up visits, and medicines your doctor prescribed — straight into your phone's calendar."
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <FollowUpApp />
      </div>
    </main>
  );
}
