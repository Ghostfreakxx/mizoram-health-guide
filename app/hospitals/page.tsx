export default function HospitalsPage() {
  const hospitals = [
    ["Civil Hospital Aizawl", "Main public hospital resource for Aizawl."],
    ["State Cancer Institute", "Cancer screening, treatment and awareness support."],
    ["District Hospitals", "District-level government hospital support."],
    ["Emergency Help", "Use local emergency services for serious health situations."],
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12">
      <section className="max-w-6xl mx-auto">
        <a href="/" className="text-emerald-300 text-sm">← Back to Home</a>

        <h1 className="mt-8 text-5xl font-black">Hospital & Help Directory</h1>

        <p className="mt-5 text-slate-300 text-lg leading-relaxed max-w-3xl">
          This page will collect useful hospital and public health contact information
          for citizens in Mizoram.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {hospitals.map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="mt-3 text-slate-400">{text}</p>
              <p className="mt-5 text-sm text-slate-500">Details updating soon.</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}