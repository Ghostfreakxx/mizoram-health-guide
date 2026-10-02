"use client";

import { useEffect, useRef, useState } from "react";

// Tests the camera and microphone on this phone only. Nothing is sent or
// saved. The camera turns off when you stop the check or leave the page.
export default function DeviceCheck() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const [state, setState] = useState<"idle" | "on" | "denied" | "unsupported">("idle");
  const [level, setLevel] = useState(0);

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);
    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    setLevel(0);
  };

  useEffect(() => stop, []);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) return setState("unsupported");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => {});
      }
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(s).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        setLevel(Math.min(100, Math.round((data.reduce((a, b) => a + b, 0) / data.length) * 1.5)));
        raf.current = requestAnimationFrame(tick);
      };
      tick();
      setState("on");
    } catch {
      setState("denied");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
        <div className="aspect-video overflow-hidden rounded-xl bg-slate-900">
          <video ref={video} muted playsInline aria-label="Your camera preview" className={`h-full w-full object-cover ${state === "on" ? "" : "hidden"}`} />
          {state !== "on" && <div className="grid h-full place-items-center text-4xl" aria-hidden>📷</div>}
        </div>
        <div className="space-y-3 text-lg">
          {state === "idle" && <p className="text-slate-700">Check that the doctor will be able to see and hear you. Nothing is recorded or sent.</p>}
          {state === "on" && (
            <>
              <p className="font-semibold text-emerald-800">✓ Camera is working. Say something to test the microphone:</p>
              <div className="h-4 w-full rounded-full bg-slate-200" role="meter" aria-label="Microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level}>
                <div className="h-4 rounded-full bg-emerald-600 transition-[width]" style={{ width: `${level}%` }} />
              </div>
            </>
          )}
          {state === "denied" && <p className="text-red-800">The camera or microphone was blocked. Allow them in your browser settings, then try again.</p>}
          {state === "unsupported" && <p className="text-red-800">This browser cannot use the camera. Try Chrome on Android.</p>}
          <div className="flex flex-wrap gap-3">
            {state !== "on" ? (
              <button type="button" onClick={start} className="rounded-xl bg-blue-900 px-5 py-3 font-bold text-white">Test camera and microphone</button>
            ) : (
              <button type="button" onClick={() => { stop(); setState("idle"); }} className="rounded-xl border-2 border-slate-300 px-5 py-3 font-semibold">Stop test</button>
            )}
          </div>
        </div>
      </div>
      <ul className="grid gap-1 text-slate-700 sm:grid-cols-2">
        <li>• Sit somewhere quiet with good light on your face.</li>
        <li>• Keep your phone charged, with good network.</li>
        <li>• Have your medicines and reports beside you.</li>
        <li>• A family member can sit with you.</li>
      </ul>
    </div>
  );
}
