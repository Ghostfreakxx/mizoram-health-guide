"use client";

import { useReportWebVitals } from "next/web-vitals";
import { VITALS } from "../lib/metrics";
import { areaOf, track } from "../lib/telemetry";

// Page speed as experienced on real phones: only the metric name, its
// good / needs-improvement / poor rating and the site area. Sent only when
// telemetry is configured (see app/lib/telemetry.ts).

// A stable function (defined once), as useReportWebVitals requires.
function report(m: { name: string; rating?: string }) {
  if (!(VITALS as readonly string[]).includes(m.name) || !m.rating) return;
  track({ type: "web_vital", name: m.name as (typeof VITALS)[number], rating: m.rating as "good", area: areaOf(window.location.pathname) });
}

export default function WebVitals() {
  useReportWebVitals(report);
  return null;
}
