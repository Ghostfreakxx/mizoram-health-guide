// First-aid guides. Emergency topics reuse the exact guidance from the shared
// red-flag list (one source of truth with Emergency Mode). Minor topics are
// short, widely taught steps, each with when to get help.

import { type RedFlagId, getRedFlag } from "../../lib/safety/redFlags";

export type FirstAidGuide = {
  id: string;
  icon: string;
  title: string;
  emergency: boolean; // true: call 108/112 first
  steps: string[];
  getHelp: string[]; // when to get medical help
  sourceIds: string[];
};

function fromRedFlag(id: RedFlagId, icon: string, title: string): FirstAidGuide {
  const f = getRedFlag(id);
  return {
    id,
    icon,
    title,
    emergency: true,
    steps: f.guidance,
    getHelp: ["Call 108 (ambulance) or 112 (emergency) now, or go to the nearest emergency department."],
    sourceIds: f.sourceIds,
  };
}

export const firstAidGuides: FirstAidGuide[] = [
  fromRedFlag("bleeding", "🩸", "Heavy bleeding"),
  fromRedFlag("unconscious", "😵", "Unconscious but breathing"),
  fromRedFlag("seizure", "⚡", "Fits (seizure)"),
  fromRedFlag("breathing", "🫁", "Choking or severe breathing difficulty"),
  fromRedFlag("snakebite", "🐍", "Snake bite"),
  fromRedFlag("allergy", "🐝", "Severe allergic reaction"),
  fromRedFlag("poisoning", "☠️", "Poisoning"),
  fromRedFlag("injury", "🚑", "Serious injury or fall"),
  {
    id: "burn",
    icon: "🔥",
    title: "Burns and scalds",
    emergency: false,
    steps: [
      "Cool the burn under cool running water for 20 minutes.",
      "Remove rings, watches, or tight clothing near the burn — unless stuck to the skin.",
      "Cover loosely with clean cling film or a clean plastic bag.",
      "Do not put ice, toothpaste, oil, or butter on a burn.",
    ],
    getHelp: [
      "Get urgent help for burns larger than the person's hand, burns on the face, hands, feet, or private parts, deep burns, electrical or chemical burns, and any burn in a baby or child.",
    ],
    sourceIds: ["ifrc-first-aid-2020"],
  },
  {
    id: "nosebleed",
    icon: "👃",
    title: "Nosebleed",
    emergency: false,
    steps: [
      "Sit down and lean forward (not back).",
      "Pinch the soft part of the nose, just above the nostrils, for 10 to 15 minutes.",
      "Breathe through your mouth.",
    ],
    getHelp: [
      "Get urgent help if bleeding does not stop after 10 to 15 minutes, is very heavy, follows a head injury, or the person feels faint.",
    ],
    sourceIds: ["nhs-nosebleed"],
  },
  {
    id: "sprain",
    icon: "🦶",
    title: "Possible broken bone or sprain",
    emergency: false,
    steps: [
      "Keep the injured part still and support it in the position you found it.",
      "Do not try to straighten it.",
      "A cold pack wrapped in a cloth can help with swelling.",
    ],
    getHelp: [
      "Go to a hospital if the part looks bent or out of shape, cannot move or bear weight, is very painful or swollen, or there is numbness.",
      "Call 108 if the bone is through the skin, or for a neck, back, or hip injury — do not move the person.",
    ],
    sourceIds: ["ifrc-first-aid-2020"],
  },
];
