import Link from "next/link";
import { SITE } from "./config";
import { ActionCard, ButtonLink, Section } from "./components/ui";
import { healthTopics } from "./topics";

// The front door. In five seconds: what this is. In fifteen: started.

const journey = [
  { icon: "💬", title: "You say what's wrong", text: "In your own words — typed or spoken. Not sure how to explain? The doctor helps you describe it." },
  { icon: "🛡️", title: "Safety checks every answer", text: "Fixed, sourced rules look for danger signs at every step. An emergency is shown at once." },
  { icon: "🩺", title: "A virtual doctor guides you", text: "It listens, remembers what you said, explains words and asks one useful question at a time." },
  { icon: "📋", title: "You get a clear summary", text: "A patient-prepared visit summary to show a nurse or doctor — not a diagnosis." },
  { icon: "🏥", title: "A real professional takes over", text: "You are shown how urgently to be seen, and where: online, a health centre, or a hospital." },
];

export default function Home() {
  const library = healthTopics.slice(0, 6);
  return (
    <main className="flex-1 bg-slate-50">
      {/* Identity and the four things people come to do */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-800">{SITE.tagline}</p>
            <h1 className="mt-2 text-4xl font-black leading-tight text-blue-950 sm:text-5xl">{SITE.name}</h1>
            <p className="mt-4 max-w-xl text-xl leading-relaxed text-slate-700">
              Tell us what&apos;s wrong. We help you find out how urgently to get care, where to go, and get ready for a real doctor.
            </p>
            <p className="mt-3 text-sm text-slate-600">
              {SITE.status} · {SITE.boundary}
            </p>
          </div>
          <nav aria-label="Start here" className="grid gap-3 sm:grid-cols-2">
            <ActionCard href="/ai-hospital/departments/general-medicine/room" icon="🩺" title="Talk to the virtual doctor" text="A guided consultation" tone="primary" />
            <ActionCard href="/ai-hospital/reception" icon="💬" title="Check my symptoms" text="Tell us in your own words" />
            <ActionCard href="/ai-hospital/emergency" icon="🚨" title="Emergency help" text="Call 108 · what to do now" tone="danger" />
            <ActionCard href="/find-care" icon="📍" title="Find healthcare" text="Hospitals, helplines, online doctors" />
          </nav>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 pt-6 sm:px-6">
        <Link href="/health-library" className="font-semibold text-blue-800 underline-offset-4 hover:underline">
          📚 Learn about health →
        </Link>
        <Link href="/ai-hospital/prepare" className="font-semibold text-blue-800 underline-offset-4 hover:underline">
          📝 Prepare for a doctor visit →
        </Link>
      </div>

      {/* How it works — and who is in control at each step */}
      <Section id="how" title="How it works" intro="The virtual doctor is the friendly face. Fixed safety rules decide urgency. A real healthcare professional makes every diagnosis.">
        <ol className="grid gap-3 md:grid-cols-5">
          {journey.map((j, i) => (
            <li key={j.title} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-bold text-slate-500">Step {i + 1}</p>
              <p className="mt-1 text-2xl" aria-hidden>
                {j.icon}
              </p>
              <h3 className="mt-1 font-bold text-blue-950">{j.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{j.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/ai-hospital/reception">Start now</ButtonLink>
          <ButtonLink href="/about" tone="secondary">
            About this prototype and its safety
          </ButtonLink>
        </div>
      </Section>

      <Section id="library" title="Health Library" intro="Simple, sourced guides — read them any time.">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {library.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="flex h-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-500 hover:bg-blue-50">
                <span aria-hidden className="text-3xl">
                  {t.icon}
                </span>
                <span>
                  <span className="block font-bold text-blue-950">{t.title}</span>
                  <span className="mt-0.5 block text-sm text-slate-600">{t.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <ButtonLink href="/health-library" tone="secondary">
            All health topics
          </ButtonLink>
        </div>
      </Section>
    </main>
  );
}
