"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Mood } from "../../lib/consultation";
import type { Tier } from "./capability";
import { type Activity, poseAt } from "./doctorMotion";
import type { RoomStyle } from "./rooms";

// A consulting room seen from the patient's chair, with the virtual guide
// sitting across the desk. Everything is built from code (no model files), so
// the whole scene is a few hundred kilobytes of JavaScript, shared by every
// department. A rigged, scanned human model can replace <Guide /> later
// without changing anything else (see docs/VIRTUAL_CONSULTATION.md).

export type StageProps = {
  activity: Activity;
  mood: Mood;
  voiceLevel: React.RefObject<number>;
  reducedMotion: boolean;
  paused: boolean;
  tier: Exclude<Tier, "lite">;
  room: RoomStyle;
};

type V3 = [number, number, number];

const SKIN = "#c58f6c";
const SKIN_SHADE = "#b37e5d";
const HAIR = "#17110e";
const COAT = "#f7f8fa";
const SCRUBS = "#1f5f6b";

function textTexture(lines: { text: string; size: number; weight?: string; color: string }[], w: number, h: number, bg: string) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.textAlign = "center";
  g.textBaseline = "middle";
  const total = lines.reduce((a, l) => a + l.size * 1.35, 0);
  let y = (h - total) / 2;
  for (const l of lines) {
    g.font = `${l.weight ?? "600"} ${l.size}px system-ui, sans-serif`;
    g.fillStyle = l.color;
    y += (l.size * 1.35) / 2;
    g.fillText(l.text, w / 2, y);
    y += (l.size * 1.35) / 2;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Box({ size, position, color, rotation, emissive }: { size: V3; position: V3; color: string; rotation?: V3; emissive?: string }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.75} emissive={emissive ?? "#000000"} emissiveIntensity={emissive ? 0.6 : 0} />
    </mesh>
  );
}

// ---------------- The virtual guide ----------------

function Eye({ x, seg }: { x: number; seg: number }) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    // Keep eye contact with the patient's viewpoint (the camera).
    if (!ref.current) return;
    target.copy(camera.position);
    ref.current.lookAt(target);
  });
  return (
    <group position={[x, 0.012, 0.074]}>
      <group ref={ref}>
        <mesh>
          <sphereGeometry args={[0.0132, seg, seg]} />
          <meshPhysicalMaterial color="#f3efe9" roughness={0.25} clearcoat={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.0094]}>
          <sphereGeometry args={[0.0066, seg, seg]} />
          <meshPhysicalMaterial color="#3a2417" roughness={0.3} clearcoat={1} />
        </mesh>
        <mesh position={[0, 0, 0.0127]}>
          <sphereGeometry args={[0.0028, 12, 12]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
        <mesh position={[0.002, 0.0025, 0.0142]}>
          <sphereGeometry args={[0.0011, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    </group>
  );
}

function Guide({ activity, mood, voiceLevel, reducedMotion, tier }: Omit<StageProps, "room" | "paused">) {
  const seg = tier === "full" ? 32 : 20;
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lidL = useRef<THREE.Mesh>(null);
  const lidR = useRef<THREE.Mesh>(null);
  const browL = useRef<THREE.Mesh>(null);
  const browR = useRef<THREE.Mesh>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const smile = useRef<THREE.Mesh>(null);
  const foreR = useRef<THREE.Group>(null);
  const foreL = useRef<THREE.Group>(null);
  const handR = useRef<THREE.Group>(null);

  const badge = useMemo(
    () => textTexture([{ text: "VIRTUAL GUIDE", size: 30, weight: "800", color: "#1e3a8a" }, { text: "Not a doctor", size: 22, color: "#475569" }], 256, 110, "#ffffff"),
    [],
  );
  const skin = useMemo(() => new THREE.MeshPhysicalMaterial({ color: SKIN, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color("#ffd9c2"), sheenRoughness: 0.6 }), []);
  const lid = useMemo(() => new THREE.MeshStandardMaterial({ color: SKIN_SHADE, roughness: 0.6 }), []);

  useFrame(({ clock }) => {
    const p = poseAt(clock.elapsedTime, activity, mood, { reducedMotion, voiceLevel: voiceLevel.current ?? 0 });
    if (body.current) {
      body.current.position.y = p.breath * 0.003;
      body.current.rotation.x = p.lean * 0.06;
    }
    if (head.current) head.current.rotation.set(p.headPitch, p.headYaw, p.headRoll);
    const lidAngle = THREE.MathUtils.lerp(0.42, 1.62, p.blink);
    if (lidL.current) lidL.current.rotation.x = lidAngle;
    if (lidR.current) lidR.current.rotation.x = lidAngle;
    const by = 0.04 + p.brow * 0.004;
    if (browL.current) {
      browL.current.position.y = by;
      browL.current.rotation.z = -0.08 - p.brow * 0.12;
    }
    if (browR.current) {
      browR.current.position.y = by;
      browR.current.rotation.z = 0.08 + p.brow * 0.12;
    }
    if (mouth.current) mouth.current.scale.y = 0.05 + p.mouth * 0.6;
    if (smile.current) smile.current.scale.y = 0.18 + p.smile * 0.9;
    if (foreR.current) foreR.current.rotation.x = -0.15 - p.gesture * 0.55;
    if (handR.current) handR.current.rotation.z = p.gesture * 0.4;
    if (foreL.current) foreL.current.rotation.x = -0.15 - p.gesture * 0.15;
  });

  return (
    <group position={[0, 0, -0.95]}>
      <group ref={body}>
        {/* Torso in a white coat over scrubs */}
        <mesh position={[0, 0.55, 0]} scale={[1, 1, 0.58]}>
          <latheGeometry
            args={[
              [
                new THREE.Vector2(0.0, 0),
                new THREE.Vector2(0.17, 0),
                new THREE.Vector2(0.18, 0.25),
                new THREE.Vector2(0.2, 0.45),
                new THREE.Vector2(0.205, 0.53),
                new THREE.Vector2(0.17, 0.6),
                new THREE.Vector2(0.07, 0.64),
                new THREE.Vector2(0.0, 0.645),
              ],
              seg,
            ]}
          />
          <meshStandardMaterial color={COAT} roughness={0.85} />
        </mesh>
        {/* Scrubs V-neck */}
        <mesh position={[0, 1.13, 0.098]} rotation={[-0.25, 0, Math.PI]}>
          <circleGeometry args={[0.07, 3]} />
          <meshStandardMaterial color={SCRUBS} roughness={0.8} />
        </mesh>
        {/* Coat lapels */}
        <Box size={[0.03, 0.2, 0.01]} position={[-0.055, 1.06, 0.105]} rotation={[-0.2, 0, -0.35]} color="#eceff3" />
        <Box size={[0.03, 0.2, 0.01]} position={[0.055, 1.06, 0.105]} rotation={[-0.2, 0, 0.35]} color="#eceff3" />
        {/* Name badge */}
        <mesh position={[0.1, 1.0, 0.112]} rotation={[-0.15, 0.1, 0]}>
          <planeGeometry args={[0.075, 0.032]} />
          <meshBasicMaterial map={badge} toneMapped={false} />
        </mesh>
        {/* Stethoscope */}
        <mesh position={[0, 1.15, 0.03]} rotation={[1.35, 0, 0]}>
          <torusGeometry args={[0.085, 0.0055, 8, seg, Math.PI * 1.2]} />
          <meshStandardMaterial color="#1f2937" roughness={0.4} />
        </mesh>
        <mesh position={[-0.07, 1.04, 0.1]} rotation={[0.15, 0, 0.1]}>
          <cylinderGeometry args={[0.005, 0.005, 0.16, 8]} />
          <meshStandardMaterial color="#1f2937" roughness={0.4} />
        </mesh>
        <mesh position={[-0.078, 0.955, 0.112]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.008, 20]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* Arms: shoulders → elbows resting forward → hands on the desk */}
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 0.2, 1.06, 0]}>
            <mesh position={[0, -0.12, 0.03]} rotation={[0.25, 0, side * 0.12]}>
              <capsuleGeometry args={[0.045, 0.2, 6, seg / 2]} />
              <meshStandardMaterial color={COAT} roughness={0.85} />
            </mesh>
            <group ref={side === 1 ? foreR : foreL} position={[side * 0.015, -0.24, 0.07]}>
              <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.04, 0.19, 6, seg / 2]} />
                <meshStandardMaterial color={COAT} roughness={0.85} />
              </mesh>
              <group ref={side === 1 ? handR : undefined} position={[-side * 0.01, 0, 0.27]}>
                <mesh scale={[1, 0.5, 1.35]} material={skin}>
                  <sphereGeometry args={[0.038, seg, seg]} />
                </mesh>
              </group>
            </group>
          </group>
        ))}

        {/* Neck and head */}
        <mesh position={[0, 1.2, 0]} material={skin}>
          <cylinderGeometry args={[0.042, 0.048, 0.1, seg]} />
        </mesh>
        <group ref={head} position={[0, 1.335, 0.005]} scale={1.08}>
          {/* Skull and face */}
          <mesh scale={[0.84, 1.1, 0.95]} material={skin}>
            <sphereGeometry args={[0.1, seg, seg]} />
          </mesh>
          <mesh position={[0, -0.05, 0.012]} scale={[0.8, 0.8, 0.86]} material={skin}>
            <sphereGeometry args={[0.075, seg, seg]} />
          </mesh>
          {/* Ears */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.084, 0.0, -0.005]} scale={[0.35, 1, 0.6]} material={skin}>
              <sphereGeometry args={[0.022, 12, 12]} />
            </mesh>
          ))}
          {/* Hair, tied back */}
          <mesh position={[0, 0.02, -0.012]} rotation={[-0.3, 0, 0]} scale={[0.92, 1.08, 0.99]}>
            <sphereGeometry args={[0.104, seg, seg, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={HAIR} roughness={0.55} />
          </mesh>
          <mesh position={[0, -0.005, -0.045]} scale={[0.9, 1.0, 0.86]}>
            <sphereGeometry args={[0.1, seg, seg, Math.PI * 0.62, Math.PI * 0.76, 0.2, Math.PI * 0.55]} />
            <meshStandardMaterial color={HAIR} roughness={0.55} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.02, -0.11]}>
            <sphereGeometry args={[0.04, seg, seg]} />
            <meshStandardMaterial color={HAIR} roughness={0.55} />
          </mesh>
          {/* Eyes, eyelids, brows */}
          <Eye x={-0.032} seg={seg} />
          <Eye x={0.032} seg={seg} />
          {[-1, 1].map((s) => (
            <mesh key={s} ref={s === -1 ? lidL : lidR} position={[s * 0.032, 0.012, 0.074]} material={lid}>
              <sphereGeometry args={[0.0143, seg, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
          ))}
          <mesh ref={browL} position={[-0.033, 0.04, 0.083]}>
            <boxGeometry args={[0.03, 0.0045, 0.006]} />
            <meshStandardMaterial color={HAIR} />
          </mesh>
          <mesh ref={browR} position={[0.033, 0.04, 0.083]}>
            <boxGeometry args={[0.03, 0.0045, 0.006]} />
            <meshStandardMaterial color={HAIR} />
          </mesh>
          {/* Nose */}
          <mesh position={[0, -0.012, 0.09]} scale={[0.75, 1.4, 1]} material={skin}>
            <sphereGeometry args={[0.012, 16, 16]} />
          </mesh>
          <mesh position={[0, -0.026, 0.094]} material={skin}>
            <sphereGeometry args={[0.0105, 16, 16]} />
          </mesh>
          {/* Mouth: lips, a gentle smile line, and an opening for speech */}
          <mesh position={[0, -0.056, 0.079]} scale={[1, 0.3, 0.45]}>
            <sphereGeometry args={[0.02, 20, 12]} />
            <meshStandardMaterial color="#9c5a52" roughness={0.45} />
          </mesh>
          <mesh ref={smile} position={[0, -0.052, 0.0855]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.017, 0.0016, 6, 24, Math.PI]} />
            <meshStandardMaterial color="#6f3b35" />
          </mesh>
          <mesh ref={mouth} position={[0, -0.057, 0.086]} scale={[1, 0.05, 0.3]}>
            <sphereGeometry args={[0.013, 16, 10]} />
            <meshBasicMaterial color="#2a0f0f" />
          </mesh>
        </group>
      </group>
      {/* Chair back behind the guide */}
      <Box size={[0.5, 0.7, 0.06]} position={[0, 1.0, -0.17]} color="#334155" />
    </group>
  );
}

// ---------------- The room ----------------

function Room({ room, tier }: { room: RoomStyle; tier: StageProps["tier"] }) {
  const sign = useMemo(
    () =>
      textTexture(
        [
          { text: "MIZORAM AI HOSPITAL", size: 34, weight: "800", color: "#ffffff" },
          { text: room.title, size: 46, weight: "700", color: "#fde68a" },
        ],
        900,
        200,
        room.accent,
      ),
    [room],
  );
  const screen = useMemo(
    () => textTexture([{ text: "AI Hospital", size: 40, weight: "800", color: "#e0f2fe" }, { text: "Patient guide", size: 28, color: "#93c5fd" }], 320, 200, "#0f2a4a"),
    [],
  );
  const full = tier === "full";

  return (
    <group>
      {/* Floor, walls, ceiling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.6]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color={room.floor} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.5, -1.95]}>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial color={room.wall} roughness={0.95} />
      </mesh>
      <mesh position={[-2.2, 1.5, -0.6]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial color={room.wall} roughness={0.95} />
      </mesh>
      <mesh position={[2.2, 1.5, -0.6]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial color={room.wall} roughness={0.95} />
      </mesh>
      <Box size={[6, 0.12, 0.02]} position={[0, 0.06, -1.94]} color="#94a3b8" />
      <Box size={[1.2, 0.02, 0.5]} position={[0, 2.6, -0.9]} color="#ffffff" emissive="#ffffff" />

      {/* Signage */}
      <mesh position={[-0.75, 1.82, -1.93]}>
        <planeGeometry args={[0.95, 0.21]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>

      {/* Window with blinds (left) */}
      <mesh position={[-2.19, 1.6, -1.0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.0, 0.9]} />
        <meshStandardMaterial color="#cfe8f7" emissive="#cfe8f7" emissiveIntensity={0.5} />
      </mesh>
      {full &&
        Array.from({ length: 9 }, (_, i) => (
          <Box key={i} size={[0.01, 0.025, 1.0]} position={[-2.17, 1.2 + i * 0.1, -1.0]} rotation={[0.4, 0, 0]} color="#f1f5f9" />
        ))}

      {/* Medicine cabinet (right) */}
      <Box size={[0.8, 1.5, 0.35]} position={[1.55, 0.95, -1.75]} color="#f8fafc" />
      <Box size={[0.74, 0.02, 0.3]} position={[1.55, 1.2, -1.72]} color="#cbd5e1" />
      <Box size={[0.74, 0.02, 0.3]} position={[1.55, 1.5, -1.72]} color="#cbd5e1" />
      {full &&
        [
          [1.3, 1.27, "#93c5fd"],
          [1.45, 1.27, "#fca5a5"],
          [1.62, 1.27, "#bbf7d0"],
          [1.38, 1.57, "#fde68a"],
          [1.6, 1.57, "#c4b5fd"],
        ].map(([x, y, c]) => <Box key={`${x}-${y}`} size={[0.1, 0.12, 0.12]} position={[x as number, y as number, -1.7]} color={c as string} />)}
      <mesh position={[1.55, 1.38, -1.57]}>
        <planeGeometry args={[0.76, 0.72]} />
        <meshPhysicalMaterial color="#dbeafe" transparent opacity={0.25} roughness={0.05} />
      </mesh>

      {/* Department props */}
      {room.props.includes("x-ray-viewer") && (
        <group position={[0.62, 1.62, -1.93]}>
          <Box size={[0.55, 0.42, 0.04]} position={[0, 0, 0]} color="#e2e8f0" />
          <mesh position={[0, 0, 0.022]}>
            <planeGeometry args={[0.48, 0.35]} />
            <meshStandardMaterial color="#f8fafc" emissive="#f1f5f9" emissiveIntensity={0.7} />
          </mesh>
        </group>
      )}
      {room.props.includes("plant") && full && (
        <group position={[-1.7, 0, -1.6]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.15, 0.12, 0.4, 16]} />
            <meshStandardMaterial color="#e7e5e4" />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[Math.sin(i * 1.3) * 0.12, 0.6 + (i % 2) * 0.12, Math.cos(i * 1.3) * 0.1]}>
              <sphereGeometry args={[0.16, 12, 12]} />
              <meshStandardMaterial color={i % 2 ? "#3f7d4e" : "#4f9460"} roughness={0.8} />
            </mesh>
          ))}
        </group>
      )}

      {/* Desk between the patient and the guide */}
      <Box size={[1.5, 0.05, 0.75]} position={[0, 0.76, -0.55]} color="#c9a27a" />
      <Box size={[1.46, 0.7, 0.03]} position={[0, 0.4, -0.19]} color="#b58d66" />
      {/* Computer monitor, turned towards the guide */}
      <group position={[-0.62, 0.79, -0.88]} rotation={[0, 0.7, 0]} scale={0.8}>
        <Box size={[0.05, 0.14, 0.05]} position={[0, 0.07, 0]} color="#334155" />
        <Box size={[0.48, 0.3, 0.025]} position={[0, 0.27, 0]} color="#1e293b" />
        <mesh position={[0, 0.27, -0.014]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.44, 0.27]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
      </group>
      {/* Blood pressure monitor */}
      {room.props.includes("bp-monitor") && (
        <group position={[0.5, 0.785, -0.62]} rotation={[0, -0.4, 0]}>
          <Box size={[0.16, 0.06, 0.12]} position={[0, 0.03, 0]} color="#f1f5f9" />
          <mesh position={[0, 0.062, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.09, 0.06]} />
            <meshStandardMaterial color="#0f766e" emissive="#14b8a6" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0.15, 0.02, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.05, 0.012, 8, 20]} />
            <meshStandardMaterial color="#1e3a8a" roughness={0.7} />
          </mesh>
        </group>
      )}
      {/* Notepad and pen */}
      <Box size={[0.2, 0.006, 0.27]} position={[0.12, 0.787, -0.42]} rotation={[0, 0.15, 0]} color="#ffffff" />
      <Box size={[0.008, 0.008, 0.14]} position={[0.25, 0.793, -0.42]} rotation={[0, 0.3, 0]} color="#1e3a8a" />
    </group>
  );
}

function Rig() {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(0, 1.17, -0.95), []);
  useFrame(() => camera.lookAt(look));
  return null;
}

export default function Doctor3D(props: StageProps) {
  const full = props.tier === "full";
  return (
    <Canvas
      dpr={full ? [1, 2] : [1, 1.25]}
      frameloop={props.paused ? "never" : "always"}
      camera={{ fov: 30, position: [0, 1.22, 0.45], near: 0.05, far: 20 }}
      gl={{ antialias: full, powerPreference: full ? "high-performance" : "low-power" }}
    >
      <color attach="background" args={[props.room.wall]} />
      <hemisphereLight args={["#ffffff", "#d9cbb8", 1.15]} />
      <directionalLight position={[-1.0, 2.4, 1.8]} intensity={2.0} color="#fff4e8" />
      <directionalLight position={[1.4, 1.5, 1.2]} intensity={0.8} color="#e6f0ff" />
      <directionalLight position={[0, 2.2, -2.5]} intensity={0.9} color="#ffffff" />
      <pointLight position={[0, 1.5, 0.2]} intensity={0.6} distance={2.5} color="#ffe9dc" />
      <Room room={props.room} tier={props.tier} />
      <Guide activity={props.activity} mood={props.mood} voiceLevel={props.voiceLevel} reducedMotion={props.reducedMotion} tier={props.tier} />
      <Rig />
    </Canvas>
  );
}
