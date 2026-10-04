import type { Metadata } from "next";
import Link from "next/link";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import { SourceNote } from "../components/ui";
import CalmTools from "./CalmTools";
import CallLink from "../../components/ui/CallLink";

export const metadata: Metadata = {
  title: `Calm Corner — ${AI_HOSPITAL.name}`,
  description: "Short exercises for stress and worry, and free support from Tele-MANAS (14416).",
};

const TIPS = [
  "Keep a daily routine: regular sleep, meals, and some activity.",
  "Talk to someone you trust — family, a friend, a church elder, or a health worker.",
  "Make room for difficult feelings. They come and go, like the weather.",
  "Avoid using alcohol, drugs, or tobacco to cope. They make stress worse over time.",
  "Do one small thing each day that matters to you.",
];

export default function CalmPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Calm corner"
        icon="🌿"
        intro="Short exercises for when you feel stressed, worried, or overwhelmed. They help many people, but they do not replace care from a professional."
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div role="note" className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-lg text-red-950">
          <p className="font-bold">If you are thinking about harming yourself, or are in danger now</p>
          <p className="mt-1">
            Call <CallLink id="erss-112" className="font-bold underline">112</CallLink> now, or call Tele-MANAS free on{" "}
            <CallLink id="telemanas" className="font-bold underline">14416</CallLink> (24 hours). You are not alone.
          </p>
        </div>

        <CalmTools />

        <section aria-labelledby="tips" className="rounded-2xl border-2 border-slate-200 bg-white p-6">
          <h2 id="tips" className="text-2xl font-bold text-blue-950">Everyday ways to look after your mind</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-6 text-lg text-slate-800">
            {TIPS.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section aria-labelledby="help" className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-6">
          <h2 id="help" className="text-2xl font-bold text-blue-950">Talk to someone</h2>
          <p className="mt-2 text-lg text-slate-800">
            If stress, sadness, or worry lasts more than two weeks, or makes daily life hard, talk to a counsellor or doctor.
            Help works, and it is confidential.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <CallLink id="telemanas" className="rounded-xl bg-blue-900 px-5 py-3 text-lg font-bold text-white hover:bg-blue-800">📞 Tele-MANAS 14416</CallLink>
            <Link href="/ai-hospital/departments/mental-health" className="rounded-xl border-2 border-blue-900 bg-white px-5 py-3 text-lg font-bold text-blue-900">Mental health services</Link>
            <Link href="/ai-hospital/consult" className="rounded-xl border-2 border-blue-900 bg-white px-5 py-3 text-lg font-bold text-blue-900">Talk to a doctor</Link>
          </div>
        </section>

        <SourceNote ids={["who-doing-what-matters", "telemanas", "who-mhgap"]} />
      </div>
    </main>
  );
}
