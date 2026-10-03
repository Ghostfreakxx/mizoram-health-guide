// Consultation rooms. Every department shares the same guide, furniture and
// lighting (downloaded once); a room only changes colours, signage and a few
// department props. Only General Medicine is built so far (prototype).

export type Prop = "bp-monitor" | "ecg-display" | "lung-chart" | "toy-shelf" | "plant" | "eye-chart" | "x-ray-viewer";

export type RoomStyle = {
  slug: string;
  title: string; // signage
  wall: string;
  accent: string;
  floor: string;
  props: Prop[];
  greeting: string; // department name used by the guide
};

export const ROOMS: Record<string, RoomStyle> = {
  "general-medicine": {
    slug: "general-medicine",
    title: "General Medicine · OPD",
    wall: "#eef3f6",
    accent: "#1e3a8a",
    floor: "#d9d4cc",
    props: ["bp-monitor", "x-ray-viewer", "plant"],
    greeting: "General Medicine",
  },
};

export const roomFor = (slug: string): RoomStyle | undefined => ROOMS[slug];
