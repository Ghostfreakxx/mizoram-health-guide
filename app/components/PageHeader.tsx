import Link from "next/link";

export default function PageHeader({
  title,
  intro,
  icon,
  crumbs = [],
}: {
  title: string;
  intro?: string;
  icon?: string;
  crumbs?: { href: string; label: string }[];
}) {
  return (
    <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-blue-100">
            <li><Link href="/" className="hover:underline">Home</Link></li>
            {crumbs.map((c) => (
              <li key={c.href} className="flex items-center gap-2">
                <span aria-hidden>›</span>
                <Link href={c.href} className="hover:underline">{c.label}</Link>
              </li>
            ))}
            <li className="flex items-center gap-2">
              <span aria-hidden>›</span>
              <span aria-current="page" className="font-semibold text-white">{title}</span>
            </li>
          </ol>
        </nav>

        <div className="mt-5 flex items-center gap-4">
          {icon && (
            <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-4xl">
              {icon}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
        </div>

        {intro && <p className="mt-4 max-w-3xl text-lg text-blue-50 leading-relaxed">{intro}</p>}
      </div>
    </section>
  );
}
