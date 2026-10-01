import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";

export const metadata: Metadata = { title: "Tobacco & Oral Health" };

export default function TobaccoPage() {
  return (
    <TopicPage
      icon="🚭"
      title="Tobacco & Oral Health"
      intro="Tobacco, smoking, and betel nut can increase the risk of mouth cancer, gum disease, breathing problems, and heart disease."
      signs={[
        "Mouth ulcer that does not heal",
        "White or red patches inside the mouth",
        "Pain while chewing or swallowing",
        "Lump in the mouth or neck",
        "Bleeding from gums or mouth",
        "Bad breath that does not improve",
      ]}
      tool={{
        href: "/tools/tobacco-cost",
        title: "Tobacco & Kuhva Cost Calculator",
        text: "See how much your habit really costs over 10 years.",
      }}
      advice="If you use tobacco, try to reduce slowly. If you notice mouth wounds, patches, or lumps that continue for more than 2–3 weeks, visit a doctor."
      tone="caution"
    />
  );
}
