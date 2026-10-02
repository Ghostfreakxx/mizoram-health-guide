"use client";

import { useEffect, useRef, useState } from "react";
import { type JitsiApi, loadJitsi, startCall } from "./jitsi";

// Embeds the live video call from the Health Department's video server.
export default function LiveCall({
  domain,
  room,
  displayName,
  onPeers,
  onEnd,
}: {
  domain: string;
  room: string;
  displayName: string;
  onPeers: (count: number) => void;
  onEnd: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let api: JitsiApi | null = null;
    let cancelled = false;
    loadJitsi(domain)
      .then((Api) => {
        if (cancelled || !box.current) return;
        api = startCall(Api, domain, room, box.current, displayName);
        const update = () => onPeers(Math.max(0, (api?.getNumberOfParticipants() ?? 1) - 1));
        api.addListener("participantJoined", update);
        api.addListener("participantLeft", update);
        api.addListener("readyToClose", onEnd);
      })
      .catch(() => setError(true));
    return () => {
      cancelled = true;
      api?.dispose();
    };
  }, [domain, room, displayName, onPeers, onEnd]);

  if (error) {
    return (
      <div className="grid h-full place-items-center bg-slate-900 p-6 text-center text-white">
        <div>
          <p className="text-xl font-bold">The video service could not be reached.</p>
          <p className="mt-2">Check your internet connection and try again, or call the doctor or health worker who sent you the link.</p>
        </div>
      </div>
    );
  }
  return <div ref={box} className="h-full w-full bg-slate-900" />;
}
