import type { Metadata } from "next";
import Link from "next/link";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import { PREGNANCY_VACCINES, SOURCE_IDS } from "../../lib/vaccines";
import { SourceNote } from "../components/ui";
import VaccinationPlanner from "./VaccinationPlanner";

export const metadata: Metadata = {
  title: `Child Vaccination Planner — ${AI_HOSPITAL.name}`,
  description: "See when your child's free vaccines are usually due under the national schedule, and add reminders to your calendar.",
};

export default function VaccinationsPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Child vaccination planner"
        icon="💉"
        intro="Free vaccines protect children from serious diseases. Enter your child's date of birth to see when each visit is usually due."
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <div role="note" className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-amber-950">
          <p className="text-lg font-bold">Your child&apos;s MCP card and health worker are the final word</p>
          <p className="mt-1">
            This timetable follows the national schedule, which is updated from time to time. Vaccines are free at government
            health centres and Anganwadi immunisation days.
          </p>
        </div>

        <section aria-labelledby="planner">
          <h2 id="planner" className="sr-only">Plan the visits</h2>
          <VaccinationPlanner />
        </section>

        <section aria-labelledby="pregnancy" className="rounded-2xl border-2 border-slate-200 bg-white p-6">
          <h2 id="pregnancy" className="text-2xl font-bold text-blue-950">🤰 Vaccines in pregnancy</h2>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-lg text-slate-800">
            {PREGNANCY_VACCINES.map((v) => <li key={v}>{v}</li>)}
          </ul>
          <p className="mt-3 text-slate-700">
            Your health worker will give these at your antenatal check-ups.{" "}
            <Link href="/ai-hospital/departments/obstetrics-gynaecology" className="font-semibold text-blue-800 underline">Pregnancy care</Link>
          </p>
        </section>

        <section aria-labelledby="after" className="rounded-2xl border-2 border-slate-200 bg-white p-6">
          <h2 id="after" className="text-2xl font-bold text-blue-950">After a vaccine</h2>
          <p className="mt-2 text-lg text-slate-800">
            Mild fever, crying, or soreness where the injection was given are common and usually settle in a day or two.
            Keep breastfeeding.
          </p>
          <p className="mt-2 text-lg font-semibold text-red-800">
            Call 108 or go to hospital at once if the child has trouble breathing, swelling of the face, fits, or is very
            sleepy and hard to wake.
          </p>
        </section>

        <SourceNote ids={SOURCE_IDS} />
      </div>
    </main>
  );
}
