export default function CancerPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12">
      <section className="max-w-5xl mx-auto">
        <a href="/" className="text-emerald-300 text-sm">
          ← Back to Home
        </a>

        <h1 className="mt-8 text-5xl font-black">
          Cancer Awareness
        </h1>

        <p className="mt-5 text-slate-300 text-lg leading-relaxed">
          Cancer is easier to treat when it is found early. This page gives
          simple awareness information for citizens in Mizoram.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            "A wound or ulcer that does not heal",
            "Unusual bleeding",
            "A lump in any part of the body",
            "Long-lasting cough",
            "Difficulty swallowing",
            "Weight loss without reason",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-red-400/30 bg-red-400/10 p-8">
          <h2 className="text-3xl font-bold">When to visit a doctor?</h2>
          <p className="mt-4 text-slate-300 leading-relaxed">
            Visit a doctor if a symptom continues, becomes worse, or makes you
            worried. Do not wait until the pain becomes severe.
          </p>
        </div>
      </section>
    </main>
  );
}