// Consultation rooms. Every department shares the same guide, skeleton,
// furniture, lighting and signage (loaded once); a department only changes
// colours, sign text and a small "prop pack". Only General Medicine is built
// so far — it is the template for the others.

export type Prop = "bp-monitor" | "stethoscope" | "sanitizer" | "anatomy-chart" | "couch" | "curtain";

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
};

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
    intro:
      "Hello. Welcome to General Medicine. I'm your AI Hospital virtual health guide. I'll ask you a few questions to help determine how urgently you may need care, and help prepare information for a healthcare professional. What brings you here today?",
  },
};

export const roomFor = (slug: string): RoomStyle | undefined => ROOMS[slug];
