import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import { siteIndex } from "../site";

export const metadata: Metadata = { title: "Search" };

function search(query: string) {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return [];

  return siteIndex
    .map((entry) => {
      const title = entry.title.toLowerCase();
      const body = `${entry.description} ${entry.keywords ?? ""}`.toLowerCase();
      const score = words.reduce(
        (sum, w) => sum + (title.includes(w) ? 3 : 0) + (body.includes(w) ? 1 : 0),
        0
      );
      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.entry);
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q ?? "").trim().slice(0, 100);
  const results = search(query);

  return (
    <main className="flex-1">
      <PageHeader title="Search" />
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <form action="/search" role="search" className="flex">
          <label htmlFor="search-page-input" className="sr-only">Search this website</label>
          <input
            id="search-page-input"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="e.g. diabetes, kuhva, hospital"
            className="flex-1 rounded-l-md border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-700"
          />
          <button type="submit" className="rounded-r-md bg-blue-900 px-6 font-semibold text-white hover:bg-blue-800">
            Search
          </button>
        </form>

        {query && (
          <p className="mt-6 text-slate-600" aria-live="polite">
            {results.length} result{results.length === 1 ? "" : "s"} for{" "}
            <strong className="text-slate-900">&quot;{query}&quot;</strong>
          </p>
        )}

        <ul className="mt-4 space-y-3">
          {results.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300">
                <span className="block text-lg font-bold text-blue-800">{r.title}</span>
                <span className="mt-1 block text-slate-600">{r.description}</span>
              </Link>
            </li>
          ))}
        </ul>

        {query && results.length === 0 && (
          <p className="mt-4 rounded-lg bg-white border border-slate-200 p-5 text-slate-600">
            No pages matched. Try a simpler word, or browse the{" "}
            <Link href="/sitemap" className="text-blue-700 underline">sitemap</Link>.
          </p>
        )}
      </section>
    </main>
  );
}
