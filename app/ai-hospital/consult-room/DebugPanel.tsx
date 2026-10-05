"use client";

import { useEffect, useState } from "react";
import type { ConsultState, Turn } from "../../lib/consultation";
import { PERFORMANCE, type DoctorState } from "./doctor/state";

// Developer debug panel — development builds only (`npm run dev`, then add
// ?debug to a room address). Never shipped to patients: the room only loads it
// when NODE_ENV is "development". Use synthetic test conversations only;
// nothing here is logged or sent.

export default function DebugPanel(props: {
  state: ConsultState;
  turn: Turn;
  doctor: DoctorState;
  speaking: boolean;
  listening: boolean;
  tier: string;
  voiceIssue: boolean;
}) {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const p = PERFORMANCE[props.doctor];
  const rows: [string, string][] = [
    ["doctor state", props.doctor],
    ["expression / gaze policy", `${p.expression} / ${p.gaze}`],
    ["speaking / listening", `${props.speaking} / ${props.listening}`],
    ["display tier", props.tier],
    ["voice issue", String(props.voiceIssue)],
    ["page fps", String(fps)],
    ["step / input", `${props.turn.step} / ${props.turn.input.kind}`],
    ["turns", String(props.state.turns)],
  ];
  return (
    <details open className="rounded-2xl border-2 border-fuchsia-700 bg-fuchsia-50 p-3 font-mono text-xs text-fuchsia-950">
      <summary className="cursor-pointer font-bold">Doctor debug (development only)</summary>
      <table className="mt-2">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th className="pr-3 text-left font-semibold">{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 font-semibold">Visit memory</p>
      <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap">{JSON.stringify(props.state, null, 1)}</pre>
    </details>
  );
}
