"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Equipment, Simulation } from "../data/simulator";

// Low-poly, procedural 3D scene (no downloaded models) to keep it light on
// slow connections and inexpensive phones.

type V3 = [number, number, number];

function Box({ size, position = [0, 0, 0], color, rotation }: { size: V3; position?: V3; color: string; rotation?: V3 }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Cyl({ r, h, position = [0, 0, 0], color, rotation }: { r: number; h: number; position?: V3; color: string; rotation?: V3 }) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[r, r, h, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

const WOOD = "#b98b5e";
const METAL = "#94a3b8";
const WHITE = "#f8fafc";
const DARK = "#334155";
const TEAL = "#5eead4";

function Desk() {
  return (
    <group>
      <Box size={[1.6, 0.08, 0.8]} position={[0, 0.75, 0]} color={WOOD} />
      {[-0.7, 0.7].map((x) => [-0.32, 0.32].map((z) => <Box key={`${x}${z}`} size={[0.06, 0.75, 0.06]} position={[x, 0.37, z]} color={DARK} />))}
      <Box size={[0.6, 0.4, 0.04]} position={[0, 1.02, -0.25]} color={DARK} />
      <Box size={[0.55, 0.34, 0.02]} position={[0, 1.02, -0.22]} color="#60a5fa" />
      <Box size={[0.5, 0.06, 0.5]} position={[0, 0.48, -0.75]} color="#1e40af" />
      <Box size={[0.5, 0.55, 0.06]} position={[0, 0.78, -0.98]} color="#1e40af" />
    </group>
  );
}

function Bed() {
  return (
    <group>
      <Box size={[2, 0.2, 0.9]} position={[0, 0.6, 0]} color={WHITE} />
      <Box size={[2, 0.08, 0.9]} position={[0, 0.46, 0]} color={METAL} />
      <Box size={[0.4, 0.12, 0.6]} position={[-0.75, 0.76, 0]} color="#bfdbfe" />
      {[-0.9, 0.9].map((x) => [-0.4, 0.4].map((z) => <Cyl key={`${x}${z}`} r={0.03} h={0.45} position={[x, 0.22, z]} color={METAL} />))}
    </group>
  );
}

function Xray() {
  return (
    <group>
      <Box size={[1, 0.2, 1]} position={[0, 0.1, 0]} color={METAL} />
      <Box size={[0.25, 2, 0.25]} position={[-0.35, 1.1, 0]} color={WHITE} />
      <Box size={[0.8, 0.25, 0.4]} position={[0.1, 1.7, 0]} color={WHITE} />
      <Box size={[0.9, 1.1, 0.08]} position={[0, 1.1, -0.6]} color="#cbd5e1" />
    </group>
  );
}

function DentalChair() {
  return (
    <group>
      <Cyl r={0.25} h={0.4} position={[0, 0.2, 0]} color={METAL} />
      <Box size={[0.6, 0.12, 1.1]} position={[0, 0.5, 0.1]} color="#0ea5e9" />
      <Box size={[0.6, 0.8, 0.12]} position={[0, 0.85, -0.5]} rotation={[-0.4, 0, 0]} color="#0ea5e9" />
      <Cyl r={0.03} h={1.6} position={[0.6, 0.8, -0.5]} color={METAL} />
      <Box size={[0.6, 0.05, 0.05]} position={[0.35, 1.6, -0.35]} color={METAL} />
      <Box size={[0.25, 0.12, 0.2]} position={[0.1, 1.58, -0.3]} color="#fde68a" />
    </group>
  );
}

function EyeChart() {
  return (
    <group>
      <Box size={[1, 1.5, 0.05]} position={[0, 1.4, -0.5]} color={WHITE} />
      {[0.6, 0.48, 0.38, 0.3, 0.22, 0.16].map((w, i) => (
        <Box key={w} size={[w, 0.09, 0.02]} position={[0, 1.95 - i * 0.2, -0.47]} color={DARK} />
      ))}
      <Cyl r={0.03} h={0.7} position={[0, 0.35, -0.5]} color={METAL} />
    </group>
  );
}

function Lamp() {
  return (
    <group>
      <Box size={[1, 0.06, 0.6]} position={[0, 0.75, 0]} color={WHITE} />
      <Cyl r={0.04} h={0.75} position={[0, 0.37, 0]} color={METAL} />
      <Cyl r={0.03} h={0.5} position={[0, 1.02, 0]} color={METAL} />
      <Cyl r={0.12} h={0.15} position={[0, 1.3, 0.1]} rotation={[Math.PI / 2, 0, 0]} color={DARK} />
    </group>
  );
}

function Monitor() {
  return (
    <group>
      <Cyl r={0.04} h={1.5} position={[0, 0.75, 0]} color={METAL} />
      <Box size={[0.7, 0.5, 0.12]} position={[0, 1.6, 0]} color={DARK} />
      <Box size={[0.6, 0.02, 0.01]} position={[0, 1.6, 0.07]} color={TEAL} />
      <Box size={[0.05, 0.2, 0.01]} position={[0.05, 1.65, 0.07]} color={TEAL} />
      <Cyl r={0.25} h={0.05} position={[0, 0.03, 0]} color={METAL} />
    </group>
  );
}

function Cot() {
  return (
    <group>
      <Box size={[1, 0.08, 0.6]} position={[0, 0.6, 0]} color={WHITE} />
      {Array.from({ length: 7 }, (_, i) => (
        <Box key={i} size={[0.03, 0.35, 0.03]} position={[-0.45 + i * 0.15, 0.82, 0.28]} color="#f9a8d4" />
      ))}
      {[-0.45, 0.45].map((x) => <Box key={x} size={[0.04, 0.6, 0.6]} position={[x, 0.6, 0]} color="#f9a8d4" />)}
      {[-0.45, 0.45].map((x) => <Cyl key={x} r={0.03} h={0.6} position={[x, 0.3, 0]} color={METAL} />)}
    </group>
  );
}

function DeliveryBed() {
  return (
    <group>
      <Bed />
      <Box size={[0.7, 0.08, 0.85]} position={[-0.7, 0.95, 0]} rotation={[0, 0, -0.6]} color="#fbcfe8" />
    </group>
  );
}

function Lab() {
  const colors = ["#f87171", "#facc15", "#60a5fa", "#a78bfa", "#34d399"];
  return (
    <group>
      <Box size={[1.8, 0.9, 0.7]} position={[0, 0.45, 0]} color={WHITE} />
      <Box size={[1.8, 0.05, 0.7]} position={[0, 0.92, 0]} color={DARK} />
      {colors.map((c, i) => <Cyl key={c} r={0.04} h={0.22} position={[-0.6 + i * 0.12, 1.06, 0.1]} color={c} />)}
      <Box size={[0.2, 0.05, 0.25]} position={[0.5, 0.97, 0]} color={DARK} />
      <Cyl r={0.04} h={0.35} position={[0.5, 1.15, -0.05]} color={DARK} />
      <Cyl r={0.06} h={0.1} position={[0.5, 1.3, 0.05]} rotation={[0.6, 0, 0]} color={DARK} />
    </group>
  );
}

function Sofa() {
  return (
    <group>
      <Box size={[1.6, 0.35, 0.7]} position={[0, 0.3, 0]} color="#8b5cf6" />
      <Box size={[1.6, 0.6, 0.18]} position={[0, 0.6, -0.3]} color="#7c3aed" />
      {[-0.85, 0.85].map((x) => <Box key={x} size={[0.18, 0.5, 0.7]} position={[x, 0.4, 0]} color="#7c3aed" />)}
      <Cyl r={0.15} h={0.35} position={[1.3, 0.17, -0.2]} color={WOOD} />
      <mesh position={[1.3, 0.6, -0.2]}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    </group>
  );
}

function Stretcher() {
  return (
    <group>
      <Box size={[2, 0.12, 0.7]} position={[0, 0.85, 0]} color={WHITE} />
      <Box size={[1.9, 0.05, 0.6]} position={[0, 0.4, 0]} color={METAL} />
      {[-0.85, 0.85].map((x) => [-0.28, 0.28].map((z) => (
        <group key={`${x}${z}`}>
          <Cyl r={0.03} h={0.6} position={[x, 0.55, z]} color={METAL} />
          <Cyl r={0.07} h={0.04} position={[x, 0.07, z]} rotation={[Math.PI / 2, 0, 0]} color={DARK} />
        </group>
      )))}
      <Box size={[0.3, 0.08, 0.5]} position={[-0.8, 0.95, 0]} color="#fecaca" />
    </group>
  );
}

function Scale() {
  return (
    <group>
      <Box size={[0.6, 0.08, 0.6]} position={[0, 0.04, 0]} color={METAL} />
      <Cyl r={0.04} h={1.3} position={[0, 0.7, -0.25]} color={METAL} />
      <Box size={[0.3, 0.2, 0.08]} position={[0, 1.35, -0.22]} color={DARK} />
      <Box size={[0.22, 0.1, 0.01]} position={[0, 1.36, -0.17]} color={TEAL} />
    </group>
  );
}

function Pharmacy() {
  const colors = ["#fca5a5", "#93c5fd", "#fde68a", "#86efac", "#c4b5fd", "#fdba74"];
  return (
    <group>
      <Box size={[2, 2, 0.4]} position={[0, 1, -0.5]} color={WOOD} />
      {[0.5, 1.1, 1.7].map((y, r) =>
        colors.map((c, i) => <Box key={`${r}${c}`} size={[0.22, 0.3, 0.2]} position={[-0.75 + i * 0.3, y, -0.25]} color={colors[(i + r) % colors.length]} />),
      )}
      <Box size={[1.6, 0.9, 0.5]} position={[0, 0.45, 0.4]} color={WHITE} />
    </group>
  );
}

function Booth() {
  return (
    <group>
      <Box size={[1.4, 2.1, 1.4]} position={[0, 1.05, -0.2]} color="#e2e8f0" />
      <Box size={[0.7, 1.7, 0.04]} position={[0, 0.85, 0.52]} color="#94a3b8" />
      <Box size={[0.4, 0.3, 0.04]} position={[0, 1.4, 0.55]} color="#bae6fd" />
    </group>
  );
}

function EntChair() {
  return (
    <group>
      <Box size={[0.6, 0.1, 0.6]} position={[0, 0.5, 0]} color="#0d9488" />
      <Box size={[0.6, 0.7, 0.1]} position={[0, 0.9, -0.28]} color="#0d9488" />
      <Cyl r={0.2} h={0.45} position={[0, 0.22, 0]} color={METAL} />
      <Cyl r={0.03} h={1.8} position={[0.6, 0.9, -0.4]} color={METAL} />
      <Cyl r={0.1} h={0.08} position={[0.4, 1.75, -0.2]} rotation={[0.8, 0, 0]} color="#fde68a" />
    </group>
  );
}

const EQUIPMENT: Record<Equipment, () => React.ReactElement> = {
  desk: Desk,
  bed: Bed,
  xray: Xray,
  dental: DentalChair,
  eyechart: EyeChart,
  lamp: Lamp,
  monitor: Monitor,
  cot: Cot,
  delivery: DeliveryBed,
  lab: Lab,
  sofa: Sofa,
  stretcher: Stretcher,
  scale: Scale,
  pharmacy: Pharmacy,
  booth: Booth,
  ent: EntChair,
};

function Chairs() {
  return (
    <group>
      {[-1.2, -0.4, 0.4, 1.2].map((x) => (
        <group key={x} position={[x, 0, -0.6]}>
          <Box size={[0.5, 0.06, 0.5]} position={[0, 0.45, 0]} color="#3b82f6" />
          <Box size={[0.5, 0.5, 0.06]} position={[0, 0.72, -0.24]} color="#3b82f6" />
          <Cyl r={0.03} h={0.45} position={[0, 0.22, 0]} color={METAL} />
        </group>
      ))}
    </group>
  );
}

function Marker({ position, active, accent, index }: { position: V3; active: boolean; accent: string; index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = active ? 1 + Math.sin(clock.elapsedTime * 3) * 0.08 : 1;
      ref.current.scale.set(s, s, 1);
    }
  });
  return (
    <group position={[position[0], 0.02, position[2] + 1]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.6, 32]} />
        <meshBasicMaterial color={active ? accent : "#94a3b8"} />
      </mesh>
      {/* Small pillars show the step number (1 pillar = step 1, etc.) */}
      {Array.from({ length: index + 1 }, (_, i) => (
        <mesh key={i} position={[-0.75 - i * 0.12, 0.08, 0]}>
          <boxGeometry args={[0.07, 0.16, 0.07]} />
          <meshBasicMaterial color={active ? accent : "#94a3b8"} />
        </mesh>
      ))}
    </group>
  );
}

function Patient({ target, accent, instant }: { target: V3; accent: string; instant: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const goal = new THREE.Vector3(target[0], 0, target[2] + 1);
    if (instant) g.position.copy(goal);
    else g.position.lerp(goal, Math.min(1, delta * 2.5));
    const dir = goal.clone().sub(g.position);
    if (dir.lengthSq() > 0.0004) g.rotation.y = Math.atan2(dir.x, dir.z);
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.22, 0.6, 6, 12]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#f5d0a9" />
      </mesh>
    </group>
  );
}

function CameraRig({ target, azimuth, instant }: { target: V3; azimuth: React.RefObject<number>; instant: boolean }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 0.8, 0));
  useFrame((_, delta) => {
    const a = azimuth.current ?? 0;
    const t = new THREE.Vector3(target[0], 0.8, target[2]);
    const pos = new THREE.Vector3(t.x + Math.sin(a) * 6.5, 5.2, t.z + Math.cos(a) * 6.5);
    const k = instant ? 1 : Math.min(1, delta * 2);
    camera.position.lerp(pos, k);
    look.current.lerp(t, k);
    camera.lookAt(look.current);
  });
  return null;
}

export default function Scene3D({
  simulation,
  active,
  reducedMotion,
}: {
  simulation: Simulation;
  active: number;
  reducedMotion: boolean;
}) {
  const azimuth = useRef(0.35);
  const drag = useRef<number | null>(null);
  const station = simulation.stations[active];
  const target = station.position;

  const scenery = useMemo(
    () => (
      <>
        {/* Floor and walls */}
        <Box size={[15, 0.1, 11]} position={[0, -0.05, 0]} color="#eef2f7" />
        <Box size={[15, 2.6, 0.15]} position={[0, 1.3, -5.5]} color="#f1f5f9" />
        <Box size={[0.15, 2.6, 11]} position={[-7.5, 1.3, 0]} color="#f8fafc" />
        <Box size={[0.15, 2.6, 11]} position={[7.5, 1.3, 0]} color="#f8fafc" />
        <Box size={[15, 0.25, 0.02]} position={[0, 1.6, -5.42]} color={simulation.accent} />
        {/* Entrance mat */}
        <Box size={[1.6, 0.02, 1]} position={[-5, 0.01, 4.6]} color={simulation.accent} />
      </>
    ),
    [simulation.accent],
  );

  return (
    <div
      className="h-full w-full touch-none"
      onPointerDown={(e) => (drag.current = e.clientX)}
      onPointerMove={(e) => {
        if (drag.current === null) return;
        azimuth.current = Math.max(-1.2, Math.min(1.2, azimuth.current + (e.clientX - drag.current) * 0.005));
        drag.current = e.clientX;
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
    >
      <Canvas dpr={[1, 1.5]} camera={{ fov: 45, position: [0, 6, 9] }} gl={{ antialias: true, powerPreference: "low-power" }}>
        <color attach="background" args={["#dbe6f3"]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[5, 10, 6]} intensity={1.1} />
        <hemisphereLight args={["#ffffff", "#cbd5e1", 0.4]} />
        {scenery}
        {simulation.stations.map((s, i) => {
          const Items = s.equipment.map((e) => EQUIPMENT[e]);
          return (
            <group key={s.id}>
              <group position={s.position}>
                {s.id === "wait" ? <Chairs /> : Items.map((Item, j) => <Item key={j} />)}
              </group>
              <Marker position={s.position} active={i === active} accent={simulation.accent} index={i} />
            </group>
          );
        })}
        <Patient target={target} accent={simulation.accent} instant={reducedMotion} />
        <CameraRig target={target} azimuth={azimuth} instant={reducedMotion} />
      </Canvas>
    </div>
  );
}
