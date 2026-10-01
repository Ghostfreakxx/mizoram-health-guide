import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";
import { tobacco } from "../content/tobacco";

export const metadata: Metadata = { title: tobacco.title, description: tobacco.intro };

export default function TobaccoPage() {
  return <TopicPage content={tobacco} />;
}
