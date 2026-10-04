"use client";

import { useEffect, useRef } from "react";
import type { LipSync } from "./doctor/lipsync";
import { performAt } from "./doctor/perform";
import type { DoctorState } from "./doctor/state";
import type { RoomStyle } from "./rooms";

// Fallback doctor: a small SVG portrait driven by the same performance planner
// as the 3D doctor (state, gaze, blinks, expressions, lip-sync). No WebGL, no
// downloads.

export default function Doctor2D({
  state,
  since,
  lips,
  activity,
  reducedMotion,
  paused,
  room,
}: {
  state: React.RefObject<DoctorState>;
  since: React.RefObject<number>;
  lips: React.RefObject<LipSync | null>;
  activity?: React.RefObject<number>;
  reducedMotion: boolean;
  paused: boolean;
  room: RoomStyle;
}) {
  const head = useRef<SVGGElement>(null);
  const lidL = useRef<SVGRectElement>(null);
  const lidR = useRef<SVGRectElement>(null);
  const mouth = useRef<SVGEllipseElement>(null);
  const smile = useRef<SVGPathElement>(null);
  const browL = useRef<SVGPathElement>(null);
  const browR = useRef<SVGPathElement>(null);
  const body = useRef<SVGGElement>(null);
  const hand = useRef<SVGGElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const motion = useRef(reducedMotion);
  useEffect(() => {
    motion.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    const tick = (now: number) => {
      const t = now / 1000;
      const r = lips.current?.rhythm(t);
      const patientActive = activity?.current ? t - activity.current : 99;
      const f = performAt(t, state.current ?? "idle", since.current ?? 0, { reducedMotion: motion.current, ...r, patientActive });
      const v = lips.current?.visemeAt(t);
      const p = { ...f.body, ...f.face, smile: f.face.mouthSmile };
      const deg = 180 / Math.PI;
      const look = f.gaze.target === "chart" ? [4, 1] : f.gaze.target === "down" ? [0, 2.5] : f.gaze.target === "away" ? [-3, -0.5] : [f.gaze.sx * 80, f.gaze.sy * 80];
      eyes.current?.setAttribute("transform", `translate(${look[0]} ${look[1]})`);
      head.current?.setAttribute("transform", `translate(${p.headYaw * 60} ${p.headPitch * 40 + p.lean * 3}) rotate(${p.headRoll * deg} 160 120)`);
      body.current?.setAttribute("transform", `translate(0 ${p.breath * 1.2})`);
      hand.current?.setAttribute("transform", `translate(0 ${-p.gesture * 14})`);
      const lidH = 2 + f.blink * 16 + (f.gaze.target === "down" ? 3 : 0);
      lidL.current?.setAttribute("height", String(lidH));
      lidR.current?.setAttribute("height", String(lidH));
      mouth.current?.setAttribute("ry", String(0.5 + (v?.jawOpen ?? 0) * 16));
      smile.current?.setAttribute("d", `M146 166 Q160 ${166 + p.smile * 10 - p.browDown * 4} 174 166`);
      const b = (p.browInnerUp - p.browDown) * 4;
      browL.current?.setAttribute("d", `M126 ${100 - b * 0.4} Q138 ${94 - b} 150 ${99 - b}`);
      browR.current?.setAttribute("d", `M170 ${99 - b} Q182 ${94 - b} 194 ${100 - b * 0.4}`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, state, since, lips, activity]);

  return (
    <svg viewBox="-90 -10 500 310" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect x="-90" y="-10" width="500" height="310" fill={room.wall} />
      <rect x="-90" y="200" width="500" height="100" fill={room.dado} />
      <rect x="18" y="16" width="160" height="34" rx="3" fill={room.accent} />
      <text x="98" y="38" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fde68a">{room.title}</text>
      <rect x="236" y="36" width="66" height="130" rx="3" fill="#f8fafc" stroke="#cbd5e1" />
      <rect x="62" y="150" width="54" height="36" rx="3" fill="#1f2937" />
      <g ref={body}>
        <path d="M70 300 Q76 214 128 200 L192 200 Q244 214 250 300 Z" fill="#f4f5f6" stroke="#d6dbe1" />
        <path d="M140 200 L160 238 L180 200 Z" fill="#1f6470" />
        <path d="M128 202 L152 262 M192 202 L168 262" stroke="#d6dbe1" strokeWidth="3" fill="none" />
        <path d="M136 206 Q160 252 184 206" stroke="#111827" strokeWidth="3" fill="none" />
        <rect x="148" y="176" width="24" height="30" fill="#c99a7b" />
        <g ref={head}>
          <ellipse cx="160" cy="124" rx="44" ry="54" fill="#c99a7b" />
          <path d="M114 120 Q112 66 160 64 Q208 66 206 120 Q198 90 160 86 Q122 90 114 120 Z" fill="#2a1f19" />
          <ellipse cx="160" cy="70" rx="30" ry="10" fill="#2a1f19" />
          <ellipse cx="116" cy="128" rx="6" ry="11" fill="#b9845f" />
          <ellipse cx="204" cy="128" rx="6" ry="11" fill="#b9845f" />
          {[138, 182].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="114" rx="9" ry="5.5" fill="#f1ede6" />
            </g>
          ))}
          <g ref={eyes}>
            {[138, 182].map((x) => (
              <g key={x}>
                <circle cx={x} cy="114" r="4.2" fill="#4a2d1b" />
                <circle cx={x} cy="114" r="1.9" fill="#060403" />
                <circle cx={x + 1.3} cy="112.6" r="0.9" fill="#fff" />
              </g>
            ))}
          </g>
          <rect ref={lidL} x="128" y="108" width="20" height="2" fill="#b9876a" />
          <rect ref={lidR} x="172" y="108" width="20" height="2" fill="#b9876a" />
          <path ref={browL} d="M126 100 Q138 94 150 99" stroke="#2b1e17" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path ref={browR} d="M170 99 Q182 94 194 100" stroke="#2b1e17" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M160 118 Q156 138 152 142 Q160 146 168 142" stroke="#a8724f" strokeWidth="2" fill="none" />
          <ellipse ref={mouth} cx="160" cy="166" rx="9" ry="0.5" fill="#3a1414" />
          <path ref={smile} d="M146 166 Q160 168 174 166" stroke="#a55a55" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </g>
      </g>
      <rect x="-90" y="262" width="500" height="38" fill="#d8c3a5" />
      <g ref={hand}>
        <ellipse cx="196" cy="262" rx="16" ry="8" fill="#c99a7b" />
      </g>
      <ellipse cx="124" cy="262" rx="16" ry="8" fill="#c99a7b" />
    </svg>
  );
}
