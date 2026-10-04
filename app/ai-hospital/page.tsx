import type { Metadata } from "next";
import Link from "next/link";
import RoomLink from "./consult-room/RoomLink";
import { AI_HOSPITAL, SITE } from "../config";
import { Section } from "../components/ui";

export const metadata: Metadata = {
  title: `${AI_HOSPITAL.name} — ${AI_HOSPITAL.subtitle}`,
  description: AI_HOSPITAL.definition,
};

// The lobby asks one question and offers five answers. Everything else is
// one step further down, grouped by when people need it.

const choices = [
  { href: "/ai-hospital/reception", icon: "💬", title: "Something is wrong", text: "Tell us in your own words — we'll help you find out how urgent it is and where to go.", tone: "primary" as const },
  { href: "/ai-hospital/departments/general-medicine/room", icon: "🩺", title: "Talk to the virtual doctor", text: "A guided consultation. It helps you describe the problem and prepares a summary.", room: true },
  { href: "/ai-hospital/emergency", icon: "🚨", title: "It's an emergency", text: "Call 108 and see what to do while help comes.", tone: "danger" as const },
  { href: "/ai-hospital/doctor", icon: "👩‍⚕️", title: "See a real doctor", text: "Free online consultations and how to get the most from a visit." },
  { href: "/ai-hospital/prepare", icon: "📝", title: "Prepare for a visit", text: "Write down what to tell the doctor, in one page." },
];

const more = [
  {
    title: "After a visit",
    links: [
      { href: "/ai-hospital/medicines", label: "Understand a prescription" },
      { href: "/ai-hospital/lab-reports", label: "Understand a lab report" },
      { href: "/ai-hospital/follow-up", label: "Set reminders" },
      { href: "/ai-hospital/passport", label: "Health Passport (your records, on your phone)" },
    ],
  },
  {
    title: "Stay healthy",
    links: [
      { href: "/ai-hospital/vaccinations", label: "Child vaccination planner" },
      { href: "/ai-hospital/screening", label: "Free check-ups (age 30+)" },
      { href: "/ai-hospital/first-aid", label: "First aid" },
      { href: "/ai-hospital/calm", label: "Calm corner" },
    ],
  },
  {
    title: "Departments",
    links: [
      { href: "/ai-hospital/departments", label: "All departments" },
      { href: "/ai-hospital/departments/general-medicine/simulator", label: "Walk through a visit in 3D" },
      { href: "/ai-hospital/triage", label: "Quick urgency check (text only)" },
      { href: "/ai-hospital/sources", label: "Sources and verification" },
    ],
  },
];

const tone = {
  primary: "border-blue-900 bg-blue-900 text-white hover:bg-blue-800",
  danger: "border-red-700 bg-red-700 text-white hover:bg-red-800",
  default: "border-slate-200 bg-white text-slate-900 hover:border-blue-500 hover:bg-blue-50",
};

export default function AiHospitalLobby() {
  return (
    <main className="flex-1 bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-800">
            {SITE.name} · {AI_HOSPITAL.subtitle}
          </p>
          <h1 className="mt-2 text-3xl font-black text-blue-950 sm:text-5xl">What can we help you with today?</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-700">{AI_HOSPITAL.shortBoundary}</p>
        </div>
      </section>

      <nav aria-label="Choose what you need" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {choices.map((c, i) => {
            const L = c.room ? RoomLink : Link;
            const t = tone[c.tone ?? "default"];
            return (
              <li key={c.href} className={i === 0 ? "md:col-span-2 lg:col-span-1 lg:row-span-2" : ""}>
                <L href={c.href} className={`flex h-full min-h-24 items-start gap-4 rounded-2xl border-2 p-5 transition-colors ${t}`}>
                  <span aria-hidden className="text-4xl">
                    {c.icon}
                  </span>
                  <span>
                    <span className="block text-xl font-bold">{c.title}</span>
                    <span className={`mt-1 block ${c.tone ? "text-white/85" : "text-slate-600"}`}>{c.text}</span>
                  </span>
                </L>
              </li>
            );
          })}
        </ul>
      </nav>

      <Section id="more" title="More services" className="pt-2">
        <div className="grid gap-4 md:grid-cols-3">
          {more.map((g) => (
            <div key={g.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-blue-950">{g.title}</h3>
              <ul className="mt-2 space-y-1">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-block py-1.5 font-semibold text-blue-800 underline-offset-4 hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section id="how" title="How the AI Hospital keeps you safe">
        <ul className="grid gap-3 md:grid-cols-3">
          <li className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-blue-950">Fixed safety rules decide urgency</h3>
            <p className="mt-1 text-slate-700">Danger signs are checked by fixed rules based on published health guidance — not by an AI guessing.</p>
          </li>
          <li className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-blue-950">No diagnosis, no prescriptions</h3>
            <p className="mt-1 text-slate-700">{AI_HOSPITAL.boundary}</p>
          </li>
          <li className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-blue-950">Nothing is kept</h3>
            <p className="mt-1 text-slate-700">
              Your answers are worked on in your browser and are not sent to us. They are gone when you close the tab.{" "}
              <Link href="/privacy" className="font-semibold text-blue-800 underline">
                Privacy
              </Link>
            </p>
          </li>
        </ul>
        <p className="mt-5 text-sm text-slate-600">
          For health staff:{" "}
          <Link href="/ai-hospital/doctor-desk" className="font-semibold text-blue-800 underline">
            Doctor&apos;s Desk
          </Link>
        </p>
      </Section>
    </main>
  );
}
