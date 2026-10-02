"use client";

import { useEffect, useState } from "react";

// Registers the service worker (production only) and shows a small banner
// when the device is offline.
export default function OfflineSupport() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        // Offline support is optional; the site works without it.
      });
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" className="no-print sticky top-0 z-[95] bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white">
      📶 You are offline. Emergency numbers still work: <a href="tel:108" className="underline">108</a> ·{" "}
      <a href="tel:112" className="underline">112</a>. Saved pages still open.
    </div>
  );
}
