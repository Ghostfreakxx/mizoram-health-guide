// The single shared list of RED (emergency) conditions.
//
// Used by the Triage Desk, Emergency Mode, the Digital Receptionist, and the
// Health Assistant. Adding a red flag here protects every tool at once.

export type RedFlagId =
  | "breathing"
  | "chest_pain"
  | "stroke"
  | "unconscious"
  | "seizure"
  | "bleeding"
  | "allergy"
  | "severe_infection"
  | "overdose"
  | "poisoning"
  | "snakebite"
  | "injury"
  | "suicide"
  | "pregnancy"
  | "postpartum"
  | "infant";

export type RedFlag = {
  id: RedFlagId;
  // Short label for the emergency checklist (plain English).
  label: string;
  // Title for Emergency Mode.
  title: string;
  // Mental health crisis: show crisis lines prominently.
  crisis?: boolean;
  // Short first-response guidance. Only sourced, widely taught steps.
  guidance: string[];
  sourceIds: string[];
  // Shown in the emergency checklist (some flags are only reached through
  // follow-up questions or free-text detection).
  inChecklist: boolean;
};

export const redFlags: RedFlag[] = [
  {
    id: "breathing",
    label: "Severe difficulty breathing, choking, or lips turning blue",
    title: "Severe breathing difficulty",
    guidance: [
      "Help the person sit upright.",
      "Loosen tight clothing.",
      "If they have their own prescribed inhaler, help them use it.",
    ],
    sourceIds: ["ifrc-first-aid-2020"],
    inChecklist: true,
  },
  {
    id: "chest_pain",
    label: "Chest pain, pressure, or tightness right now",
    title: "Chest pain",
    guidance: [
      "Help the person sit down and rest.",
      "Do not let them walk, climb stairs, or drive themselves to hospital.",
      "Stay with them until help arrives.",
    ],
    sourceIds: ["nhs-heart-attack", "ifrc-first-aid-2020"],
    inChecklist: true,
  },
  {
    id: "stroke",
    label: "Face drooping, weakness in an arm or leg, or slurred speech",
    title: "Possible stroke signs",
    guidance: [
      "Note the time the signs started — doctors need to know.",
      "Do not give food or drink.",
      "If they become unconscious but are breathing, turn them on their side.",
    ],
    sourceIds: ["nhs-stroke", "ifrc-first-aid-2020"],
    inChecklist: true,
  },
  {
    id: "unconscious",
    label: "Fainted, unconscious, or cannot be woken properly",
    title: "Unconscious or hard to wake",
    guidance: [
      "If they are breathing, turn them on their side so they do not choke.",
      "If they are not breathing normally, tell the emergency call-taker straight away and follow their instructions.",
      "Do not give food or drink.",
    ],
    sourceIds: ["ifrc-first-aid-2020"],
    inChecklist: true,
  },
  {
    id: "seizure",
    label: "Having fits (seizures), or just had one",
    title: "Fits (seizure)",
    guidance: [
      "Move hard or sharp objects away from them.",
      "Do not hold them down or put anything in their mouth.",
      "Note how long the fit lasts. When it stops, turn them on their side.",
    ],
    sourceIds: ["ifrc-first-aid-2020"],
    inChecklist: true,
  },
  {
    id: "bleeding",
    label: "Heavy bleeding that will not stop, or vomiting blood",
    title: "Heavy bleeding",
    guidance: [
      "If bleeding is from a wound, press firmly on it with a clean cloth and keep pressing.",
      "Keep the person lying down and still.",
    ],
    sourceIds: ["ifrc-first-aid-2020"],
    inChecklist: true,
  },
  {
    id: "allergy",
    label: "Swelling of the lips, tongue, or throat, or a severe allergic reaction",
    title: "Severe allergic reaction",
    guidance: [
      "If they have their own prescribed adrenaline auto-injector, help them use it.",
      "If breathing is difficult, help them sit up. If they feel faint, help them lie down.",
    ],
    sourceIds: ["nhs-anaphylaxis", "ifrc-first-aid-2020"],
    inChecklist: true,
  },
  {
    id: "severe_infection",
    label: "Very unwell with fever: confusion, stiff neck, or a rash that does not fade when pressed",
    title: "Very unwell with signs of serious infection",
    guidance: ["Go to the nearest hospital emergency now.", "Keep the person comfortable and stay with them."],
    sourceIds: ["nhs-sepsis", "who-dengue-2009"],
    inChecklist: true,
  },
  {
    id: "overdose",
    label: "Took too much medicine or drugs (overdose)",
    title: "Possible overdose",
    guidance: [
      "Try to wake them. If they are breathing, turn them on their side.",
      "Stay with them. Do not leave them alone.",
      "Keep any medicine or drug packets to show the doctor.",
    ],
    sourceIds: ["who-opioid-overdose", "ifrc-first-aid-2020"],
    inChecklist: true,
  },
  {
    id: "poisoning",
    label: "Swallowed poison, pesticide, or a harmful chemical",
    title: "Possible poisoning",
    guidance: [
      "Do not make them vomit.",
      "Keep the container or label to show the doctor.",
      "If they are unconscious but breathing, turn them on their side.",
    ],
    sourceIds: ["ifrc-first-aid-2020"],
    inChecklist: true,
  },
  {
    id: "snakebite",
    label: "Snake bite",
    title: "Snake bite",
    guidance: [
      "Keep the person calm and still, and keep the bitten limb still.",
      "Remove rings, watches, or tight items near the bite.",
      "Do not cut, suck, or tie a tight band around the bite.",
    ],
    sourceIds: ["who-snakebite"],
    inChecklist: true,
  },
  {
    id: "injury",
    label: "Serious injury, accident, head injury, or large burn",
    title: "Serious injury",
    guidance: [
      "If a neck or back injury is possible, do not move the person unless they are in danger.",
      "Press firmly on any bleeding wound.",
      "Cool burns under cool running water for 20 minutes.",
    ],
    sourceIds: ["ifrc-first-aid-2020", "nhs-head-injury"],
    inChecklist: true,
  },
  {
    id: "suicide",
    label: "Thoughts of suicide or harming yourself",
    title: "You are not alone — help is available now",
    crisis: true,
    guidance: [
      "If you can, stay with someone you trust, or ask someone to come and be with you.",
      "If it is safe, move away from anything that could be used for harm.",
      "Talk to a trained counsellor now on Tele-MANAS 14416 (free, 24 hours).",
    ],
    sourceIds: ["who-mhgap", "telemanas"],
    inChecklist: true,
  },
  {
    id: "pregnancy",
    label: "Pregnant with bleeding, fits, severe headache, water breaking, or baby moving less",
    title: "Pregnancy danger sign",
    guidance: [
      "Go to the hospital now.",
      "Take the Mother and Child Protection (MCP) card with you.",
    ],
    sourceIds: ["mohfw-mcp-card", "who-anc-2016"],
    inChecklist: true,
  },
  {
    id: "postpartum",
    label: "Recently gave birth with heavy bleeding, fits, severe headache, or breathing difficulty",
    title: "Danger sign after giving birth",
    guidance: ["Go to the hospital now.", "Take your discharge papers and MCP card if you have them."],
    sourceIds: ["who-postnatal-2022"],
    inChecklist: true,
  },
  {
    id: "infant",
    label: "Baby or young child: not feeding, very sleepy or hard to wake, fits, or chest pulling in",
    title: "Seriously ill baby or young child",
    guidance: ["Keep the baby warm.", "If the baby can feed, keep breastfeeding on the way to hospital."],
    sourceIds: ["who-imci"],
    inChecklist: true,
  },
];

const byId = new Map(redFlags.map((f) => [f.id, f]));

export function getRedFlag(id: RedFlagId): RedFlag {
  const f = byId.get(id);
  if (!f) throw new Error(`Unknown red flag: ${id}`);
  return f;
}
