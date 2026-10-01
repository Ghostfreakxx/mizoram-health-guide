import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";
import { mental } from "../content/mental";

export const metadata: Metadata = { title: mental.title, description: mental.intro };

export default function MentalPage() {
  return <TopicPage content={mental} />;
}
