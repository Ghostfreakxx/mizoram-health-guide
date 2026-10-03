import { chooseTier, readDevice } from "./capability";
import { MODEL_URL } from "./models";

// Intelligent preload: when someone shows they are about to enter a
// consultation room (pointer over, or focus on, a link to it), start fetching
// the 3D code and the right-sized doctor model in the background, so the room
// opens quickly. Nothing is fetched on Data Saver, slow networks or devices
// that will use the 2D doctor. Prefetches are low priority and happen once.
let started = false;

export function preloadConsultation() {
  if (started || typeof window === "undefined") return;
  started = true;
  const tier = chooseTier(readDevice());
  if (tier === "fallback") return;
  void import("./Doctor3D").catch(() => {});
  // A static file prefetch hint: no data is sent, the browser fetches when idle.
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "fetch";
  link.crossOrigin = "anonymous";
  link.href = MODEL_URL[tier];
  document.head.appendChild(link);
}
