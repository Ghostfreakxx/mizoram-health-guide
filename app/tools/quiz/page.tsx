import type { Metadata } from "next";
import ToolPage from "../../components/ToolPage";
import MythFactQuiz from "./MythFactQuiz";

export const metadata: Metadata = { title: "Myth or Fact Quiz" };

export default function QuizPage() {
  return (
    <ToolPage
      icon="❓"
      title="Myth or Fact Quiz"
      intro="Many health beliefs we hear from friends or social media are not true. Test yourself with 8 quick questions."
    >
      <MythFactQuiz />
    </ToolPage>
  );
}
