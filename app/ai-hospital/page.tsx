import type { Metadata } from "next";
import Link from "next/link";
import { AI_HOSPITAL } from "../config";

export const metadata: Metadata = {
  title: `${AI_HOSPITAL.name} — ${AI_HOSPITAL.subtitle}`,
  description: AI_HOSPITAL.definition,
};

const actions = [
  { href: "/ai-hospital/triage", icon: "🤒", label: "I feel sick", sub: "Check how urgent it is", style: "bg-blue-900 text-white border-blue-900 hover:bg-blue-800" },
  { href: "/ai-hospital/emergency", icon: "🚨", label: "Emergency", sub: "Call for help now", style: "bg-red-700 text-white border-red-700 hover:bg-red-800" },
  { href: "/ai-hospital/departments", icon: "🧭", label: "Find the right department", sub: "Where should I go?" },
  { href: "/ai-hospital/doctor", icon: "👩‍⚕️", label: "Talk to a real doctor", sub: "Online or in person" },
  { href: "/ai-hospital/prepare", icon: "📋", label: "Prepare for a hospital visit", sub: "Make a summary for the doctor" },
  { href: "/ai-hospital/departments/obstetrics-gynaecology", icon: "🤱", label: "Mother & Child", sub: "Pregnancy, babies, children" },
  { href: "/ai-hospital/departments/mental-health", icon: "🧠", label: "Mental Health", sub: "Stress, sadness, worry" },
  { href: "/ai-hospital/departments/oncology", icon: "🎗️", label: "Cancer", sub: "Warning signs and screening" },
  { href: "/ai-hospital/departments#hiv-tb", icon: "🛡️", label: "HIV / TB", sub: "Free testing and treatment" },
  { href: "/ai-hospital/hospitals", icon: "🏥", label: "Find a hospital", sub: "Hospitals in Mizoram" },
  { href: "/ai-hospital/prepare#summary", icon: "🗂️", label: "My visit summary", sub: "Print or show on phone" },
  { href: "/#topics", icon: "📚", label: "Learn about a condition", sub: "Simple health guides" },
];

const journey = [
  { icon: "🛎️", label: "Reception", text: "Tell us what is wrong" },
  { icon: "🩺", label: "Triage", text: "How urgent is it?" },
  { icon: "🧭", label: "Department", text: "The right service" },
  { icon: "📋", label: "Preparation", text: "Summary for the doctor" },
  { icon: "👩‍⚕️", label: "Real doctor", text: "Online or in person" },
  { icon: "🔁", label: "Follow-up", text: "Coming soon" },
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
          {actions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={`flex min-h-24 items-center gap-4 rounded-2xl border-2 p-5 transition ${a.style ?? "border-slate-200 bg-white text-slate-900 hover:border-blue-400 hover:bg-blue-50"}`}
            >
              <span aria-hidden className="text-4xl">{a.icon}</span>
              <span>
                <span className="block text-xl font-bold">{a.label}</span>
                <span className={`block text-base ${a.style ? "text-white/85" : "text-slate-600"}`}>{a.sub}</span>
              </span>
            </Link>
          ))}
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
      </section>
    </main>
  );
}
