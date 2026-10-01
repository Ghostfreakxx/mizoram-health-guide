export default function MentalPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12">
      <section className="max-w-5xl mx-auto">
        <a href="/" className="text-emerald-300 text-sm">← Back to Home</a>

        <h1 className="mt-8 text-5xl font-black">Mental Wellbeing</h1>

        <p className="mt-5 text-slate-300 text-lg leading-relaxed">
          Mental health is part of overall health. Stress, sleep problems,
          addiction, sadness, and anxiety should not be ignored.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            "Feeling hopeless for many days",
            "Unable to sleep properly",
            "Too much stress or fear",
            "Loss of interest in daily life",
            "Using substances to cope",
            "Feeling alone or overwhelmed",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              {item}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-8">
          <h2 className="text-3xl font-bold">Simple advice</h2>
          <p className="mt-4 text-slate-300 leading-relaxed">
            Talk to someone you trust. If the problem continues or becomes too
            heavy, seek help from a doctor, counsellor, or mental health professional.
          </p>
        </div>
      </section>
    </main>
  );
}