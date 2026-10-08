"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { ArmPose } from "./body";
import type { GazeTarget } from "./gaze";
import { LAYOUT } from "./scene";
import type { LipSync } from "./lipsync";
import { performAt } from "./perform";
import type { DoctorState } from "./state";

// The virtual doctor (MakeHuman CC0 model, scripts/avatar). One skeleton and
// one animation system for every department; attire varies by department.
//
// Bones have no rest rotation, so every rotation here is an ordinary rotation
// in the parent's space. Poses are solved each frame from the shared
// performance planner (perform.ts), then smoothed so nothing ever snaps.

export type Attire = { coat: boolean; coatColor?: string; scrubsColor?: string };

export type DoctorAvatarProps = {
  url: string;
  state: React.RefObject<DoctorState>;
  since: React.RefObject<number>; // when the state started (performance.now()/1000)
  lips: React.RefObject<LipSync | null>;
  activity?: React.RefObject<number>; // when the patient last typed or spoke (performance.now()/1000)
  reducedMotion: boolean;
  detail: boolean; // skin micro-detail shader (high quality only)
  attire: Attire;
  onReady?: () => void;
  onError?: (e: unknown) => void;
  onProgress?: (fraction: number) => void;
};

type Rig = {
  root: THREE.Object3D;
  bones: Record<string, THREE.Bone>;
  meshes: THREE.SkinnedMesh[];
  morph: Record<string, number>;
  rest: Record<string, THREE.Vector3>;
  materials: Record<string, THREE.Material>;
};

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpQ2 = new THREE.Quaternion();
const tmpE = new THREE.Euler();

// Rotates `bone` so its child points at `target` (world space).
// Uses scratch objects: this runs for every arm bone, every frame.
const aimParent = new THREE.Quaternion();
const aimInv = new THREE.Quaternion();
const aimQ = new THREE.Quaternion();
const aimFrom = new THREE.Vector3();
const aimTo = new THREE.Vector3();
const aimPos = new THREE.Vector3();
function aim(bone: THREE.Bone, childLocal: THREE.Vector3, target: THREE.Vector3, twist = 0) {
  bone.quaternion.identity();
  bone.updateWorldMatrix(true, false);
  if (bone.parent) bone.parent.getWorldQuaternion(aimParent);
  else aimParent.identity();
  aimFrom.copy(childLocal).normalize().applyQuaternion(aimParent);
  aimTo.copy(target).sub(bone.getWorldPosition(aimPos)).normalize();
  aimQ.setFromUnitVectors(aimFrom, aimTo);
  aimInv.copy(aimParent).invert();
  bone.quaternion.copy(aimInv.multiply(aimQ).multiply(aimParent));
  if (twist) bone.quaternion.multiply(aimQ.setFromAxisAngle(aimFrom.copy(childLocal).normalize(), twist));
  bone.updateWorldMatrix(false, true);
}

// Applies a world-space rotation to a bone (in its parent's frame).
const rwLocal = new THREE.Quaternion();
function rotateWorld(bone: THREE.Bone, worldQ: THREE.Quaternion) {
  bone.updateWorldMatrix(true, false);
  const parentQ = bone.parent!.getWorldQuaternion(tmpQ2);
  rwLocal.copy(parentQ).invert().multiply(worldQ).multiply(parentQ);
  bone.quaternion.premultiply(rwLocal);
}

// ---------------- Materials ----------------

// Skin micro-detail: fine pores and gentle unevenness as a procedural bump
// and roughness variation, so skin is never waxy or perfectly uniform.
function addSkinDetail(mat: THREE.MeshPhysicalMaterial) {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSkinPos;")
      .replace("#include <skinning_vertex>", "#include <skinning_vertex>\nvSkinPos = transformed;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vSkinPos;
float skHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float skNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(skHash(i), skHash(i+vec3(1,0,0)), f.x), mix(skHash(i+vec3(0,1,0)), skHash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(skHash(i+vec3(0,0,1)), skHash(i+vec3(1,0,1)), f.x), mix(skHash(i+vec3(0,1,1)), skHash(i+vec3(1,1,1)), f.x), f.y), f.z); }`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
float skBroad = mix(0.5, skNoise(vSkinPos * 60.0), 1.0 - smoothstep(0.15, 0.45, length(fwidth(vSkinPos)) * 60.0));
roughnessFactor = clamp(roughnessFactor * (0.9 + 0.22 * skBroad), 0.3, 1.0);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
{
  // Pores and fine texture, faded out wherever they would be smaller than a
  // pixel (otherwise they alias into speckle at a normal viewing distance).
  float fp = length(fwidth(vSkinPos));
  float aFine = 1.0 - smoothstep(0.15, 0.45, fp * 900.0);
  float h = skNoise(vSkinPos * 900.0) * aFine;
  vec2 dHdxy = vec2(dFdx(h), dFdy(h)) * 0.0012;
  vec3 vSigmaX = dFdx(-vViewPosition);
  vec3 vSigmaY = dFdy(-vViewPosition);
  vec3 R1 = cross(vSigmaY, normal);
  vec3 R2 = cross(normal, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDirection;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  normal = normalize(abs(fDet) * normal - vGrad);
}`,
      );
  };
  mat.customProgramCacheKey = () => "skin-detail-v3";
}

function makeMaterial(name: string, old: THREE.MeshStandardMaterial, detail: boolean, attire: Attire): THREE.Material {
  switch (name) {
    case "skin": {
      const m = new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.6,
        specularIntensity: 0.45,
        specularColor: new THREE.Color("#ffe7dc"),
        sheen: 0.15,
        sheenColor: new THREE.Color("#ffcfb8"),
        sheenRoughness: 0.6,
        clearcoat: 0.03,
        clearcoatRoughness: 0.55,
        envMapIntensity: 0.5, // room reflections otherwise wash out the skin tone
      });
      if (detail) addSkinDetail(m);
      return m;
    }
    case "eye":
      // Wet, slightly glossy: the catchlight is what makes eyes read as alive.
      return new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.22, specularIntensity: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.08 });
    case "cornea":
      return new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.12,
        roughness: 0.02,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        depthWrite: false,
      });
    case "hair":
      // Low, dark sheen: a strong sheen lights the thin hairline edge at grazing
      // angles and reads as a pale "cap" rim around the forehead.
      // Black hair shows its shape through a soft, broad highlight (without it
      // the head reads as a dark cap). Strand texture breaks the surface up.
      // The strand texture carries alpha and the hairline fades the vertex
      // alpha: only the edge is cut into fine strands (alphaTest). No
      // alpha-to-coverage: it made the whole crown partly see-through, so
      // the scalp showed as silver specks.
      return new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        map: old.map,
        alphaTest: 0.5,
        roughness: 0.5,
        specularIntensity: 0.4,
        specularColor: new THREE.Color("#d9c7b8"),
        sheen: 0.55,
        sheenColor: new THREE.Color("#6e5a4c"),
        sheenRoughness: 0.35,
        envMapIntensity: 0.8,
      });
    case "coat": {
      // Cotton drill: matte, a touch below pure white so folds and shading
      // read (pure white with a strong sheen glowed like plastic).
      const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, color: new THREE.Color("#e9ebee"), roughness: 0.94, sheen: 0.22, sheenColor: new THREE.Color("#f4f6f8"), sheenRoughness: 0.9, envMapIntensity: 0.6 });
      if (attire.coatColor) m.color = new THREE.Color(attire.coatColor);
      return m;
    }
    case "scrubs": {
      const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.9, sheen: 0.4, sheenColor: new THREE.Color("#cfe9ee"), sheenRoughness: 0.8 });
      if (attire.scrubsColor) {
        m.vertexColors = false;
        m.color = new THREE.Color(attire.scrubsColor);
      }
      return m;
    }
    default:
      return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: old.roughness, side: old.side });
  }
}

function prepare(scene: THREE.Object3D, detail: boolean, attire: Attire): Rig {
  const bones: Record<string, THREE.Bone> = {};
  const meshes: THREE.SkinnedMesh[] = [];
  const materials: Record<string, THREE.Material> = {};
  scene.traverse((o) => {
    // GLTFLoader sanitises names ("wrist.L" → "wristL"); the original is in userData.
    if ((o as THREE.Bone).isBone) bones[(o.userData.name as string) || o.name] = o as THREE.Bone;
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) {
      meshes.push(m);
      m.frustumCulled = false;
      m.castShadow = true;
      const old = m.material as THREE.MeshStandardMaterial;
      const name = old.name;
      const mat = materials[name] ?? makeMaterial(name, old, detail, attire);
      mat.name = name;
      materials[name] = mat;
      m.material = mat;
      if (name === "cornea") m.renderOrder = 2;
      if (name === "coat" && !attire.coat) m.visible = false;
      old.dispose();
    }
  });
  const morph = meshes[0]?.morphTargetDictionary ?? {};
  const rest: Record<string, THREE.Vector3> = {};
  const wp = (n: string) => bones[n].getWorldPosition(new THREE.Vector3());
  for (const s of ["L", "R"]) {
    rest[`upperarm01.${s}`] = wp(`lowerarm01.${s}`).sub(wp(`upperarm01.${s}`));
    rest[`lowerarm01.${s}`] = wp(`wrist.${s}`).sub(wp(`lowerarm01.${s}`));
    rest[`wrist.${s}`] = wp(`finger3-1.${s}`).sub(wp(`wrist.${s}`));
  }
  return { root: scene, bones, meshes, morph, rest, materials };
}

// ---------------- Pose ----------------

// Where each hand rests for an arm pose (relative to the doctor's root), and
// how the forearm is turned (palm down ≈ 1.15; open palm up ≈ -0.4).
type HandTarget = { elbow: THREE.Vector3; hand: THREE.Vector3; finger: THREE.Vector3; twist: number; curl: number };

function handTargets(rig: Rig, pose: ArmPose, gesture: number, side: "L" | "R"): HandTarget {
  const sgn = side === "L" ? 1 : -1;
  const sh = rig.root.worldToLocal(rig.bones[`upperarm01.${side}`].getWorldPosition(new THREE.Vector3()));
  const deskY = LAYOUT.deskY - rig.root.position.y + 0.04;
  const z = sh.z + LAYOUT.handZ;
  let hand: THREE.Vector3;
  let finger: THREE.Vector3;
  let twist = sgn * 1.1;
  let curl = 0.35;
  if (pose === "clasped") {
    hand = new THREE.Vector3(sgn * 0.055, deskY, z);
    finger = new THREE.Vector3(-sgn * 0.09, deskY - 0.01, z + 0.05);
    curl = 0.7;
  } else if (pose === "tablet" && side === "R") {
    hand = new THREE.Vector3(-0.2, deskY, z + 0.06);
    finger = new THREE.Vector3(-0.22, deskY - 0.015, z + 0.16);
    curl = 0.25;
  } else {
    hand = new THREE.Vector3(sgn * 0.13, deskY, z - 0.02);
    finger = new THREE.Vector3(sgn * 0.09, deskY - 0.015, z + 0.08);
    curl = 0.4;
  }
  const elbow = new THREE.Vector3(sh.x + sgn * 0.06, sh.y - 0.25, sh.z + 0.05);
  if (side === "R" && gesture > 0) {
    // A small open-palm gesture: forearm lifts slightly, palm turns up.
    const g = gesture;
    hand.lerp(new THREE.Vector3(-0.17, deskY + 0.13, z - 0.03), g);
    finger.lerp(new THREE.Vector3(-0.2, deskY + 0.17, z + 0.06), g);
    twist = twist + (-0.4 * sgn - twist) * g;
    curl = curl * (1 - g) + 0.12 * g;
    elbow.lerp(new THREE.Vector3(sh.x - 0.07, sh.y - 0.24, sh.z + 0.03), g);
  }
  return { elbow, hand, finger, twist, curl };
}

function lerpTarget(cur: HandTarget, to: HandTarget, k: number) {
  cur.elbow.lerp(to.elbow, k);
  cur.hand.lerp(to.hand, k);
  cur.finger.lerp(to.finger, k);
  cur.twist += (to.twist - cur.twist) * k;
  cur.curl += (to.curl - cur.curl) * k;
}

function solveArm(rig: Rig, side: "L" | "R", t: HandTarget, time = 0) {
  const b = rig.bones;
  const L = (v: THREE.Vector3) => rig.root.localToWorld(v.clone());
  aim(b[`upperarm01.${side}`], rig.rest[`upperarm01.${side}`], L(t.elbow));
  aim(b[`lowerarm01.${side}`], rig.rest[`lowerarm01.${side}`], L(t.hand), t.twist);
  aim(b[`wrist.${side}`], rig.rest[`wrist.${side}`], L(t.finger));
  for (let f = 2; f <= 5; f++)
    for (let k = 1; k <= 3; k++) {
      const fb = b[`finger${f}-${k}.${side}`];
      // Fingers settle very slowly, each a little differently: hands at rest
      // are never perfectly frozen (amplitude ~3°).
      const settle = Math.sin(time * 0.21 + f * 1.7 + (side === "L" ? 0.9 : 0)) * 0.05 + Math.sin(time * 0.083 + f) * 0.03;
      if (fb) fb.rotation.set(t.curl * (0.6 + k * 0.25) + settle * (k === 1 ? 1 : 0.6), 0, 0);
    }
  const th = b[`finger1-2.${side}`];
  if (th) th.rotation.set(t.curl * 0.4, 0, 0);
}

function seat(rig: Rig) {
  const b = rig.bones;
  for (const bone of Object.values(b)) bone.quaternion.identity();
  rig.root.position.set(0, 0, 0);
  rig.root.updateMatrixWorld(true);
  const hip = b["root"].getWorldPosition(new THREE.Vector3());
  rig.root.position.y = LAYOUT.seatY + 0.08 - hip.y;
  for (const s of ["L", "R"]) {
    b[`upperleg01.${s}`]?.rotation.set(-1.45, 0, 0);
    b[`lowerleg01.${s}`]?.rotation.set(1.5, 0, 0);
    // relaxed shoulders: clavicles drop and come forward a touch
    b[`clavicle.${s}`]?.rotation.set(0.05, 0, (s === "L" ? -1 : 1) * 0.05);
  }
  b["spine03"]?.rotation.set(0.06, 0, 0);
  b["spine01"]?.rotation.set(0.02, 0, 0);
  rig.root.updateMatrixWorld(true);
}

// ---------------- Component ----------------

// Per-frame smoothing (at 60 fps). Blinks are instant; mouth shapes are fast
// enough for "m/b/p" closures (~70 ms) without jitter, and open slightly
// faster than they close; expressions change slowly.
const MOUTH = new Set(["jawOpen", "mouthPucker", "mouthFunnel", "mouthStretch", "lipsPart", "mouthUpperUp"]);
const MORPH_SPEED: Record<string, number> = { eyeBlink_L: 1, eyeBlink_R: 1 };
const morphRate = (name: string, rising: boolean, speaking: boolean) =>
  MORPH_SPEED[name] ?? (MOUTH.has(name) ? (rising ? 0.55 : 0.4) : name === "mouthPress" && speaking ? 0.6 : 0.06);

// Scratch objects reused every frame (no garbage while animating).
const fwdV = new THREE.Vector3();
const dirV = new THREE.Vector3();
const camDirV = new THREE.Vector3();
const eyeDirV = new THREE.Vector3();
const headWorld = new THREE.Vector3();
const parentQ = new THREE.Quaternion();
const eyeQ = new THREE.Quaternion();
const identityQ = new THREE.Quaternion();

export default function DoctorAvatar(props: DoctorAvatarProps) {
  const { camera } = useThree();
  const rigRef = useRef<Rig | null>(null);
  const [root, setRoot] = useState<THREE.Object3D | null>(null);
  const base = useRef<Record<string, THREE.Quaternion>>({});
  const arms = useRef<Record<"L" | "R", HandTarget> | null>(null);
  const smooth = useRef<Record<string, number>>({});
  const gazeDir = useRef(new THREE.Vector3(0, 0, 1));
  const headTurn = useRef(new THREE.Vector2());
  const lastTarget = useRef<GazeTarget>("patient");
  const lastShift = useRef(-10);
  const onReady = useRef(props.onReady);
  const onError = useRef(props.onError);
  const onProgress = useRef(props.onProgress);
  useEffect(() => {
    onReady.current = props.onReady;
    onError.current = props.onError;
    onProgress.current = props.onProgress;
  });
  const { url, detail } = props;
  const attireKey = JSON.stringify(props.attire);
  const attire = useMemo(() => JSON.parse(attireKey) as Attire, [attireKey]);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const timeout = setTimeout(() => !cancelled && onError.current?.(new Error("The doctor took too long to load")), 15000);
    loader.load(
      url,
      (g) => {
        clearTimeout(timeout);
        if (cancelled) return;
        try {
          const r = prepare(g.scene, detail, attire);
          seat(r);
          base.current = Object.fromEntries(Object.entries(r.bones).map(([k, v]) => [k, v.quaternion.clone()]));
          rigRef.current = r;
          arms.current = null;
          setRoot(r.root);
          onReady.current?.();
        } catch (e) {
          console.error("[doctor] model could not be prepared", e);
          onError.current?.(e);
        }
      },
      (ev) => ev.total && onProgress.current?.(ev.loaded / ev.total),
      (e) => {
        clearTimeout(timeout);
        console.error("[doctor] model could not be loaded", e);
        if (!cancelled) onError.current?.(e);
      },
    );
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [url, detail, attire]);

  // Where each gaze target is in the world.
  const targets = useMemo(
    () => ({
      chart: new THREE.Vector3(...LAYOUT.chart.position),
      down: new THREE.Vector3(0.05, LAYOUT.deskY, -0.6),
      away: new THREE.Vector3(0.75, 1.25, -0.4),
      // Toward the patient's screen, lower down: where the body map appears.
      visual: new THREE.Vector3(-0.12, 0.92, 0.05),
    }),
    [],
  );

  useFrame(({ clock }, dt) => {
    const rig = rigRef.current;
    if (!rig || !root) return;
    const t = clock.elapsedTime;
    const now = performance.now() / 1000;
    const state = props.state.current ?? "idle";
    const since = (props.since.current ?? now) - now + t; // state start on the clock's timeline
    const rhythm = props.lips.current?.rhythm(now) ?? { speaking: false, phrase: 0, phraseAge: 0, beat: 0, question: false };
    const patientActive = props.activity?.current ? now - props.activity.current : 99;
    const f = performAt(t, state, since, { reducedMotion: props.reducedMotion, ...rhythm, lastGazeShift: lastShift.current, patientActive });
    const b = rig.bones;
    const k = (rate: number) => 1 - Math.exp(-rate * Math.min(dt, 0.1));

    // Restore the seated pose, then layer motion on top.
    for (const [name, q] of Object.entries(base.current)) b[name]?.quaternion.copy(q);
    rig.root.updateMatrixWorld(true);

    // Arms: blend towards the current pose; arms never snap.
    const want = { L: handTargets(rig, f.body.armPose, 0, "L"), R: handTargets(rig, f.body.armPose, f.body.gesture, "R") };
    if (!arms.current) arms.current = want;
    else {
      lerpTarget(arms.current.L, want.L, k(2.2));
      lerpTarget(arms.current.R, want.R, k(f.body.gesture > 0 ? 3 : 2.2));
    }
    const still = props.reducedMotion ? 0 : t;
    solveArm(rig, "L", arms.current.L, still);
    solveArm(rig, "R", arms.current.R, still);

    // Breathing, attentive lean and a very slow weight shift.
    b["spine02"]?.quaternion.multiply(tmpQ.setFromEuler(tmpE.set(f.body.breath * 0.006 + f.body.lean * 0.035, 0, 0)));
    b["spine04"]?.quaternion.multiply(tmpQ.setFromEuler(tmpE.set(0, f.body.shift * 0.01, f.body.shift * 0.01)));
    for (const s of ["L", "R"]) b[`clavicle.${s}`]?.quaternion.multiply(tmpQ.setFromEuler(tmpE.set(0, 0, (s === "L" ? 1 : -1) * f.body.breath * 0.004)));

    // Gaze target in the world; the head turns part of the way, eyes do the rest.
    camera.getWorldPosition(tmpV);
    const target = f.gaze.target === "patient" ? tmpV : targets[f.gaze.target];
    if (f.gaze.target !== lastTarget.current) {
      lastTarget.current = f.gaze.target;
      lastShift.current = t; // a natural blink accompanies a larger gaze shift
    }
    const headPos = b["head"].getWorldPosition(tmpV2);
    const dir = dirV.copy(target).sub(headPos).normalize();
    const camDir = camDirV.copy(tmpV).sub(headPos).normalize();
    const yawTo = Math.atan2(dir.x, dir.z) - Math.atan2(camDir.x, camDir.z);
    const pitchTo = Math.asin(Math.max(-1, Math.min(1, -dir.y))) - Math.asin(Math.max(-1, Math.min(1, -camDir.y)));
    headTurn.current.x += (yawTo * 0.35 - headTurn.current.x) * k(props.reducedMotion ? 2 : 4);
    headTurn.current.y += (pitchTo * 0.4 - headTurn.current.y) * k(props.reducedMotion ? 2 : 4);
    const hy = f.body.headYaw + headTurn.current.x;
    const hp = f.body.headPitch + headTurn.current.y;
    b["neck02"]?.quaternion.multiply(tmpQ.setFromEuler(tmpE.set(hp * 0.4, hy * 0.4, f.body.headRoll * 0.4)));
    b["head"]?.quaternion.multiply(tmpQ.setFromEuler(tmpE.set(hp * 0.6, hy * 0.6, f.body.headRoll * 0.6)));
    rig.root.updateMatrixWorld(true);

    // Eyes: quick but not instant (a saccade takes a few tens of milliseconds).
    gazeDir.current.lerp(eyeDirV.copy(target).sub(b["head"].getWorldPosition(headWorld)).normalize(), k(18));
    for (const s of ["L", "R"]) {
      const eye = b[`eye.${s}`];
      if (!eye) continue;
      const d = eyeDirV.copy(gazeDir.current);
      d.x += f.gaze.sx;
      d.y += f.gaze.sy;
      const fwd = fwdV.set(0, 0, 1).applyQuaternion(eye.parent!.getWorldQuaternion(parentQ));
      // limit eye rotation to a natural range (~25°)
      const q = eyeQ.setFromUnitVectors(fwd, d.normalize());
      const ang = 2 * Math.acos(Math.min(1, Math.abs(q.w)));
      if (ang > 0.45) q.slerp(identityQ, 1 - 0.45 / ang);
      rotateWorld(eye, q);
    }

    // Face: expression (slow), blink (instant), mouth (from the voice).
    const lip = props.lips.current?.visemeAt(now);
    const speaking = rhythm.speaking;
    const lookDown = f.gaze.target === "down" || f.gaze.target === "chart" ? 0.18 : f.gaze.target === "visual" ? 0.1 : 0; // lids follow a downward look
    // A relaxed upper lid rests just over the top of the iris; wide-open lids
    // showing white above the iris read as a stare. Wider when attentive.
    const restLid = Math.max(0, 0.08 - f.face.eyeWide * 0.5);
    const target2: Record<string, number> = {
      eyeBlink_L: Math.min(1, restLid + f.blink * (1 - restLid) + lookDown),
      eyeBlink_R: Math.min(1, restLid + f.blink * (1 - restLid) + lookDown),
      browInnerUp: f.face.browInnerUp,
      browDown: f.face.browDown,
      browOuterUp: f.face.browOuterUp,
      mouthSmile: f.face.mouthSmile * (speaking ? 0.5 : 1),
      mouthFrown: f.face.mouthFrown,
      eyeSquint: f.face.eyeSquint,
      eyeWide: Math.max(0, f.face.eyeWide - f.blink * f.face.eyeWide),
      mouthPress: Math.max(f.face.mouthPress * (speaking ? 0 : 1), lip?.mouthPress ?? 0),
      jawOpen: lip?.jawOpen ?? 0,
      mouthPucker: lip?.mouthPucker ?? 0,
      mouthFunnel: lip?.mouthFunnel ?? 0,
      mouthStretch: lip?.mouthStretch ?? 0,
      lipsPart: lip?.lipsPart ?? 0,
      mouthUpperUp: lip?.mouthUpperUp ?? 0,
    };
    const values: [number, number][] = [];
    for (const [name, value] of Object.entries(target2)) {
      const i = rig.morph[name];
      if (i === undefined) continue;
      const prev = smooth.current[name] ?? 0;
      const rate = morphRate(name, value > prev, speaking);
      const v = rate >= 1 ? value : prev + (value - prev) * Math.min(1, rate * dt * 60);
      smooth.current[name] = v;
      values.push([i, v]);
    }
    for (const m of rig.meshes) {
      const inf = m.morphTargetInfluences;
      // eslint-disable-next-line react-hooks/immutability -- three.js morph weights are mutated per frame
      if (inf) for (const [i, v] of values) inf[i] = v;
    }
  });

  return root ? <primitive object={root} /> : null;
}
