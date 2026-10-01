import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";
import { malaria } from "../content/malaria";

export const metadata: Metadata = { title: malaria.title, description: malaria.intro };

export default function MalariaPage() {
  return <TopicPage content={malaria} />;
}
