import type { Metadata } from "next";
import ToolPage from "../../components/ToolPage";
import TobaccoCostCalculator from "./TobaccoCostCalculator";

export const metadata: Metadata = { title: "Tobacco & Kuhva Cost Calculator" };

export default function TobaccoCostPage() {
  return (
    <ToolPage
      icon="💰"
      title="Tobacco & Kuhva Cost Calculator"
      intro="Small daily spending adds up. Enter what you spend on cigarettes, tobacco, or betel nut (kuhva) to see the real cost over time."
    >
      <TobaccoCostCalculator />
    </ToolPage>
  );
}
