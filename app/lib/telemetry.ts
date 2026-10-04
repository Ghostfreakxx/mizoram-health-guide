// Privacy-preserving counts for a pilot, and technical failure reports.
//
// OFF unless NEXT_PUBLIC_TELEMETRY_URL is set at build time. Even then:
// - only events that pass metrics.sanitize() are sent: fixed category codes
//   and the day — never words, names, numbers, IDs, exact times or addresses
// - nothing identifies a person or links two events together (no cookies,
//   no storage, no session or device ID; the request carries no credentials)
// - Do Not Track or Global Privacy Control in the browser switches it off
// - failures to send are ignored: telemetry can never break the page
//
// Error reports carry the KIND of failure and the area of the site only —
// never an error message or stack, which could contain what someone typed.

import { type MetricEvent, sanitize, AREAS } from "./metrics";

type Without<T> = T extends unknown ? Omit<T, "day"> : never;
export type TelemetryEvent = Without<MetricEvent>;

const ENDPOINT = (process.env.NEXT_PUBLIC_TELEMETRY_URL ?? "").trim();

export function telemetryEnabled(): boolean {
  if (!ENDPOINT || typeof window === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.doNotTrack === "1" || nav.globalPrivacyControl === true) return false;
  return true;
}

let queue: MetricEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  if (!queue.length) return;
  const body = JSON.stringify(queue);
  queue = [];
  try {
    const sent = navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }));
    if (!sent) void fetch(ENDPOINT, { method: "POST", body, keepalive: true, credentials: "omit", headers: { "content-type": "application/json" } }).catch(() => {});
  } catch {
    // Never let reporting affect the page.
  }
}

const today = () => new Date().toISOString().slice(0, 10);

// Returns the clean event that would be sent (useful for tests), or null.
export function track(e: TelemetryEvent): MetricEvent | null {
  const clean = sanitize({ ...e, day: today() });
  if (!clean || !telemetryEnabled()) return clean;
  queue.push(clean);
  if (!timer) timer = setTimeout(flush, 4000);
  return clean;
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    if (timer) clearTimeout(timer);
    flush();
  });
}

// The area of the site for a path (a fixed list — never the path itself).
export function areaOf(path: string): (typeof AREAS)[number] {
  if (path === "/") return "home";
  if (path.startsWith("/ai-hospital/reception")) return "reception";
  if (/\/room(\/|$)/.test(path)) return "consultation";
  if (path.startsWith("/ai-hospital/emergency")) return "emergency";
  if (path.startsWith("/find-care")) return "find-care";
  if (path.startsWith("/health-library") || /^\/(tb|hiv|malaria|cancer|diabetes|heart|mental|tobacco|drugs|mother-child)\b/.test(path)) return "library";
  if (path.startsWith("/my-visit")) return "my-visit";
  return "other";
}

export function reportFailure(kind: Extract<TelemetryEvent, { type: "failure" }>["kind"]) {
  const path = typeof window === "undefined" ? "/" : window.location.pathname;
  return track({ type: "failure", kind, area: areaOf(path) });
}
