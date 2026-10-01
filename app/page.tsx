import Link from "next/link";
import AskAIButton from "./components/AskAIButton";
import { healthTopics } from "./topics";
import { healthTools } from "./tools";
import HeroSlider from "./components/HeroSlider";
import { helplines, importantLinks } from "./site";

const services = [
  { icon: "🏥", label: "AI Hospital", href: "/ai-hospital" },
  { icon: "📚", label: "Health Topics", href: "/#topics" },
  { icon: "🩺", label: "Self-Check Tools", href: "/tools" },
  { icon: "🏥", label: "Find a Hospital", href: "/hospitals" },
  { icon: "📞", label: "Helplines", href: "/helplines" },
  { icon: "💬", label: "Ask a Question", href: null },
];

const myths = [
  {
    myth: "Cancer always means death.",
    fact: "Many cancers can be treated better when found early.",
  },
  {
    myth: "Pain must be serious before seeing a doctor.",
    fact: "Some serious diseases begin with small symptoms. Early check-up is safer.",
  },
  {
    myth: "Online health advice is always correct.",
    fact: "Always check health information with doctors or trusted health sources.",
  },
];

const alerts = [
  {
    label: "Oral Health",
    title: "Tobacco and mouth changes",
    text: "Long-lasting mouth ulcers, lumps, or white patches should be checked by a doctor.",
    style: "border-amber-200 bg-amber-50",
    labelStyle: "text-amber-800",
  },
  {
    label: "Cancer Awareness",
    title: "Early detection matters",
    text: "Early diagnosis can improve treatment outcomes and quality of life.",
    style: "border-red-200 bg-red-50",
    labelStyle: "text-red-800",
  },
  {
    label: "Digital Health",
    title: "Verify online information",
    text: "Not all health advice on social media is accurate. Use trusted sources.",
    style: "border-sky-200 bg-sky-50",
    labelStyle: "text-sky-800",
  },
];

const surveyAreas = [
  "Age group and district",
  "Cancer awareness",
  "Tobacco and betel nut habits",
  "Health check-up behaviour",
  "Online health information trust",
];

export default function Home() {
  return (
    <main className="flex-1">
      <HeroSlider />

      {/* AI Hospital */}
      <section className="bg-gradient-to-r from-blue-950 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">New</p>
            <h2 className="mt-1 text-3xl font-bold">🏥 AI Hospital — Digital Front Door to Healthcare</h2>
            <p className="mt-2 max-w-3xl text-lg text-blue-100">
              Feeling unwell? Find out how urgently you need care, which department to go to, and get a one-page summary
              for the doctor. It does not diagnose — it helps you reach the right care sooner.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row md:flex-col gap-3">
            <Link href="/ai-hospital/triage" className="rounded-lg bg-amber-400 px-6 py-3 text-center text-lg font-bold text-blue-950 hover:bg-amber-300">
              I feel sick →
            </Link>
            <Link href="/ai-hospital" className="rounded-lg border-2 border-white/60 px-6 py-3 text-center text-lg font-semibold hover:bg-white/10">
              Enter AI Hospital
            </Link>
          </div>
        </div>
      </section>

      {/* Citizen services */}
      <section aria-labelledby="services-heading" className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <h2 id="services-heading" className="text-2xl font-bold text-blue-950">
            Citizen Services
          </h2>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {services.map((s) => {
              const tile = (
                <>
                  <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-3xl ring-1 ring-blue-100 group-hover:bg-white">
                    {s.icon}
                  </span>
                  <span className="mt-3 block text-sm font-semibold text-slate-800 group-hover:text-blue-900">
                    {s.label}
                  </span>
                </>
              );
              const cls =
                "group flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50 p-5 text-center transition hover:border-blue-300 hover:bg-blue-50 hover:shadow";
              return s.href ? (
                <Link key={s.label} href={s.href} className={cls}>
                  {tile}
                </Link>
              ) : (
                <AskAIButton key={s.label} className={cls}>
                  {tile}
                </AskAIButton>
              );
            })}
          </div>
        </div>
      </section>

      {/* Topics + sidebar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid lg:grid-cols-[1fr_340px] gap-10">
        <div id="topics">
          <h2 className="text-2xl font-bold text-blue-950 border-l-4 border-amber-400 pl-3">
            Health Topics
          </h2>
          <p className="mt-2 text-slate-600">Warning signs and simple advice, in easy language.</p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {healthTopics.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <span aria-hidden className="text-4xl">{item.icon}</span>
                <span>
                  <span className="block text-lg font-bold text-slate-900 group-hover:text-blue-800">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-sm text-slate-600 leading-relaxed">{item.text}</span>
                  <span className="mt-2 block text-sm font-semibold text-blue-700">Read more →</span>
                </span>
              </Link>
            ))}

            <div id="assistant" className="flex gap-4 rounded-lg bg-blue-900 p-5 text-white shadow-sm">
              <span aria-hidden className="text-4xl">💬</span>
              <span>
                <span className="block text-lg font-bold">Health Assistant</span>
                <span className="mt-1 block text-sm text-blue-100 leading-relaxed">
                  Ask simple health questions and get instant answers. It does
                  not diagnose or prescribe medicine.
                </span>
                <AskAIButton className="mt-3 rounded bg-amber-400 px-4 py-1.5 text-sm font-bold text-blue-950 hover:bg-amber-300">
                  Ask a question
                </AskAIButton>
              </span>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-red-200 bg-white shadow-sm overflow-hidden">
            <h2 className="bg-red-700 px-5 py-3 font-bold text-white">📞 Helplines</h2>
            <ul className="divide-y divide-slate-100">
              {helplines.map((h) => (
                <li key={h.tel} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span>
                    <span className="block font-semibold text-slate-900">{h.label}</span>
                    <span className="block text-xs text-slate-600">{h.text}</span>
                  </span>
                  <a
                    href={`tel:${h.tel}`}
                    className={`shrink-0 font-bold ${h.urgent ? "text-xl text-red-700" : "text-blue-800"} hover:underline`}
                  >
                    {h.number}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <h2 className="bg-blue-900 px-5 py-3 font-bold text-white">🔗 Important Links</h2>
            <ul className="divide-y divide-slate-100 text-sm">
              {importantLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-5 py-3 text-blue-900 hover:bg-blue-50"
                  >
                    {l.label}
                    <span aria-hidden>↗</span>
                    <span className="sr-only">(opens external website in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      {/* Tools */}
      <section id="tools" className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <p className="font-semibold text-blue-300">Interactive · Private · Free</p>
          <h2 className="mt-2 text-3xl font-bold">Check your health in 1 minute</h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            Quick self-check tools. Nothing you enter is saved or sent anywhere.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            {healthTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-blue-400 hover:bg-white/10"
              >
                <div aria-hidden className="text-4xl">{tool.icon}</div>
                <h3 className="mt-4 text-xl font-bold group-hover:text-blue-300">{tool.title}</h3>
                <p className="mt-2 text-slate-300">{tool.text}</p>
                <p className="mt-4 text-sm font-semibold text-blue-300">Start · {tool.time} →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why it matters */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <p className="font-semibold text-red-700">Public health concern</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Why health awareness matters in Mizoram
          </h2>
          <p className="mt-4 max-w-4xl text-slate-600 leading-relaxed">
            Mizoram has been repeatedly discussed for its high cancer burden.
            This platform does not try to diagnose disease. Its purpose is to
            improve public awareness, encourage early check-up, reduce harmful
            habits, and help citizens find trusted health information.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              ["Early awareness", "Small symptoms should not be ignored when they continue for many days."],
              ["Risk reduction", "Tobacco, smoking, alcohol, diet, and late check-up can affect public health."],
              ["Trusted information", "Citizens need simple, clear, and verified health information."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alerts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-bold text-slate-900">Health alerts</h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {alerts.map((a) => (
            <div key={a.title} className={`rounded-xl border p-6 ${a.style}`}>
              <p className={`text-sm font-semibold ${a.labelStyle}`}>{a.label}</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">{a.title}</h3>
              <p className="mt-2 text-slate-700">{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Myth vs fact */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <h2 className="text-3xl font-bold text-slate-900">Myth vs fact</h2>
            <Link href="/tools/quiz" className="font-semibold text-blue-700 hover:underline">
              Take the full quiz →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
            {myths.map((item) => (
              <div key={item.myth} className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Myth</p>
                <p className="mt-1 text-slate-800">{item.myth}</p>
                <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-blue-700">Fact</p>
                <p className="mt-1 text-slate-800">{item.fact}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Survey */}
      <section id="survey" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <p className="font-semibold text-blue-700">Research tool</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Citizen Health Awareness Survey
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              This survey will help understand public health awareness in
              Mizoram, including cancer awareness, tobacco habits, early
              check-up behaviour, and trust in online health information. The
              data can support research, public policy discussion, and digital
              governance studies.
            </p>
            <p className="mt-6 inline-block rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              Survey opening soon
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900">Survey areas</h3>
            <ul className="mt-4 space-y-3">
              {surveyAreas.map((area) => (
                <li key={area} className="flex items-center gap-3 text-slate-700">
                  <span aria-hidden className="text-blue-700 font-bold">✓</span>
                  {area}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
