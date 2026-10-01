import FireAura from "./components/FireAura";
<FireAura />
import FireWarriorHero from "./components/FireWarriorHero";
import Link from "next/link";
import HealthChatbot from "./components/HealthChatbot";
const healthModules = [
  {
    icon: "🎗️",
    title: "Cancer Awareness",
    text: "Learn early warning signs, risk factors, and when to seek help.",
  },
  {
    icon: "🫁",
    title: "Tobacco & Oral Health",
    text: "Understand how smoking, tobacco, and betel nut can affect health.",
  },
  {
    icon: "🩸",
    title: "Diabetes Awareness",
    text: "Simple information on sugar level, diet, exercise, and regular check-up.",
  },
  {
    icon: "❤️",
    title: "Heart Health",
    text: "Know the basics of blood pressure, chest pain, and healthy habits.",
  },
  {
    icon: "🧠",
    title: "Mental Wellbeing",
    text: "Simple guidance on stress, sleep, addiction, and asking for support.",
  },
  {
    icon: "🤖",
    title: "AI Health Guide",
    text: "Ask simple health questions in easy English. Coming soon.",
  },
];

const dashboardItems = [
  ["Health Topics", "6"],
  ["AI Assistant", "Beta"],
  ["Survey Module", "Coming Soon"],
  ["Verified Resources", "Updating"],
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

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <FireWarriorHero />
      <section className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
  <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    
    <div>
      <h1 className="font-black text-xl">
        Mizoram Health Guide
      </h1>
    </div>

    <div className="hidden md:flex gap-6 text-sm text-slate-300">
      <a href="#" className="hover:text-emerald-300">
        Home
      </a>

      <a href="#" className="hover:text-emerald-300">
        Awareness
      </a>

      <a href="#" className="hover:text-emerald-300">
        Survey
      </a>

      <a href="#" className="hover:text-emerald-300">
        Hospitals
      </a>

      <a href="#" className="hover:text-emerald-300">
        Ask AI
      </a>
    </div>

  </div>
</section>

      <section className="px-6 pt-16 pb-10 max-w-7xl mx-auto text-center">
        <div className="inline-block mb-5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
          Digital Public Health Awareness for Mizoram
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight">
          Mizoram Health Guide
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          A simple digital platform for health awareness, early warning signs,
          public health information, and citizen-friendly guidance in Mizoram.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <button className="rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950">
            Explore Health Topics
          </button>
          <button className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-200">
            Ask AI Health Guide
          </button>
        </div>

        <p className="mt-6 text-sm text-slate-400">
          For awareness only. Please visit a doctor for medical advice.
        </p>
      </section>

      <section className="px-6 py-10 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">Health Awareness Modules</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {healthModules.map((item) => (
            <Link
  href={
  item.title === "Cancer Awareness"
    ? "/cancer"
    : item.title === "Tobacco & Oral Health"
    ? "/tobacco"
    : item.title === "Diabetes Awareness"
    ? "/diabetes"
    : item.title === "Heart Health"
    ? "/heart"
    : item.title === "Mental Wellbeing"
    ? "/mental"
    : item.title === "AI Health Guide"
    ? "/ai-health-guide"
    : "#"
}
      
key={item.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 hover:bg-slate-800 transition"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-2xl font-bold">{item.title}</h3>
              <p className="mt-3 text-slate-400 leading-relaxed">
                {item.text}
              </p>
            </Link>
          ))}
        </div>
      </section>
<section className="px-6 py-10 max-w-7xl mx-auto">
  <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-8">
    <p className="text-red-300 font-semibold">Public Health Concern</p>

    <h2 className="mt-3 text-3xl md:text-4xl font-black">
      Why health awareness matters in Mizoram
    </h2>

    <p className="mt-4 text-slate-300 max-w-4xl leading-relaxed">
      Mizoram has been repeatedly discussed for its high cancer burden.
      This platform does not try to diagnose disease. Its purpose is to
      improve public awareness, encourage early check-up, reduce harmful
      habits, and help citizens find trusted health information.
    </p>

    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
        <h3 className="font-bold text-xl">Early Awareness</h3>
        <p className="mt-2 text-slate-400">
          Small symptoms should not be ignored when they continue for many days.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
        <h3 className="font-bold text-xl">Risk Reduction</h3>
        <p className="mt-2 text-slate-400">
          Tobacco, smoking, alcohol, diet, and late check-up can affect public health.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
        <h3 className="font-bold text-xl">Trusted Information</h3>
        <p className="mt-2 text-slate-400">
          Citizens need simple, clear, and verified health information.
        </p>
      </div>
    </div>
  </div>
</section>
     <section className="px-6 py-10 max-w-7xl mx-auto">
  <div className="rounded-3xl border border-emerald-400/30 bg-slate-900/70 p-8">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
      <div>
        <p className="text-emerald-300 font-semibold">Research Tool</p>

        <h2 className="mt-3 text-3xl md:text-4xl font-black">
          Citizen Health Awareness Survey
        </h2>

        <p className="mt-4 text-slate-300 leading-relaxed">
          This survey will help understand public health awareness in Mizoram,
          including cancer awareness, tobacco habits, early check-up behaviour,
          and trust in online health information.
        </p>

        <p className="mt-4 text-slate-400">
          The data can later support academic research, public policy discussion,
          and digital governance studies.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-950 border border-slate-800 p-6">
        <h3 className="text-2xl font-bold">Survey Areas</h3>

        <div className="mt-5 space-y-3 text-slate-300">
          <p>✓ Age group and district</p>
          <p>✓ Cancer awareness</p>
          <p>✓ Tobacco and betel nut habits</p>
          <p>✓ Health check-up behaviour</p>
          <p>✓ Online health information trust</p>
        </div>

        <button className="mt-6 rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950">
          Survey Coming Soon
        </button>
      </div>
    </div>
  </div>
</section>
      <section className="px-6 py-10 max-w-7xl mx-auto">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
          <h2 className="text-3xl font-bold">Public Health Dashboard</h2>
          <p className="mt-3 text-slate-400 max-w-3xl">
            This dashboard will later show survey results, health awareness
            data, verified resources, and citizen feedback.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {dashboardItems.map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl bg-slate-950 border border-slate-800 p-5"
              >
                <div className="text-3xl font-black text-emerald-300">
                  {value}
                </div>
                <div className="text-sm text-slate-400 mt-2">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
<section className="px-6 py-10 max-w-7xl mx-auto">
  <h2 className="text-3xl font-bold mb-6">Hospital & Help Directory</h2>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
    {[
      ["🏥", "Civil Hospital Aizawl", "Main public hospital resource for Aizawl."],
      ["🎗️", "State Cancer Institute", "Cancer screening, awareness, and treatment support."],
      ["🚑", "Emergency Help", "Call local emergency services during serious health situations."],
      ["📍", "District Hospitals", "Find help through district-level government hospitals."],
    ].map(([icon, title, text]) => (
      <div
        key={title}
        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 hover:bg-slate-800 transition"
      >
        <div className="text-4xl">{icon}</div>
        <h3 className="mt-4 text-xl font-bold">{title}</h3>
        <p className="mt-3 text-slate-400">{text}</p>
        <button className="mt-5 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">
          Details Coming Soon
        </button>
      </div>
    ))}
  </div>
</section>
<section className="px-6 py-10 max-w-7xl mx-auto">
  <h2 className="text-3xl font-bold mb-6">Latest Health Alerts</h2>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
    
    <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-6">
      <p className="text-yellow-300 font-semibold">Awareness</p>
      <h3 className="mt-2 text-xl font-bold">
        Oral Health and Tobacco
      </h3>
      <p className="mt-3 text-slate-300">
        Long-lasting mouth ulcers, lumps, or white patches should be checked by a doctor.
      </p>
    </div>

    <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-6">
      <p className="text-red-300 font-semibold">Cancer Awareness</p>
      <h3 className="mt-2 text-xl font-bold">
        Early Detection Matters
      </h3>
      <p className="mt-3 text-slate-300">
        Early diagnosis can improve treatment outcomes and quality of life.
      </p>
    </div>

    <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-6">
      <p className="text-cyan-300 font-semibold">Digital Health</p>
      <h3 className="mt-2 text-xl font-bold">
        Verify Online Information
      </h3>
      <p className="mt-3 text-slate-300">
        Not all health advice on social media is accurate. Use trusted sources.
      </p>
    </div>

  </div>
</section>
      <section className="px-6 py-10 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">Myth vs Fact</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {myths.map((item) => (
            <div
              key={item.myth}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
            >
              <p className="text-red-300 font-semibold">Myth</p>
              <p className="mt-2 text-slate-200">{item.myth}</p>

              <p className="text-emerald-300 font-semibold mt-5">Fact</p>
              <p className="mt-2 text-slate-400">{item.fact}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-10 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-500 to-cyan-500 p-8 text-slate-950">
          <h2 className="text-3xl font-black">AI Health Guide</h2>
          <p className="mt-3 max-w-3xl text-slate-900">
            A simple chatbot will be added here to answer basic health awareness
            questions in easy English. It will not diagnose or prescribe
            medicine.
          </p>
          <button className="mt-6 rounded-xl bg-slate-950 px-6 py-3 text-white font-semibold">
            Coming Soon
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-800 mt-20">
  <div className="max-w-7xl mx-auto px-6 py-10">

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

      <div>
        <h3 className="font-bold text-lg">
          Mizoram Health Guide
        </h3>

        <p className="mt-3 text-slate-400">
          A digital public health awareness platform focused on simple,
          accessible, and citizen-friendly health information.
        </p>
      </div>

      <div>
        <h3 className="font-bold text-lg">
          Health Topics
        </h3>

        <div className="mt-3 space-y-2 text-slate-400">
          <p>Cancer Awareness</p>
          <p>Diabetes</p>
          <p>Heart Health</p>
          <p>Mental Wellbeing</p>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-lg">
          Research Focus
        </h3>

        <div className="mt-3 space-y-2 text-slate-400">
          <p>Digital Governance</p>
          <p>Public Health Awareness</p>
          <p>Citizen Education</p>
          <p>Mizoram Focus</p>
        </div>
      </div>

    </div>

    <div className="mt-10 pt-6 border-t border-slate-800 text-center text-slate-500 text-sm">
      © 2026 Mizoram Health Guide
    </div>

  </div>
</footer>
      <HealthChatbot />
    </main>
  );
}