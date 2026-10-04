import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "../config";
import { ButtonLink, Notice, Section } from "../components/ui";
import { DEMO_SCENARIOS } from "../lib/demoScenarios";
import { importantLinks } from "../site";

export const metadata: Metadata = {
  title: "About this prototype",
  description: `What ${SITE.name} is, the role it proposes, how it stays safe, and where a healthcare professional takes over.`,
};

// The page a reviewer reads first. Plain statements only: no statistics we
// cannot source, no "first" claims, no outcomes we have not measured.

const layers = [
  { title: "1. Safety rules (decide)", text: "Fixed, written rules check every message for danger signs such as chest pain with breathlessness, stroke signs, heavy bleeding, pregnancy danger signs and thoughts of suicide. A match shows emergency help at once. No AI model can delay or override this." },
  { title: "2. Triage rules (route)", text: "A fixed questionnaire based on published guidance gives a navigation urgency — emergency, today, within a few days, or self-care with warning signs — and the right kind of service." },
  { title: "3. Conversation (guide)", text: "The virtual doctor listens, asks one question at a time, explains words, helps people who cannot describe the problem, and keeps track of what was said. It cannot change the safety or triage result." },
  { title: "4. Summary (hand over)", text: "A patient-prepared summary in the patient's own words for a nurse or doctor. It is labelled as not a diagnosis." },
];

const notList = [
  "It does not diagnose, prescribe or give medicine doses.",
  "It does not replace a doctor, nurse, ASHA, health centre or hospital.",
  "It does not tell anyone they do not need a doctor.",
  "It is not an official Government of Mizoram service, and is not endorsed by any government body.",
  "It has not been clinically validated. Its rules and content still need review by clinicians.",
];

export default function AboutPage() {
  return (
    <main className="flex-1 bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-800">
            {SITE.name} — {SITE.status}
          </p>
          <h1 className="mt-2 text-3xl font-black text-blue-950 sm:text-4xl">About this prototype</h1>
          <p className="mt-3 text-lg text-slate-700">
            A digital front door to healthcare: one place to say what is wrong, find out how urgently to get care and where, and arrive prepared.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl">
        <Section id="problem" title="The problem it looks at">
          <ul className="space-y-2 text-lg text-slate-800">
            <li>• Many people are not sure whether a symptom needs an emergency, a clinic visit, or care at home.</li>
            <li>• Travel to a hospital in hilly districts takes time and money, so going to the right place first matters.</li>
            <li>• Patients often find it hard to explain a problem, and important details are forgotten in a short consultation.</li>
            <li>• Reliable health information and free government services exist, but are spread across many sites and numbers.</li>
          </ul>
        </Section>

        <Section id="role" title="The proposed role">
          <p className="text-lg text-slate-800">
            {SITE.name} sits <strong>before</strong> a visit and <strong>between</strong> visits. It helps a person to:
          </p>
          <ol className="mt-3 grid gap-2 text-lg text-slate-800 sm:grid-cols-2">
            <li className="rounded-xl border border-slate-200 bg-white p-4">Recognise an emergency and call 108 or 112 without delay.</li>
            <li className="rounded-xl border border-slate-200 bg-white p-4">Know how urgently to be seen and which service fits.</li>
            <li className="rounded-xl border border-slate-200 bg-white p-4">Describe the problem clearly, with help if they cannot find the words.</li>
            <li className="rounded-xl border border-slate-200 bg-white p-4">Take a clear summary to a real health professional.</li>
          </ol>
        </Section>

        <Section id="safety" title="How it is built to be safe" intro="Four layers. The ones that decide are fixed rules; the friendly conversation can only guide.">
          <ul className="grid gap-3">
            {layers.map((l) => (
              <li key={l.title} className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-bold text-blue-950">{l.title}</h3>
                <p className="mt-1 text-slate-700">{l.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-slate-700">
            The safety and triage rules are covered by automated tests, including misspelt and indirect emergency messages. Each rule names its source on the{" "}
            <Link href="/ai-hospital/sources" className="font-semibold text-blue-800 underline">
              Sources page
            </Link>
            , with its verification status.
          </p>
        </Section>

        <Section id="handover" title="Where a professional takes over">
          <ul className="space-y-2 text-lg text-slate-800">
            <li>• <strong>Emergency signs:</strong> the site shows 108 and 112 straight away and stops the consultation.</li>
            <li>• <strong>Urgent or unclear problems:</strong> it recommends being seen today, and where.</li>
            <li>• <strong>Questions only a clinician can answer</strong> (diagnosis, medicines, test results): it says so honestly and adds the question to the summary.</li>
            <li>• <strong>Every consultation</strong> ends with a recommendation to see a real health professional when needed, and the summary to take along.</li>
          </ul>
        </Section>

        <Section id="not" title="What it is not">
          <ul className="space-y-2 text-lg text-slate-800">
            {notList.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        </Section>

        <Section id="privacy" title="Privacy">
          <p className="text-lg text-slate-800">
            There are no accounts and no analytics. What a person types is worked on in their browser and is not sent to our server; it is gone when the tab is closed.
            Nothing health-related is saved unless the person turns on saving in the Health Passport. Speaking instead of typing is off until the person turns it on,
            and they are told first that their browser&apos;s speech service (in Chrome, Google) turns the audio into text.
          </p>
          <p className="mt-2">
            <Link href="/privacy" className="font-semibold text-blue-800 underline">
              Read the privacy policy
            </Link>
          </p>
        </Section>

        <Section id="demo" title="See it working" intro="Demonstration scenarios run through the same rules and conversation engine a patient uses — nothing is scripted around them.">
          <ul className="grid gap-2 sm:grid-cols-2">
            {DEMO_SCENARIOS.filter((d) => d.group === "core").map((d) => (
              <li key={d.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="font-bold text-blue-950">
                  {d.letter}. {d.title}
                </span>
                <span className="block text-sm text-slate-600">{d.shows}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/ai-hospital/departments/general-medicine/room?demo">Open demonstration mode</ButtonLink>
            <ButtonLink href="/ai-hospital/reception" tone="secondary">
              Try it as a patient
            </ButtonLink>
          </div>
        </Section>

        <Section id="status" title="Status and what is still needed">
          <Notice tone="warn" title="Prototype">
            Before any public use this needs: review of every rule and content page by clinicians; confirmation of phone numbers, hospital details and service
            information against official sources; testing with patients and health workers in Mizoram; and Mizo translation by qualified translators.
          </Notice>
          <h3 className="mt-6 font-bold text-blue-950">Official health websites</h3>
          <ul className="mt-2 space-y-1">
            {importantLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-800 underline">
                  {l.label}
                  <span className="sr-only"> (opens external website in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </main>
  );
}
