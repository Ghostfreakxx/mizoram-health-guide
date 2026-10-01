// Rule-based triage for the Virtual Hospital.
//
// It never names a disease or a medicine. It only decides how urgently a
// person should get care and which department fits. When unsure it always
// picks the more urgent level. Rules follow widely used public red-flag
// lists (e.g. WHO danger signs for sick children, FAST for stroke).

export type Level = 0 | 1 | 2 | 3;

export const LEVELS: Record<
  Level,
  { title: string; action: string; where: string; color: string; icon: string }
> = {
  0: {
    title: "Emergency",
    action: "Call 108 now or go to the nearest hospital emergency immediately.",
    where: "Hospital Emergency",
    color: "red",
    icon: "🚨",
  },
  1: {
    title: "Get care today",
    action: "See a doctor or health worker today. Do not wait until tomorrow.",
    where: "Nearest health centre or hospital, today",
    color: "orange",
    icon: "⏰",
  },
  2: {
    title: "See a doctor soon",
    action: "See a doctor within the next 2–3 days. A free online consultation may be enough to start.",
    where: "Hospital OPD or free eSanjeevani online consultation",
    color: "amber",
    icon: "📅",
  },
  3: {
    title: "Care for yourself at home",
    action: "This can usually be looked after at home. Watch for warning signs, and see a doctor if you are not better in 3 days.",
    where: "Home, with a doctor if things change",
    color: "green",
    icon: "🏠",
  },
};

export type Flag = { id: string; text: string; level: Level };

// Asked first, before anything else.
export const emergencyFlags: Flag[] = [
  { id: "breathing", text: "Severe difficulty breathing, choking, or lips turning blue", level: 0 },
  { id: "chest", text: "Chest pain, pressure, or tightness right now", level: 0 },
  { id: "stroke", text: "Face drooping, weakness in an arm or leg, or slurred speech", level: 0 },
  { id: "unconscious", text: "Fainted, unconscious, or cannot be woken properly", level: 0 },
  { id: "fits", text: "Having fits (seizures), or just had one", level: 0 },
  { id: "bleeding", text: "Heavy bleeding that will not stop", level: 0 },
  { id: "injury", text: "Serious injury, accident, or large burn", level: 0 },
  { id: "poison", text: "Poisoning, overdose, or snake bite", level: 0 },
  { id: "pregnancy", text: "Pregnant with bleeding, fits, or a severe headache", level: 0 },
  { id: "suicide", text: "Thoughts of suicide or harming yourself", level: 0 },
];

export type AgeGroup = "infant" | "child" | "teen" | "adult" | "older";

export const ageGroups: { id: AgeGroup; label: string }[] = [
  { id: "infant", label: "Baby under 3 months" },
  { id: "child", label: "3 months to 4 years" },
  { id: "teen", label: "5 to 17 years" },
  { id: "adult", label: "18 to 59 years" },
  { id: "older", label: "60 years or older" },
];

export const durations = [
  { id: "today", label: "Started today" },
  { id: "days", label: "1 to 3 days" },
  { id: "week", label: "4 days to 2 weeks" },
  { id: "long", label: "More than 2 weeks" },
] as const;

export const severities = [
  { id: "mild", label: "Mild", hint: "I can do my normal activities" },
  { id: "moderate", label: "Moderate", hint: "It is hard to do normal activities" },
  { id: "severe", label: "Severe", hint: "I can hardly do anything" },
] as const;

export type Complaint = {
  id: string;
  label: string;
  icon: string;
  department: string;
  topic?: string;
  base: Level;
  flags: Flag[];
  homeCare: string[];
  freeTips: string[];
};

export const complaints: Complaint[] = [
  {
    id: "fever",
    label: "Fever",
    icon: "🌡️",
    department: "general-medicine",
    topic: "/malaria",
    base: 1,
    flags: [
      { id: "neck", text: "Stiff neck, or a rash that does not fade when pressed", level: 0 },
      { id: "confused", text: "Confusion or extreme drowsiness", level: 0 },
      { id: "bleed", text: "Bleeding from gums or nose, or black stools", level: 0 },
      { id: "vomit", text: "Vomiting everything, or cannot drink", level: 1 },
      { id: "pain", text: "Severe stomach pain", level: 1 },
      { id: "chills", text: "Shivering and chills", level: 1 },
      { id: "tb", text: "Cough for more than 2 weeks, night sweats, or weight loss", level: 2 },
    ],
    homeCare: ["Rest and drink plenty of fluids", "Sleep under a mosquito net"],
    freeTips: ["A malaria test is free at government health centres, and many ASHAs can test on the spot.", "Any fever in Mizoram should be tested for malaria the same day."],
  },
  {
    id: "cough",
    label: "Cough or breathing",
    icon: "😷",
    department: "chest-tb",
    topic: "/tb",
    base: 3,
    flags: [
      { id: "fast", text: "Breathing very fast or struggling to breathe", level: 0 },
      { id: "blood", text: "Coughing up blood", level: 1 },
      { id: "wheeze", text: "Wheezing or tight chest", level: 1 },
      { id: "fever", text: "High fever with the cough", level: 2 },
      { id: "sweats", text: "Night sweats or losing weight", level: 2 },
    ],
    homeCare: ["Rest and drink warm fluids", "Cover coughs and sneezes", "Avoid smoke and tobacco"],
    freeTips: ["A cough lasting more than 2 weeks should be tested for TB — the test and treatment are free.", "TB Helpline: 1800-11-6666 (free)."],
  },
  {
    id: "heart",
    label: "Chest discomfort, heartbeat, or blood pressure",
    icon: "❤️",
    department: "heart-care",
    topic: "/heart",
    base: 2,
    flags: [
      { id: "now", text: "Chest pain or pressure right now", level: 0 },
      { id: "spread", text: "Pain spreading to the arm, neck, jaw, or back", level: 0 },
      { id: "sweat", text: "Sweating, nausea, or breathlessness with chest discomfort", level: 0 },
      { id: "exertion", text: "Chest discomfort during activity that goes away with rest", level: 1 },
      { id: "irregular", text: "Very fast or irregular heartbeat", level: 1 },
      { id: "veryhigh", text: "Blood pressure reading of 180/120 or higher", level: 1 },
      { id: "swelling", text: "Swollen feet with breathlessness", level: 1 },
      { id: "high", text: "Blood pressure reading of 140/90 or higher", level: 2 },
    ],
    homeCare: [],
    freeTips: ["Blood pressure checks are free at government health centres for adults over 30."],
  },
  {
    id: "stomach",
    label: "Stomach pain, vomiting, or diarrhoea",
    icon: "🤢",
    department: "general-medicine",
    base: 3,
    flags: [
      { id: "blood", text: "Vomiting blood, or black or bloody stools", level: 0 },
      { id: "severe", text: "Severe stomach pain that does not go away", level: 1 },
      { id: "dry", text: "Very little urine, very dry mouth, or dizzy when standing", level: 1 },
      { id: "nofluids", text: "Cannot keep any fluids down", level: 1 },
      { id: "yellow", text: "Yellow eyes or skin", level: 2 },
      { id: "swallow", text: "Difficulty swallowing, or weight loss without trying", level: 2 },
    ],
    homeCare: ["Drink plenty of fluids, including ORS (oral rehydration solution)", "Eat light, simple food", "Wash hands with soap after using the toilet and before eating"],
    freeTips: ["ORS packets are free at government health centres and from ASHAs."],
  },
  {
    id: "headache",
    label: "Headache or dizziness",
    icon: "🤕",
    department: "general-medicine",
    base: 3,
    flags: [
      { id: "worst", text: "Sudden, very severe headache — the worst ever", level: 0 },
      { id: "neck", text: "Headache with fever and a stiff neck", level: 0 },
      { id: "injury", text: "Headache after a head injury", level: 1 },
      { id: "faint", text: "Fainting or nearly fainting", level: 1 },
      { id: "vision", text: "Blurred or double vision", level: 1 },
      { id: "repeat", text: "Headaches that keep coming back for weeks", level: 2 },
    ],
    homeCare: ["Rest in a quiet, dark room", "Drink water", "Get enough sleep"],
    freeTips: [],
  },
  {
    id: "injury",
    label: "Injury, wound, burn, or bite",
    icon: "🩹",
    department: "emergency",
    base: 3,
    flags: [
      { id: "head", text: "Head injury with vomiting, drowsiness, or confusion", level: 0 },
      { id: "snake", text: "Snake bite", level: 0 },
      { id: "bone", text: "A bone may be broken, or cannot move the limb", level: 1 },
      { id: "deep", text: "Deep cut that may need stitches", level: 1 },
      { id: "burn", text: "Burn larger than the palm, or on the face, hands, or private parts", level: 1 },
      { id: "animal", text: "Bitten or scratched by a dog, cat, or other animal", level: 1 },
      { id: "infected", text: "Wound is red, hot, swollen, or has pus", level: 2 },
    ],
    homeCare: ["Wash small cuts with clean water and cover with a clean cloth", "Cool small burns under running water for 20 minutes"],
    freeTips: ["After any animal bite, wash the wound with soap and water for 15 minutes and get the anti-rabies vaccine the same day — it is free at government hospitals."],
  },
  {
    id: "mouth",
    label: "Mouth, teeth, or throat",
    icon: "🦷",
    department: "dental-mouth",
    topic: "/tobacco",
    base: 3,
    flags: [
      { id: "swelling", text: "Swelling of the face or neck with difficulty swallowing or breathing", level: 0 },
      { id: "ulcer", text: "Mouth ulcer, or white or red patch, lasting more than 2 weeks", level: 2 },
      { id: "open", text: "Difficulty opening the mouth fully", level: 2 },
      { id: "lump", text: "Lump in the mouth or neck", level: 2 },
      { id: "tooth", text: "Severe toothache or swelling around a tooth", level: 2 },
    ],
    homeCare: ["Rinse with warm salt water", "Brush gently twice a day", "Stop tobacco and kuhva"],
    freeTips: ["Oral cancer screening is free for adults over 30 at government health centres."],
  },
  {
    id: "skin",
    label: "Skin rash or patch",
    icon: "🔴",
    department: "general-medicine",
    base: 3,
    flags: [
      { id: "allergy", text: "Rash with swelling of the lips or face, or difficulty breathing", level: 0 },
      { id: "fever", text: "Rash that does not fade when pressed, with fever", level: 0 },
      { id: "blisters", text: "Painful blisters, or rash spreading quickly", level: 1 },
      { id: "mole", text: "Mole or patch changing in size, shape, or colour", level: 2 },
      { id: "numb", text: "Light-coloured patch with loss of feeling", level: 2 },
      { id: "long", text: "Itchy rash lasting more than 2 weeks", level: 2 },
    ],
    homeCare: ["Keep the skin clean and dry", "Avoid scratching", "Wear loose cotton clothes"],
    freeTips: [],
  },
  {
    id: "urine",
    label: "Urine problems",
    icon: "🚽",
    department: "general-medicine",
    topic: "/diabetes",
    base: 2,
    flags: [
      { id: "none", text: "Unable to pass urine at all", level: 1 },
      { id: "feverback", text: "Pain or burning with fever or back pain", level: 1 },
      { id: "blood", text: "Blood in the urine", level: 2 },
      { id: "thirst", text: "Passing urine often and feeling very thirsty", level: 2 },
    ],
    homeCare: ["Drink plenty of water"],
    freeTips: ["Blood sugar tests are free for adults over 30 at government health centres."],
  },
  {
    id: "pregnancy",
    label: "Pregnancy concern",
    icon: "🤰",
    department: "maternity",
    topic: "/mother-child",
    base: 2,
    flags: [
      { id: "bleed", text: "Any bleeding from the vagina", level: 0 },
      { id: "water", text: "Water breaking", level: 0 },
      { id: "moves", text: "Baby moving less than usual", level: 0 },
      { id: "headache", text: "Severe headache, blurred vision, or swelling of the face and hands", level: 0 },
      { id: "labour", text: "Regular, painful contractions", level: 0 },
      { id: "fever", text: "High fever", level: 1 },
      { id: "urine", text: "Burning while passing urine", level: 2 },
      { id: "mood", text: "Feeling very sad or anxious", level: 2 },
    ],
    homeCare: [],
    freeTips: ["Delivery, medicines, tests, food, and transport are free in government hospitals under JSSK.", "Go for at least 4 pregnancy check-ups — they are free."],
  },
  {
    id: "child",
    label: "Baby or young child is unwell",
    icon: "👶",
    department: "child-health",
    topic: "/mother-child",
    base: 2,
    flags: [
      { id: "drink", text: "Not able to drink or breastfeed", level: 0 },
      { id: "vomit", text: "Vomits everything", level: 0 },
      { id: "sleepy", text: "Very sleepy or difficult to wake", level: 0 },
      { id: "fits", text: "Has had fits", level: 0 },
      { id: "chest", text: "Chest pulls in when breathing", level: 0 },
      { id: "fast", text: "Breathing fast", level: 1 },
      { id: "dehydrated", text: "Diarrhoea with sunken eyes or very thirsty", level: 1 },
      { id: "fever", text: "Fever", level: 1 },
      { id: "weight", text: "Not growing or gaining weight", level: 2 },
    ],
    homeCare: [],
    freeTips: ["All childhood vaccines are free under the Universal Immunization Programme.", "Treatment for sick newborns is free under JSSK."],
  },
  {
    id: "mental",
    label: "Stress, sadness, or worry",
    icon: "🧠",
    department: "mental-health",
    topic: "/mental",
    base: 2,
    flags: [
      { id: "harm", text: "Thoughts of suicide or harming yourself", level: 0 },
      { id: "seeing", text: "Hearing or seeing things others don't, with confusion", level: 1 },
      { id: "selfcare", text: "Unable to eat, sleep, or look after yourself", level: 1 },
      { id: "weeks", text: "Feeling sad, hopeless, or anxious most days for 2 weeks or more", level: 2 },
      { id: "substances", text: "Using alcohol or drugs to cope", level: 2 },
    ],
    homeCare: [],
    freeTips: ["Tele-MANAS gives free, confidential support 24 hours a day: call 14416."],
  },
  {
    id: "cancer",
    label: "Lump, unusual bleeding, or weight loss",
    icon: "🎗️",
    department: "cancer-care",
    topic: "/cancer",
    base: 2,
    flags: [
      { id: "heavy", text: "Heavy bleeding that will not stop", level: 0 },
      { id: "blood", text: "Vomiting or coughing up blood", level: 1 },
      { id: "lump", text: "A new lump anywhere in the body", level: 2 },
      { id: "weight", text: "Losing weight without trying", level: 2 },
      { id: "unusual", text: "Bleeding after menopause, between periods, or in urine or stool", level: 2 },
      { id: "wound", text: "A wound or ulcer that does not heal", level: 2 },
    ],
    homeCare: [],
    freeTips: ["Screening for common cancers is free for adults over 30.", "Ayushman Bharat PM-JAY can cover cancer treatment for eligible families."],
  },
  {
    id: "substance",
    label: "Alcohol or drug problem",
    icon: "🚫",
    department: "mental-health",
    topic: "/drugs",
    base: 2,
    flags: [
      { id: "overdose", text: "Someone took too much and cannot be woken, or is breathing slowly", level: 0 },
      { id: "fits", text: "Fits after stopping alcohol", level: 0 },
      { id: "withdrawal", text: "Severe shaking, confusion, or seeing things after stopping", level: 1 },
      { id: "needles", text: "Has shared needles", level: 2 },
      { id: "cantstop", text: "Wants to stop but cannot", level: 2 },
    ],
    homeCare: [],
    freeTips: ["Tele-MANAS (14416) can guide you to de-addiction services.", "HIV testing is free and confidential at ICTCs."],
  },
  {
    id: "other",
    label: "Something else",
    icon: "❔",
    department: "general-medicine",
    base: 3,
    flags: [],
    homeCare: ["Rest and drink plenty of fluids"],
    freeTips: [],
  },
];

export type Answers = {
  emergency: string[];
  who: "self" | "other";
  age: AgeGroup;
  pregnant: boolean;
  complaint: string;
  flags: string[];
  duration: (typeof durations)[number]["id"];
  severity: (typeof severities)[number]["id"];
};

export type Result = {
  level: Level;
  reasons: string[];
  complaint: Complaint;
  crisis: boolean;
};

const min = (a: Level, b: Level) => (a < b ? a : b) as Level;

export function triage(a: Answers): Result {
  const complaint = complaints.find((c) => c.id === a.complaint) ?? complaints[complaints.length - 1];
  const reasons: string[] = [];
  const crisis =
    a.emergency.includes("suicide") || (complaint.id === "mental" && a.flags.includes("harm"));

  let level: Level = complaint.base;
  if (complaint.base < 3) reasons.push(`${complaint.label} should always be checked by a doctor`);

  for (const f of emergencyFlags) {
    if (a.emergency.includes(f.id)) {
      level = min(level, f.level);
      reasons.push(f.text);
    }
  }

  for (const f of complaint.flags) {
    if (a.flags.includes(f.id)) {
      level = min(level, f.level);
      reasons.push(f.text);
    }
  }

  if (a.severity === "severe") {
    level = min(level, 1);
    reasons.push("The problem is severe");
  } else if (a.severity === "moderate") {
    level = min(level, 2);
    reasons.push("The problem makes normal activities hard");
  }

  if (a.duration === "long") {
    level = min(level, 2);
    reasons.push("It has lasted more than 2 weeks");
  } else if (a.duration === "week" && level === 3) {
    level = 2;
    reasons.push("It has lasted more than 3 days without getting better");
  }

  if (a.age === "infant") {
    level = min(level, 1);
    reasons.push("Babies under 3 months can become very sick quickly");
  } else if (a.age === "child" || a.age === "older") {
    level = min(level, 2);
    reasons.push(a.age === "child" ? "Young children need a doctor's check" : "People over 60 need a doctor's check");
  }

  if (a.pregnant) {
    level = min(level, 2);
    reasons.push("Pregnancy needs extra care");
  }

  return { level, reasons: [...new Set(reasons)], complaint, crisis };
}
