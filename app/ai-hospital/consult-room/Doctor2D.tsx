"use client";

import { useEffect, useRef } from "react";
import type { Mood } from "../../lib/consultation";
import { type Activity, poseAt } from "./doctorMotion";
import type { RoomStyle } from "./rooms";

// Low-resource guide: a small SVG drawing driven by the same motion as the
// 3D guide. No WebGL, no downloads, tiny CPU use.

export default function Doctor2D({
  activity,
  mood,
  voiceLevel,
  reducedMotion,
  paused,
  room,
}: {
  activity: Activity;
  mood: Mood;
  voiceLevel: React.RefObject<number>;
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
  const state = useRef({ activity, mood, reducedMotion });
  useEffect(() => {
    state.current = { activity, mood, reducedMotion };
  }, [activity, mood, reducedMotion]);

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const s = state.current;
      const p = poseAt((now - t0) / 1000, s.activity, s.mood, { reducedMotion: s.reducedMotion, voiceLevel: voiceLevel.current ?? 0 });
      const deg = 180 / Math.PI;
      head.current?.setAttribute("transform", `translate(${p.headYaw * 60} ${p.headPitch * 40}) rotate(${p.headRoll * deg} 160 120)`);
      body.current?.setAttribute("transform", `translate(0 ${p.breath * 1.2})`);
      const lidH = 2 + p.blink * 16;
      lidL.current?.setAttribute("height", String(lidH));
      lidR.current?.setAttribute("height", String(lidH));
      mouth.current?.setAttribute("ry", String(0.5 + p.mouth * 6));
      smile.current?.setAttribute("d", `M146 166 Q160 ${166 + p.smile * 10} 174 166`);
      const b = p.brow * 3;
      browL.current?.setAttribute("d", `M126 ${100 - b} Q138 ${94 - b} 150 ${99 - b * 0.5}`);
      browR.current?.setAttribute("d", `M170 ${99 - b * 0.5} Q182 ${94 - b} 194 ${100 - b}`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, voiceLevel]);

  return (
    <svg viewBox="0 0 320 300" className="h-full w-full" aria-hidden>
      <rect width="320" height="300" fill={room.wall} />
      <rect x="20" y="18" width="150" height="34" rx="4" fill={room.accent} />
      <text x="95" y="40" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fde68a">{room.title}</text>
      <rect x="230" y="40" width="70" height="120" rx="4" fill="#f8fafc" stroke="#cbd5e1" />
      <g ref={body}>
        {/* Coat and scrubs */}
        <path d="M70 300 Q76 214 128 200 L192 200 Q244 214 250 300 Z" fill="#f7f8fa" stroke="#d6dbe1" />
        <path d="M140 200 L160 236 L180 200 Z" fill="#1f5f6b" />
        <path d="M128 202 L150 260 M192 202 L170 260" stroke="#d6dbe1" strokeWidth="3" fill="none" />
        <path d="M134 204 Q160 250 186 204" stroke="#1f2937" strokeWidth="3" fill="none" />
        <rect x="186" y="226" width="40" height="16" rx="2" fill="#ffffff" stroke="#cbd5e1" />
        <text x="206" y="237" textAnchor="middle" fontSize="6" fontWeight="800" fill="#1e3a8a">VIRTUAL GUIDE</text>
        <rect x="148" y="176" width="24" height="30" fill="#c58f6c" />
        <g ref={head}>
          <ellipse cx="160" cy="124" rx="46" ry="56" fill="#c58f6c" />
          <path d="M112 118 Q112 62 160 62 Q208 62 208 118 Q196 86 160 84 Q124 86 112 118 Z" fill="#17110e" />
          <ellipse cx="114" cy="128" rx="6" ry="11" fill="#b9845f" />
          <ellipse cx="206" cy="128" rx="6" ry="11" fill="#b9845f" />
          {[138, 182].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="114" rx="9" ry="6" fill="#f3efe9" />
              <circle cx={x} cy="114" r="4.2" fill="#3a2417" />
              <circle cx={x} cy="114" r="1.9" fill="#050505" />
              <circle cx={x + 1.3} cy="112.6" r="0.9" fill="#fff" />
            </g>
          ))}
          <rect ref={lidL} x="128" y="107" width="20" height="2" fill="#b37e5d" />
          <rect ref={lidR} x="172" y="107" width="20" height="2" fill="#b37e5d" />
          <path ref={browL} d="M126 100 Q138 94 150 99" stroke="#17110e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path ref={browR} d="M170 99 Q182 94 194 100" stroke="#17110e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M160 118 Q156 138 152 142 Q160 146 168 142" stroke="#a8724f" strokeWidth="2" fill="none" />
          <ellipse ref={mouth} cx="160" cy="166" rx="9" ry="0.5" fill="#2a0f0f" />
          <path ref={smile} d="M146 166 Q160 168 174 166" stroke="#7c3f38" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      </g>
      <rect x="0" y="262" width="320" height="38" fill="#c9a27a" />
    </svg>
  );
}
