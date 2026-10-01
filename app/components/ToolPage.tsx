import Link from "next/link";

export default function ToolPage({
  icon,
  title,
  intro,
  children,
}: {
  icon: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1">
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
            <Link href="/" className="hover:text-teal-700">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/tools" className="hover:text-teal-700">Self-Check Tools</Link>
          </nav>
          <div className="mt-6 flex items-center gap-4">
            <span aria-hidden className="text-5xl">{icon}</span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
          </div>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">{intro}</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">{children}</section>
    </main>
  );
}
