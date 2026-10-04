import type { NextConfig } from "next";

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
    ];
  },
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
    ];
    return [
      {
        // Every page: no location access; camera off; microphone only for this
        // site (on-device spoken answers, when switched on).
        source: "/((?!ai-hospital/consult|ai-hospital/doctor-desk).*)",
        headers: [...common, { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self), payment=(), usb=()" }],
      },
      {
        // Live video consultations with a real doctor need the camera and
        // microphone inside the video service's frame; still no location.
        source: "/ai-hospital/(consult|doctor-desk)/:path*",
        headers: [...common, { key: "Permissions-Policy", value: "geolocation=(), payment=(), usb=()" }],
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
