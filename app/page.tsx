import Link from "next/link";
import AskAIButton from "./components/AskAIButton";
import { healthTopics } from "./topics";

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
      {/* Hero */}
      <section className="bg-gradient-to-b from-teal-50 to-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 grid lg:grid-cols-[1.3fr_1fr] gap-12 items-center">
          <div>
            <p className="inline-block rounded-full bg-teal-100 px-3 py-1 text-sm font-medium text-teal-800">
              Digital public health awareness for Mizoram
            </p>

            <h1 className="mt-5 text-4xl md:text-6xl font-bold tracking-tight text-slate-900">
              Simple health information for every citizen.
            </h1>

            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl">
              Learn early warning signs, reduce harmful habits, and know when to
              see a doctor — in clear, easy language.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="#topics"
                className="rounded-lg bg-teal-700 px-6 py-3 text-center font-semibold text-white hover:bg-teal-800"
              >
                Explore health topics
              </Link>
              <AskAIButton className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 hover:bg-slate-50">
                Ask the AI Health Guide
              </AskAIButton>
            </div>

            <p className="mt-6 text-sm text-slate-500">
              For awareness only. Please visit a doctor for medical advice.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900">Need help now?</h2>
            <ul className="mt-4 divide-y divide-slate-100">
              <li className="flex items-center justify-between py-3">
                <span className="text-slate-600">Ambulance</span>
                <a href="tel:108" className="text-xl font-bold text-red-700">108</a>
              </li>
              <li className="flex items-center justify-between py-3">
                <span className="text-slate-600">National emergency</span>
                <a href="tel:112" className="text-xl font-bold text-red-700">112</a>
              </li>
              <li className="flex items-center justify-between py-3">
                <span className="text-slate-600">Hospitals near you</span>
                <Link href="/hospitals" className="font-semibold text-teal-700 hover:underline">
                  View directory →
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Topics */}
      <section id="topics" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-bold text-slate-900">Health topics</h2>
        <p className="mt-2 text-slate-600">Choose a topic to learn the warning signs and simple advice.</p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {healthTopics.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-300 hover:shadow-md"
            >
              <div aria-hidden className="text-4xl">{item.icon}</div>
              <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-teal-800">
                {item.title}
              </h3>
              <p className="mt-2 text-slate-600 leading-relaxed">{item.text}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-teal-700">
                Read more →
              </span>
            </Link>
          ))}

          <div className="rounded-xl bg-teal-700 p-6 text-white shadow-sm">
            <div aria-hidden className="text-4xl">💬</div>
            <h3 className="mt-4 text-xl font-bold">AI Health Guide</h3>
            <p className="mt-2 text-teal-50 leading-relaxed">
              Ask simple health questions in easy English. It does not diagnose
              or prescribe medicine.
            </p>
            <AskAIButton className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">
              Start a conversation
            </AskAIButton>
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
          <h2 className="text-3xl font-bold text-slate-900">Myth vs fact</h2>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
            {myths.map((item) => (
              <div key={item.myth} className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Myth</p>
                <p className="mt-1 text-slate-800">{item.myth}</p>
                <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-teal-700">Fact</p>
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
            <p className="font-semibold text-teal-700">Research tool</p>
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
                  <span aria-hidden className="text-teal-700 font-bold">✓</span>
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
