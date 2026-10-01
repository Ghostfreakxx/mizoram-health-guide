import type { Metadata } from "next";
import TopicPage from "../components/TopicPage";

export const metadata: Metadata = { title: "Mental Wellbeing" };

export default function MentalPage() {
  return (
    <TopicPage
      icon="🧠"
      title="Mental Wellbeing"
      intro="Mental health is part of overall health. Stress, sleep problems, addiction, sadness, and anxiety should not be ignored."
      signsTitle="Signs you may need support"
      signs={[
        "Feeling hopeless for many days",
        "Unable to sleep properly",
        "Too much stress or fear",
        "Loss of interest in daily life",
        "Using substances to cope",
        "Feeling alone or overwhelmed",
      ]}
      advice="Talk to someone you trust. If the problem continues or becomes too heavy, seek help from a doctor, counsellor, or mental health professional."
    />
  );
}
