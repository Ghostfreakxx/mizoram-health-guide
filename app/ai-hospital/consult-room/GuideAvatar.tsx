"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { type GuideState, poseAt } from "./doctorMotion";
import type { LipSync } from "./voice";

// The virtual guide: a human model built from MakeHuman CC0 data
// (scripts/avatar). One skeleton and one animation system for every guide.
//
// The model's bones have no rest rotation, so every rotation below is an
// ordinary rotation in the parent's space. Poses are solved, not keyframed:
// the guide sits, rests her hands on the desk, keeps eye contact, breathes,
// blinks and speaks.

export type AvatarProps = {
  url: string;
  state: React.RefObject<GuideState>;
  lips: React.RefObject<LipSync | null>;
  reducedMotion: boolean;
  seatY: number; // seat height in metres
  deskY: number; // desk top height
  handZ: number; // how far forward of the shoulders the hands rest
  onReady?: () => void;
  onError?: (e: unknown) => void;
};

const V = () => new THREE.Vector3();
const Q = () => new THREE.Quaternion();

// Rotates `bone` so its first child points at `target` (world space).
function aim(bone: THREE.Bone, childLocal: THREE.Vector3, target: THREE.Vector3, twist = 0) {
  bone.quaternion.identity();
  bone.updateWorldMatrix(true, false);
  const parentQ = bone.parent ? bone.parent.getWorldQuaternion(Q()) : Q();
  const from = childLocal.clone().normalize().applyQuaternion(parentQ);
  const to = target.clone().sub(bone.getWorldPosition(V())).normalize();
  const q = Q().setFromUnitVectors(from, to);
  const inv = parentQ.clone().invert();
  bone.quaternion.copy(inv.multiply(q).multiply(parentQ));
  if (twist) bone.quaternion.multiply(Q().setFromAxisAngle(childLocal.clone().normalize(), twist));
  bone.updateWorldMatrix(false, true);
}

// Rotates `bone` (in its parent's world frame) by a world-space quaternion.
function rotateWorld(bone: THREE.Bone, worldQ: THREE.Quaternion) {
  bone.updateWorldMatrix(true, false);
  const parentQ = bone.parent ? bone.parent.getWorldQuaternion(Q()) : Q();
  const local = parentQ.clone().invert().multiply(worldQ).multiply(parentQ);
  bone.quaternion.premultiply(local);
}

type Rig = {
  root: THREE.Object3D;
  bones: Record<string, THREE.Bone>;
  meshes: THREE.SkinnedMesh[];
  morph: Record<string, number>;
  rest: Record<string, THREE.Vector3>; // child offsets (local) for aiming
};

function child(b: THREE.Bone, name?: string): THREE.Vector3 {
  const c = (b.children.find((x) => !name || x.userData.name === name || x.name === name) as THREE.Bone | undefined) ?? (b.children[0] as THREE.Bone | undefined);
  return c ? c.position.clone() : new THREE.Vector3(0, -0.1, 0);
}

function prepare(scene: THREE.Object3D): Rig {
  const bones: Record<string, THREE.Bone> = {};
  const meshes: THREE.SkinnedMesh[] = [];
  scene.traverse((o) => {
    // GLTFLoader sanitises names ("wrist.L" → "wristL"); the original is kept in userData.
    if ((o as THREE.Bone).isBone) bones[(o.userData.name as string) || o.name] = o as THREE.Bone;
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) {
      meshes.push(m);
      m.frustumCulled = false;
      const old = m.material as THREE.MeshStandardMaterial;
      const name = old.name;
      let mat: THREE.Material;
      if (name === "skin") {
        mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.56, sheen: 0.3, sheenColor: new THREE.Color("#ffd2b8"), sheenRoughness: 0.55, clearcoat: 0.04, clearcoatRoughness: 0.6 });
      } else if (name === "eye") {
        mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.35, clearcoat: 0.35, clearcoatRoughness: 0.12 });
      } else if (name === "hair") {
        mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: old.map, roughness: 0.55 });
      } else {
        mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: old.roughness, side: old.side });
      }
      mat.name = name;
      m.material = mat;
      old.dispose();
    }
  });
  const morph = meshes[0]?.morphTargetDictionary ?? {};
  const rest: Record<string, THREE.Vector3> = {};
  for (const s of ["L", "R"]) {
    rest[`upperarm01.${s}`] = bones[`lowerarm01.${s}`] ? bones[`lowerarm01.${s}`].getWorldPosition(V()).sub(bones[`upperarm01.${s}`].getWorldPosition(V())) : V();
    rest[`lowerarm01.${s}`] = bones[`wrist.${s}`] ? bones[`wrist.${s}`].getWorldPosition(V()).sub(bones[`lowerarm01.${s}`].getWorldPosition(V())) : V();
    rest[`wrist.${s}`] = child(bones[`wrist.${s}`], `metacarpal2.${s}`).add(child(bones[`metacarpal2.${s}`] ?? bones[`wrist.${s}`]));
  }
  return { root: scene, bones, meshes, morph, rest };
}

// The static seated pose. Called once, then animation layers go on top.
function seat(rig: Rig, p: Pick<AvatarProps, "seatY" | "deskY" | "handZ">, gesture: number) {
  const b = rig.bones;
  for (const bone of Object.values(b)) bone.quaternion.identity();
  rig.root.updateMatrixWorld(true);
  const hip = b["root"].getWorldPosition(V());
  rig.root.position.y += p.seatY + 0.08 - hip.y;
  rig.root.updateMatrixWorld(true);

  // Legs: thighs forward, shins down (mostly hidden by the desk)
  for (const s of ["L", "R"]) {
    if (b[`upperleg01.${s}`]) b[`upperleg01.${s}`].rotation.set(-1.45, 0, 0);
    if (b[`lowerleg01.${s}`]) b[`lowerleg01.${s}`].rotation.set(1.5, 0, 0);
  }
  // A slight, attentive forward lean
  b["spine03"]?.rotation.set(0.07, 0, 0);
  b["spine01"]?.rotation.set(0.03, 0, 0);
  rig.root.updateMatrixWorld(true);

  for (const s of ["L", "R"]) arm(rig, p, s, s === "R" ? gesture : 0);
}

const _e = V();
const _w = V();
function arm(rig: Rig, p: Pick<AvatarProps, "deskY" | "handZ">, s: string, gesture: number) {
  const b = rig.bones;
  const up = b[`upperarm01.${s}`];
  const lo = b[`lowerarm01.${s}`];
  const wr = b[`wrist.${s}`];
  if (!up || !lo || !wr) return;
  const sign = s === "L" ? 1 : -1;
  const sh = up.getWorldPosition(V());
  const local = rig.root.worldToLocal(sh.clone());
  // Resting: elbows by the body, forearms on the desk, hands loosely together.
  const elbowRest = V().set(local.x + sign * 0.05, local.y - 0.25, local.z + 0.06);
  const handRest = V().set(sign * 0.09, p.deskY - rig.root.position.y + 0.035, local.z + p.handZ);
  // Explaining (right hand only): forearm lifts a little, open hand.
  const elbowG = V().set(local.x + sign * 0.07, local.y - 0.24, local.z + 0.04);
  const handG = V().set(sign * 0.16, p.deskY - rig.root.position.y + 0.14, local.z + p.handZ - 0.05);
  _e.lerpVectors(elbowRest, elbowG, gesture);
  _w.lerpVectors(handRest, handG, gesture);
  aim(up, rig.rest[`upperarm01.${s}`], rig.root.localToWorld(_e.clone()));
  // Forearm: point at the hand, turned so the palm faces down (or up when explaining)
  aim(lo, rig.rest[`lowerarm01.${s}`], rig.root.localToWorld(_w.clone()), sign * (1.15 - gesture * 1.5));
  // Hand: continue forward and slightly inwards, wrist relaxed
  const fingertip = _w.clone().add(V().set(-sign * 0.05, -0.02 + gesture * 0.03, 0.09));
  aim(wr, rig.rest[`wrist.${s}`], rig.root.localToWorld(fingertip));
  // Relaxed fingers: a gentle curl
  for (let f = 2; f <= 5; f++) {
    for (let k = 1; k <= 3; k++) {
      const fb = b[`finger${f}-${k}.${s}`];
      if (fb) fb.rotation.set(0.25 + k * 0.08 - gesture * 0.15, 0, 0);
    }
  }
}

const _q = Q();
const _eul = new THREE.Euler();
const _cam = V();

export default function GuideAvatar(props: AvatarProps) {
  const { camera } = useThree();
  // three.js objects are mutated every frame, so the rig lives in a ref;
  // state only tells React when there is something to draw.
  const rigRef = useRef<Rig | null>(null);
  const [root, setRoot] = useState<THREE.Object3D | null>(null);
  const base = useRef<Record<string, THREE.Quaternion>>({});
  const gestureNow = useRef(0);
  const smooth = useRef<Record<string, number>>({});
  const { url } = props;
  // Callbacks change identity on every parent render; loading must not.
  const onReady = useRef(props.onReady);
  const onError = useRef(props.onError);
  useEffect(() => {
    onReady.current = props.onReady;
    onError.current = props.onError;
  });

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const timeout = setTimeout(() => !cancelled && onError.current?.(new Error("Model took too long to load")), 15000);
    loader.load(
      url,
      (g) => {
        clearTimeout(timeout);
        if (cancelled) return;
        try {
          const r = prepare(g.scene);
          rigRef.current = r;
          setRoot(r.root);
          onReady.current?.();
        } catch (e) {
          console.error("[guide] model could not be prepared", e);
          onError.current?.(e);
        }
      },
      undefined,
      (e) => {
        clearTimeout(timeout);
        console.error("[guide] model could not be loaded", e);
        if (!cancelled) onError.current?.(e);
      },
    );
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [url]);

  const seatProps = useMemo(() => ({ seatY: props.seatY, deskY: props.deskY, handZ: props.handZ }), [props.seatY, props.deskY, props.handZ]);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig || !root) return;
    rig.root.position.set(0, 0, 0);
    seat(rig, seatProps, 0);
    base.current = Object.fromEntries(Object.entries(rig.bones).map(([k, v]) => [k, v.quaternion.clone()]));
  }, [root, seatProps]);

  useFrame(({ clock }) => {
    const rig = rigRef.current;
    if (!rig || !root) return;
    const t = clock.elapsedTime;
    const state = props.state.current ?? "waiting";
    const p = poseAt(t, state, { reducedMotion: props.reducedMotion });
    const b = rig.bones;

    // Restore the seated base pose, then layer motion on top.
    for (const [k, q] of Object.entries(base.current)) b[k]?.quaternion.copy(q);

    // Right-hand gesture, eased so it never snaps.
    gestureNow.current += (p.gesture - gestureNow.current) * 0.04;
    if (gestureNow.current > 0.01) {
      rig.root.updateMatrixWorld(true);
      arm(rig, seatProps, "R", gestureNow.current);
    }

    // Breathing and posture
    b["spine02"]?.quaternion.multiply(_q.setFromEuler(_eul.set(p.breath * 0.008 + p.lean * 0.03, 0, 0)));
    b["spine04"]?.quaternion.multiply(_q.setFromEuler(_eul.set(0, 0, p.shift * 0.012)));
    for (const s of ["L", "R"]) b[`clavicle.${s}`]?.quaternion.multiply(_q.setFromEuler(_eul.set(0, 0, (s === "L" ? 1 : -1) * p.breath * 0.006)));

    // Head: split between neck and head so it looks natural
    b["neck02"]?.quaternion.multiply(_q.setFromEuler(_eul.set(p.headPitch * 0.4, p.headYaw * 0.4, p.headRoll * 0.4)));
    b["head"]?.quaternion.multiply(_q.setFromEuler(_eul.set(p.headPitch * 0.6, p.headYaw * 0.6, p.headRoll * 0.6)));
    rig.root.updateMatrixWorld(true);

    // Eyes: keep eye contact with the patient's viewpoint, with tiny saccades
    camera.getWorldPosition(_cam);
    for (const s of ["L", "R"]) {
      const eye = b[`eye.${s}`];
      if (!eye) continue;
      const dir = _cam.clone().sub(eye.getWorldPosition(V())).normalize();
      dir.x += p.gazeX;
      dir.y += p.gazeY;
      rotateWorld(eye, Q().setFromUnitVectors(V().set(0, 0, 1).applyQuaternion(eye.parent!.getWorldQuaternion(Q())), dir.normalize()));
    }

    // Face
    const lip = props.lips.current?.visemeAt(performance.now() / 1000);
    const target: Record<string, number> = {
      eyeBlink_L: Math.min(1, p.blink + p.squint * 0.25),
      eyeBlink_R: Math.min(1, p.blink + p.squint * 0.25),
      browInnerUp: p.browInnerUp,
      browDown: p.browDown,
      mouthSmile: p.smile * 0.55,
      eyeSquint: p.squint,
      // a little more open than the model's rest shape: attentive, not sleepy
      eyeWide: Math.max(0, 0.28 - p.squint - p.blink * 0.28),
      jawOpen: lip?.jawOpen ?? 0,
      mouthPucker: lip?.mouthPucker ?? 0,
      mouthFunnel: lip?.mouthFunnel ?? 0,
      mouthStretch: lip?.mouthStretch ?? 0,
      mouthPress: lip?.mouthPress ?? 0,
      lipsPart: lip?.lipsPart ?? 0,
    };
    const values: [number, number][] = [];
    for (const [name, value] of Object.entries(target)) {
      const i = rig.morph[name];
      if (i === undefined) continue;
      // blinks are instant; mouth shapes quick; expressions ease slowly
      const k = name.startsWith("eyeBlink") ? 1 : /^(jaw|lips|mouthP|mouthF|mouthStretch)/.test(name) ? 0.45 : 0.08;
      const prev = smooth.current[name] ?? 0;
      const v = prev + (value - prev) * k;
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
