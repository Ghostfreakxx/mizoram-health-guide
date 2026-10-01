import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";
import { heart } from "../content/heart";

export const metadata: Metadata = { title: heart.title, description: heart.intro };

export default function HeartPage() {
  return <TopicPage content={heart} />;
}
