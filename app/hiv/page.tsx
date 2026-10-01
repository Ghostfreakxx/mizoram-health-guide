import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";
import { hiv } from "../content/hiv";

export const metadata: Metadata = { title: hiv.title, description: hiv.intro };

export default function HivPage() {
  return <TopicPage content={hiv} />;
}
