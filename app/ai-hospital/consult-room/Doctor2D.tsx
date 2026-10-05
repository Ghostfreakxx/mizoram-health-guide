"use client";

import { useEffect, useRef } from "react";
import type { LipSync } from "./doctor/lipsync";
import { performAt } from "./doctor/perform";
import type { DoctorState } from "./doctor/state";
import type { RoomStyle } from "./rooms";

// Fallback doctor (no WebGL, Data Saver, slow phones): a calm illustrated
// portrait driven by the same performance planner as the 3D doctor — state,
// gaze, blinks, expressions, nods and lip-sync. One small SVG; no downloads.

const SKIN = "#c99474";
const SKIN_SHADE = "#a9775a";
const LIP = "#ab6a5e";
const HAIR = "#211814";

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
  const upperLip = useRef<SVGPathElement>(null);
  const lowerLip = useRef<SVGPathElement>(null);
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
      const deg = 180 / Math.PI;
      const g = f.gaze.target;
      const look = g === "chart" ? [-3.2, 1.6] : g === "down" ? [0, 2.4] : g === "away" ? [3, -0.6] : g === "visual" ? [-1.4, 2.6] : [f.gaze.sx * 70, f.gaze.sy * 70];
      eyes.current?.setAttribute("transform", `translate(${look[0].toFixed(2)} ${look[1].toFixed(2)})`);
      const b = f.body;
      head.current?.setAttribute("transform", `translate(${(b.headYaw * 55).toFixed(2)} ${(b.headPitch * 38 + b.lean * 3).toFixed(2)}) rotate(${(b.headRoll * deg).toFixed(2)} 160 128)`);
      body.current?.setAttribute("transform", `translate(0 ${(b.breath * 1.1).toFixed(2)})`);
      hand.current?.setAttribute("transform", `translate(0 ${(-b.gesture * 12).toFixed(2)})`);
      // upper lids follow blinks and downward looks
      const lid = Math.min(1, f.blink + (g === "down" || g === "chart" ? 0.25 : 0));
      const lidH = (lid * 9).toFixed(2);
      lidL.current?.setAttribute("height", lidH);
      lidR.current?.setAttribute("height", lidH);
      // mouth: opening from the voice; corners from the expression
      const jaw = v?.jawOpen ?? 0;
      const press = v?.mouthPress ?? 0;
      const open = Math.max(0, jaw * 15 + (v?.lipsPart ?? 0) * 2.2 - press * 2);
      const wide = (v?.mouthStretch ?? 0) * 3 - ((v?.mouthPucker ?? 0) + (v?.mouthFunnel ?? 0)) * 3.5;
      mouth.current?.setAttribute("ry", open.toFixed(2));
      mouth.current?.setAttribute("rx", (8.5 + wide).toFixed(2));
      const corner = 163 - f.face.mouthSmile * 6 + f.face.mouthFrown * 3; // neutral: corners level, a little up when smiling
      const w = 12 + wide;
      upperLip.current?.setAttribute("d", `M${160 - w} ${corner} Q${160 - w / 2} ${160.4 - open * 0.15} 160 ${161.3 - open * 0.2} Q${160 + w / 2} ${160.4 - open * 0.15} ${160 + w} ${corner} Q160 ${164.2 - open * 0.25} ${160 - w} ${corner} Z`);
      lowerLip.current?.setAttribute("d", `M${160 - w + 1} ${corner + 0.4} Q160 ${164.6 + open * 0.95} ${160 + w - 1} ${corner + 0.4} Q160 ${168.6 + open} ${160 - w + 1} ${corner + 0.4} Z`);
      const lift = (f.face.browInnerUp + f.face.browOuterUp * 0.5 - f.face.browDown) * 4;
      browL.current?.setAttribute("d", `M133 ${109 - lift * 0.5} Q142 ${104.5 - lift} 151 ${106.5 - lift * 1.1}`);
      browR.current?.setAttribute("d", `M169 ${106.5 - lift * 1.1} Q178 ${104.5 - lift} 187 ${109 - lift * 0.5}`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, state, since, lips, activity]);

  const scrubs = room.attire.scrubsColor ?? "#2f5d73";
  const coat = room.attire.coat;

  return (
    <svg viewBox="-90 -10 500 310" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="d2-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={room.wall} />
          <stop offset="1" stopColor="#e7e4dd" />
        </linearGradient>
        <radialGradient id="d2-skin" cx="0.45" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#d6a283" />
          <stop offset="0.7" stopColor={SKIN} />
          <stop offset="1" stopColor={SKIN_SHADE} />
        </radialGradient>
        <linearGradient id="d2-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2b23" />
          <stop offset="1" stopColor={HAIR} />
        </linearGradient>
        <linearGradient id="d2-coat" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e6e9ee" />
          <stop offset="0.5" stopColor="#fbfcfd" />
          <stop offset="1" stopColor="#e2e6eb" />
        </linearGradient>
        <linearGradient id="d2-desk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9ad8a" />
          <stop offset="1" stopColor="#a88b69" />
        </linearGradient>
        <radialGradient id="d2-iris" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#7a4e2e" />
          <stop offset="1" stopColor="#3a2416" />
        </radialGradient>
        <clipPath id="d2-eyeL">
          <path d="M132 120 Q141 113.5 150 120 Q141 124.6 132 120 Z" />
        </clipPath>
        <clipPath id="d2-eyeR">
          <path d="M170 120 Q179 113.5 188 120 Q179 124.6 170 120 Z" />
        </clipPath>
      </defs>

      {/* Consulting room: calm wall, painted dado, a window's soft light, a cabinet */}
      <rect x="-90" y="-10" width="500" height="310" fill="url(#d2-wall)" />
      <rect x="-90" y="196" width="500" height="104" fill={room.dado} opacity="0.85" />
      <rect x="-90" y="194" width="500" height="3" fill="#ffffff" opacity="0.8" />
      <rect x="262" y="22" width="92" height="120" rx="3" fill="#f7f9fb" stroke="#d5dbe1" />
      <rect x="268" y="28" width="80" height="108" rx="2" fill="#e8f1f6" />
      <line x1="308" y1="28" x2="308" y2="136" stroke="#d5dbe1" />
      <rect x="-56" y="70" width="70" height="126" rx="3" fill="#e9e5de" stroke="#d8d2c8" />
      <line x1="-21" y1="74" x2="-21" y2="192" stroke="#d8d2c8" />
      <rect x="22" y="20" width="150" height="26" rx="3" fill={room.accent} />
      <text x="97" y="37.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff7d6">{room.title}</text>

      {/* Chair back */}
      <path d="M104 150 Q160 138 216 150 L222 262 L98 262 Z" fill="#5b6b7a" />

      <g ref={body}>
        {/* Shoulders and clothes */}
        <path d="M78 300 Q82 222 132 206 L188 206 Q238 222 242 300 Z" fill={coat ? "url(#d2-coat)" : scrubs} />
        <path d="M138 206 L160 244 L182 206 Z" fill={coat ? scrubs : "#ffffff"} opacity={coat ? 1 : 0.0} />
        <path d="M141 206 L160 240 L179 206" fill="none" stroke={coat ? "#ffffff" : "#00000022"} strokeWidth="1.5" />
        {coat && (
          <>
            <path d="M132 207 L152 268 L144 300 M188 207 L168 268 L176 300" fill="none" stroke="#d3d9e0" strokeWidth="2.5" />
            {/* stethoscope */}
            <path d="M139 208 Q133 236 146 254 M181 208 Q187 236 174 254" fill="none" stroke="#2b3440" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="174" cy="256" r="4" fill="#9aa5b1" stroke="#2b3440" strokeWidth="1.5" />
          </>
        )}
        {/* Neck */}
        <path d="M147 176 L173 176 L176 208 Q160 214 144 208 Z" fill={SKIN_SHADE} />
        <path d="M147 176 L173 176 L174 190 Q160 196 146 190 Z" fill="#00000018" />

        <g ref={head}>
          {/* hair behind the head (low bun) */}
          <ellipse cx="160" cy="98" rx="47" ry="48" fill="url(#d2-hair)" />
          {/* ears */}
          <path d="M117 118 Q110 120 112 132 Q114 142 121 141 Z" fill={SKIN_SHADE} />
          <path d="M203 118 Q210 120 208 132 Q206 142 199 141 Z" fill={SKIN_SHADE} />
          {/* face */}
          <path d="M120 112 Q120 76 160 74 Q200 76 200 112 Q201 148 190 164 Q178 181 160 182 Q142 181 130 164 Q119 148 120 112 Z" fill="url(#d2-skin)" />
          {/* hairline: smooth hair parted at the side, pulled back */}
          <path d="M118 114 Q115 70 160 66 Q205 70 202 114 Q199 95 184 89 Q170 85 158 86 Q140 88 130 96 Q122 104 118 114 Z" fill="url(#d2-hair)" />
          <path d="M150 86 Q166 76 190 88" fill="none" stroke="#4a3a30" strokeWidth="0.9" opacity="0.5" />
          {/* cheeks and jaw shading */}
          <ellipse cx="137" cy="145" rx="9" ry="5.5" fill="#c97f68" opacity="0.09" />
          <ellipse cx="183" cy="145" rx="9" ry="5.5" fill="#c97f68" opacity="0.09" />
          <path d="M132 166 Q160 188 188 166 Q176 179 160 180 Q144 179 132 166 Z" fill="#00000010" />

          {/* eyes */}
          <path d="M132 120 Q141 113.5 150 120 Q141 124.6 132 120 Z" fill="#f2ede6" />
          <path d="M170 120 Q179 113.5 188 120 Q179 124.6 170 120 Z" fill="#f2ede6" />
          <g ref={eyes}>
            {[141, 179].map((x) => (
              <g key={x} clipPath={`url(#${x < 160 ? "d2-eyeL" : "d2-eyeR"})`}>
                <circle cx={x} cy="119.4" r="3.9" fill="url(#d2-iris)" />
                <circle cx={x} cy="119.4" r="1.7" fill="#0b0705" />
                <circle cx={x + 1.2} cy="118.2" r="0.8" fill="#ffffff" opacity="0.9" />
              </g>
            ))}
          </g>
          {/* upper lids (blink / look down) */}
          <g clipPath="url(#d2-eyeL)">
            <rect ref={lidL} x="130" y="113" width="22" height="0" fill={SKIN_SHADE} />
          </g>
          <g clipPath="url(#d2-eyeR)">
            <rect ref={lidR} x="168" y="113" width="22" height="0" fill={SKIN_SHADE} />
          </g>
          {/* lash lines and creases */}
          <path d="M131.5 120 Q141 112.8 150.5 119.6" fill="none" stroke="#2a1d17" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M169.5 119.6 Q179 112.8 188.5 120" fill="none" stroke="#2a1d17" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M134 115 Q141 110.5 149 114" fill="none" stroke={SKIN_SHADE} strokeWidth="0.9" opacity="0.7" />
          <path d="M171 114 Q179 110.5 186 115" fill="none" stroke={SKIN_SHADE} strokeWidth="0.9" opacity="0.7" />
          {/* brows */}
          <path ref={browL} d="M133 109 Q142 104.5 151 106.5" stroke="#2b1e17" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path ref={browR} d="M169 106.5 Q178 104.5 187 109" stroke="#2b1e17" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          {/* nose */}
          {/* nose: a soft side shadow and the base only */}
          <path d="M156 131 Q153.5 141 152.5 146" fill="none" stroke={SKIN_SHADE} strokeWidth="1.6" opacity="0.45" strokeLinecap="round" />
          <path d="M152 147.5 Q156 151.5 160 150.5 Q164 151.5 168 147.5" fill="none" stroke={SKIN_SHADE} strokeWidth="1.4" opacity="0.8" strokeLinecap="round" />
          <path d="M154.5 148.6 Q156 149.8 157.5 149.2 M162.5 149.2 Q164 149.8 165.5 148.6" fill="none" stroke="#7d4f3b" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
          {/* mouth: dark opening behind the lips */}
          <ellipse ref={mouth} cx="160" cy="164" rx="8.5" ry="0" fill="#4a1d1a" />
          <path ref={upperLip} d="M148 163 Q154 160.4 160 161.3 Q166 160.4 172 163 Q160 164.2 148 163 Z" fill={LIP} />
          <path ref={lowerLip} d="M149 163.4 Q160 164.6 171 163.4 Q160 168.6 149 163.4 Z" fill="#b97467" />
        </g>
      </g>

      {/* Desk, with a closed notebook and a pen */}
      <rect x="-90" y="262" width="500" height="40" fill="url(#d2-desk)" />
      <rect x="-90" y="262" width="500" height="2.5" fill="#e3cfb3" />
      <rect x="40" y="266" width="58" height="14" rx="2" fill="#1f3b57" />
      <line x1="232" y1="270" x2="268" y2="266" stroke="#30363d" strokeWidth="2.5" strokeLinecap="round" />
      <g ref={hand}>
        <ellipse cx="196" cy="264" rx="15" ry="7" fill={SKIN} />
      </g>
      <ellipse cx="124" cy="264" rx="15" ry="7" fill={SKIN} />
    </svg>
  );
}
