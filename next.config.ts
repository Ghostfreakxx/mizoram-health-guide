import type { NextConfig } from "next";

// Content Security Policy. Everything is served from this site, except:
// - the live video consultation script and frame, from the Health
//   Department's own video server (only on the consultation pages, and only
//   when NEXT_PUBLIC_LIVE_CONSULT_DOMAIN is set)
// - pilot counts, sent only to NEXT_PUBLIC_TELEMETRY_URL when it is set.
// 'unsafe-inline' scripts: Next.js inlines its start-up data; there are no
// third-party scripts to protect against, and connect-src stops data leaving.
// 'wasm-unsafe-eval': the 3D model's mesh decoder is WebAssembly.
const dev = process.env.NODE_ENV !== "production";
const consult = (process.env.NEXT_PUBLIC_LIVE_CONSULT_DOMAIN ?? "").trim().toLowerCase();
const consultOrigin = /^[a-z0-9.-]+\.[a-z]{2,}$/.test(consult) && consult !== "meet.jit.si" ? `https://${consult}` : "";
const telemetryOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_TELEMETRY_URL ? new URL(process.env.NEXT_PUBLIC_TELEMETRY_URL).origin : "";
  } catch {
    return "";
  }
})();

function csp(opts: { video: boolean }) {
  const v = opts.video && consultOrigin ? ` ${consultOrigin}` : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}${v}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' blob: data:${telemetryOrigin ? ` ${telemetryOrigin}` : ""}${v}${dev ? " ws:" : ""}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `frame-src ${v ? v.trim() : "'none'"}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const nextConfig: NextConfig = {
  // Old addresses from before the site was reorganised keep working.
  // Temporary (307) while the prototype's structure may still change.
  async redirects() {
    return [
      { source: "/hospitals", destination: "/find-care#hospitals", permanent: false },
      { source: "/helplines", destination: "/find-care#helplines", permanent: false },
      { source: "/ai-hospital/hospitals", destination: "/find-care#hospitals", permanent: false },
      { source: "/tools", destination: "/health-library", permanent: false },
      { source: "/tools/quiz", destination: "/health-library", permanent: false },
      { source: "/tools/tobacco-cost", destination: "/tobacco", permanent: false },
      { source: "/ai-hospital/admin", destination: "/about", permanent: false },
      { source: "/ai-hospital/triage", destination: "/ai-hospital/departments/general-medicine/room?view=text", permanent: false },
      { source: "/ai-hospital/departments/:slug/simulator", destination: "/ai-hospital/departments/:slug", permanent: false },
    ];
  },
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];
    return [
      {
        // Every page: no location access; camera off; microphone only for this
        // site (on-device spoken answers, when switched on).
        source: "/((?!ai-hospital/consult|ai-hospital/doctor-desk).*)",
        headers: [...common, { key: "Content-Security-Policy", value: csp({ video: false }) }, { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self), payment=(), usb=()" }],
      },
      {
        // Live video consultations with a real doctor need the camera and
        // microphone inside the video service's frame; still no location.
        source: "/ai-hospital/(consult|doctor-desk)/:path*",
        headers: [...common, { key: "Content-Security-Policy", value: csp({ video: true }) }, { key: "Permissions-Policy", value: "geolocation=(), payment=(), usb=()" }],
      },
      {
        // The service worker must always be re-checked so updates arrive quickly.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        // The guide's 3D model is versioned (?v=…), so browsers may keep it for a long time.
        source: "/models/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
