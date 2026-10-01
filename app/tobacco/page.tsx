export default function TobaccoPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12">
      <section className="max-w-5xl mx-auto">
        <a href="/" className="text-emerald-300 text-sm">← Back to Home</a>

        <h1 className="mt-8 text-5xl font-black">Tobacco & Oral Health</h1>

        <p className="mt-5 text-slate-300 text-lg leading-relaxed">
          Tobacco, smoking, and betel nut can increase the risk of mouth cancer,
          gum disease, breathing problems, and heart disease.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            "Mouth ulcer that does not heal",
            "White or red patches inside the mouth",
            "Pain while chewing or swallowing",
            "Lump in the mouth or neck",
            "Bleeding from gums or mouth",
            "Bad breath that does not improve",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              {item}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-yellow-400/30 bg-yellow-400/10 p-8">
          <h2 className="text-3xl font-bold">Simple advice</h2>
          <p className="mt-4 text-slate-300 leading-relaxed">
            If you use tobacco, try to reduce slowly. If you notice mouth wounds,
            patches, or lumps that continue for more than 2–3 weeks, visit a doctor.
          </p>
        </div>
      </section>
    </main>
  );
}