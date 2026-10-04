"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AGE_GROUPS, DURATIONS, PROGRESSIONS, SEVERITIES } from "../../lib/safety/triage";
import DoctorSummary from "../components/DoctorSummary";
import { BigChoice } from "../components/ui";
import CallLink from "../../components/ui/CallLink";

type Opt = { id: string; label: string };

function Choices({ label, options, value, onChange, cols = 2 }: { label: string; options: readonly Opt[]; value?: string; onChange: (id?: string) => void; cols?: number }) {
  return (
    <fieldset>
      <legend className="text-lg font-bold text-blue-950">{label}</legend>
      <div className={`mt-2 grid gap-2 ${cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {options.map((o) => (
          <BigChoice key={o.id} selected={value === o.id} onClick={() => onChange(value === o.id ? undefined : o.id)}>
            {o.label}
          </BigChoice>
        ))}
      </div>
    </fieldset>
  );
}

const SEXES = [
  { id: "Female", label: "Female" },
  { id: "Male", label: "Male" },
];
const PREGNANCY = [
  { id: "Pregnant", label: "Pregnant" },
  { id: "Gave birth in the last 6 weeks", label: "Gave birth in the last 6 weeks" },
  { id: "Not pregnant", label: "Not pregnant" },
];

export default function PrepareForm() {
  const [forWhom, setForWhom] = useState<string>();
  const [age, setAge] = useState<string>();
  const [sex, setSex] = useState<string>();
  const [pregnancy, setPregnancy] = useState<string>();
  const [concern, setConcern] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [started, setStarted] = useState<string>();
  const [progression, setProgression] = useState<string>();
  const [severity, setSeverity] = useState<string>();
  // Set in the browser only, so the server-rendered page and the client agree.
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- time must come from the visitor's clock
    setGeneratedAt(new Date());
  }, []);

  const label = (list: readonly Opt[], id?: string) => list.find((x) => x.id === id)?.label;
  const showPregnancy = sex !== "Male" && (age === "child" || age === "adult");

  const input = "mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-lg text-slate-900 outline-none focus:border-blue-700";

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 text-red-950">
        <p className="text-lg font-semibold">
          Feeling very unwell right now? <Link href="/ai-hospital/emergency" className="underline">Open Emergency Mode</Link> or call{" "}
          <CallLink id="ambulance-108" className="font-bold underline">108</CallLink>. Not sure how urgent it is?{" "}
          <Link href="/ai-hospital/triage" className="underline">Use the Triage Desk</Link> — it fills in this summary for you.
        </p>
      </div>

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
        <h2 className="text-2xl font-bold text-blue-950">1. About the patient</h2>
        <Choices label="Who is this for?" options={[{ id: "Self", label: "Myself" }, { id: "Someone else", label: "Someone else" }]} value={forWhom} onChange={setForWhom} />
        <Choices label="Age" options={AGE_GROUPS} value={age} onChange={setAge} />
        <Choices label="Sex (if you want the doctor to know)" options={SEXES} value={sex} onChange={setSex} />
        {showPregnancy && <Choices label="Pregnancy" options={PREGNANCY} value={pregnancy} onChange={setPregnancy} cols={3} />}
      </section>

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
        <h2 className="text-2xl font-bold text-blue-950">2. The problem</h2>
        <label className="block text-lg font-bold text-blue-950">
          Main concern
          <input className={input} value={concern} onChange={(e) => setConcern(e.target.value)} placeholder="e.g. cough and fever" maxLength={200} />
        </label>
        <label className="block text-lg font-bold text-blue-950">
          Other symptoms (one per line)
          <textarea className={input} rows={3} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder={"e.g. tired\nno appetite"} maxLength={600} />
        </label>
        <Choices label="When did it start?" options={DURATIONS} value={started} onChange={setStarted} />
        <Choices label="How has it changed?" options={PROGRESSIONS} value={progression} onChange={setProgression} cols={3} />
        <Choices label="How bad is it?" options={SEVERITIES} value={severity} onChange={setSeverity} cols={3} />
      </section>

      <section id="summary" className="scroll-mt-20 space-y-3">
        <h2 className="text-2xl font-bold text-blue-950">3. Your one-page doctor summary</h2>
        {generatedAt ? (
        <DoctorSummary
          base={{
            generatedAt,
            forWhom,
            age: label(AGE_GROUPS, age),
            sex,
            pregnancy: showPregnancy ? pregnancy : undefined,
            mainConcern: concern,
            relevant: symptoms.split(/\n|,/).map((s) => s.trim()).filter(Boolean),
            started: label(DURATIONS, started),
            progression: label(PROGRESSIONS, progression),
            severity: label(SEVERITIES, severity),
          }}
        />
        ) : (
          <p className="text-lg text-slate-600">Preparing your summary…</p>
        )}
      </section>
    </div>
  );
}
