import Link from "next/link";
import AskAIButton from "./AskAIButton";

const tones = {
  info: "border-teal-200 bg-teal-50 text-teal-950",
  caution: "border-amber-200 bg-amber-50 text-amber-950",
  urgent: "border-red-200 bg-red-50 text-red-950",
};

export default function TopicPage({
  icon,
  title,
  intro,
  signsTitle = "Warning signs to watch for",
  signs,
  adviceTitle = "Simple advice",
  advice,
  tone = "info",
}: {
  icon: string;
  title: string;
  intro: string;
  signsTitle?: string;
  signs: string[];
  adviceTitle?: string;
  advice: string;
  tone?: keyof typeof tones;
}) {
  return (
    <main className="flex-1">
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
            <Link href="/" className="hover:text-teal-700">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/#topics" className="hover:text-teal-700">Health Topics</Link>
          </nav>

          <div className="mt-6 flex items-center gap-4">
            <span aria-hidden className="text-5xl">{icon}</span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
          </div>

          <p className="mt-5 max-w-3xl text-lg text-slate-600 leading-relaxed">{intro}</p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl font-bold text-slate-900">{signsTitle}</h2>

        <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {signs.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 text-slate-800 shadow-sm"
            >
              <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-600" />
              {item}
            </li>
          ))}
        </ul>

        <div className={`mt-10 rounded-2xl border p-8 ${tones[tone]}`}>
          <h2 className="text-2xl font-bold">{adviceTitle}</h2>
          <p className="mt-3 leading-relaxed">{advice}</p>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <AskAIButton className="rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800">
            Ask the Health Assistant
          </AskAIButton>
          <Link
            href="/hospitals"
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
          >
            Find a hospital
          </Link>
        </div>
      </section>
    </main>
  );
}
