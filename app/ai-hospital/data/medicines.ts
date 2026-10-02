// General medicine information. Never doses, never "should you take it".
// Every entry points to sources in lib/sources.ts.

export type MedicineInfo = {
  id: string;
  name: string;
  also?: string;
  usedFor: string;
  keyPoints: string[];
  getHelp: string[];
  sourceIds: string[];
};

export const medicines: MedicineInfo[] = [
  {
    id: "paracetamol",
    name: "Paracetamol",
    usedFor: "Commonly used for pain and fever.",
    keyPoints: [
      "Never take more than the label or your doctor says. Too much can seriously harm the liver.",
      "Many cold and flu medicines also contain paracetamol. Check labels so you do not take it twice.",
      "Children need different amounts from adults — follow the label for the child's age or ask a pharmacist.",
    ],
    getHelp: ["If someone has taken more than the label says, get medical help straight away, even if they feel well."],
    sourceIds: ["nhs-paracetamol", "who-eml-2023"],
  },
  {
    id: "ors",
    name: "ORS (oral rehydration solution)",
    usedFor: "Replaces water and salts lost through diarrhoea or vomiting.",
    keyPoints: ["Mix exactly as the packet says, with clean drinking water.", "Keep giving sips, even if the person vomits."],
    getHelp: ["Very little urine, very dry mouth, blood in the stool, or a child who cannot drink — see a health worker urgently."],
    sourceIds: ["who-diarrhoea", "who-eml-2023"],
  },
  {
    id: "iron-folic-acid",
    name: "Iron and folic acid (IFA) tablets",
    usedFor: "Used to prevent and treat iron-deficiency anaemia, including during pregnancy.",
    keyPoints: ["Dark or black stools are common with iron tablets.", "Keep iron tablets out of reach of children — too much iron can be very harmful to a child."],
    getHelp: ["If a child swallows iron tablets, get medical help straight away."],
    sourceIds: ["nhs-ferrous-sulfate", "who-eml-2023"],
  },
  {
    id: "metformin",
    name: "Metformin",
    usedFor: "Used to treat type 2 diabetes. It needs a doctor's prescription.",
    keyPoints: [
      "Take it exactly as your doctor prescribed.",
      "Stomach upset is common when starting — tell your doctor if it does not settle.",
      "Tell the doctor you take metformin before any scan with dye, or before surgery.",
    ],
    getHelp: ["Severe stomach pain, vomiting, fast breathing, or feeling very unwell — get medical help urgently."],
    sourceIds: ["nhs-metformin", "who-eml-2023"],
  },
  {
    id: "amlodipine",
    name: "Amlodipine",
    usedFor: "Used for high blood pressure and some types of chest pain (angina). It needs a prescription.",
    keyPoints: ["Keep taking it even when you feel well. Do not stop without asking your doctor.", "Swollen ankles can happen — tell your doctor."],
    getHelp: ["Chest pain, fainting, or a very fast heartbeat — call 108 or 112."],
    sourceIds: ["nhs-amlodipine", "who-eml-2023"],
  },
  {
    id: "antibiotics",
    name: "Antibiotics",
    also: "for example amoxicillin",
    usedFor: "Used for infections caused by bacteria. They do not work for colds, flu, or most sore throats, which are caused by viruses.",
    keyPoints: [
      "Only take antibiotics prescribed for you, exactly as prescribed.",
      "Do not share them or keep them for later.",
      "Tell the doctor about any allergy, especially to penicillin.",
      "Using antibiotics when they are not needed helps germs become resistant.",
    ],
    getHelp: ["Swelling of the lips or face, difficulty breathing, or a widespread rash — this may be an emergency. Call 108 or 112."],
    sourceIds: ["who-amr", "who-eml-2023"],
  },
  {
    id: "salbutamol",
    name: "Salbutamol inhaler (reliever)",
    usedFor: "A reliever inhaler for asthma symptoms and breathlessness. It needs a prescription.",
    keyPoints: ["Ask a health worker to check how you use your inhaler.", "Always know where your reliever inhaler is."],
    getHelp: ["Needing it more often than usual, or it not helping — see a doctor.", "Severe breathlessness or lips turning blue — call 108 or 112."],
    sourceIds: ["nhs-salbutamol", "who-eml-2023"],
  },
  {
    id: "insulin",
    name: "Insulin",
    usedFor: "Used to treat diabetes. Your doctor decides the type and plan.",
    keyPoints: ["Follow your doctor's plan and the storage instructions on the label.", "Learn the signs of low blood sugar: shaking, sweating, confusion, or feeling faint."],
    getHelp: ["Someone with diabetes who is confused, very drowsy, or unconscious — call 108 or 112."],
    sourceIds: ["nhs-insulin", "who-eml-2023"],
  },
  {
    id: "tb-medicines",
    name: "TB medicines",
    usedFor: "Used to cure tuberculosis. Given free under the National TB Elimination Programme, usually for at least 6 months.",
    keyPoints: [
      "Take every dose for the full course, even after you feel better. Stopping early can make TB much harder to treat.",
      "Some TB medicines can turn urine or tears orange-red. This is usually expected — ask your health worker.",
    ],
    getHelp: ["Yellow eyes or skin, repeated vomiting, or a new rash — tell your doctor or TB health worker urgently."],
    sourceIds: ["ntep-presumptive-tb", "who-eml-2023"],
  },
  {
    id: "art",
    name: "HIV medicines (ART)",
    usedFor: "Used to control HIV. Given free at ART centres and taken every day for life.",
    keyPoints: [
      "Take it every day. Missing doses can make the medicine stop working.",
      "Do not stop without talking to your ART centre doctor.",
      "Tell the doctor about any other medicines, including herbal or traditional ones.",
    ],
    getHelp: ["Fever, cough, or weight loss while on ART — see your ART centre doctor soon."],
    sourceIds: ["naco-guidelines", "who-eml-2023"],
  },
  {
    id: "antimalarials",
    name: "Malaria medicines",
    usedFor: "Used to treat malaria after a positive test. Free through the public health system.",
    keyPoints: ["Take the full course exactly as the health worker explains.", "Only take malaria medicine after a positive test."],
    getHelp: ["Fever that continues or comes back, confusion, or vomiting everything — see a health worker urgently."],
    sourceIds: ["nvbdcp-malaria", "who-eml-2023"],
  },
];

export const generalSafety = {
  points: [
    "Keep a written list of all your medicines and show it at every visit.",
    "Check the name and expiry date before taking a medicine.",
    "Store medicines as the label says, away from children.",
    "Never share prescription medicines or take someone else's.",
    "Tell your doctor if you are pregnant, breastfeeding, or taking any other medicine, including herbal or traditional remedies.",
    "Do not start, stop, or change a prescription medicine without asking your doctor.",
    "If you are not sure about anything, ask your pharmacist.",
  ],
  sourceIds: ["who-medication-without-harm"],
};

// What common prescription abbreviations mean.
export const labelTerms: { term: string; meaning: string }[] = [
  { term: "OD", meaning: "Once a day" },
  { term: "BD / BID", meaning: "Twice a day" },
  { term: "TDS / TID", meaning: "Three times a day" },
  { term: "QID", meaning: "Four times a day" },
  { term: "HS", meaning: "At bedtime" },
  { term: "SOS / PRN", meaning: "Only when needed" },
  { term: "AC", meaning: "Before food" },
  { term: "PC", meaning: "After food" },
  { term: "STAT", meaning: "Immediately (now)" },
  { term: "1-0-1", meaning: "Morning – afternoon – night: here, one in the morning, none in the afternoon, one at night" },
  { term: "× 5 days", meaning: "For 5 days" },
  { term: "Tab / Cap / Syp / Inj", meaning: "Tablet / Capsule / Syrup / Injection" },
  { term: "Rx", meaning: "Prescription" },
];
export const labelSourceIds = ["rx-abbreviations"];
