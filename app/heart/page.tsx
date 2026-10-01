export default function HeartPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12">
      <section className="max-w-5xl mx-auto">
        <a href="/" className="text-emerald-300 text-sm">← Back to Home</a>

        <h1 className="mt-8 text-5xl font-black">Heart Health</h1>

        <p className="mt-5 text-slate-300 text-lg leading-relaxed">
          Heart problems can become serious quickly. Knowing early warning signs
          can help people seek help before it becomes dangerous.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            "Chest pain or tightness",
            "Shortness of breath",
            "Pain moving to left arm, neck, or jaw",
            "Sudden sweating",
            "Fainting or dizziness",
            "Very fast or irregular heartbeat",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              {item}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-red-400/30 bg-red-400/10 p-8">
          <h2 className="text-3xl font-bold">Important</h2>
          <p className="mt-4 text-slate-300 leading-relaxed">
            Chest pain, breathing difficulty, fainting, or sudden weakness should
            be treated as urgent. Seek medical help immediately.
          </p>
        </div>
      </section>
    </main>
  );
}