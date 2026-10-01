import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";

export const metadata: Metadata = { title: "Heart Health" };

export default function HeartPage() {
  return (
    <TopicPage
      icon="❤️"
      title="Heart Health"
      intro="Heart problems can become serious quickly. Knowing early warning signs can help people seek help before it becomes dangerous."
      signs={[
        "Chest pain or tightness",
        "Shortness of breath",
        "Pain moving to left arm, neck, or jaw",
        "Sudden sweating",
        "Fainting or dizziness",
        "Very fast or irregular heartbeat",
      ]}
      adviceTitle="Important"
      advice="Chest pain, breathing difficulty, fainting, or sudden weakness should be treated as urgent. Seek medical help immediately — call 108 for an ambulance."
      tone="urgent"
    />
  );
}
