import type { Metadata } from "next";
import Link from "next/link";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import { SOURCE_IDS } from "../../lib/screening";
import { SourceNote } from "../components/ui";
import ScreeningCheck from "./ScreeningCheck";

export const metadata: Metadata = {
  title: `Free Health Check-ups — ${AI_HOSPITAL.name}`,
  description: "Find out which free check-ups for blood pressure, diabetes, and common cancers you can ask for.",
};

export default function ScreeningPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Free health check-ups"
        icon="🩺"
        intro="High blood pressure, diabetes, and some cancers often cause no symptoms at first. Free check-ups find them early, when treatment works best."
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <ScreeningCheck />
        <p className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 text-lg text-red-900">
          A check-up is for people who feel well. If you have symptoms now — for example chest pain, a lump, unusual bleeding,
          or a sore in the mouth that does not heal — do not wait for screening. Use the{" "}
          <Link href="/ai-hospital/triage" className="font-semibold underline">Triage Desk</Link> or see a doctor.
        </p>
        <SourceNote ids={SOURCE_IDS} />
      </div>
    </main>
  );
}
