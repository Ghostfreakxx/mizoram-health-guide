import Link from "next/link";
import PageHeader from "./PageHeader";
import AskAIButton from "./AskAIButton";
import ShareButton from "./ShareButton";

const tones = {
  info: "border-blue-200 bg-blue-50 text-blue-950",
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
  tool,
}: {
  icon: string;
  title: string;
  intro: string;
  signsTitle?: string;
  signs: string[];
  adviceTitle?: string;
  advice: string;
  tone?: keyof typeof tones;
  tool?: { href: string; title: string; text: string };
}) {
  return (
    <main className="flex-1">
      <PageHeader
        title={title}
        intro={intro}
        icon={icon}
        crumbs={[{ href: "/#topics", label: "Health Topics" }]}
      />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl font-bold text-slate-900">{signsTitle}</h2>

        <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {signs.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 text-slate-800 shadow-sm"
            >
              <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
              {item}
            </li>
          ))}
        </ul>

        <div className={`mt-10 rounded-2xl border p-8 ${tones[tone]}`}>
          <h2 className="text-2xl font-bold">{adviceTitle}</h2>
          <p className="mt-3 leading-relaxed">{advice}</p>
        </div>

        {tool && (
          <Link
            href={tool.href}
            className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-slate-900 p-6 text-white hover:bg-slate-800"
          >
            <span>
              <span className="block text-sm font-semibold text-blue-300">Self-check tool</span>
              <span className="mt-1 block text-xl font-bold">{tool.title}</span>
              <span className="mt-1 block text-slate-300">{tool.text}</span>
            </span>
            <span className="shrink-0 rounded-lg bg-blue-500 px-4 py-2 font-semibold text-slate-950">
              Start →
            </span>
          </Link>
        )}

        <div className="mt-10 flex flex-col sm:flex-row flex-wrap gap-3">
          <AskAIButton className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">
            Ask the Health Assistant
          </AskAIButton>
          <Link
            href="/hospitals"
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
          >
            Find a hospital
          </Link>
          <ShareButton text={`${title} — simple health information for Mizoram:`} />
        </div>
      </section>
    </main>
  );
}
