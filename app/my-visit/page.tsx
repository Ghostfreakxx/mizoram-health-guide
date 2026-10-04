import type { Metadata } from "next";
import PageHeader from "../components/PageHeader";
import MyVisit from "./MyVisit";

export const metadata: Metadata = {
  title: "My Visit",
  description: "This visit's summary and next steps. Kept only in this browser tab — nothing is saved or sent.",
};

export default function MyVisitPage() {
  return (
    <main className="flex-1 bg-slate-50">
      <PageHeader title="My Visit" icon="📋" intro="Your summary and next steps for this visit. Kept only while this tab is open — nothing is saved or sent." />
      <MyVisit />
    </main>
  );
}
