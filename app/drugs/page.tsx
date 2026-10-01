import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";
import { drugs } from "../content/drugs";

export const metadata: Metadata = { title: drugs.title, description: drugs.intro };

export default function DrugsPage() {
  return <TopicPage content={drugs} />;
}
