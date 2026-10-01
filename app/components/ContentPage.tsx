import PageHeader from "./PageHeader";

export default function ContentPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1">
      <PageHeader title={title} intro={intro} />
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-10 shadow-sm text-slate-700 leading-relaxed space-y-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-blue-950 [&_h2:first-child]:mt-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-blue-700 [&_a]:underline">
          {children}
        </div>
      </section>
    </main>
  );
}
