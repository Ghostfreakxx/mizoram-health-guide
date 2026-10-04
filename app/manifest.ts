import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mizoram Health Guide — AI Hospital",
    short_name: "Health Guide",
    description: "Public health information, emergency help, and AI Hospital health navigation for Mizoram.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7fb",
    theme_color: "#1e3a8a",
    lang: "en",
    categories: ["health", "medical"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Emergency", url: "/ai-hospital/emergency", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Tell us what's wrong", url: "/ai-hospital/reception", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Find care", url: "/find-care", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
