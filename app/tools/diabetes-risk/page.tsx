import type { Metadata } from "next";
import ToolPage from "../../components/ToolPage";
import DiabetesRiskCheck from "./DiabetesRiskCheck";

export const metadata: Metadata = { title: "Diabetes Risk Check" };

export default function DiabetesRiskPage() {
  return (
    <ToolPage
      icon="🩺"
      title="Diabetes Risk Check"
      intro="Many people have type 2 diabetes without knowing it. Answer 4 quick questions to see your risk. This uses the Indian Diabetes Risk Score (IDRS), a simple screening tool developed for Indians."
    >
      <DiabetesRiskCheck />
    </ToolPage>
  );
}
