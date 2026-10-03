"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Tier } from "./capability";
import type { GuideState } from "./doctorMotion";
import GuideAvatar from "./GuideAvatar";
import Room3D from "./Room3D";
import type { RoomStyle } from "./rooms";
import type { LipSync } from "./voice";

// The consultation stage: the patient's view across the desk. The camera is
// fixed at the patient's eye level, about 1.2 m from the guide. No orbiting,
// no game controls.

export type StageProps = {
  state: React.RefObject<GuideState>;
  lips: React.RefObject<LipSync | null>;
  reducedMotion: boolean;
  paused: boolean;
  tier: Exclude<Tier, "lite">;
  room: RoomStyle;
  onAvatarError: (e: unknown) => void;
  onAvatarReady?: () => void;
  onSlow?: () => void;
};

// Bump when the model is rebuilt (scripts/avatar) so phones fetch the new one.
export const MODEL_VERSION = 1;
export const MODEL_URL: Record<Exclude<Tier, "lite">, string> = {
  full: `/models/guide-high.glb?v=${MODEL_VERSION}`,
  standard: `/models/guide-balanced.glb?v=${MODEL_VERSION}`,
};

const DESK_Y = 0.78;

// Patient eye level (seated) and framing that keeps the guide's head and hands
// in view on both wide and tall screens.
function Camera() {
  const { camera, size } = useThree();
  useEffect(() => {
    // three.js cameras are mutable objects owned by the renderer.
    /* eslint-disable react-hooks/immutability */
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    cam.position.set(0, 1.2, 0.32);
    // Wide screens: fixed vertical view. Tall phones: widen so hands stay in view.
    cam.fov = aspect >= 1.2 ? 33 : Math.min(60, 33 * (1.2 / aspect) ** 0.75);
    cam.near = 0.05;
    cam.far = 20;
    cam.updateProjectionMatrix();
    cam.lookAt(0, 1.08, -0.95);
    /* eslint-enable react-hooks/immutability */
  }, [camera, size]);
  return null;
}

// Watches the frame rate once the guide is shown. Below 20 fps for 4 seconds,
// the stage steps down a quality level (high → balanced → 2D).
function FpsGuard({ active, onSlow }: { active: boolean; onSlow?: () => void }) {
  const acc = useRef({ frames: 0, time: 0, fired: false });
  useFrame((_, dt) => {
    const a = acc.current;
    if (!active || a.fired || !onSlow) return;
    a.frames += 1;
    a.time += Math.min(dt, 0.5);
    if (a.time >= 4) {
      if (a.frames / a.time < 20) {
        a.fired = true;
        onSlow();
      }
      a.frames = 0;
      a.time = 0;
    }
  });
  return null;
}

export default function Doctor3D(props: StageProps) {
  const [ready, setReady] = useState(false);
  const full = props.tier === "full";
  return (
    <Canvas
      dpr={full ? [1, 2] : [1, 1.25]}
      shadows={full}
      frameloop={props.paused ? "never" : "always"}
      gl={{ antialias: full, powerPreference: full ? "high-performance" : "low-power" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          props.onAvatarError(new Error("WebGL context lost"));
        });
      }}
    >
      <Camera />
      <color attach="background" args={[props.room.wall]} />
      {/* Clinic lighting: ceiling panel, window daylight, soft fill */}
      <hemisphereLight args={["#ffffff", "#e6ddd0", 1.0]} />
      <directionalLight
        position={[0.4, 2.7, 0.6]}
        intensity={1.7}
        color="#fffaf2"
        castShadow={full}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-camera-left={-1.5}
        shadow-camera-right={1.5}
        shadow-camera-top={1.5}
        shadow-camera-bottom={-1.5}
      />
      <directionalLight position={[-2.5, 1.7, -0.6]} intensity={0.75} color="#e8f3ff" />
      <directionalLight position={[0.5, 1.4, 1.6]} intensity={0.55} color="#fff1e6" />
      {/* Soft front fill so her face is readable (like light from the patient's side) */}
      <pointLight position={[0.55, 1.75, -0.2]} intensity={1.4} distance={2.0} decay={1.2} color="#fff0e6" />
      <FpsGuard active={ready && !props.paused} onSlow={props.onSlow} />
      <Room3D room={props.room} tier={props.tier} />
      <group position={[0, 0, -1.05]}>
        <GuideAvatar
          url={MODEL_URL[props.tier]}
          state={props.state}
          lips={props.lips}
          reducedMotion={props.reducedMotion}
          seatY={0.5}
          deskY={DESK_Y}
          handZ={0.42}
          onReady={() => {
            setReady(true);
            props.onAvatarReady?.();
          }}
          onError={props.onAvatarError}
        />
      </group>
    </Canvas>
  );
}
