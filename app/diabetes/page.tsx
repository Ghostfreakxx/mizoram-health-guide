export default function DiabetesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12">
      <section className="max-w-5xl mx-auto">
        <a href="/" className="text-emerald-300 text-sm">← Back to Home</a>

        <h1 className="mt-8 text-5xl font-black">Diabetes Awareness</h1>

        <p className="mt-5 text-slate-300 text-lg leading-relaxed">
          Diabetes happens when blood sugar stays too high. Many people do not know
          they have it until symptoms become serious.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            "Frequent urination",
            "Too much thirst",
            "Feeling tired often",
            "Slow wound healing",
            "Blurred vision",
            "Sudden weight change",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              {item}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-8">
          <h2 className="text-3xl font-bold">Simple advice</h2>
          <p className="mt-4 text-slate-300 leading-relaxed">
            A simple blood sugar test can help detect diabetes. Regular check-up,
            walking, balanced food, and reducing sugary drinks can help manage risk.
          </p>
        </div>
      </section>
    </main>
  );
}