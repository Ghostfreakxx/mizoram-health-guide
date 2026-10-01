import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";
import { cancer } from "../content/cancer";

export const metadata: Metadata = { title: cancer.title, description: cancer.intro };

export default function CancerPage() {
  return <TopicPage content={cancer} />;
}
