import type { Metadata } from "next";
import Link from "next/link";
import RoomLink from "./consult-room/RoomLink";
import { AI_HOSPITAL } from "../config";

export const metadata: Metadata = {
  title: `${AI_HOSPITAL.name} — ${AI_HOSPITAL.subtitle}`,
  description: AI_HOSPITAL.definition,
};

const actions = [
  { href: "/ai-hospital/reception", icon: "🛎️", label: "Tell us what is wrong", sub: "Start at Reception", style: "bg-blue-900 text-white border-blue-900 hover:bg-blue-800" },
  { href: "/ai-hospital/emergency", icon: "🚨", label: "Emergency", sub: "Call for help now", style: "bg-red-700 text-white border-red-700 hover:bg-red-800" },
  { href: "/ai-hospital/departments/general-medicine/room", icon: "🪑", label: "General Medicine consultation", sub: "Sit with the virtual health guide" },
  { href: "/ai-hospital/triage", icon: "🤒", label: "Quick urgency check", sub: "A few questions, text only" },
  { href: "/ai-hospital/departments", icon: "🧭", label: "Find the right department", sub: "Where should I go?" },
  { href: "/ai-hospital/consult", icon: "👩‍⚕️", label: "Talk to a real doctor", sub: "Live, in real time" },
  { href: "/ai-hospital/prepare", icon: "📋", label: "Prepare for a hospital visit", sub: "Make a summary for the doctor" },
  { href: "/ai-hospital/departments/obstetrics-gynaecology", icon: "🤱", label: "Mother & Child", sub: "Pregnancy, babies, children" },
  { href: "/ai-hospital/departments/mental-health", icon: "🧠", label: "Mental Health", sub: "Stress, sadness, worry" },
  { href: "/ai-hospital/departments/oncology", icon: "🎗️", label: "Cancer", sub: "Warning signs and screening" },
  { href: "/ai-hospital/departments#hiv-tb", icon: "🛡️", label: "HIV / TB", sub: "Free testing and treatment" },
  { href: "/ai-hospital/hospitals", icon: "🏥", label: "Find a hospital", sub: "Hospitals in Mizoram" },
  { href: "/ai-hospital/passport", icon: "🗂️", label: "My health records", sub: "Health Passport and saved summaries" },
  { href: "/#topics", icon: "📚", label: "Learn about a condition", sub: "Simple health guides" },
];

const journey = [
  { icon: "🛎️", label: "Reception", text: "Tell us what is wrong" },
  { icon: "🩺", label: "Triage", text: "How urgent is it?" },
  { icon: "🧭", label: "Department", text: "The right service" },
  { icon: "📋", label: "Preparation", text: "Summary for the doctor" },
  { icon: "👩‍⚕️", label: "Real doctor", text: "Online or in person" },
  { icon: "🔁", label: "Follow-up", text: "Reminders and records" },
];

export default function AiHospitalLobby() {
  return (
    <main className="flex-1">
      {/* Entrance */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="inline-block rounded-full bg-white/15 px-4 py-1 text-sm font-semibold uppercase tracking-wide">
            Mizoram Health Guide
          </p>
          <h1 className="mt-4 text-4xl font-black sm:text-6xl">
            🏥 {AI_HOSPITAL.name}
          </h1>
          <p className="mt-2 text-xl font-semibold text-amber-300 sm:text-2xl">{AI_HOSPITAL.subtitle}</p>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-blue-50">
            Find out how urgently you need care, where to go, and get ready to see a real doctor — in simple steps.
          </p>
        </div>
      </section>

      {/* Reception */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <Link
          href="/ai-hospital/reception"
          className="-mt-6 flex items-center gap-4 rounded-2xl border-2 border-amber-300 bg-white p-5 shadow-lg hover:border-amber-400 sm:p-6"
        >
          <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-amber-100 text-4xl">🛎️</span>
          <span className="flex-1">
            <span className="block text-2xl font-bold text-blue-950">Reception</span>
            <span className="block text-lg text-slate-600">Tell us in your own words what is wrong. We will guide you.</span>
          </span>
          <span aria-hidden className="text-3xl text-blue-900">→</span>
        </Link>
      </section>

      {/* Main actions */}
      <section aria-labelledby="actions-heading" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 id="actions-heading" className="text-2xl font-bold text-blue-950">What do you need?</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((a) => {
            // Links into a consultation room warm up the 3D doctor on hover/focus.
            const L = a.href.endsWith("/room") ? RoomLink : Link;
            return (
            <L
              key={a.label}
              href={a.href}
              className={`flex min-h-24 items-center gap-4 rounded-2xl border-2 p-5 transition ${a.style ?? "border-slate-200 bg-white text-slate-900 hover:border-blue-400 hover:bg-blue-50"}`}
            >
              <span aria-hidden className="text-4xl">{a.icon}</span>
              <span>
                <span className="block text-xl font-bold">{a.label}</span>
                <span className={`block text-base ${a.style ? "text-white/85" : "text-slate-600"}`}>{a.sub}</span>
              </span>
            </L>
            );
          })}
        </div>
      </section>

      {/* After the visit */}
      <section aria-labelledby="after-heading" className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <h2 id="after-heading" className="text-2xl font-bold text-blue-950">After your visit</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/ai-hospital/follow-up", icon: "🔔", label: "Reminders", sub: "Appointments, tests, medicines" },
            { href: "/ai-hospital/medicines", icon: "💊", label: "Medicine information", sub: "Understand your prescription" },
            { href: "/ai-hospital/lab-reports", icon: "🧪", label: "Lab report explainer", sub: "What a test measures" },
            { href: "/ai-hospital/passport", icon: "🗂️", label: "Health Passport", sub: "Your records, on your phone" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="flex min-h-24 items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-5 text-slate-900 transition hover:border-blue-400 hover:bg-blue-50">
              <span aria-hidden className="text-4xl">{a.icon}</span>
              <span>
                <span className="block text-xl font-bold">{a.label}</span>
                <span className="block text-base text-slate-600">{a.sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Stay healthy */}
      <section aria-labelledby="healthy-heading" className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <h2 id="healthy-heading" className="text-2xl font-bold text-blue-950">Stay healthy</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/ai-hospital/vaccinations", icon: "💉", label: "Child vaccines", sub: "When each visit is due" },
            { href: "/ai-hospital/screening", icon: "🩺", label: "Free check-ups", sub: "BP, sugar, and cancer checks" },
            { href: "/ai-hospital/calm", icon: "🌿", label: "Calm corner", sub: "Exercises for stress" },
            { href: "/ai-hospital/first-aid", icon: "⛑️", label: "First aid", sub: "Steps to help someone now" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="flex min-h-24 items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-5 text-slate-900 transition hover:border-blue-400 hover:bg-blue-50">
              <span aria-hidden className="text-4xl">{a.icon}</span>
              <span>
                <span className="block text-xl font-bold">{a.label}</span>
                <span className="block text-base text-slate-600">{a.sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3D tours */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
          <h2 className="text-2xl font-bold text-blue-950">🧊 Visit a department in 3D before you go</h2>
          <p className="mt-1 text-lg text-slate-700">Walk through a typical visit, so you know what to expect.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["general-medicine", "General doctor"],
              ["emergency", "Emergency"],
              ["obstetrics-gynaecology", "Pregnancy care"],
              ["paediatrics", "Children's health"],
              ["dental", "Teeth and mouth"],
              ["eye-care", "Eye care"],
            ].map(([slug, label]) => (
              <Link key={slug} href={`/ai-hospital/departments/${slug}/simulator`} className="rounded-xl border-2 border-blue-900 bg-white px-4 py-2 text-lg font-semibold text-blue-900 hover:bg-blue-50">
                {label}
              </Link>
            ))}
            <Link href="/ai-hospital/departments" className="rounded-xl px-4 py-2 text-lg font-semibold text-blue-700 underline">All 17 →</Link>
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="text-2xl font-bold text-blue-950">How AI Hospital works</h2>
          <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {journey.map((j, i) => (
              <li key={j.label} className="rounded-xl bg-slate-50 p-4 text-center">
                <span aria-hidden className="block text-3xl">{j.icon}</span>
                <span className="mt-2 block text-sm font-semibold text-slate-600">Step {i + 1}</span>
                <span className="block text-lg font-bold text-blue-950">{j.label}</span>
                <span className="block text-sm text-slate-600">{j.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-blue-950">What AI Hospital is</h2>
            <p className="mt-2 text-slate-700">{AI_HOSPITAL.definition}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-blue-950">What it is not</h2>
            <p className="mt-2 text-slate-700">{AI_HOSPITAL.boundary}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-blue-950">Your privacy</h2>
            <p className="mt-2 text-slate-700">
              Your answers stay on your phone while you use the page and are not saved or sent anywhere. Urgency is decided by
              fixed safety rules based on published health guidance — not by a chatbot guessing.
            </p>
          </div>
        </div>
        <p className="mt-6 text-sm text-slate-600">
          For staff:{" "}
          <Link href="/ai-hospital/doctor-desk" className="font-semibold text-blue-800 underline">Doctor&apos;s Desk</Link>
          {" · "}
          <Link href="/ai-hospital/admin" className="font-semibold text-blue-800 underline">Health Department dashboard (demonstration)</Link>
        </p>
      </section>
    </main>
  );
}
