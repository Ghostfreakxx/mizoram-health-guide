"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  activity?: React.RefObject<number>;
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
  frame?: Frame;
};


// The part of the canvas not covered by the consultation panels (pixels).
export type Frame = { l: number; r: number; t: number; b: number };
const NO_FRAME: Frame = { l: 0, r: 0, t: 0, b: 0 };

// The patient's seat: framed so the doctor's head, shoulders, upper body and
// hands on the desk fill the FREE part of the screen (between the panels).
// The room stays full-bleed behind the panels; an off-centre projection
// (view offset) moves the doctor into the free area instead of shrinking the
// picture.
const SPAN_V = 0.6; // metres: just above her head to mid-chest (the face must read)
const SPAN_H = 0.66; // never narrower than her shoulders
function Camera({ frame }: { frame: Frame }) {
  const { camera, size } = useThree();
  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- three.js cameras are mutable objects owned by the renderer */
    const cam = camera as THREE.PerspectiveCamera;
    const W = Math.max(1, size.width);
    const H = Math.max(1, size.height);
    const fw = Math.max(120, W - frame.l - frame.r);
    const fh = Math.max(120, H - frame.t - frame.b);
    cam.position.set(...LAYOUT.camera.position);
    const D = Math.abs(LAYOUT.camera.position[2] - LAYOUT.camera.target[2]);
    // Vertical field of the free area, widened if her shoulders would not fit.
    let half = Math.atan(SPAN_V / 2 / D);
    if (Math.tan(half) * (fw / fh) * 2 * D < SPAN_H) half = Math.atan(SPAN_H / 2 / D / (fw / fh));
    // The whole canvas sees proportionally more.
    cam.fov = Math.min(90, (2 * Math.atan(Math.tan(half) * (H / fh)) * 180) / Math.PI);
    cam.near = 0.05;
    cam.far = 20;
    cam.lookAt(...LAYOUT.camera.target);
    const cx = frame.l + fw / 2;
    const cy = frame.t + fh / 2;
    if (frame.l || frame.r || frame.t || frame.b) cam.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
    /* eslint-enable react-hooks/immutability */
  }, [camera, size, frame.l, frame.r, frame.t, frame.b]);
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
  // The renderer deliberately drops its context when this stage is taken
  // down (a quality change remounts it). That is not a failure: only a loss
  // while the stage is live means the graphics chip gave up.
  const alive = useRef(true);
  const onLost = useRef(props.onAvatarError);
  useEffect(() => {
    onLost.current = props.onAvatarError;
  });
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
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
          if (alive.current) onLost.current(new Error("WebGL context lost"));
        });
      }}
    >
      <Camera frame={props.frame ?? NO_FRAME} />
      <color attach="background" args={[props.room.wall]} />
      {!low && <Environment intensity={high ? 0.32 : 0.26} />}
      {/* Portrait lighting for a consultation: a soft key from the ceiling
          panel at front-left, low enough to model the face and put a
          catchlight in the eyes; a cooler fill from the patient's side; a
          warm rim from the window behind; little flat ambient (flat ambient
          made the face look waxy). */}
      <hemisphereLight args={["#fffaf3", "#d9cfc2", low ? 1.0 : 0.34]} />
      <directionalLight
        position={[-1.7, 1.9, 0.7]}
        intensity={2.7}
        color="#fff3e6"
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
      <directionalLight position={[1.4, 1.3, 1.4]} intensity={0.42} color="#eef3ff" />
      {!low && <directionalLight position={[0.8, 2.2, -2.2]} intensity={1.0} color="#fff1df" />}
      <Room3D room={props.room} tier={props.tier} chart={props.chart} />
      <group position={[0, 0, LAYOUT.doctorZ]}>
        <DoctorAvatar
          url={MODEL_URL[props.tier]}
          state={props.state}
          since={props.since}
          lips={props.lips}
          activity={props.activity}
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
