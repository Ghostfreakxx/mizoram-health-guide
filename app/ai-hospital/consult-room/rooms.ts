// Consultation rooms. Every department shares the same guide, skeleton,
// furniture, lighting, conversation engine, chart and summary (loaded once).
// A department only changes colours, sign text, its greeting, which problems
// it shows first, and a small "prop pack" of equipment and wall material.
// Emergency has no seated room: it opens Emergency Mode directly.

import { defaultIntro } from "../../lib/consultation";
import type { Attire } from "./doctor/DoctorAvatar";

export type Prop =
  | "bp-monitor"
  | "stethoscope"
  | "sanitizer"
  | "anatomy-chart"
  | "couch"
  | "curtain"
  | "ecg-cart"
  | "heart-poster"
  | "lung-poster"
  | "peak-flow"
  | "oxygen"
  | "toy-shelf"
  | "height-chart"
  | "armchairs"
  | "lamp"
  | "plant"
  | "rug"
  | "pregnancy-poster"
  | "doppler"
  | "scale";

export type RoomStyle = {
  slug: string;
  title: string; // signage
  wall: string;
  dado: string; // lower wall paint, common in Indian clinics
  accent: string;
  floor: string;
  props: Prop[];
  greeting: string; // department name used by the guide
  intro: string; // what the guide says first (spoken and shown)
  focus: string[]; // complaint ids shown first when the person's words are unclear
  attire: Attire; // what the doctor wears in this department
};

// Every department uses the same introduction, so patients always hear the
// same promise: questions, appropriate care, and emergencies said at once.
const intro = (dept: string) => defaultIntro(dept);

export const ROOMS: Record<string, RoomStyle> = {
  "general-medicine": {
    slug: "general-medicine",
    title: "General Medicine · OPD",
    wall: "#f3f1ec",
    dado: "#cfe3df",
    accent: "#1e3a8a",
    floor: "#d6d3cd",
    props: ["bp-monitor", "stethoscope", "sanitizer", "anatomy-chart", "couch", "curtain"],
    greeting: "General Medicine",
    intro: intro("General Medicine"),
    focus: ["fever", "cough", "stomach", "headache"],
    attire: { coat: true, scrubsColor: "#2f5d73" },
  },
  cardiology: {
    slug: "cardiology",
    title: "Cardiology · Heart Care",
    wall: "#f2f3f6",
    dado: "#cfdcec",
    accent: "#9f1239",
    floor: "#d5d4d2",
    props: ["ecg-cart", "heart-poster", "bp-monitor", "stethoscope", "sanitizer", "couch", "curtain"],
    greeting: "Cardiology",
    intro: intro("Cardiology"),
    focus: ["heart", "headache", "other"],
    attire: { coat: true, scrubsColor: "#283a5c" },
  },
  respiratory: {
    slug: "respiratory",
    title: "Respiratory Medicine · Chest",
    wall: "#eef3f2",
    dado: "#cfe5e3",
    accent: "#115e59",
    floor: "#d4d6d2",
    props: ["lung-poster", "peak-flow", "oxygen", "stethoscope", "sanitizer", "couch", "curtain"],
    greeting: "Respiratory Medicine",
    intro: intro("Respiratory Medicine"),
    focus: ["cough", "fever", "heart"],
    attire: { coat: true, scrubsColor: "#2c6460" },
  },
  paediatrics: {
    slug: "paediatrics",
    title: "Paediatrics · Children's Health",
    wall: "#fbf4e8",
    dado: "#f6d9a8",
    accent: "#0369a1",
    floor: "#dcd6cb",
    props: ["toy-shelf", "height-chart", "scale", "stethoscope", "sanitizer", "rug"],
    greeting: "Paediatrics",
    intro: intro("Paediatrics"),
    focus: ["child", "fever", "cough", "stomach"],
    attire: { coat: false, scrubsColor: "#3d7aa6" },
  },
  "mental-health": {
    slug: "mental-health",
    title: "Mental Health · Counselling",
    wall: "#eef0ea",
    dado: "#d9e3d3",
    accent: "#4c1d95",
    floor: "#d8d2c6",
    props: ["armchairs", "lamp", "plant", "rug"],
    greeting: "Mental Health",
    intro: intro("Mental Health"),
    focus: ["mental", "substance", "headache"],
    attire: { coat: false, scrubsColor: "#5f6b62" },
  },
  "obstetrics-gynaecology": {
    slug: "obstetrics-gynaecology",
    title: "Obstetrics & Gynaecology",
    wall: "#f7f0f1",
    dado: "#ebd3d9",
    accent: "#9d174d",
    floor: "#d9d3cf",
    props: ["pregnancy-poster", "doppler", "scale", "bp-monitor", "sanitizer", "couch", "curtain"],
    greeting: "Obstetrics and Gynaecology",
    intro: intro("Obstetrics and Gynaecology"),
    focus: ["pregnancy", "urine", "stomach"],
    attire: { coat: true, scrubsColor: "#6e3550" },
  },
};

export const roomFor = (slug: string): RoomStyle | undefined => ROOMS[slug];
