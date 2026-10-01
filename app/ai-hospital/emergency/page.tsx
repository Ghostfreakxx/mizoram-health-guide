import type { Metadata } from "next";
import EmergencyScreen from "./EmergencyScreen";

export const metadata: Metadata = {
  title: "Emergency — AI Hospital",
  description: "Emergency numbers and what to do while waiting for help.",
};

export default function EmergencyPage() {
  return <EmergencyScreen />;
}
