// 3D department simulator configuration.
//
// The simulator shows a TYPICAL visit to each kind of department, built only
// from the department content in departments.ts. It is not a model of any
// real hospital, and it does not show clinical procedures.

import { type Department, departments, getDepartment } from "./departments";

export type Equipment =
  | "desk"
  | "bed"
  | "xray"
  | "dental"
  | "eyechart"
  | "lamp"
  | "monitor"
  | "cot"
  | "delivery"
  | "lab"
  | "sofa"
  | "stretcher"
  | "scale"
  | "pharmacy"
  | "booth"
  | "ent";

export type Station = {
  id: string;
  title: string;
  text: string;
  position: [number, number, number];
  equipment: Equipment[];
};

export type Simulation = {
  slug: string;
  name: string;
  accent: string; // hex colour for the department theme
  stations: Station[];
};

// Equipment shown at each visit step (one entry per item in department.expect).
const EQUIPMENT: Record<string, Equipment[]> = {
  emergency: ["stretcher", "monitor", "bed"],
  "general-medicine": ["desk", "lab", "pharmacy"],
  paediatrics: ["scale", "desk", "cot"],
  "obstetrics-gynaecology": ["scale", "bed", "delivery"],
  oncology: ["desk", "xray", "desk"],
  cardiology: ["desk", "monitor", "desk"],
  respiratory: ["desk", "xray", "pharmacy"],
  "tb-services": ["lab", "pharmacy", "desk"],
  "mental-health": ["sofa", "desk", "sofa"],
  "substance-use": ["sofa", "desk", "lab"],
  ent: ["ent", "booth"],
  dental: ["dental", "desk"],
  dermatology: ["lamp", "lab"],
  orthopaedics: ["bed", "xray", "desk"],
  "eye-care": ["eyechart", "lamp", "desk"],
  "infectious-diseases": ["lab", "pharmacy"],
  "hiv-services": ["sofa", "lab", "desk"],
};

const ACCENT: Record<string, string> = {
  emergency: "#b91c1c",
  "mental-health": "#7c3aed",
  "substance-use": "#7c3aed",
  "obstetrics-gynaecology": "#db2777",
  paediatrics: "#0891b2",
  oncology: "#d97706",
  cardiology: "#dc2626",
};

// Station positions in the room (x, y, z), walking from the entrance.
const ARRIVE: [number, number, number] = [-5, 0, 3];
const WAIT: [number, number, number] = [-5, 0, -2.5];
const STEPS: [number, number, number][] = [
  [-0.5, 0, -2.5],
  [4, 0, -2.5],
  [4, 0, 2.5],
];
const LEAVE: [number, number, number] = [0, 0, 4];

function stepTitle(d: Department, i: number): string {
  if (d.slug === "emergency") return ["Quick check of how serious it is", "Examined by a doctor", "Treated, admitted, or moved"][i] ?? "Next";
  if (i === 0) return "Check-up";
  if (i === d.expect.length - 1 && d.expect.length >= 3) return "Next steps";
  return "Tests or treatment";
}

function build(d: Department): Simulation {
  const equipment = EQUIPMENT[d.slug] ?? d.expect.map(() => "desk" as Equipment);
  const stations: Station[] = [
    {
      id: "arrive",
      title: d.slug === "emergency" ? "Arrive at Emergency" : "Arrive — what to bring",
      text:
        d.slug === "emergency"
          ? "Call 108 or 112, or go straight to the emergency entrance. Bring the patient's ID and medicine list if you can — but do not delay."
          : `Have these ready: ${d.bring.join("; ")}.`,
      position: ARRIVE,
      equipment: ["desk"],
    },
  ];
  if (d.slug !== "emergency") {
    stations.push({
      id: "wait",
      title: "Wait for your turn",
      text: "You may wait in a waiting area until you are called. If you feel much worse while waiting, tell a staff member straight away.",
      position: WAIT,
      equipment: [],
    });
  }
  d.expect.forEach((text, i) => {
    stations.push({
      id: `step-${i + 1}`,
      title: stepTitle(d, i),
      text,
      position: STEPS[i] ?? STEPS[STEPS.length - 1],
      equipment: [equipment[i] ?? "desk"],
    });
  });
  stations.push({
    id: "leave",
    title: "Before you leave",
    text: "Make sure you know what happens next, when to come back, and which warning signs mean you should return quickly. Ask if anything is unclear.",
    position: LEAVE,
    equipment: [],
  });
  return { slug: d.slug, name: d.plainName, accent: ACCENT[d.slug] ?? "#1e3a8a", stations };
}

export const simulations: Simulation[] = departments.map(build);

export function getSimulation(slug: string): Simulation | undefined {
  const d = getDepartment(slug);
  return d ? build(d) : undefined;
}
