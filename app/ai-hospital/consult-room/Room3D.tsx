"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Tier } from "./capability";
import { LAYOUT } from "./doctor/scene";
import type { Prop, RoomStyle } from "./rooms";

// A consulting room in a modern Indian clinic, seen from the patient's chair.
// Shared furniture for every department; each department adds a small "prop
// pack" (rooms.ts). Everything is built from code: no downloads.
//
// Layout (metres): the guide sits at z = -0.95 behind the desk; the patient's
// eyes (camera) are ~1.2 m in front of her. Back wall at z = -2.1.

type V3 = [number, number, number];

function canvasTexture(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Box({ size, position, color, rotation, rough = 0.8, metal = 0, emissive }: { size: V3; position: V3; color: string; rotation?: V3; rough?: number; metal?: number; emissive?: string }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={emissive ?? "#000"} emissiveIntensity={emissive ? 0.5 : 0} />
    </mesh>
  );
}

function Cyl({ r, h, position, color, rotation, rough = 0.6, metal = 0, seg = 20 }: { r: number | [number, number]; h: number; position: V3; color: string; rotation?: V3; rough?: number; metal?: number; seg?: number }) {
  const [rt, rb] = Array.isArray(r) ? r : [r, r];
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <cylinderGeometry args={[rt, rb, h, seg]} />
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
    </mesh>
  );
}

function Picture({ texture, size, position, rotation, frame = "#e5e7eb" }: { texture: THREE.Texture; size: [number, number]; position: V3; rotation?: V3; frame?: string }) {
  return (
    <group position={position} rotation={rotation}>
      <Box size={[size[0] + 0.03, size[1] + 0.03, 0.015]} position={[0, 0, 0]} color={frame} />
      <mesh position={[0, 0, 0.009]}>
        <planeGeometry args={size} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
    </group>
  );
}

// ---------------- Wall textures ----------------

function useSign(room: RoomStyle) {
  return useMemo(
    () =>
      canvasTexture((g, w, h) => {
        g.fillStyle = room.accent;
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#ffffff";
        g.textAlign = "left";
        g.textBaseline = "middle";
        g.font = "700 30px system-ui, sans-serif";
        g.fillText("MIZORAM AI HOSPITAL · PROTOTYPE", 34, 50);
        g.font = "800 64px system-ui, sans-serif";
        g.fillStyle = "#fde68a";
        g.fillText(room.title, 34, 124);
        // A thin, muted stripe band: a quiet nod to Mizo textile colours,
        // not decoration. (Mizo signage text is added only once reviewed.)
        const stripes = ["#7f1d1d", "#111827", "#f8fafc", "#166534", "#ca8a04", "#111827", "#7f1d1d"];
        stripes.forEach((c, i) => {
          g.fillStyle = c;
          g.globalAlpha = 0.85;
          g.fillRect(0, 172 + i * 2.6, w, 2.6);
        });
        g.globalAlpha = 1;
      }, 1024, 190),
    [room],
  );
}

function useHandwashPoster() {
  return useMemo(
    () =>
      canvasTexture((g, w, h) => {
        g.fillStyle = "#f8fafc";
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#0f766e";
        g.fillRect(0, 0, w, 70);
        g.fillStyle = "#fff";
        g.font = "800 34px system-ui, sans-serif";
        g.textAlign = "center";
        g.fillText("Clean hands save lives", w / 2, 46);
        const steps = ["Wet", "Soap", "Palms", "Backs", "Fingers", "Thumbs", "Rinse", "Dry"];
        steps.forEach((s, i) => {
          const x = 70 + (i % 4) * 125;
          const y = 140 + Math.floor(i / 4) * 170;
          g.fillStyle = "#ccfbf1";
          g.beginPath();
          g.arc(x, y, 46, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = "#0f766e";
          g.font = "700 30px system-ui";
          g.fillText(String(i + 1), x, y + 10);
          g.fillStyle = "#334155";
          g.font = "600 24px system-ui";
          g.fillText(s, x, y + 82);
        });
      }, 560, 480),
    [],
  );
}

function useBodyChart() {
  return useMemo(
    () =>
      canvasTexture((g, w, h) => {
        g.fillStyle = "#fffdf7";
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#1e3a8a";
        g.font = "800 30px system-ui";
        g.textAlign = "center";
        g.fillText("THE HUMAN BODY", w / 2, 44);
        // silhouette
        g.fillStyle = "#e7d3c3";
        g.beginPath();
        g.ellipse(w / 2, 110, 34, 42, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(w / 2 - 80, 170);
        g.quadraticCurveTo(w / 2, 150, w / 2 + 80, 170);
        g.lineTo(w / 2 + 64, 400);
        g.lineTo(w / 2 + 40, 600);
        g.lineTo(w / 2 - 40, 600);
        g.lineTo(w / 2 - 64, 400);
        g.closePath();
        g.fill();
        // organs (simple, labelled)
        const organ = (x: number, y: number, rx: number, ry: number, c: string) => {
          g.fillStyle = c;
          g.beginPath();
          g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
          g.fill();
        };
        organ(w / 2 - 34, 245, 26, 52, "#f4a7a7");
        organ(w / 2 + 34, 245, 26, 52, "#f4a7a7");
        organ(w / 2 + 6, 262, 18, 20, "#c2410c");
        organ(w / 2 - 20, 330, 34, 22, "#a16207");
        organ(w / 2 + 22, 340, 22, 18, "#d6a36a");
        g.strokeStyle = "#475569";
        g.fillStyle = "#334155";
        g.font = "600 20px system-ui";
        g.textAlign = "left";
        const label = (x1: number, y1: number, text: string) => {
          g.beginPath();
          g.moveTo(x1, y1);
          g.lineTo(w / 2 + 110, y1);
          g.stroke();
          g.fillText(text, w / 2 + 116, y1 + 7);
        };
        label(w / 2 + 50, 220, "Lungs");
        label(w / 2 + 16, 262, "Heart");
        label(w / 2 + 6, 326, "Liver");
        label(w / 2 + 36, 350, "Stomach");
      }, 480, 640),
    [],
  );
}

// A simple educational poster: title, an illustration and short labels.
function usePoster(kind: "heart" | "lungs" | "pregnancy" | "height") {
  return useMemo(
    () =>
      canvasTexture((g, w, h) => {
        const title: Record<typeof kind, [string, string]> = {
          heart: ["YOUR HEART", "#9f1239"],
          lungs: ["YOUR LUNGS", "#115e59"],
          pregnancy: ["CARE IN PREGNANCY", "#9d174d"],
          height: ["HOW TALL AM I?", "#0369a1"],
        };
        const [t, c] = title[kind];
        g.fillStyle = "#fffdf8";
        g.fillRect(0, 0, w, h);
        g.fillStyle = c;
        g.fillRect(0, 0, w, 64);
        g.fillStyle = "#fff";
        g.font = "800 30px system-ui";
        g.textAlign = "center";
        g.fillText(t, w / 2, 43);
        g.textAlign = "left";
        g.font = "600 22px system-ui";
        const label = (x: number, y: number, s: string) => {
          g.fillStyle = "#334155";
          g.fillText(s, x, y);
        };
        if (kind === "heart") {
          g.fillStyle = "#e11d48";
          g.beginPath();
          g.moveTo(w / 2, 400);
          g.bezierCurveTo(w / 2 - 210, 270, w / 2 - 120, 110, w / 2, 200);
          g.bezierCurveTo(w / 2 + 120, 110, w / 2 + 210, 270, w / 2, 400);
          g.fill();
          label(40, 470, "Know your blood pressure");
          label(40, 505, "Stay active · Avoid tobacco");
          label(40, 540, "Eat less salt");
        } else if (kind === "lungs") {
          g.fillStyle = "#94a3b8";
          g.fillRect(w / 2 - 8, 100, 16, 120);
          g.fillStyle = "#f9a8b4";
          g.beginPath();
          g.ellipse(w / 2 - 90, 300, 80, 150, 0.1, 0, Math.PI * 2);
          g.ellipse(w / 2 + 90, 300, 80, 150, -0.1, 0, Math.PI * 2);
          g.fill();
          label(40, 500, "Windpipe · Lungs");
          label(40, 535, "Avoid smoke and tobacco");
        } else if (kind === "pregnancy") {
          g.fillStyle = "#fbcfe8";
          g.beginPath();
          g.ellipse(w / 2, 280, 120, 160, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = "#f472b6";
          g.beginPath();
          g.ellipse(w / 2 + 10, 300, 50, 70, 0.4, 0, Math.PI * 2);
          g.fill();
          label(40, 485, "Regular check-ups");
          label(40, 520, "Keep your MCP card safe");
          label(40, 555, "Danger signs: go to hospital");
        } else {
          for (let i = 0; i < 10; i++) {
            g.fillStyle = i % 2 ? "#bae6fd" : "#fde68a";
            g.fillRect(w / 2 - 50, 80 + i * 50, 100, 50);
            g.fillStyle = "#334155";
            g.font = "700 20px system-ui";
            g.fillText(`${150 - i * 10} cm`, w / 2 + 60, 112 + i * 50);
          }
        }
      }, 400, kind === "height" ? 600 : 580),
    [kind],
  );
}

function useClock() {
  return useMemo(
    () =>
      canvasTexture((g, w) => {
        const r = w / 2;
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.arc(r, r, r - 4, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#1f2937";
        g.lineWidth = 8;
        g.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.beginPath();
          g.moveTo(r + Math.sin(a) * (r - 22), r - Math.cos(a) * (r - 22));
          g.lineTo(r + Math.sin(a) * (r - 40), r - Math.cos(a) * (r - 40));
          g.lineWidth = 6;
          g.stroke();
        }
        g.lineWidth = 9;
        g.beginPath();
        g.moveTo(r, r);
        g.lineTo(r + 50, r - 30);
        g.stroke();
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(r, r);
        g.lineTo(r - 20, r - 90);
        g.stroke();
      }, 256, 256),
    [],
  );
}

export type ChartLine = [label: string, value: string];

// The desk screen shows this patient's own visit record, as it is filled in.
function useChartScreen(lines: ChartLine[]) {
  const key = JSON.stringify(lines);
  return useMemo(
    () =>
      canvasTexture((g, w, h) => {
        const rows = JSON.parse(key) as ChartLine[];
        g.fillStyle = "#f8fafc";
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#1e3a8a";
        g.fillRect(0, 0, w, 54);
        g.fillStyle = "#fff";
        g.font = "800 26px system-ui";
        g.fillText("CURRENT VISIT", 18, 36);
        g.font = "600 17px system-ui";
        g.textAlign = "right";
        g.fillText("Not a diagnosis", w - 16, 35);
        g.textAlign = "left";
        if (!rows.length) {
          g.fillStyle = "#64748b";
          g.font = "italic 20px system-ui";
          g.fillText("Waiting for your answers…", 18, 100);
        }
        rows.slice(0, 9).forEach(([label, value], i) => {
          const y = 88 + i * 38;
          g.fillStyle = "#64748b";
          g.font = "700 17px system-ui";
          g.fillText(label, 18, y);
          g.fillStyle = value === "Not provided" ? "#94a3b8" : "#0f172a";
          g.font = value === "Not provided" ? "italic 19px system-ui" : "600 19px system-ui";
          const v = value.length > 26 ? value.slice(0, 25) + "…" : value;
          g.fillText(v, 230, y);
          g.fillStyle = "#e2e8f0";
          g.fillRect(18, y + 12, w - 36, 1);
        });
      }, 560, 420),
    [key],
  );
}

// ---------------- Department props ----------------

function PropItem({ prop }: { prop: Prop }) {
  const chart = useBodyChart();
  switch (prop) {
    case "bp-monitor":
      return (
        <group position={[0.5, 0.785, -0.66]} rotation={[0, -0.5, 0]}>
          <Box size={[0.16, 0.07, 0.13]} position={[0, 0.035, 0]} color="#f1f5f9" rough={0.4} />
          <mesh position={[0, 0.072, 0.012]} rotation={[-Math.PI / 2 + 0.3, 0, 0]}>
            <planeGeometry args={[0.1, 0.055]} />
            <meshStandardMaterial color="#0b3b36" emissive="#0f766e" emissiveIntensity={0.35} roughness={0.2} />
          </mesh>
          <mesh position={[0.17, 0.02, 0.02]} rotation={[Math.PI / 2, 0, 0.3]}>
            <torusGeometry args={[0.055, 0.016, 10, 24]} />
            <meshStandardMaterial color="#1e3a8a" roughness={0.85} />
          </mesh>
        </group>
      );
    case "stethoscope":
      return (
        <group position={[0.32, 0.79, -0.42]} rotation={[0, 0.4, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.07, 0.005, 8, 32, Math.PI * 1.6]} />
            <meshStandardMaterial color="#111827" roughness={0.4} />
          </mesh>
          <Cyl r={0.022} h={0.012} position={[0.09, 0.003, 0.03]} color="#d1d5db" metal={0.9} rough={0.2} />
        </group>
      );
    case "sanitizer":
      return (
        <group position={[-0.62, 0.785, -0.42]}>
          <Cyl r={0.032} h={0.13} position={[0, 0.065, 0]} color="#bae6fd" rough={0.15} />
          <Cyl r={0.012} h={0.04} position={[0, 0.15, 0]} color="#f8fafc" />
          <Box size={[0.05, 0.01, 0.014]} position={[0.02, 0.17, 0]} color="#f8fafc" />
        </group>
      );
    case "anatomy-chart":
      return <Picture texture={chart} size={[0.4, 0.53]} position={[0.74, 1.45, -2.08]} />;
    case "couch":
      return (
        <group position={[1.75, 0, -1.35]}>
          <Box size={[0.68, 0.08, 1.85]} position={[0, 0.66, 0]} color="#5b6b7a" rough={0.5} />
          <Box size={[0.6, 0.012, 1.7]} position={[0, 0.706, 0.05]} color="#f8fafc" />
          <Box size={[0.68, 0.18, 0.5]} position={[0, 0.78, -0.68]} rotation={[0.35, 0, 0]} color="#5b6b7a" rough={0.5} />
          {[-0.28, 0.28].map((x) => [-0.82, 0.82].map((z) => <Cyl key={`${x}${z}`} r={0.025} h={0.62} position={[x, 0.31, z]} color="#9ca3af" metal={0.7} rough={0.3} />))}
          <Box size={[0.4, 0.18, 0.3]} position={[-0.55, 0.09, 0.4]} color="#9ca3af" metal={0.5} rough={0.4} />
        </group>
      );
    case "curtain":
      return (
        <group position={[1.15, 0, -1.2]}>
          <Cyl r={0.01} h={1.8} position={[0, 2.35, 0]} rotation={[Math.PI / 2, 0, 0]} color="#cbd5e1" metal={0.6} />
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[Math.sin(i * 1.4) * 0.03, 1.4, -0.85 + i * 0.09]} rotation={[0, 0, 0]}>
              <boxGeometry args={[0.02, 1.9, 0.1]} />
              <meshStandardMaterial color="#a5d8e6" roughness={0.95} />
            </mesh>
          ))}
        </group>
      );
    case "ecg-cart":
      return (
        <group position={[0.8, 0, -1.5]} rotation={[0, -0.45, 0]}>
          <Box size={[0.5, 0.75, 0.4]} position={[0, 0.45, 0]} color="#e5e7eb" rough={0.5} />
          <Box size={[0.42, 0.3, 0.04]} position={[0, 1.02, 0.05]} rotation={[-0.2, 0, 0]} color="#1f2937" />
          <mesh position={[0, 1.02, 0.075]} rotation={[-0.2, 0, 0]}>
            <planeGeometry args={[0.37, 0.24]} />
            <meshBasicMaterial color="#052e2b" />
          </mesh>
          {[0.03, 0.1, 0.17].map((x, i) => (
            <Box key={x} size={[0.06, 0.012, 0.004]} position={[-0.12 + x * 1.4, 1.0 + (i === 1 ? 0.05 : 0), 0.08]} rotation={[-0.2, 0, i === 1 ? 0.9 : 0]} color="#34d399" emissive="#34d399" />
          ))}
          {[-0.2, 0.2].map((x) => <Cyl key={x} r={0.03} h={0.06} position={[x, 0.03, 0.15]} color="#374151" />)}
        </group>
      );
    case "heart-poster":
      return <Poster kind="heart" position={[0.74, 1.45, -2.08]} size={[0.38, 0.55]} />;
    case "lung-poster":
      return <Poster kind="lungs" position={[0.74, 1.45, -2.08]} size={[0.38, 0.55]} />;
    case "pregnancy-poster":
      return <Poster kind="pregnancy" position={[0.74, 1.45, -2.08]} size={[0.38, 0.55]} />;
    case "height-chart":
      return <Poster kind="height" position={[0.74, 1.3, -2.08]} size={[0.3, 0.45]} />;
    case "peak-flow":
      return (
        <group position={[0.42, 0.79, -0.5]} rotation={[0, -0.4, Math.PI / 2]}>
          <Cyl r={0.022} h={0.16} position={[0, 0, 0]} color="#e0f2fe" rough={0.2} />
          <Cyl r={0.012} h={0.05} position={[0, 0.1, 0]} color="#93c5fd" />
        </group>
      );
    case "oxygen":
      return (
        <group position={[0.82, 0, -1.55]}>
          <Cyl r={0.11} h={1.1} position={[0, 0.55, 0]} color="#e5e7eb" rough={0.35} metal={0.3} />
          <Cyl r={0.11} h={0.18} position={[0, 1.15, 0]} color="#15803d" rough={0.4} />
          <Cyl r={0.03} h={0.1} position={[0, 1.29, 0]} color="#9ca3af" metal={0.8} />
        </group>
      );
    case "toy-shelf":
      return (
        <group position={[0.95, 0, -1.85]} rotation={[0, -0.2, 0]}>
          <Box size={[0.9, 0.9, 0.35]} position={[0, 0.45, 0]} color="#fef3c7" rough={0.6} />
          {[0.3, 0.62].map((y) => <Box key={y} size={[0.86, 0.02, 0.3]} position={[0, y, 0.02]} color="#fcd34d" />)}
          {([[-0.3, 0.38, "#ef4444"], [-0.12, 0.38, "#3b82f6"], [0.08, 0.38, "#22c55e"], [0.28, 0.38, "#f59e0b"], [-0.22, 0.7, "#a855f7"], [0.1, 0.7, "#06b6d4"]] as [number, number, string][]).map(([x, y, c]) => (
            <Box key={`${x}${y}`} size={[0.12, 0.12, 0.12]} position={[x, y + 0.02, 0.05]} color={c} rough={0.5} />
          ))}
        </group>
      );
    case "scale":
      return (
        <group position={[1.6, 0, -1.2]}>
          <Box size={[0.36, 0.06, 0.36]} position={[0, 0.03, 0]} color="#e5e7eb" rough={0.4} />
          <Box size={[0.2, 0.012, 0.1]} position={[0, 0.066, -0.08]} color="#0f172a" />
        </group>
      );
    case "armchairs":
      return (
        <group>
          {[[-1.25, -1.45, 0.6], [0.95, -1.55, -0.6]].map(([x, z, r]) => (
            <group key={x} position={[x, 0, z]} rotation={[0, r, 0]}>
              <Box size={[0.75, 0.42, 0.75]} position={[0, 0.21, 0]} color="#64748b" rough={0.9} />
              <Box size={[0.75, 0.55, 0.16]} position={[0, 0.6, -0.3]} color="#64748b" rough={0.9} />
              <Box size={[0.14, 0.26, 0.7]} position={[0.31, 0.5, 0]} color="#64748b" rough={0.9} />
              <Box size={[0.14, 0.26, 0.7]} position={[-0.31, 0.5, 0]} color="#64748b" rough={0.9} />
              <Box size={[0.5, 0.1, 0.5]} position={[0, 0.46, 0.04]} color="#94a3b8" rough={0.95} />
            </group>
          ))}
        </group>
      );
    case "lamp":
      return (
        <group position={[0.55, 0, -1.95]}>
          <Cyl r={0.12} h={0.03} position={[0, 0.015, 0]} color="#78716c" />
          <Cyl r={0.012} h={1.4} position={[0, 0.72, 0]} color="#78716c" metal={0.4} />
          <Cyl r={[0.12, 0.2]} h={0.22} position={[0, 1.48, 0]} color="#fef3c7" />
          <pointLight position={[0, 1.4, 0.1]} intensity={0.5} distance={2} color="#ffe4b5" />
        </group>
      );
    case "plant":
      return (
        <group position={[-1.75, 0, -1.65]}>
          <Cyl r={[0.17, 0.13]} h={0.42} position={[0, 0.21, 0]} color="#e7e5e4" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} position={[Math.sin(i * 1.3) * 0.13, 0.62 + (i % 3) * 0.12, Math.cos(i * 1.3) * 0.11]}>
              <sphereGeometry args={[0.16, 12, 12]} />
              <meshStandardMaterial color={i % 2 ? "#3f7d4e" : "#4f9460"} roughness={0.85} />
            </mesh>
          ))}
        </group>
      );
    case "rug":
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -0.9]}>
          <planeGeometry args={[2.4, 1.6]} />
          <meshStandardMaterial color="#c7b9a3" roughness={1} />
        </mesh>
      );
    case "doppler":
      return (
        <group position={[0.48, 0.785, -0.66]} rotation={[0, -0.4, 0]}>
          <Box size={[0.12, 0.05, 0.18]} position={[0, 0.025, 0]} color="#f8fafc" rough={0.3} />
          <Box size={[0.08, 0.002, 0.05]} position={[0, 0.051, -0.04]} color="#0f766e" emissive="#14b8a6" />
          <Cyl r={0.018} h={0.1} position={[0.1, 0.02, 0.05]} rotation={[Math.PI / 2, 0, 0]} color="#e2e8f0" />
        </group>
      );
    default:
      return null;
  }
}

function Poster({ kind, position, size }: { kind: "heart" | "lungs" | "pregnancy" | "height"; position: V3; size: [number, number] }) {
  const tex = usePoster(kind);
  return <Picture texture={tex} size={size} position={position} />;
}

export default function Room3D({ room, tier, chart }: { room: RoomStyle; tier: Exclude<Tier, "fallback">; chart: ChartLine[] }) {
  const sign = useSign(room);
  const poster = useHandwashPoster();
  const clock = useClock();
  const screen = useChartScreen(chart);
  const full = tier === "high";
  const minimal = tier === "low";

  return (
    <group>
      {/* Floor (light vinyl), walls with a painted dado, ceiling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.6]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color={room.floor} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.5, -2.1]} receiveShadow>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial color={room.wall} roughness={0.95} />
      </mesh>
      <Box size={[6, 1.0, 0.01]} position={[0, 0.5, -2.095]} color={room.dado} rough={0.9} />
      <Box size={[6, 0.03, 0.02]} position={[0, 1.0, -2.09]} color="#ffffff" />
      {([-1, 1] as const).map((s) => (
        <group key={s}>
          <mesh position={[s * 2.3, 1.5, -0.6]} rotation={[0, -s * Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[6, 3]} />
            <meshStandardMaterial color={room.wall} roughness={0.95} />
          </mesh>
          <Box size={[0.01, 1.0, 6]} position={[s * 2.295, 0.5, -0.6]} color={room.dado} rough={0.9} />
        </group>
      ))}
      <mesh position={[0, 2.8, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <Box size={[1.2, 0.03, 0.6]} position={[0, 2.78, -0.7]} color="#ffffff" emissive="#ffffff" />

      {/* Signage and wall items */}
      <mesh position={[-0.7, 1.74, -2.09]}>
        <planeGeometry args={[1.0, 0.185]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {!minimal && <Picture texture={poster} size={[0.42, 0.36]} position={[-1.0, 1.34, -2.08]} />}
      <mesh position={[0.32, 1.9, -2.085]}>
        <circleGeometry args={[0.13, 32]} />
        <meshStandardMaterial map={clock} roughness={0.6} />
      </mesh>

      {/* Window with blinds, left wall */}
      <mesh position={[-2.29, 1.6, -1.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.2, 1.0]} />
        <meshStandardMaterial color="#e0f2fe" emissive="#e0f2fe" emissiveIntensity={0.7} />
      </mesh>
      {Array.from({ length: full ? 14 : 7 }, (_, i) => (
        <Box key={i} size={[0.012, 0.05, 1.2]} position={[-2.27, 1.13 + i * (0.95 / (full ? 14 : 7)), -1.2]} rotation={[0.5, 0, 0]} color="#f8fafc" rough={0.5} />
      ))}

      {/* Medicine cabinet with glass doors, back right */}
      <group position={[1.45, 0, -1.9]}>
        <Box size={[0.9, 1.8, 0.38]} position={[0, 0.9, 0]} color="#f1f5f9" rough={0.5} />
        {[0.95, 1.3, 1.62].map((y) => <Box key={y} size={[0.84, 0.02, 0.32]} position={[0, y, 0.02]} color="#cbd5e1" />)}
        {full &&
          ([
            [-0.28, 1.0, "#e0f2fe"], [-0.12, 1.0, "#fef3c7"], [0.1, 1.0, "#dcfce7"], [0.28, 1.0, "#fee2e2"],
            [-0.22, 1.36, "#e2e8f0"], [0.02, 1.36, "#dbeafe"], [0.24, 1.36, "#fef9c3"],
          ] as [number, number, string][]).map(([x, y, c]) => <Box key={`${x}${y}`} size={[0.12, 0.14, 0.16]} position={[x, y + 0.08, 0.02]} color={c} />)}
        <mesh position={[0, 1.3, 0.195]}>
          <planeGeometry args={[0.86, 0.95]} />
          <meshPhysicalMaterial color="#e0f2fe" transparent opacity={0.18} roughness={0.05} />
        </mesh>
        <Box size={[0.88, 0.8, 0.02]} position={[0, 0.42, 0.195]} color="#e2e8f0" rough={0.5} />
      </group>

      {/* Desk: laminate top, steel legs, modesty panel */}
      <Box size={[1.5, 0.04, 0.78]} position={[0, 0.76, -0.56]} color="#d8c3a5" rough={0.55} />
      <Box size={[1.46, 0.62, 0.02]} position={[0, 0.43, -0.18]} color="#b9a184" rough={0.7} />
      {[-0.7, 0.7].map((x) => <Box key={x} size={[0.04, 0.74, 0.7]} position={[x, 0.37, -0.56]} color="#94a3b8" metal={0.5} rough={0.4} />)}

      {/* Doctor's chair (behind her) */}
      <group position={[0, 0, -1.2]}>
        {/* upholstered back, slightly curved and reclined */}
        <mesh position={[0, 1.0, -0.07]} rotation={[-0.12, 0, 0]} scale={[1, 1, 0.22]} castShadow>
          <cylinderGeometry args={[0.27, 0.25, 0.6, 24, 1, false, -0.9, 1.8]} />
          <meshStandardMaterial color="#4a5563" roughness={0.95} side={2} />
        </mesh>
        <Box size={[0.5, 0.08, 0.48]} position={[0, 0.48, 0.18]} color="#4a5563" rough={0.95} />
        <Cyl r={0.025} h={0.4} position={[0, 0.25, 0.18]} color="#6b7280" metal={0.7} rough={0.3} />
      </group>

      {/* The chart screen, angled towards the doctor as on a real clinic desk (the patient sees the same record on their own screen) */}
      <group position={[LAYOUT.chart.position[0], LAYOUT.deskY, LAYOUT.chart.position[2]]} rotation={[0, LAYOUT.chart.rotationY, 0]}>
        <Box size={[0.2, 0.012, 0.14]} position={[0, 0.006, 0]} color="#1f2937" metal={0.3} rough={0.4} />
        <Box size={[0.04, 0.17, 0.03]} position={[0, 0.09, -0.03]} color="#1f2937" metal={0.3} rough={0.4} />
        <Box size={[0.44, 0.33, 0.025]} position={[0, LAYOUT.chart.position[1] - LAYOUT.deskY, -0.01]} color="#1f2937" rough={0.4} />
        <mesh position={[0, LAYOUT.chart.position[1] - LAYOUT.deskY, 0.0035]}>
          <planeGeometry args={[0.41, 0.3]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
      </group>
      {/* Tablet beside the doctor's right hand */}
      <group position={LAYOUT.tablet.position} rotation={[0, -0.25, 0]}>
        <Box size={[0.17, 0.008, 0.24]} position={[0, 0.004, 0]} color="#111827" rough={0.3} />
        <mesh position={[0, 0.0085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.155, 0.22]} />
          <meshStandardMaterial color="#1e293b" emissive="#334155" emissiveIntensity={0.4} roughness={0.15} />
        </mesh>
      </group>
      {/* Pedal waste bin */}
      {!minimal && (
        <group position={[0.95, 0, -0.95]}>
          <Cyl r={[0.13, 0.11]} h={0.36} position={[0, 0.18, 0]} color="#94a3b8" metal={0.5} rough={0.35} />
          <Cyl r={0.135} h={0.02} position={[0, 0.37, 0]} color="#cbd5e1" metal={0.5} rough={0.3} />
        </group>
      )}
      <Box size={[0.38, 0.015, 0.13]} position={[-0.32, 0.787, -0.78]} rotation={[0, 0.35, 0]} color="#e5e7eb" rough={0.5} />
      <Box size={[0.17, 0.006, 0.24]} position={[0.12, 0.783, -0.4]} rotation={[0, -0.12, 0]} color="#ffffff" rough={0.9} />
      <Cyl r={0.0045} h={0.14} position={[0.24, 0.787, -0.4]} rotation={[Math.PI / 2, 0, 0.35]} color="#1e3a8a" />

      {room.props.filter((p) => !minimal || p.endsWith("poster") || p === "anatomy-chart").map((p) => (
        <PropItem key={p} prop={p} />
      ))}
    </group>
  );
}
