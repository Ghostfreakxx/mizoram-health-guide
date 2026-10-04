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
    <section className="bg-blue-900 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-12 sm:pt-10 sm:pb-16">
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

        <div className="mt-3 flex items-center gap-3 sm:mt-5 sm:gap-4">
          {icon && (
            <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-3xl sm:h-16 sm:w-16 sm:text-4xl">
              {icon}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
        </div>

        {intro && <p className="mt-3 max-w-3xl text-lg text-blue-50 sm:mt-4 leading-relaxed">{intro}</p>}
      </div>
    </section>
  );
}
