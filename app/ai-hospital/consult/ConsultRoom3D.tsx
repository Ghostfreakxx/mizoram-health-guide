"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

// A doctor's consulting room, seen from the patient's chair. It is only the
// setting: the doctor is a real person who appears on video. The doctor's
// chair stays empty until a real doctor joins.

type V3 = [number, number, number];

function Box({ size, position, color }: { size: V3; position: V3; color: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Doctor() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.sin(clock.elapsedTime * 1.5) * 0.01;
  });
  return (
    <group ref={ref} position={[0, 0, -1.55]}>
      <mesh position={[0, 1.15, 0]}>
        <capsuleGeometry args={[0.28, 0.55, 6, 12]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#c68a5a" />
      </mesh>
      {/* Stethoscope */}
      <mesh position={[0, 1.42, 0.22]} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[0.13, 0.015, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}

function Rig({ azimuth }: { azimuth: React.RefObject<number> }) {
  const { camera } = useThree();
  useFrame(() => {
    const a = azimuth.current ?? 0;
    const target = new THREE.Vector3(Math.sin(a) * 3, 1.3, -2.6);
    camera.position.lerp(new THREE.Vector3(0, 1.35, 1.8), 0.1);
    camera.lookAt(target);
  });
  return null;
}

export default function ConsultRoom3D({ doctorPresent, screenText }: { doctorPresent: boolean; screenText: string }) {
  const azimuth = useRef(0);
  const drag = useRef<number | null>(null);

  return (
    <div
      className="relative h-full w-full touch-none"
      onPointerDown={(e) => (drag.current = e.clientX)}
      onPointerMove={(e) => {
        if (drag.current === null) return;
        azimuth.current = Math.max(-0.6, Math.min(0.6, azimuth.current + (e.clientX - drag.current) * 0.004));
        drag.current = e.clientX;
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
    >
      <Canvas dpr={[1, 1.5]} camera={{ fov: 55, position: [0, 1.35, 1.8] }} gl={{ antialias: true, powerPreference: "low-power" }}>
        <color attach="background" args={["#e0e7f1"]} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 3]} intensity={1} />
        <hemisphereLight args={["#ffffff", "#cbd5e1", 0.4]} />

        {/* Room */}
        <Box size={[8, 0.1, 8]} position={[0, -0.05, -1]} color="#eef2f7" />
        <Box size={[8, 3.2, 0.1]} position={[0, 1.6, -3.2]} color="#f1f5f9" />
        <Box size={[0.1, 3.2, 8]} position={[-3.5, 1.6, -1]} color="#f8fafc" />
        <Box size={[0.1, 3.2, 8]} position={[3.5, 1.6, -1]} color="#f8fafc" />
        <Box size={[8, 0.2, 0.02]} position={[0, 1.1, -3.14]} color="#1e3a8a" />

        {/* Window */}
        <Box size={[1.4, 1, 0.04]} position={[-2.2, 1.9, -3.12]} color="#bae6fd" />
        <Box size={[0.04, 1, 0.06]} position={[-2.2, 1.9, -3.1]} color="#ffffff" />

        {/* Wall screen (live video is shown over this area) */}
        <Box size={[1.7, 1, 0.06]} position={[1.6, 1.95, -3.1]} color="#0f172a" />
        <Box size={[1.6, 0.9, 0.02]} position={[1.6, 1.95, -3.06]} color={doctorPresent ? "#1d4ed8" : "#334155"} />

        {/* Desk */}
        <Box size={[2.2, 0.08, 0.9]} position={[0, 0.78, -0.9]} color="#b98b5e" />
        <Box size={[2.1, 0.7, 0.05]} position={[0, 0.42, -1.32]} color="#a87a4f" />
        <Box size={[0.5, 0.32, 0.03]} position={[-0.6, 1.0, -1.15]} color="#1e293b" />
        <Box size={[0.3, 0.02, 0.22]} position={[0.4, 0.83, -0.8]} color="#ffffff" />

        {/* Doctor's chair (empty until a real doctor joins) */}
        <Box size={[0.6, 0.08, 0.6]} position={[0, 0.5, -1.6]} color="#1e40af" />
        <Box size={[0.6, 0.8, 0.08]} position={[0, 0.95, -1.92]} color="#1e40af" />
        {doctorPresent && <Doctor />}

        {/* Examination couch */}
        <Box size={[0.8, 0.5, 1.9]} position={[2.6, 0.35, -1.6]} color="#e2e8f0" />
        <Box size={[0.5, 0.1, 0.35]} position={[2.6, 0.65, -2.35]} color="#bfdbfe" />

        {/* Plant */}
        <mesh position={[-2.9, 0.25, -2.6]}>
          <cylinderGeometry args={[0.2, 0.16, 0.5, 12]} />
          <meshStandardMaterial color="#b98b5e" />
        </mesh>
        <mesh position={[-2.9, 0.8, -2.6]}>
          <sphereGeometry args={[0.4, 12, 12]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>

        <Rig azimuth={azimuth} />
      </Canvas>
      <p className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-1 text-sm font-semibold text-white">
        {screenText}
      </p>
    </div>
  );
}
