import type { Metadata } from "next";
import Link from "next/link";
import HospitalNavigator from "../ai-hospital/components/HospitalNavigator";
import PageHeader from "../components/PageHeader";
import { ActionCard, Section } from "../components/ui";
import CallLink from "../components/ui/CallLink";
import { HELPLINES } from "../lib/helplines";
import CareTypeGuide from "./CareTypeGuide";

export const metadata: Metadata = {
  title: "Find Care",
  description: "Emergency numbers, free helplines, online consultations with real doctors, and hospitals in Mizoram — verified information only.",
};

export default function FindCare() {
  const urgent = HELPLINES.filter((h) => h.urgent);
  const support = HELPLINES.filter((h) => !h.urgent);
  return (
    <main className="flex-1 bg-slate-50">
      <PageHeader title="Find Care" icon="📍" intro="Where to get help: emergency numbers, free helplines, real doctors online, and hospitals in Mizoram." />

      <section aria-label="Emergency" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-red-300 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg font-bold text-red-950">Emergency? Chest pain, trouble breathing, heavy bleeding, fits, or someone who will not wake.</p>
          <div className="flex shrink-0 gap-2">
            {urgent.map((h) => (
              <CallLink key={h.id} id={h.id} className="min-h-12 rounded-xl bg-red-700 px-5 py-3 text-lg font-bold text-white hover:bg-red-800">
                📞 {h.number}
              </CallLink>
            ))}
          </div>
        </div>
      </section>

      <Section id="choose" title="Not sure where to go?" intro="Tell us what's wrong. We'll help you find out how urgently to be seen, and where.">
        <div className="grid gap-3 sm:grid-cols-3">
          <ActionCard href="/ai-hospital/reception" icon="💬" title="Check my symptoms" text="Find out how urgent it is" tone="primary" />
          <ActionCard href="/ai-hospital/doctor" icon="👩‍⚕️" title="Talk to a real doctor" text="Online or in person" />
          <ActionCard href="/ai-hospital/departments" icon="🧭" title="Hospital departments" text="What each department does" />
        </div>
      </Section>

      <Section id="care-type" title="What type of care should I look for?" intro="How urgently to be seen decides where to go. The consultation tells you which of these fits; this is what each one means.">
        <CareTypeGuide />
      </Section>

      <Section id="helplines" title="Free helplines" intro="Tap a number to call. Each number is recorded with the official source it comes from.">
        <ul className="grid gap-3 sm:grid-cols-2">
          {support.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <span>
                <span className="block font-bold text-blue-950">{h.name}</span>
                <span className="block text-sm text-slate-600">{h.purpose}</span>
              </span>
              <a href={`tel:${h.tel}`} className="min-h-12 shrink-0 rounded-xl border-2 border-blue-900 px-4 py-2.5 text-lg font-bold text-blue-900 hover:bg-blue-50">
                {h.number}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-slate-600">
          Sources for every number are listed on the{" "}
          <Link href="/ai-hospital/sources" className="underline">
            Sources page
          </Link>
          , with whether each has been re-checked recently.
        </p>
      </Section>

      <Section id="hospitals" title="Hospitals in Mizoram" intro="Only details confirmed from an official source are shown.">
        <HospitalNavigator />
      </Section>
    </main>
  );
}
