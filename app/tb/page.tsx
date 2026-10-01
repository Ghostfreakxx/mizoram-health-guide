import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";
import { tb } from "../content/tb";

export const metadata: Metadata = { title: tb.title, description: tb.intro };

export default function TbPage() {
  return <TopicPage content={tb} />;
}
