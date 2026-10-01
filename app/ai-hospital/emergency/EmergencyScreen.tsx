"use client";

import { useRouter } from "next/navigation";
import EmergencyMode from "../components/EmergencyMode";

export default function EmergencyScreen() {
  const router = useRouter();
  return (
    <>
      {/* Visible if scripts are slow to load */}
      <noscript>
        <p>Emergency: call 108 (ambulance) or 112.</p>
      </noscript>
      <EmergencyMode onExit={() => router.push("/ai-hospital")} exitLabel="Back to AI Hospital" />
    </>
  );
}
