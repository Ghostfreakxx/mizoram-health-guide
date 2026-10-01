import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";
import { motherChild } from "../content/motherChild";

export const metadata: Metadata = { title: motherChild.title, description: motherChild.intro };

export default function MotherChildPage() {
  return <TopicPage content={motherChild} />;
}
