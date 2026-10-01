import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "../../components/PageHeader";

export const metadata: Metadata = {
  title: "See a Real Doctor Online — Virtual Hospital",
  description: "How to get a free video consultation with a government doctor through eSanjeevani.",
};

const steps = [
  { title: "Open eSanjeevani", text: "Visit esanjeevani.mohfw.gov.in on your phone or computer, or install the eSanjeevani app." },
  { title: "Register with your mobile number", text: "Enter your phone number and the one-time password (OTP) sent to you. Fill in the patient's basic details." },
  { title: "Choose a consultation", text: "Pick the general OPD or a specialist service, and describe the problem. Keep your Visit Summary ready." },
  { title: "Wait for your turn", text: "You join a queue. Keep your phone charged and stay in a quiet place with good network." },
  { title: "Talk to the doctor by video", text: "The doctor asks questions, may look at the problem on camera, and gives advice." },
  { title: "Get your e-prescription", text: "If needed, the doctor sends a prescription you can download and show at a pharmacy or health centre." },
];

export default function DoctorPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="See a Real Doctor Online"
        icon="💻"
        intro="eSanjeevani is the Government of India's free online doctor consultation service. A real, registered doctor sees you by video — no travel, no queue at the hospital, and no fee."
        crumbs={[{ href: "/virtual-hospital", label: "Virtual Hospital" }]}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <section className="grid sm:grid-cols-3 gap-4">
          {[
            ["₹0", "Consultation fee"],
            ["🏠", "From your home — no travel cost"],
            ["👩‍⚕️", "Real registered doctors"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm">
              <span className="block text-3xl font-bold text-blue-900">{v}</span>
              <span className="mt-1 block text-slate-700">{l}</span>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-blue-950">How it works</h2>
          <ol className="mt-5 grid md:grid-cols-2 gap-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-400 text-lg font-bold text-blue-950">{i + 1}</span>
                <span>
                  <span className="block font-bold text-slate-900">{s.title}</span>
                  <span className="mt-1 block text-slate-600">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <a
            href="https://esanjeevani.mohfw.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-lg bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
          >
            Open eSanjeevani ↗<span className="sr-only"> (opens external website in a new tab)</span>
          </a>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-6">
            <h2 className="text-lg font-bold text-emerald-900">✓ Good for</h2>
            <ul className="mt-3 space-y-2 text-emerald-950">
              <li>• Mild illness and common problems</li>
              <li>• Follow-up for diabetes, blood pressure, and other ongoing conditions</li>
              <li>• Questions about medicines you already take</li>
              <li>• Deciding whether you need to travel to a hospital</li>
              <li>• Mental health and counselling support</li>
            </ul>
          </div>
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
            <h2 className="text-lg font-bold text-red-900">✗ Not for emergencies</h2>
            <ul className="mt-3 space-y-2 text-red-950">
              <li>• Chest pain, stroke signs, or severe breathing difficulty</li>
              <li>• Serious injuries, heavy bleeding, or fits</li>
              <li>• Pregnancy danger signs</li>
              <li>• A very sick baby or child</li>
            </ul>
            <a href="tel:108" className="mt-4 inline-block rounded bg-red-700 px-5 py-2 font-bold text-white">📞 Call 108 for emergencies</a>
          </div>
        </section>

        <section className="rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 p-6 sm:p-8 text-white">
          <h2 className="text-2xl font-bold">Before your consultation</h2>
          <p className="mt-2 text-blue-100">
            Use the Triage Desk first. It tells you whether an online consultation is right for you, and makes a Visit
            Summary you can read out to the doctor — so nothing important is forgotten.
          </p>
          <Link href="/virtual-hospital/triage" className="mt-5 inline-block rounded bg-amber-400 px-6 py-3 font-bold text-blue-950 hover:bg-amber-300">
            Start triage →
          </Link>
        </section>
      </div>
    </main>
  );
}
