import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";

export const metadata: Metadata = { title: "Cancer Awareness" };

export default function CancerPage() {
  return (
    <TopicPage
      icon="🎗️"
      title="Cancer Awareness"
      intro="Cancer is easier to treat when it is found early. This page gives simple awareness information for citizens in Mizoram."
      signs={[
        "A wound or ulcer that does not heal",
        "Unusual bleeding",
        "A lump in any part of the body",
        "Long-lasting cough",
        "Difficulty swallowing",
        "Weight loss without reason",
      ]}
      adviceTitle="When to visit a doctor?"
      advice="Visit a doctor if a symptom continues, becomes worse, or makes you worried. Do not wait until the pain becomes severe."
      tone="caution"
    />
  );
}
