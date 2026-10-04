import PageHeader from "./PageHeader";

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
      <PageHeader
        title={title}
        intro={intro}
        icon={icon}
        crumbs={[{ href: "/health-library", label: "Health Library" }]}
      />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">{children}</section>
    </main>
  );
}
