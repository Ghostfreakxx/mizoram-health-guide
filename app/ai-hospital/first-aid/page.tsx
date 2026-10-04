import type { Metadata } from "next";
import Link from "next/link";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import ReadAloud from "../../components/ReadAloud";
import { firstAidGuides } from "../data/firstAid";
import { SourceNote } from "../components/ui";
import CallLink from "../../components/ui/CallLink";

export const metadata: Metadata = {
  title: `First Aid — ${AI_HOSPITAL.name}`,
  description: "Simple first-aid steps for bleeding, burns, fits, choking, snake bites, and more — and when to call 108.",
};

export default function FirstAidPage() {
  const emergency = firstAidGuides.filter((g) => g.emergency);
  const minor = firstAidGuides.filter((g) => !g.emergency);
  return (
    <main className="flex-1">
      <PageHeader
        title="First aid"
        icon="⛑️"
        intro="Simple steps to help someone until a health worker takes over. Saved on your phone for offline use after your first visit to this site."
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-red-300 bg-red-50 p-5">
          <p className="flex-1 text-lg font-bold text-red-950">In an emergency, call for help first.</p>
          <CallLink id="ambulance-108" className="rounded-xl bg-red-700 px-5 py-3 text-lg font-bold text-white">📞 108 Ambulance</CallLink>
          <CallLink id="erss-112" className="rounded-xl bg-red-700 px-5 py-3 text-lg font-bold text-white">📞 112 Emergency</CallLink>
        </div>

        {[
          { id: "fa-emergency", title: "Emergencies — call 108 first", guides: emergency },
          { id: "fa-minor", title: "Common injuries", guides: minor },
        ].map((group) => (
          <section key={group.id} aria-labelledby={group.id} className="space-y-3">
            <h2 id={group.id} className="text-2xl font-bold text-blue-950">{group.title}</h2>
            {group.guides.map((g) => (
              <details key={g.id} id={g.id} className="group rounded-2xl border-2 border-slate-200 bg-white open:border-blue-300">
                <summary className="flex min-h-16 cursor-pointer items-center gap-3 px-5 py-4 text-xl font-bold text-slate-900">
                  <span aria-hidden className="text-3xl">{g.icon}</span>
                  {g.title}
                </summary>
                <div className="space-y-4 border-t border-slate-200 px-5 py-4">
                  <ol className="list-decimal space-y-2 pl-6 text-lg text-slate-800">
                    {g.steps.map((s) => <li key={s}>{s}</li>)}
                  </ol>
                  <div className={`rounded-xl p-4 ${g.emergency ? "bg-red-50 text-red-950" : "bg-amber-50 text-amber-950"}`}>
                    <p className="font-bold">{g.emergency ? "Get help now" : "When to get medical help"}</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {g.getHelp.map((h) => <li key={h}>{h}</li>)}
                    </ul>
                  </div>
                  <ReadAloud text={`${g.title}. ${g.steps.join(" ")} ${g.getHelp.join(" ")}`} />
                  <SourceNote ids={g.sourceIds} />
                </div>
              </details>
            ))}
          </section>
        ))}

        <p className="text-lg text-slate-700">
          Not sure how serious it is? Use the <Link href="/ai-hospital/triage" className="font-semibold text-blue-800 underline">Triage Desk</Link>,
          or open <Link href="/ai-hospital/emergency" className="font-semibold text-blue-800 underline">Emergency Mode</Link>.
        </p>
      </div>
    </main>
  );
}
