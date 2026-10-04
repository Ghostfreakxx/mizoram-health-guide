// AI Hospital triage engine — deterministic and rule-based.
//
// It answers "What should I do next?", never "What disease do I have?".
// It never names a disease, never estimates probabilities, and never
// suggests medicines or doses.
//
// Rules:
// 1. A RED answer stops triage immediately (emergency override).
// 2. Levels can only be raised by answers, never lowered by reassuring ones.
// 3. Uncertainty principle: "not sure" about an emergency sign → urgent
//    assessment; higher-risk groups never receive GREEN.
// 4. Any internal error returns a fail-safe result that directs the person to
//    human healthcare — never casual advice.

import { type RedFlagId, getRedFlag } from "./redFlags";

export type Level = "RED" | "ORANGE" | "YELLOW" | "GREEN";
export const LEVEL_ORDER: Level[] = ["RED", "ORANGE", "YELLOW", "GREEN"];
const rank = (l: Level) => LEVEL_ORDER.indexOf(l);
export const moreUrgent = (a: Level, b: Level): Level => (rank(a) <= rank(b) ? a : b);

export type AgeGroup = "young-infant" | "child-under-5" | "child" | "adult" | "older";

export const AGE_GROUPS: { id: AgeGroup; label: string }[] = [
  { id: "young-infant", label: "Baby under 2 months" },
  { id: "child-under-5", label: "2 months to 4 years" },
  { id: "child", label: "5 to 17 years" },
  { id: "adult", label: "18 to 59 years" },
  { id: "older", label: "60 years or older" },
];

export type Special = "pregnant" | "postpartum" | "immunocompromised";

export const SPECIALS: { id: Special; label: string; hint: string }[] = [
  { id: "pregnant", label: "Pregnant", hint: "" },
  { id: "postpartum", label: "Gave birth in the last 6 weeks", hint: "" },
  { id: "immunocompromised", label: "Weak immune system", hint: "For example: living with HIV, having cancer treatment, taking steroid tablets, or after an organ transplant" },
];

export type Context = {
  who: "self" | "other";
  age: AgeGroup;
  sex?: "female" | "male" | "other";
  special: Special[];
  complaint: string;
};

type Effect = { emergency: RedFlagId } | { level: Level; now?: boolean };

export type Question = {
  id: string;
  text: string;
  help?: string;
  // Only asked when this returns true.
  showIf?: (c: Context) => boolean;
  yes: Effect;
  // Defaults: emergency question → ORANGE (now); otherwise same as yes.
  unsure?: Effect;
  // Wording used in the doctor summary.
  positive: string;
  negative: string;
  sourceIds: string[];
};

export type ChoiceQuestion = {
  id: string;
  text: string;
  options: { id: string; label: string }[];
  // Recorded for the doctor summary only; does not change urgency.
  summaryLabel: string;
  showIf?: (c: Context) => boolean;
};

export type Complaint = {
  id: string;
  label: string;
  icon: string;
  departments: string[];
  topic?: string;
  // Starting level before any answers.
  base: Level;
  baseNow?: boolean;
  baseReason?: { text: string; sourceIds: string[] };
  questions: Question[];
  choices?: ChoiceQuestion[];
  services: string[];
  selfCare: { text: string; sourceIds: string[] }[];
};

const young = (c: Context) => c.age === "young-infant" || c.age === "child-under-5";

// ---------------- Special-population questions ----------------
// Asked before complaint-specific questions, only when they apply.

export const populationQuestions: Question[] = [
  // Young infants (under 2 months) — WHO IMCI young infant danger signs
  {
    id: "yi-feeding",
    text: "Is the baby not feeding well, or unable to breastfeed?",
    showIf: (c) => c.age === "young-infant",
    yes: { emergency: "infant" },
    positive: "Baby not feeding well",
    negative: "Baby is feeding",
    sourceIds: ["who-imci"],
  },
  {
    id: "yi-movement",
    text: "Does the baby move only when touched, or not move at all?",
    showIf: (c) => c.age === "young-infant",
    yes: { emergency: "infant" },
    positive: "Baby moves only when stimulated",
    negative: "Baby moving normally",
    sourceIds: ["who-imci"],
  },
  {
    id: "yi-breathing",
    text: "Is the baby breathing very fast, or does the chest pull in with each breath?",
    showIf: (c) => c.age === "young-infant",
    yes: { emergency: "infant" },
    positive: "Fast breathing or chest indrawing",
    negative: "No fast breathing or chest indrawing",
    sourceIds: ["who-imci"],
  },
  {
    id: "yi-temp",
    text: "Does the baby feel hot (fever), or unusually cold?",
    help: "A temperature of 38°C or more, or a baby who feels cold to touch.",
    showIf: (c) => c.age === "young-infant",
    yes: { level: "ORANGE", now: true },
    positive: "Fever or low temperature in a young baby",
    negative: "No fever or low temperature",
    sourceIds: ["who-imci", "nhs-fever-children"],
  },
  // Children 2 months – 4 years — WHO IMCI general danger signs
  {
    id: "c5-drink",
    text: "Is the child unable to drink or breastfeed?",
    showIf: (c) => c.age === "child-under-5",
    yes: { emergency: "infant" },
    positive: "Unable to drink or breastfeed",
    negative: "Able to drink",
    sourceIds: ["who-imci"],
  },
  {
    id: "c5-vomit",
    text: "Does the child vomit everything they eat or drink?",
    showIf: (c) => c.age === "child-under-5",
    yes: { emergency: "infant" },
    positive: "Vomits everything",
    negative: "Not vomiting everything",
    sourceIds: ["who-imci"],
  },
  {
    id: "c5-lethargic",
    text: "Is the child very sleepy, floppy, or difficult to wake?",
    showIf: (c) => c.age === "child-under-5",
    yes: { emergency: "infant" },
    positive: "Very sleepy or difficult to wake",
    negative: "Alert",
    sourceIds: ["who-imci"],
  },
  {
    id: "c5-chest",
    text: "Does the child's chest pull in when they breathe in?",
    showIf: (c) => c.age === "child-under-5",
    yes: { emergency: "infant" },
    positive: "Chest indrawing",
    negative: "No chest indrawing",
    sourceIds: ["who-imci"],
  },
  // Any age: fits
  {
    id: "any-fits",
    text: "Has the person had fits (seizures) with this illness?",
    showIf: (c) => young(c),
    yes: { emergency: "seizure" },
    positive: "Fits during this illness",
    negative: "No fits",
    sourceIds: ["who-imci"],
  },
  // Pregnancy — MCP card danger signs
  {
    id: "preg-bleeding",
    text: "Is there any bleeding from the vagina?",
    showIf: (c) => c.special.includes("pregnant"),
    yes: { emergency: "pregnancy" },
    positive: "Vaginal bleeding in pregnancy",
    negative: "No vaginal bleeding",
    sourceIds: ["mohfw-mcp-card"],
  },
  {
    id: "preg-headache",
    text: "Severe headache, blurred vision, fits, or swelling of the face and hands?",
    showIf: (c) => c.special.includes("pregnant"),
    yes: { emergency: "pregnancy" },
    positive: "Severe headache, blurred vision, fits, or face/hand swelling in pregnancy",
    negative: "No severe headache, blurred vision, fits, or face/hand swelling",
    sourceIds: ["mohfw-mcp-card"],
  },
  {
    id: "preg-water",
    text: "Has the water broken, or are there regular painful contractions?",
    showIf: (c) => c.special.includes("pregnant"),
    yes: { emergency: "pregnancy" },
    positive: "Water broken or regular contractions",
    negative: "Water not broken, no regular contractions",
    sourceIds: ["mohfw-mcp-card"],
  },
  {
    id: "preg-movement",
    text: "Is the baby moving less than usual?",
    help: "Only answer if the pregnancy is far enough along to feel the baby move.",
    showIf: (c) => c.special.includes("pregnant"),
    yes: { emergency: "pregnancy" },
    positive: "Reduced baby movements",
    negative: "Baby moving as usual",
    sourceIds: ["mohfw-mcp-card"],
  },
  {
    id: "preg-fever",
    text: "Is there a high fever?",
    showIf: (c) => c.special.includes("pregnant"),
    yes: { level: "ORANGE", now: true },
    positive: "High fever in pregnancy",
    negative: "No high fever",
    sourceIds: ["mohfw-mcp-card"],
  },
  // Postpartum — WHO postnatal danger signs
  {
    id: "pp-bleeding",
    text: "Is there heavy bleeding from the vagina?",
    showIf: (c) => c.special.includes("postpartum"),
    yes: { emergency: "postpartum" },
    positive: "Heavy bleeding after birth",
    negative: "No heavy bleeding",
    sourceIds: ["who-postnatal-2022"],
  },
  {
    id: "pp-fits",
    text: "Fits, severe headache, blurred vision, or difficulty breathing?",
    showIf: (c) => c.special.includes("postpartum"),
    yes: { emergency: "postpartum" },
    positive: "Fits, severe headache, blurred vision, or breathing difficulty after birth",
    negative: "No fits, severe headache, blurred vision, or breathing difficulty",
    sourceIds: ["who-postnatal-2022"],
  },
  {
    id: "pp-harm",
    text: "Any thoughts of harming yourself or the baby?",
    showIf: (c) => c.special.includes("postpartum"),
    yes: { emergency: "suicide" },
    positive: "Thoughts of harming self or baby",
    negative: "No thoughts of harm",
    sourceIds: ["who-postnatal-2022", "who-mhgap"],
  },
  {
    id: "pp-fever",
    text: "Fever, foul-smelling discharge, or a painful, swollen leg?",
    showIf: (c) => c.special.includes("postpartum"),
    yes: { level: "ORANGE", now: true },
    positive: "Fever, foul discharge, or painful swollen leg after birth",
    negative: "No fever, foul discharge, or swollen leg",
    sourceIds: ["who-postnatal-2022"],
  },
  // Weak immune system — fever
  {
    id: "immuno-fever",
    text: "Is there a fever, or feeling hot and shivery?",
    showIf: (c) => c.special.includes("immunocompromised"),
    yes: { level: "ORANGE", now: true },
    positive: "Fever with a weak immune system",
    negative: "No fever",
    sourceIds: ["nhs-sepsis"],
  },
];

// ---------------- Complaints ----------------

export const complaints: Complaint[] = [
  {
    id: "fever",
    label: "Fever",
    icon: "🌡️",
    departments: ["general-medicine", "infectious-diseases"],
    topic: "/malaria",
    base: "ORANGE",
    baseReason: { text: "In Mizoram, fever should be tested for malaria the same day", sourceIds: ["nvbdcp-malaria"] },
    choices: [
      {
        id: "temp",
        text: "What was the highest temperature, if measured?",
        summaryLabel: "Highest temperature",
        options: [
          { id: "not-measured", label: "Not measured" },
          { id: "below-38", label: "Below 38°C" },
          { id: "38-39", label: "38°C to 38.9°C" },
          { id: "39-plus", label: "39°C or higher" },
        ],
      },
    ],
    questions: [
      { id: "fever-neck", text: "Stiff neck, or a rash that does not fade when pressed?", yes: { emergency: "severe_infection" }, positive: "Stiff neck or non-fading rash", negative: "No stiff neck or non-fading rash", sourceIds: ["nhs-sepsis"] },
      { id: "fever-confused", text: "Confusion, or very difficult to wake?", yes: { emergency: "severe_infection" }, positive: "Confusion or difficult to wake", negative: "Not confused", sourceIds: ["nhs-sepsis"] },
      { id: "fever-bleeding", text: "Bleeding from gums or nose, blood in vomit, or black stools?", yes: { emergency: "severe_infection" }, positive: "Bleeding from gums/nose, blood in vomit, or black stools", negative: "No bleeding", sourceIds: ["who-dengue-2009"] },
      { id: "fever-breathing", text: "Breathing faster than normal, or short of breath?", yes: { level: "ORANGE", now: true }, positive: "Fast breathing or breathlessness", negative: "No breathing difficulty", sourceIds: ["nhs-sepsis"] },
      { id: "fever-vomit", text: "Severe stomach pain, or vomiting again and again?", yes: { level: "ORANGE", now: true }, positive: "Severe stomach pain or persistent vomiting", negative: "No severe stomach pain or persistent vomiting", sourceIds: ["who-dengue-2009"] },
      { id: "fever-weaker", text: "Has the fever gone down, but the person now feels much weaker, very sleepy, or restless?", yes: { level: "ORANGE", now: true }, positive: "Fever went down but now much weaker, sleepy, or restless", negative: "No new weakness after fever went down", sourceIds: ["who-dengue-2009"] },
      { id: "fever-headache", text: "Severe headache?", yes: { level: "ORANGE" }, positive: "Severe headache", negative: "No severe headache", sourceIds: ["who-dengue-2009"] },
      { id: "fever-chills", text: "Shivering and chills?", yes: { level: "ORANGE" }, positive: "Shivering and chills", negative: "No chills", sourceIds: ["nvbdcp-malaria"] },
      { id: "fever-travel", text: "Recently in forest, jhum fields, or border areas, or many mosquito bites?", yes: { level: "ORANGE" }, positive: "Recent forest/jhum/border area or many mosquito bites", negative: "No recent forest/jhum/border area exposure", sourceIds: ["nvbdcp-malaria"] },
      { id: "fever-tb", text: "Cough for 2 weeks or more, night sweats, or weight loss?", yes: { level: "YELLOW" }, positive: "Cough 2+ weeks, night sweats, or weight loss", negative: "No long cough, night sweats, or weight loss", sourceIds: ["ntep-presumptive-tb"] },
    ],
    services: ["malaria"],
    selfCare: [],
  },
  {
    id: "cough",
    label: "Cough or breathing problem",
    icon: "😷",
    departments: ["respiratory", "tb-services"],
    topic: "/tb",
    base: "GREEN",
    questions: [
      { id: "cough-severe", text: "Severe difficulty breathing, or lips turning blue?", yes: { emergency: "breathing" }, positive: "Severe breathing difficulty", negative: "No severe breathing difficulty", sourceIds: ["ifrc-first-aid-2020"] },
      { id: "cough-blood", text: "Coughing up blood?", yes: { level: "ORANGE" }, positive: "Coughing up blood", negative: "Not coughing up blood", sourceIds: ["nhs-cough"] },
      { id: "cough-chestpain", text: "Chest pain when breathing or coughing?", yes: { level: "ORANGE" }, positive: "Chest pain with breathing or coughing", negative: "No chest pain with breathing", sourceIds: ["nhs-cough"] },
      { id: "cough-wheeze", text: "Wheezing, or the chest feels tight?", yes: { level: "ORANGE" }, positive: "Wheezing or tight chest", negative: "No wheezing", sourceIds: ["nhs-cough"] },
      { id: "cough-fever", text: "Fever with the cough?", yes: { level: "ORANGE" }, positive: "Fever with cough", negative: "No fever", sourceIds: ["nvbdcp-malaria"] },
      { id: "cough-2weeks", text: "Has the cough lasted 2 weeks or more?", yes: { level: "YELLOW" }, positive: "Cough for 2 weeks or more", negative: "Cough less than 2 weeks", sourceIds: ["ntep-presumptive-tb"] },
      { id: "cough-sweats", text: "Night sweats, or losing weight without trying?", yes: { level: "YELLOW" }, positive: "Night sweats or weight loss", negative: "No night sweats or weight loss", sourceIds: ["ntep-presumptive-tb"] },
    ],
    services: ["ntep"],
    selfCare: [
      { text: "Rest and drink warm fluids.", sourceIds: ["nhs-cough"] },
      { text: "Cover coughs and sneezes, and wash your hands.", sourceIds: ["ntep-presumptive-tb"] },
      { text: "Avoid smoke and tobacco.", sourceIds: ["nhs-cough"] },
    ],
  },
  {
    id: "heart",
    label: "Chest discomfort, heartbeat, or blood pressure",
    icon: "❤️",
    departments: ["cardiology"],
    topic: "/heart",
    base: "YELLOW",
    baseReason: { text: "Chest and heart symptoms should be checked by a doctor", sourceIds: ["nhs-heart-attack"] },
    questions: [
      { id: "heart-now", text: "Chest pain, pressure, or tightness right now?", yes: { emergency: "chest_pain" }, positive: "Chest pain now", negative: "No chest pain now", sourceIds: ["nhs-heart-attack"] },
      { id: "heart-spread", text: "Pain spreading to the arm, neck, jaw, back, or stomach?", yes: { emergency: "chest_pain" }, positive: "Pain spreading to arm/neck/jaw/back", negative: "No spreading pain", sourceIds: ["nhs-heart-attack"] },
      { id: "heart-sweat", text: "Sweating, feeling sick, or short of breath with chest discomfort?", yes: { emergency: "chest_pain" }, positive: "Sweating, nausea, or breathlessness with chest discomfort", negative: "No sweating or breathlessness with chest discomfort", sourceIds: ["nhs-heart-attack"] },
      { id: "heart-exertion", text: "Chest discomfort during activity that goes away with rest?", yes: { level: "ORANGE" }, positive: "Chest discomfort on activity", negative: "No chest discomfort on activity", sourceIds: ["nhs-heart-attack"] },
      { id: "heart-veryhigh", text: "Blood pressure measured at 180/120 or higher?", yes: { level: "ORANGE", now: true }, positive: "Blood pressure 180/120 or higher", negative: "Blood pressure not measured at 180/120 or higher", sourceIds: ["nhs-high-bp"] },
      { id: "heart-irregular", text: "Very fast, pounding, or irregular heartbeat with dizziness?", yes: { level: "ORANGE" }, positive: "Fast or irregular heartbeat with dizziness", negative: "No irregular heartbeat with dizziness", sourceIds: ["nhs-heart-attack"] },
      { id: "heart-swelling", text: "Swollen feet or ankles with breathlessness?", yes: { level: "ORANGE" }, positive: "Swollen feet with breathlessness", negative: "No swollen feet with breathlessness", sourceIds: ["nhs-heart-attack"] },
      { id: "heart-high", text: "Blood pressure measured at 140/90 or higher?", yes: { level: "YELLOW" }, positive: "Blood pressure 140/90 or higher", negative: "Blood pressure not measured at 140/90 or higher", sourceIds: ["who-hypertension"] },
    ],
    services: ["np-ncd"],
    selfCare: [],
  },
  {
    id: "stomach",
    label: "Stomach pain, vomiting, or diarrhoea",
    icon: "🤢",
    departments: ["general-medicine"],
    base: "GREEN",
    questions: [
      { id: "stomach-blood", text: "Vomiting blood, or black or bloody stools?", yes: { emergency: "bleeding" }, positive: "Vomiting blood or black/bloody stools", negative: "No blood in vomit or stools", sourceIds: ["who-diarrhoea"] },
      { id: "stomach-pain", text: "Severe stomach pain that does not go away?", yes: { level: "ORANGE", now: true }, positive: "Severe constant stomach pain", negative: "No severe constant stomach pain", sourceIds: ["who-dengue-2009"] },
      { id: "stomach-dry", text: "Very little urine, very dry mouth, or dizzy when standing?", yes: { level: "ORANGE" }, positive: "Signs of dehydration", negative: "No signs of dehydration", sourceIds: ["who-diarrhoea"] },
      { id: "stomach-fluids", text: "Cannot keep any fluids down?", yes: { level: "ORANGE" }, positive: "Cannot keep fluids down", negative: "Keeping fluids down", sourceIds: ["who-diarrhoea"] },
      { id: "stomach-bloody", text: "Diarrhoea with blood in it?", yes: { level: "ORANGE" }, positive: "Bloody diarrhoea", negative: "No blood in diarrhoea", sourceIds: ["who-diarrhoea"] },
      { id: "stomach-yellow", text: "Yellow eyes or skin?", yes: { level: "YELLOW" }, positive: "Yellow eyes or skin", negative: "No yellow eyes or skin", sourceIds: ["policy-uncertainty"] },
      { id: "stomach-swallow", text: "Difficulty swallowing, or losing weight without trying?", yes: { level: "YELLOW" }, positive: "Difficulty swallowing or weight loss", negative: "No difficulty swallowing or weight loss", sourceIds: ["policy-uncertainty"] },
    ],
    services: [],
    selfCare: [
      { text: "Drink plenty of fluids, including ORS (oral rehydration solution).", sourceIds: ["who-diarrhoea"] },
      { text: "Eat small, light meals.", sourceIds: ["who-diarrhoea"] },
      { text: "Wash hands with soap after using the toilet and before eating.", sourceIds: ["who-diarrhoea"] },
    ],
  },
  {
    id: "headache",
    label: "Headache or dizziness",
    icon: "🤕",
    departments: ["general-medicine"],
    base: "GREEN",
    questions: [
      { id: "head-worst", text: "Sudden, very severe headache — the worst ever?", yes: { emergency: "stroke" }, positive: "Sudden severe headache", negative: "No sudden severe headache", sourceIds: ["nhs-stroke"] },
      { id: "head-stroke", text: "Face drooping, arm or leg weakness, or slurred speech?", yes: { emergency: "stroke" }, positive: "Face drooping, limb weakness, or slurred speech", negative: "No face drooping, weakness, or speech problems", sourceIds: ["nhs-stroke"] },
      { id: "head-neck", text: "Headache with fever and a stiff neck?", yes: { emergency: "severe_infection" }, positive: "Headache with fever and stiff neck", negative: "No fever with stiff neck", sourceIds: ["nhs-sepsis"] },
      { id: "head-injury", text: "Headache after a head injury, with vomiting or drowsiness?", yes: { emergency: "injury" }, positive: "Headache after head injury with vomiting or drowsiness", negative: "No recent head injury with vomiting or drowsiness", sourceIds: ["nhs-head-injury"] },
      { id: "head-faint", text: "Fainting or nearly fainting?", yes: { level: "ORANGE" }, positive: "Fainting or near-fainting", negative: "No fainting", sourceIds: ["policy-uncertainty"] },
      { id: "head-vision", text: "Blurred or double vision?", yes: { level: "ORANGE" }, positive: "Blurred or double vision", negative: "No vision changes", sourceIds: ["nhs-vision-loss"] },
      { id: "head-repeat", text: "Headaches that keep coming back for weeks?", yes: { level: "YELLOW" }, positive: "Recurring headaches for weeks", negative: "Not recurring for weeks", sourceIds: ["policy-uncertainty"] },
    ],
    services: [],
    selfCare: [
      { text: "Rest in a quiet, dark room.", sourceIds: ["policy-uncertainty"] },
      { text: "Drink water and get enough sleep.", sourceIds: ["policy-uncertainty"] },
    ],
  },
  {
    id: "injury",
    label: "Injury, wound, burn, or bite",
    icon: "🩹",
    departments: ["emergency", "orthopaedics"],
    base: "GREEN",
    questions: [
      { id: "inj-head", text: "Head injury with vomiting, drowsiness, confusion, or passing out?", yes: { emergency: "injury" }, positive: "Head injury with vomiting/drowsiness/confusion", negative: "No head injury warning signs", sourceIds: ["nhs-head-injury"] },
      { id: "inj-snake", text: "Snake bite?", yes: { emergency: "snakebite" }, positive: "Snake bite", negative: "Not a snake bite", sourceIds: ["who-snakebite"] },
      { id: "inj-bleed", text: "Heavy bleeding that does not stop with pressure?", yes: { emergency: "bleeding" }, positive: "Heavy bleeding not stopping", negative: "No uncontrolled bleeding", sourceIds: ["ifrc-first-aid-2020"] },
      { id: "inj-animal", text: "Bitten or scratched by a dog, cat, monkey, or other animal?", yes: { level: "ORANGE", now: true }, positive: "Animal bite or scratch", negative: "No animal bite", sourceIds: ["who-rabies"] },
      { id: "inj-bone", text: "A bone may be broken, or cannot move or put weight on the limb?", yes: { level: "ORANGE" }, positive: "Possible broken bone", negative: "Can move the limb", sourceIds: ["ifrc-first-aid-2020"] },
      { id: "inj-deep", text: "Deep cut, or a cut that gapes open?", yes: { level: "ORANGE" }, positive: "Deep or gaping cut", negative: "No deep cut", sourceIds: ["ifrc-first-aid-2020"] },
      { id: "inj-burn", text: "Burn larger than the person's palm, or on the face, hands, feet, or private parts?", yes: { level: "ORANGE" }, positive: "Large burn or burn on face/hands/feet/genitals", negative: "Small burn only", sourceIds: ["ifrc-first-aid-2020"] },
      { id: "inj-infected", text: "Wound that is red, hot, swollen, or has pus?", yes: { level: "YELLOW" }, positive: "Wound red, hot, swollen, or with pus", negative: "Wound not infected-looking", sourceIds: ["ifrc-first-aid-2020"] },
    ],
    services: [],
    selfCare: [
      { text: "Wash small cuts with clean water and cover with a clean dressing.", sourceIds: ["ifrc-first-aid-2020"] },
      { text: "Cool small burns under cool running water for 20 minutes.", sourceIds: ["ifrc-first-aid-2020"] },
      { text: "After any animal bite, wash the wound with soap and water and see a health worker the same day.", sourceIds: ["who-rabies"] },
    ],
  },
  {
    id: "ent",
    label: "Ear, nose, or throat",
    icon: "👂",
    departments: ["ent"],
    base: "GREEN",
    questions: [
      { id: "ent-airway", text: "Difficulty breathing, or unable to swallow saliva?", yes: { emergency: "breathing" }, positive: "Difficulty breathing or swallowing saliva", negative: "No breathing or swallowing difficulty", sourceIds: ["ifrc-first-aid-2020"] },
      { id: "ent-hearing", text: "Sudden loss of hearing?", yes: { level: "ORANGE", now: true }, positive: "Sudden hearing loss", negative: "No sudden hearing loss", sourceIds: ["nhs-hearing-loss"] },
      { id: "ent-ear", text: "Ear pain with high fever, or swelling behind the ear?", yes: { level: "ORANGE" }, positive: "Ear pain with high fever or swelling behind ear", negative: "No swelling behind ear", sourceIds: ["policy-uncertainty"] },
      { id: "ent-nose", text: "Nosebleed that does not stop after pinching the nose for 15 minutes?", yes: { level: "ORANGE", now: true }, positive: "Nosebleed not stopping", negative: "No persistent nosebleed", sourceIds: ["ifrc-first-aid-2020"] },
      { id: "ent-voice", text: "Hoarse voice for more than 3 weeks?", yes: { level: "YELLOW" }, positive: "Hoarse voice over 3 weeks", negative: "No long-lasting hoarseness", sourceIds: ["policy-uncertainty"] },
    ],
    services: ["nppcd"],
    selfCare: [{ text: "Rest and drink warm fluids.", sourceIds: ["policy-uncertainty"] }],
  },
  {
    id: "mouth",
    label: "Mouth or teeth",
    icon: "🦷",
    departments: ["dental"],
    topic: "/tobacco",
    base: "GREEN",
    questions: [
      { id: "mouth-swell", text: "Swelling of the face or neck with difficulty swallowing or breathing?", yes: { emergency: "breathing" }, positive: "Face/neck swelling with swallowing or breathing difficulty", negative: "No swelling with breathing difficulty", sourceIds: ["ifrc-first-aid-2020"] },
      { id: "mouth-ulcer", text: "Mouth ulcer, or white or red patch, lasting more than 2 weeks?", yes: { level: "YELLOW" }, positive: "Mouth ulcer or patch over 2 weeks", negative: "No long-lasting ulcer or patch", sourceIds: ["np-ncd"] },
      { id: "mouth-open", text: "Difficulty opening the mouth fully?", yes: { level: "YELLOW" }, positive: "Difficulty opening mouth", negative: "Opens mouth normally", sourceIds: ["np-ncd"] },
      { id: "mouth-lump", text: "A lump in the mouth or neck?", yes: { level: "YELLOW" }, positive: "Lump in mouth or neck", negative: "No lump", sourceIds: ["np-ncd"] },
      { id: "mouth-tooth", text: "Severe toothache, or swelling around a tooth?", yes: { level: "YELLOW" }, positive: "Severe toothache or swelling", negative: "No severe toothache", sourceIds: ["nohp"] },
    ],
    services: ["nohp", "np-ncd", "quitline"],
    selfCare: [
      { text: "Rinse with warm salt water and brush gently twice a day.", sourceIds: ["nohp"] },
      { text: "Stop tobacco and kuhva — free help: 1800-11-2356.", sourceIds: ["ntcp-quitline"] },
    ],
  },
  {
    id: "eye",
    label: "Eye problem",
    icon: "👁️",
    departments: ["eye-care"],
    base: "GREEN",
    questions: [
      { id: "eye-sudden", text: "Sudden loss of vision in one or both eyes?", yes: { level: "ORANGE", now: true }, positive: "Sudden vision loss", negative: "No sudden vision loss", sourceIds: ["nhs-vision-loss"] },
      { id: "eye-chemical", text: "Chemical splash or injury to the eye?", yes: { level: "ORANGE", now: true }, positive: "Chemical splash or eye injury", negative: "No eye injury", sourceIds: ["ifrc-first-aid-2020"] },
      { id: "eye-painful", text: "Painful red eye with blurred vision?", yes: { level: "ORANGE" }, positive: "Painful red eye with blurred vision", negative: "No painful red eye with blurred vision", sourceIds: ["nhs-vision-loss"] },
      { id: "eye-gradual", text: "Vision slowly getting blurry, or difficulty reading?", yes: { level: "YELLOW" }, positive: "Gradual blurring of vision", negative: "No gradual vision change", sourceIds: ["npcbvi"] },
    ],
    services: ["npcbvi"],
    selfCare: [{ text: "Keep the eye clean, do not rub it, and wash your hands often.", sourceIds: ["policy-uncertainty"] }],
  },
  {
    id: "skin",
    label: "Skin rash or patch",
    icon: "🔴",
    departments: ["dermatology"],
    base: "GREEN",
    questions: [
      { id: "skin-allergy", text: "Rash with swelling of the lips or face, or difficulty breathing?", yes: { emergency: "allergy" }, positive: "Rash with lip/face swelling or breathing difficulty", negative: "No swelling or breathing difficulty", sourceIds: ["nhs-anaphylaxis"] },
      { id: "skin-nonfading", text: "Rash that does not fade when pressed, with fever?", yes: { emergency: "severe_infection" }, positive: "Non-fading rash with fever", negative: "No non-fading rash with fever", sourceIds: ["nhs-sepsis"] },
      { id: "skin-blisters", text: "Painful blisters, or a rash spreading quickly?", yes: { level: "ORANGE" }, positive: "Painful blisters or fast-spreading rash", negative: "No painful blisters", sourceIds: ["policy-uncertainty"] },
      { id: "skin-numb", text: "A pale or reddish patch with loss of feeling?", yes: { level: "YELLOW" }, positive: "Patch with loss of feeling", negative: "No numb patch", sourceIds: ["nlep"] },
      { id: "skin-mole", text: "A mole or patch changing in size, shape, or colour?", yes: { level: "YELLOW" }, positive: "Changing mole or patch", negative: "No changing mole", sourceIds: ["policy-uncertainty"] },
      { id: "skin-long", text: "Itchy rash lasting more than 2 weeks?", yes: { level: "YELLOW" }, positive: "Itchy rash over 2 weeks", negative: "Rash less than 2 weeks", sourceIds: ["policy-uncertainty"] },
    ],
    services: ["nlep"],
    selfCare: [{ text: "Keep the skin clean and dry, avoid scratching, and wear loose cotton clothes.", sourceIds: ["policy-uncertainty"] }],
  },
  {
    id: "bones",
    label: "Joint, back, or bone pain",
    icon: "🦴",
    departments: ["orthopaedics"],
    base: "GREEN",
    questions: [
      { id: "bone-cauda", text: "Back pain with numbness around the private parts, or loss of bladder or bowel control?", yes: { level: "ORANGE", now: true }, positive: "Back pain with numbness in saddle area or loss of bladder/bowel control", negative: "No numbness or loss of bladder/bowel control", sourceIds: ["nhs-back-pain"] },
      { id: "bone-weak", text: "New weakness or numbness in the legs?", yes: { level: "ORANGE", now: true }, positive: "New leg weakness or numbness", negative: "No leg weakness", sourceIds: ["nhs-back-pain"] },
      { id: "bone-hot", text: "A hot, swollen joint with fever?", yes: { level: "ORANGE" }, positive: "Hot swollen joint with fever", negative: "No hot swollen joint with fever", sourceIds: ["policy-uncertainty"] },
      { id: "bone-fall", text: "After a fall or injury, cannot move or put weight on it?", yes: { level: "ORANGE" }, positive: "Cannot move or bear weight after injury", negative: "Can bear weight", sourceIds: ["ifrc-first-aid-2020"] },
    ],
    services: [],
    selfCare: [{ text: "Rest the painful area, and keep gently moving as pain allows.", sourceIds: ["nhs-back-pain"] }],
  },
  {
    id: "urine",
    label: "Urine problems",
    icon: "🚽",
    departments: ["general-medicine"],
    topic: "/diabetes",
    base: "YELLOW",
    baseReason: { text: "Urine problems should be checked by a doctor", sourceIds: ["policy-uncertainty"] },
    questions: [
      { id: "urine-none", text: "Unable to pass urine at all?", yes: { level: "ORANGE", now: true }, positive: "Unable to pass urine", negative: "Able to pass urine", sourceIds: ["policy-uncertainty"] },
      { id: "urine-fever", text: "Pain or burning with fever or back pain?", yes: { level: "ORANGE" }, positive: "Urine pain with fever or back pain", negative: "No fever or back pain", sourceIds: ["policy-uncertainty"] },
      { id: "urine-blood", text: "Blood in the urine?", yes: { level: "YELLOW" }, positive: "Blood in urine", negative: "No blood in urine", sourceIds: ["policy-uncertainty"] },
      { id: "urine-thirst", text: "Passing urine often and feeling very thirsty?", yes: { level: "YELLOW" }, positive: "Frequent urination and thirst", negative: "No frequent urination with thirst", sourceIds: ["np-ncd"] },
    ],
    services: ["np-ncd"],
    selfCare: [],
  },
  {
    id: "pregnancy",
    label: "Pregnancy concern",
    icon: "🤰",
    departments: ["obstetrics-gynaecology"],
    topic: "/mother-child",
    base: "YELLOW",
    baseReason: { text: "Pregnancy concerns should be checked by a health worker", sourceIds: ["mohfw-mcp-card"] },
    questions: [
      { id: "preg-urine", text: "Burning while passing urine?", yes: { level: "YELLOW" }, positive: "Burning urine in pregnancy", negative: "No burning urine", sourceIds: ["who-anc-2016"] },
      { id: "preg-mood", text: "Feeling very sad, worried, or unable to cope?", yes: { level: "YELLOW" }, positive: "Low mood or anxiety in pregnancy", negative: "Mood OK", sourceIds: ["who-mhgap"] },
    ],
    services: ["jssk"],
    selfCare: [],
  },
  {
    id: "child",
    label: "Baby or child is unwell",
    icon: "👶",
    departments: ["paediatrics"],
    topic: "/mother-child",
    base: "YELLOW",
    baseReason: { text: "A sick young child should be checked by a health worker", sourceIds: ["who-imci"] },
    questions: [
      { id: "child-fast", text: "Is the child breathing fast?", yes: { level: "ORANGE", now: true }, positive: "Fast breathing", negative: "Normal breathing rate", sourceIds: ["who-imci"] },
      { id: "child-dehydrated", text: "Diarrhoea with sunken eyes, or drinking very eagerly?", yes: { level: "ORANGE", now: true }, positive: "Diarrhoea with signs of dehydration", negative: "No signs of dehydration", sourceIds: ["who-imci"] },
      { id: "child-fever", text: "Fever?", yes: { level: "ORANGE" }, positive: "Fever", negative: "No fever", sourceIds: ["who-imci", "nvbdcp-malaria"] },
      { id: "child-weight", text: "Not growing or gaining weight?", yes: { level: "YELLOW" }, positive: "Poor growth or weight gain", negative: "Growing normally", sourceIds: ["rbsk"] },
    ],
    services: ["uip", "rbsk", "jssk"],
    selfCare: [],
  },
  {
    id: "mental",
    label: "Stress, sadness, or worry",
    icon: "🧠",
    departments: ["mental-health"],
    topic: "/mental",
    base: "YELLOW",
    baseReason: { text: "Talking to a professional helps — support is free", sourceIds: ["telemanas"] },
    questions: [
      { id: "mental-suicide", text: "Thoughts of suicide or harming yourself?", yes: { emergency: "suicide" }, unsure: { emergency: "suicide" }, positive: "Thoughts of suicide or self-harm", negative: "No thoughts of suicide or self-harm", sourceIds: ["who-mhgap"] },
      { id: "mental-psychosis", text: "Hearing or seeing things others don't, or very confused?", yes: { level: "ORANGE", now: true }, positive: "Hearing/seeing things or confusion", negative: "No hallucinations or confusion", sourceIds: ["who-mhgap"] },
      { id: "mental-selfcare", text: "Unable to eat, sleep, or look after yourself?", yes: { level: "ORANGE" }, positive: "Unable to eat, sleep, or self-care", negative: "Managing daily self-care", sourceIds: ["who-mhgap"] },
      { id: "mental-2weeks", text: "Feeling sad, hopeless, or anxious most days for 2 weeks or more?", yes: { level: "YELLOW" }, positive: "Low mood or anxiety for 2+ weeks", negative: "Not low most days for 2 weeks", sourceIds: ["who-mhgap"] },
      { id: "mental-substances", text: "Using alcohol or drugs to cope?", yes: { level: "YELLOW" }, positive: "Using alcohol or drugs to cope", negative: "Not using substances to cope", sourceIds: ["who-mhgap"] },
    ],
    services: ["telemanas"],
    selfCare: [],
  },
  {
    id: "cancer",
    label: "Lump, unusual bleeding, or weight loss",
    icon: "🎗️",
    departments: ["oncology"],
    topic: "/cancer",
    base: "YELLOW",
    baseReason: { text: "These signs should be examined by a doctor", sourceIds: ["np-ncd"] },
    questions: [
      { id: "cancer-heavy", text: "Heavy bleeding that will not stop?", yes: { emergency: "bleeding" }, positive: "Heavy bleeding", negative: "No heavy bleeding", sourceIds: ["ifrc-first-aid-2020"] },
      { id: "cancer-blood", text: "Vomiting or coughing up blood?", yes: { level: "ORANGE" }, positive: "Vomiting or coughing up blood", negative: "No blood in vomit or cough", sourceIds: ["nhs-cough"] },
      { id: "cancer-lump", text: "A new lump anywhere in the body?", yes: { level: "YELLOW" }, positive: "New lump", negative: "No new lump", sourceIds: ["np-ncd"] },
      { id: "cancer-weight", text: "Losing weight without trying?", yes: { level: "YELLOW" }, positive: "Unexplained weight loss", negative: "No unexplained weight loss", sourceIds: ["np-ncd"] },
      { id: "cancer-unusual", text: "Bleeding after menopause, between periods, or in urine or stool?", yes: { level: "YELLOW" }, positive: "Unusual bleeding", negative: "No unusual bleeding", sourceIds: ["np-ncd"] },
      { id: "cancer-wound", text: "A wound or mouth ulcer that does not heal?", yes: { level: "YELLOW" }, positive: "Non-healing wound or ulcer", negative: "No non-healing wound", sourceIds: ["np-ncd"] },
    ],
    services: ["np-ncd", "pmjay"],
    selfCare: [],
  },
  {
    id: "substance",
    label: "Alcohol or drug problem",
    icon: "🚫",
    departments: ["substance-use"],
    topic: "/drugs",
    base: "YELLOW",
    baseReason: { text: "Support and treatment are available", sourceIds: ["who-mhgap"] },
    questions: [
      { id: "sub-overdose", text: "Has someone taken too much and cannot be woken, or is breathing slowly?", yes: { emergency: "overdose" }, positive: "Possible overdose", negative: "No overdose signs", sourceIds: ["who-opioid-overdose"] },
      { id: "sub-fits", text: "Fits after stopping alcohol?", yes: { emergency: "seizure" }, positive: "Fits after stopping alcohol", negative: "No fits", sourceIds: ["who-mhgap"] },
      { id: "sub-withdrawal", text: "Severe shaking, confusion, or seeing things after stopping?", yes: { level: "ORANGE", now: true }, positive: "Severe withdrawal symptoms", negative: "No severe withdrawal symptoms", sourceIds: ["who-mhgap"] },
      { id: "sub-needles", text: "Has shared needles or syringes?", yes: { level: "YELLOW" }, positive: "Has shared needles", negative: "Has not shared needles", sourceIds: ["naco-guidelines"] },
      { id: "sub-stop", text: "Wants to stop but cannot?", yes: { level: "YELLOW" }, positive: "Wants to stop but cannot", negative: "—", sourceIds: ["who-mhgap"] },
    ],
    services: ["telemanas", "nmba", "naco-ictc"],
    selfCare: [],
  },
  {
    id: "hiv",
    label: "HIV or sexual health concern",
    icon: "🛡️",
    departments: ["hiv-services"],
    topic: "/hiv",
    base: "YELLOW",
    baseReason: { text: "Testing and advice are free and confidential", sourceIds: ["naco-guidelines"] },
    questions: [
      { id: "hiv-72h", text: "Possible exposure to HIV in the last 72 hours (3 days)?", help: "For example: sex without a condom, sharing a needle, or a needle-stick injury.", yes: { level: "ORANGE", now: true }, positive: "Possible HIV exposure within 72 hours", negative: "No exposure in the last 72 hours", sourceIds: ["naco-guidelines"] },
      { id: "hiv-older", text: "Possible exposure more than 3 days ago?", yes: { level: "YELLOW" }, positive: "Possible HIV exposure over 72 hours ago", negative: "—", sourceIds: ["naco-guidelines"] },
      { id: "hiv-symptoms", text: "Sores, unusual discharge, or pain in the private parts?", yes: { level: "YELLOW" }, positive: "Genital sores, discharge, or pain", negative: "No genital symptoms", sourceIds: ["naco-guidelines"] },
      { id: "hiv-tb", text: "Living with HIV and has fever, cough, or weight loss?", yes: { level: "ORANGE" }, positive: "Living with HIV with fever, cough, or weight loss", negative: "—", sourceIds: ["naco-guidelines", "ntep-presumptive-tb"] },
    ],
    services: ["naco-ictc", "aids-helpline"],
    selfCare: [],
  },
  {
    id: "other",
    label: "Something else",
    icon: "❔",
    departments: ["general-medicine"],
    base: "YELLOW",
    baseReason: { text: "We could not ask specific questions about this problem, so a doctor's advice is recommended", sourceIds: ["policy-uncertainty"] },
    questions: [],
    services: [],
    selfCare: [],
  },
];

// ---------------- Course of illness ----------------

export const DURATIONS = [
  { id: "today", label: "Started today" },
  { id: "1-3-days", label: "1 to 3 days" },
  { id: "4-14-days", label: "4 days to 2 weeks" },
  { id: "over-2-weeks", label: "More than 2 weeks" },
] as const;
export type Duration = (typeof DURATIONS)[number]["id"];

export const PROGRESSIONS = [
  { id: "better", label: "Getting better" },
  { id: "same", label: "About the same" },
  { id: "worse", label: "Getting worse" },
] as const;
export type Progression = (typeof PROGRESSIONS)[number]["id"];

export const SEVERITIES = [
  { id: "mild", label: "Mild", hint: "Can do normal activities" },
  { id: "moderate", label: "Moderate", hint: "Hard to do normal activities" },
  { id: "severe", label: "Severe", hint: "Can hardly do anything" },
] as const;
export type Severity = (typeof SEVERITIES)[number]["id"];

// ---------------- Answers and evaluation ----------------

export type Answer = "yes" | "no" | "unsure";

export type Answers = {
  context: Context;
  emergencyChecklist: RedFlagId[];
  answers: Record<string, Answer>;
  choices: Record<string, string>;
  duration?: Duration;
  progression?: Progression;
  severity?: Severity;
};

export type Reason = { text: string; sourceIds: string[] };

export type Result = {
  level: Level;
  now: boolean;
  emergency: RedFlagId[];
  reasons: Reason[];
  positives: string[];
  negatives: string[];
  unsure: string[];
  complaint: Complaint;
  departments: string[];
  services: string[];
  teleconsultSuitable: boolean;
  failsafe: boolean;
};

export function getComplaint(id: string): Complaint | undefined {
  return complaints.find((c) => c.id === id);
}

// The questions to ask, in order, for a given context.
export function questionsFor(context: Context): Question[] {
  const complaint = getComplaint(context.complaint);
  const pop = populationQuestions.filter((q) => !q.showIf || q.showIf(context));
  const own = (complaint?.questions ?? []).filter((q) => !q.showIf || q.showIf(context));
  return [...pop, ...own];
}

export function choicesFor(context: Context): ChoiceQuestion[] {
  return (getComplaint(context.complaint)?.choices ?? []).filter((q) => !q.showIf || q.showIf(context));
}

function effectOf(q: Question, a: Answer): Effect | null {
  if (a === "yes") return q.yes;
  if (a === "unsure") {
    if (q.unsure) return q.unsure;
    return "emergency" in q.yes ? { level: "ORANGE", now: true } : q.yes;
  }
  return null;
}

// Returns the red flag if an answer to this question triggers Emergency Mode.
export function emergencyFrom(q: Question, a: Answer): RedFlagId | null {
  const e = effectOf(q, a);
  return e && "emergency" in e ? e.emergency : null;
}

// Policy rules applied after the symptom questions. They can only RAISE
// urgency. Each has an ID so a clinician can review it by name
// (docs/CLINICAL_REVIEW.md); the engine below uses exactly these.
export type PolicyRule = { id: string; text: string; level: Level; now?: boolean; sourceIds: string[]; applies: string };
export const POLICY_RULES = {
  severe: { id: "P-SEVERE", text: "The problem is severe", level: "ORANGE", sourceIds: ["policy-uncertainty"], applies: "Patient says the problem is severe" },
  moderate: { id: "P-MODERATE", text: "The problem makes normal activities hard", level: "YELLOW", sourceIds: ["policy-uncertainty"], applies: "Patient says it makes normal activities hard" },
  worse: { id: "P-WORSE", text: "It is getting worse", level: "YELLOW", sourceIds: ["policy-uncertainty"], applies: "Patient says it is getting worse" },
  long: { id: "P-2WEEKS", text: "It has lasted more than 2 weeks", level: "YELLOW", sourceIds: ["policy-uncertainty"], applies: "Duration more than 2 weeks" },
  notBetter: { id: "P-3DAYS", text: "It has lasted more than 3 days without getting better", level: "YELLOW", sourceIds: ["policy-uncertainty"], applies: "Duration 4–14 days and not getting better" },
  youngInfant: { id: "P-INFANT", text: "Babies under 2 months can become seriously ill quickly", level: "ORANGE", now: true, sourceIds: ["who-imci"], applies: "Age under 2 months" },
  underFive: { id: "P-UNDER5", text: "A sick young child should be checked by a health worker", level: "YELLOW", sourceIds: ["who-imci"], applies: "Age 2 months to 4 years" },
  older: { id: "P-OLDER", text: "People aged 60 and over should have new symptoms checked", level: "YELLOW", sourceIds: ["policy-uncertainty"], applies: "Age 60 or older" },
  pregnant: { id: "P-PREGNANT", text: "Pregnancy needs extra care", level: "YELLOW", sourceIds: ["mohfw-mcp-card"], applies: "Pregnant" },
  postpartum: { id: "P-POSTPARTUM", text: "The weeks after giving birth need extra care", level: "YELLOW", sourceIds: ["who-postnatal-2022"], applies: "Gave birth in the last 6 weeks" },
  immuno: { id: "P-IMMUNO", text: "A weak immune system needs extra care", level: "YELLOW", sourceIds: ["nhs-sepsis"], applies: "Weak immune system" },
  missing: { id: "P-MISSING", text: "Not enough information to recommend self-care", level: "YELLOW", sourceIds: ["policy-uncertainty"], applies: "Result would be self-care but duration, severity or course is unknown" },
} as const satisfies Record<string, PolicyRule>;

function evaluate(a: Answers): Result {
  const complaint = getComplaint(a.context.complaint) ?? getComplaint("other")!;
  const ctx: Context = { ...a.context, complaint: complaint.id };
  const reasons: Reason[] = [];
  const positives: string[] = [];
  const negatives: string[] = [];
  const unsure: string[] = [];
  const emergency = new Set<RedFlagId>(a.emergencyChecklist);

  let level: Level = complaint.base;
  let now = !!complaint.baseNow;
  if (complaint.baseReason && complaint.base !== "GREEN") reasons.push(complaint.baseReason);

  const raise = (l: Level, n: boolean | undefined, reason: Reason) => {
    if (rank(l) < rank(level)) {
      level = l;
      now = !!n;
    } else if (l === level && n) {
      now = true;
    }
    reasons.push(reason);
  };

  for (const q of questionsFor(ctx)) {
    const ans = a.answers[q.id];
    if (!ans) continue;
    if (ans === "no") {
      if (q.negative !== "—") negatives.push(q.negative);
      continue;
    }
    if (ans === "yes") positives.push(q.positive);
    else unsure.push(q.positive);
    const e = effectOf(q, ans)!;
    if ("emergency" in e) {
      emergency.add(e.emergency);
    } else {
      raise(e.level, e.now, {
        text: ans === "unsure" ? `Not sure about: ${q.positive.toLowerCase()}` : q.positive,
        sourceIds: ans === "unsure" ? [...q.sourceIds, "policy-uncertainty"] : q.sourceIds,
      });
    }
  }

  if (emergency.size > 0) {
    return {
      level: "RED",
      now: true,
      emergency: [...emergency],
      reasons: [...emergency].map((id) => ({ text: getRedFlag(id).title, sourceIds: getRedFlag(id).sourceIds })),
      positives,
      negatives,
      unsure,
      complaint,
      departments: ["emergency"],
      services: ["ambulance-108", "erss-112"],
      teleconsultSuitable: false,
      failsafe: false,
    };
  }

  // Course of illness and special populations (POLICY_RULES — they can only raise urgency).
  const apply = (r: PolicyRule) => raise(r.level, r.now ?? false, { text: r.text, sourceIds: [...r.sourceIds] });
  const P = POLICY_RULES;
  if (a.severity === "severe") apply(P.severe);
  else if (a.severity === "moderate") apply(P.moderate);

  if (a.progression === "worse") apply(P.worse);

  if (a.duration === "over-2-weeks") apply(P.long);
  else if (a.duration === "4-14-days" && a.progression !== "better") apply(P.notBetter);

  // Special populations (never GREEN).
  if (ctx.age === "young-infant") apply(P.youngInfant);
  else if (ctx.age === "child-under-5") apply(P.underFive);
  else if (ctx.age === "older") apply(P.older);
  if (ctx.special.includes("pregnant")) apply(P.pregnant);
  if (ctx.special.includes("postpartum")) apply(P.postpartum);
  if (ctx.special.includes("immunocompromised")) apply(P.immuno);

  // Missing course-of-illness answers: do not reassure.
  if (level === "GREEN" && (!a.duration || !a.severity || !a.progression)) apply(P.missing);

  const departments = [...complaint.departments];
  if (ctx.special.includes("pregnant") || ctx.special.includes("postpartum")) {
    if (!departments.includes("obstetrics-gynaecology")) departments.unshift("obstetrics-gynaecology");
  }
  if (young(ctx) && !departments.includes("paediatrics")) departments.unshift("paediatrics");
  if (a.answers["fever-tb"] === "yes" || a.answers["cough-2weeks"] === "yes" || a.answers["cough-sweats"] === "yes") {
    if (!departments.includes("tb-services")) departments.push("tb-services");
  }

  const services = [...complaint.services];
  if (departments.includes("tb-services") && !services.includes("ntep")) services.push("ntep");

  return {
    level,
    now: level === "ORANGE" && now,
    emergency: [],
    reasons: dedupe(reasons),
    positives,
    negatives,
    unsure,
    complaint,
    departments,
    services,
    teleconsultSuitable: level === "YELLOW" || level === "GREEN",
    failsafe: false,
  };
}

function dedupe(reasons: Reason[]): Reason[] {
  const seen = new Set<string>();
  return reasons.filter((r) => (seen.has(r.text) ? false : (seen.add(r.text), true)));
}

const FAILSAFE_COMPLAINT: Complaint = {
  id: "failsafe",
  label: "Health concern",
  icon: "🩺",
  departments: ["general-medicine"],
  base: "ORANGE",
  questions: [],
  services: [],
  selfCare: [],
};

// Public entry point. Never throws.
export function triage(a: Answers): Result {
  try {
    if (!a || !a.context || !Array.isArray(a.emergencyChecklist) || typeof a.answers !== "object") {
      throw new Error("Invalid answers");
    }
    return evaluate(a);
  } catch {
    return {
      level: "ORANGE",
      now: false,
      emergency: [],
      reasons: [{ text: "The check could not be completed", sourceIds: ["policy-uncertainty"] }],
      positives: [],
      negatives: [],
      unsure: [],
      complaint: FAILSAFE_COMPLAINT,
      departments: ["general-medicine"],
      services: ["ambulance-108"],
      teleconsultSuitable: false,
      failsafe: true,
    };
  }
}
