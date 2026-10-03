"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Tier } from "./capability";
import DoctorAvatar, { type Attire } from "./doctor/DoctorAvatar";
import { LAYOUT } from "./doctor/scene";
import { MODEL_URL } from "./models";
import type { LipSync } from "./doctor/lipsync";
import type { DoctorState } from "./doctor/state";
import Room3D, { type ChartLine } from "./Room3D";
import type { RoomStyle } from "./rooms";

// The consultation stage: the patient's own view across the desk. The camera
// is fixed at seated eye level, about 1.2 m from the doctor, framing her from
// the chest up with her hands on the desk. No orbiting, no game controls.

export type StageProps = {
  state: React.RefObject<DoctorState>;
  since: React.RefObject<number>;
  lips: React.RefObject<LipSync | null>;
  reducedMotion: boolean;
  paused: boolean;
  tier: Exclude<Tier, "fallback">;
  room: RoomStyle;
  attire: Attire;
  chart: ChartLine[];
  onAvatarError: (e: unknown) => void;
  onAvatarReady?: () => void;
  onProgress?: (fraction: number) => void;
  onSlow?: () => void;
};


function Camera() {
  const { camera, size } = useThree();
  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- three.js cameras are mutable objects owned by the renderer */
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    cam.position.set(...LAYOUT.camera.position);
    // A natural ~35° view on wide screens; on tall phones widen just enough to
    // keep her hands on the desk in frame.
    cam.fov = aspect >= 1.2 ? 31 : Math.min(54, 31 * (1.2 / aspect) ** 0.75);
    cam.near = 0.05;
    cam.far = 20;
    cam.updateProjectionMatrix();
    cam.lookAt(...LAYOUT.camera.target);
    /* eslint-enable react-hooks/immutability */
  }, [camera, size]);
  return null;
}

// Soft, even reflections from a neutral room (skin, eyes, desk) — cheap and
// far more natural than lights alone.
function Environment({ intensity }: { intensity: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    /* eslint-disable react-hooks/immutability -- the scene is owned by the renderer */
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      /* eslint-enable react-hooks/immutability */
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

// Watches the frame rate once the doctor is shown; below 22 fps for 4 s the
// stage steps down a quality level.
function FpsGuard({ active, onSlow }: { active: boolean; onSlow?: () => void }) {
  const acc = useRef({ frames: 0, time: 0, fired: false });
  useFrame((_, dt) => {
    const a = acc.current;
    if (!active || a.fired || !onSlow) return;
    a.frames += 1;
    a.time += Math.min(dt, 0.5);
    if (a.time >= 4) {
      if (a.frames / a.time < 22) {
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
  const high = props.tier === "high";
  const low = props.tier === "low";
  return (
    <Canvas
      dpr={high ? [1, 2] : low ? 1 : [1, 1.4]}
      shadows={high ? "soft" : false}
      frameloop={props.paused ? "never" : "always"}
      gl={{ antialias: !low, powerPreference: high ? "high-performance" : "low-power" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          props.onAvatarError(new Error("WebGL context lost"));
        });
      }}
    >
      <Camera />
      <color attach="background" args={[props.room.wall]} />
      {!low && <Environment intensity={high ? 0.45 : 0.35} />}
      {/* Clinic lighting: a soft key from the ceiling panel (front-left), a
          gentle fill from the patient's side, window light, and a faint rim
          so she separates from the chair. */}
      <hemisphereLight args={["#fffaf3", "#e3d9cc", low ? 1.2 : 0.75]} />
      <directionalLight
        position={[-0.9, 2.6, 0.9]}
        intensity={1.9}
        color="#fff6ea"
        castShadow={high}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={4}
        shadow-camera-left={-1.4}
        shadow-camera-right={1.4}
        shadow-camera-top={1.6}
        shadow-camera-bottom={-0.6}
      />
      <directionalLight position={[1.2, 1.3, 1.4]} intensity={0.55} color="#f2f6ff" />
      {!low && <directionalLight position={[0.6, 2.0, -2.6]} intensity={0.7} color="#ffffff" />}
      <Room3D room={props.room} tier={props.tier} chart={props.chart} />
      <group position={[0, 0, LAYOUT.doctorZ]}>
        <DoctorAvatar
          url={MODEL_URL[props.tier]}
          state={props.state}
          since={props.since}
          lips={props.lips}
          reducedMotion={props.reducedMotion}
          detail={high}
          attire={props.attire}
          onProgress={props.onProgress}
          onReady={() => {
            setReady(true);
            props.onAvatarReady?.();
          }}
          onError={props.onAvatarError}
        />
      </group>
      <FpsGuard active={ready && !props.paused} onSlow={props.onSlow} />
    </Canvas>
  );
}
