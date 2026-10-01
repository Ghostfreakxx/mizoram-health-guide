import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";

export const metadata: Metadata = { title: "Diabetes Awareness" };

export default function DiabetesPage() {
  return (
    <TopicPage
      icon="🩸"
      title="Diabetes Awareness"
      intro="Diabetes happens when blood sugar stays too high. Many people do not know they have it until symptoms become serious."
      signs={[
        "Frequent urination",
        "Too much thirst",
        "Feeling tired often",
        "Slow wound healing",
        "Blurred vision",
        "Sudden weight change",
      ]}
      advice="A simple blood sugar test can help detect diabetes. Regular check-up, walking, balanced food, and reducing sugary drinks can help manage risk."
    />
  );
}
