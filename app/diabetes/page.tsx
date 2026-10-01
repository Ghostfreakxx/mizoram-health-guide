import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";
import { diabetes } from "../content/diabetes";

export const metadata: Metadata = { title: diabetes.title, description: diabetes.intro };

export default function DiabetesPage() {
  return <TopicPage content={diabetes} />;
}
