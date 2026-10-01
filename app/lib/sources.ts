// Structured evidence registry.
//
// Every clinical rule and public-health claim in AI Hospital points to one or
// more records here by id. A record is only "verified" when a person has
// checked it against the live official source and filled in `checked`.
//
// IMPORTANT: These records were compiled from authoritative publications but
// could not be checked online from the development environment (official
// sites were unreachable). They are therefore all "awaiting-verification"
// with `checked: null`. Do not mark a record verified without checking it.

export type SourceStatus = "verified" | "awaiting-verification";

export type Source = {
  id: string;
  title: string;
  organisation: string;
  url?: string;
  published?: string; // publication or last-update date, when known
  checked: string | null; // ISO date a person last checked it against the live source
  status: SourceStatus;
  supports: string[]; // the rules/claims this source supports
};

const pending = { checked: null, status: "awaiting-verification" as const };

export const sources: Source[] = [
  // ---- Emergency recognition and first response ----
  {
    id: "ifrc-first-aid-2020",
    title: "International First Aid, Resuscitation, and Education Guidelines 2020",
    organisation: "International Federation of Red Cross and Red Crescent Societies (IFRC)",
    url: "https://www.ifrc.org/document/international-first-aid-resuscitation-and-education-guidelines",
    published: "2020",
    ...pending,
    supports: [
      "Recovery position for an unconscious person who is breathing",
      "Direct pressure to control bleeding",
      "Seizure first aid: protect from injury, do not restrain or put anything in the mouth",
      "Cool burns with cool running water for 20 minutes",
      "Assisting with a person's own prescribed inhaler or adrenaline auto-injector",
    ],
  },
  {
    id: "nhs-heart-attack",
    title: "Heart attack — symptoms",
    organisation: "NHS (UK National Health Service)",
    url: "https://www.nhs.uk/conditions/heart-attack/symptoms/",
    ...pending,
    supports: ["Chest pain or pressure, pain spreading to arm/neck/jaw/back, sweating, breathlessness are emergency signs"],
  },
  {
    id: "nhs-stroke",
    title: "Stroke — symptoms (FAST)",
    organisation: "NHS (UK National Health Service)",
    url: "https://www.nhs.uk/conditions/stroke/symptoms/",
    ...pending,
    supports: ["Face drooping, arm weakness, speech problems: call emergency services", "Sudden very severe headache is an emergency sign"],
  },
  {
    id: "nhs-anaphylaxis",
    title: "Anaphylaxis",
    organisation: "NHS (UK National Health Service)",
    url: "https://www.nhs.uk/conditions/anaphylaxis/",
    ...pending,
    supports: ["Swelling of lips/tongue/throat with breathing difficulty is an emergency", "Use the person's own adrenaline auto-injector if they have one"],
  },
  {
    id: "nhs-sepsis",
    title: "Sepsis",
    organisation: "NHS (UK National Health Service)",
    url: "https://www.nhs.uk/conditions/sepsis/",
    ...pending,
    supports: ["Confusion, non-fading rash, mottled skin, or severe breathlessness with infection need emergency care", "People with weakened immune systems (e.g. on chemotherapy) with fever need urgent assessment"],
  },
  {
    id: "nhs-head-injury",
    title: "Head injury and concussion",
    organisation: "NHS (UK National Health Service)",
    url: "https://www.nhs.uk/conditions/head-injury-and-concussion/",
    ...pending,
    supports: ["Head injury with vomiting, drowsiness, confusion or loss of consciousness needs emergency care"],
  },
  {
    id: "who-snakebite",
    title: "Snakebite envenoming — fact sheet",
    organisation: "World Health Organization",
    url: "https://www.who.int/news-room/fact-sheets/detail/snakebite-envenoming",
    ...pending,
    supports: ["Snakebite is a medical emergency", "Keep the person and bitten limb still; avoid cutting, sucking, or tight tourniquets"],
  },
  {
    id: "who-opioid-overdose",
    title: "Opioid overdose — fact sheet",
    organisation: "World Health Organization",
    url: "https://www.who.int/news-room/fact-sheets/detail/opioid-overdose",
    ...pending,
    supports: ["Unresponsiveness, slow or stopped breathing, and pinpoint pupils are signs of opioid overdose"],
  },
  {
    id: "who-mhgap",
    title: "mhGAP Intervention Guide, version 2.0",
    organisation: "World Health Organization",
    url: "https://www.who.int/publications/i/item/9789241549790",
    published: "2016",
    ...pending,
    supports: [
      "Imminent risk of self-harm/suicide requires immediate support and not leaving the person alone",
      "Depressed mood for at least 2 weeks warrants assessment",
      "Psychotic symptoms and inability to care for oneself warrant urgent assessment",
    ],
  },
  {
    id: "erss-112",
    title: "Emergency Response Support System (Dial 112)",
    organisation: "Ministry of Home Affairs, Government of India",
    url: "https://112.gov.in",
    ...pending,
    supports: ["112 is the pan-India single emergency number"],
  },
  {
    id: "nhm-108",
    title: "Emergency Response Services (108 ambulance) under the National Health Mission",
    organisation: "National Health Mission, Ministry of Health & Family Welfare",
    url: "https://nhm.gov.in",
    ...pending,
    supports: ["108 is the free emergency ambulance number (availability in Mizoram to be confirmed locally)"],
  },
  {
    id: "telemanas",
    title: "Tele-MANAS — National Tele Mental Health Programme",
    organisation: "Ministry of Health & Family Welfare",
    url: "https://telemanas.mohfw.gov.in",
    ...pending,
    supports: ["14416 is a free, 24-hour mental health helpline"],
  },

  // ---- Children, pregnancy, postpartum ----
  {
    id: "who-imci",
    title: "Integrated Management of Childhood Illness (IMCI) chart booklet",
    organisation: "World Health Organization",
    url: "https://www.who.int/publications/m/item/integrated-management-of-childhood-illness---chart-booklet-(march-2014)",
    published: "2014",
    ...pending,
    supports: [
      "General danger signs in children 2 months–5 years: unable to drink or breastfeed, vomits everything, convulsions, lethargic or unconscious → urgent referral",
      "Young infants (under 2 months): not feeding well, convulsions, fast breathing, severe chest indrawing, fever or low temperature, movement only when stimulated → urgent referral",
      "Chest indrawing as a sign of severe illness",
      "Some dehydration: sunken eyes, drinks eagerly/thirsty",
    ],
  },
  {
    id: "nhs-fever-children",
    title: "Fever in children",
    organisation: "NHS (UK National Health Service)",
    url: "https://www.nhs.uk/conditions/fever-in-children/",
    ...pending,
    supports: ["A baby under 3 months with a temperature of 38°C or higher needs urgent medical advice", "Fever is a temperature of 38°C or higher"],
  },
  {
    id: "who-anc-2016",
    title: "WHO recommendations on antenatal care for a positive pregnancy experience",
    organisation: "World Health Organization",
    url: "https://www.who.int/publications/i/item/9789241549912",
    published: "2016",
    ...pending,
    supports: ["Regular antenatal contacts throughout pregnancy"],
  },
  {
    id: "mohfw-mcp-card",
    title: "Mother and Child Protection (MCP) Card",
    organisation: "Ministry of Health & Family Welfare and Ministry of Women & Child Development",
    ...pending,
    supports: [
      "Pregnancy danger signs: bleeding, severe headache/blurred vision, fits, swelling of face/hands, high fever, reduced fetal movement, water breaking → go to hospital immediately",
      "At least 4 antenatal check-ups",
    ],
  },
  {
    id: "who-postnatal-2022",
    title: "WHO recommendations on maternal and newborn care for a positive postnatal experience",
    organisation: "World Health Organization",
    url: "https://www.who.int/publications/i/item/9789240045989",
    published: "2022",
    ...pending,
    supports: [
      "Postnatal danger signs: heavy bleeding, fits, severe headache, fever, breathing difficulty, painful swollen leg, foul-smelling discharge",
      "The postnatal period covers the first 6 weeks after birth",
    ],
  },

  // ---- Infections ----
  {
    id: "who-dengue-2009",
    title: "Dengue: guidelines for diagnosis, treatment, prevention and control",
    organisation: "World Health Organization",
    url: "https://www.who.int/publications/i/item/9789241547871",
    published: "2009",
    ...pending,
    supports: [
      "Dengue warning signs: abdominal pain, persistent vomiting, mucosal bleeding, lethargy or restlessness",
      "Warning signs often appear around the time fever subsides (critical phase)",
    ],
  },
  {
    id: "nvbdcp-malaria",
    title: "National Framework for Malaria Elimination in India 2016–2030",
    organisation: "National Center for Vector Borne Diseases Control, Ministry of Health & Family Welfare",
    url: "https://ncvbdc.mohfw.gov.in",
    published: "2016",
    ...pending,
    supports: ["Fever in malaria-endemic areas should be tested for malaria promptly", "Free diagnosis and treatment through the public health system"],
  },
  {
    id: "ntep-presumptive-tb",
    title: "National TB Elimination Programme — technical and operational guidelines",
    organisation: "Central TB Division, Ministry of Health & Family Welfare",
    url: "https://tbcindia.mohfw.gov.in",
    ...pending,
    supports: ["Cough for 2 weeks or more, fever, night sweats, or weight loss → test for TB", "Free TB diagnosis and treatment"],
  },
  {
    id: "naco-guidelines",
    title: "National Guidelines for HIV Care and Treatment",
    organisation: "National AIDS Control Organisation (NACO), Ministry of Health & Family Welfare",
    url: "https://naco.gov.in",
    published: "2021",
    ...pending,
    supports: ["Post-exposure prophylaxis (PEP) should be started as soon as possible and within 72 hours of exposure", "Free HIV testing (ICTC) and treatment (ART)"],
  },
  {
    id: "who-rabies",
    title: "Rabies — fact sheet",
    organisation: "World Health Organization",
    url: "https://www.who.int/news-room/fact-sheets/detail/rabies",
    ...pending,
    supports: ["After an animal bite, wash the wound thoroughly and seek post-exposure prophylaxis promptly"],
  },
  {
    id: "who-diarrhoea",
    title: "Diarrhoeal disease — fact sheet",
    organisation: "World Health Organization",
    url: "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
    ...pending,
    supports: ["Oral rehydration solution (ORS) for diarrhoea", "Signs of dehydration and bloody diarrhoea need medical care"],
  },

  // ---- Non-communicable disease ----
  {
    id: "who-hypertension",
    title: "Hypertension — fact sheet",
    organisation: "World Health Organization",
    url: "https://www.who.int/news-room/fact-sheets/detail/hypertension",
    ...pending,
    supports: ["Hypertension is diagnosed at 140/90 mmHg or higher"],
  },
  {
    id: "nhs-high-bp",
    title: "High blood pressure (hypertension)",
    organisation: "NHS (UK National Health Service)",
    url: "https://www.nhs.uk/conditions/high-blood-pressure-hypertension/",
    ...pending,
    supports: ["A reading of 180/120 or higher needs same-day medical advice"],
  },
  {
    id: "nhs-cough",
    title: "Cough",
    organisation: "NHS (UK National Health Service)",
    url: "https://www.nhs.uk/conditions/cough/",
    ...pending,
    supports: ["Coughing up blood, chest pain, or breathing difficulty need urgent advice", "A cough lasting more than 3 weeks should be checked"],
  },
  {
    id: "nhs-vision-loss",
    title: "Vision loss",
    organisation: "NHS (UK National Health Service)",
    url: "https://www.nhs.uk/conditions/vision-loss/",
    ...pending,
    supports: ["Sudden loss of vision needs emergency assessment"],
  },
  {
    id: "nhs-hearing-loss",
    title: "Hearing loss",
    organisation: "NHS (UK National Health Service)",
    url: "https://www.nhs.uk/conditions/hearing-loss/",
    ...pending,
    supports: ["Sudden hearing loss needs urgent assessment"],
  },
  {
    id: "nhs-back-pain",
    title: "Back pain",
    organisation: "NHS (UK National Health Service)",
    url: "https://www.nhs.uk/conditions/back-pain/",
    ...pending,
    supports: ["Back pain with numbness around the genitals or loss of bladder or bowel control needs emergency care"],
  },
  {
    id: "nlep",
    title: "National Leprosy Eradication Programme",
    organisation: "Ministry of Health & Family Welfare",
    url: "https://mohfw.gov.in",
    ...pending,
    supports: ["A pale or reddish skin patch with loss of sensation should be examined"],
  },
  {
    id: "np-ncd",
    title: "National Programme for Prevention and Control of Non-Communicable Diseases (NP-NCD)",
    organisation: "Ministry of Health & Family Welfare",
    url: "https://mohfw.gov.in",
    ...pending,
    supports: ["Population-based screening for hypertension, diabetes, and common cancers for people aged 30 and above"],
  },

  // ---- Telemedicine and schemes ----
  {
    id: "telemedicine-guidelines-2020",
    title: "Telemedicine Practice Guidelines",
    organisation: "Board of Governors (in supersession of the Medical Council of India), with NITI Aayog",
    url: "https://www.mohfw.gov.in/pdf/Telemedicine.pdf",
    published: "2020-03-25",
    ...pending,
    supports: ["Only registered medical practitioners may provide telemedicine consultations and prescriptions", "Emergencies should be directed to in-person care"],
  },
  {
    id: "esanjeevani",
    title: "eSanjeevani — National Telemedicine Service",
    organisation: "Ministry of Health & Family Welfare",
    url: "https://esanjeevani.mohfw.gov.in",
    ...pending,
    supports: ["Government online consultation service (access steps and availability awaiting verification)"],
  },
  {
    id: "jssk",
    title: "Janani Shishu Suraksha Karyakram (JSSK)",
    organisation: "National Health Mission, Ministry of Health & Family Welfare",
    url: "https://nhm.gov.in",
    ...pending,
    supports: ["Free delivery and care for pregnant women and sick newborns in public health facilities"],
  },
  {
    id: "pmjay",
    title: "Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
    organisation: "National Health Authority",
    url: "https://pmjay.gov.in",
    ...pending,
    supports: ["Health cover for hospital treatment for eligible families"],
  },
  {
    id: "uip",
    title: "Universal Immunization Programme",
    organisation: "Ministry of Health & Family Welfare",
    url: "https://mohfw.gov.in",
    ...pending,
    supports: ["Free childhood and pregnancy vaccines"],
  },
  {
    id: "rbsk",
    title: "Rashtriya Bal Swasthya Karyakram (RBSK)",
    organisation: "National Health Mission, Ministry of Health & Family Welfare",
    url: "https://nhm.gov.in",
    ...pending,
    supports: ["Child health screening and early intervention services"],
  },
  {
    id: "npcbvi",
    title: "National Programme for Control of Blindness and Visual Impairment",
    organisation: "Ministry of Health & Family Welfare",
    url: "https://mohfw.gov.in",
    ...pending,
    supports: ["Free cataract surgery and eye care services in public facilities"],
  },
  {
    id: "nohp",
    title: "National Oral Health Programme",
    organisation: "Ministry of Health & Family Welfare",
    url: "https://mohfw.gov.in",
    ...pending,
    supports: ["Oral health services in public facilities"],
  },
  {
    id: "nppcd",
    title: "National Programme for Prevention and Control of Deafness",
    organisation: "Ministry of Health & Family Welfare",
    url: "https://mohfw.gov.in",
    ...pending,
    supports: ["Ear and hearing care services"],
  },
  {
    id: "nmba",
    title: "Nasha Mukt Bharat Abhiyaan",
    organisation: "Ministry of Social Justice & Empowerment",
    url: "https://nmba.dosje.gov.in",
    ...pending,
    supports: ["National campaign and services against substance use"],
  },
  {
    id: "ntcp-quitline",
    title: "National Tobacco Control Programme — National Tobacco Quitline Services",
    organisation: "Ministry of Health & Family Welfare",
    url: "https://mohfw.gov.in",
    ...pending,
    supports: ["Free tobacco quitline 1800-11-2356"],
  },
  {
    id: "naco-helpline",
    title: "National AIDS Helpline 1097",
    organisation: "National AIDS Control Organisation",
    url: "https://naco.gov.in",
    ...pending,
    supports: ["1097 is the national AIDS helpline"],
  },

  // ---- Internal safety policy (not a clinical claim) ----
  {
    id: "policy-uncertainty",
    title: "AI Hospital safety policy: uncertainty principle",
    organisation: "AI Hospital (internal design policy)",
    checked: null,
    status: "awaiting-verification",
    supports: [
      "When information is insufficient or a person is in a higher-risk group, do not give false reassurance — recommend professional assessment",
      "When unsure about an emergency sign, recommend urgent assessment and explain when to call 108",
    ],
  },
];

const byId = new Map(sources.map((s) => [s.id, s]));

export function getSource(id: string): Source | undefined {
  return byId.get(id);
}

export function sourcesFor(ids: Iterable<string>): Source[] {
  return [...new Set(ids)].map((id) => byId.get(id)).filter((s): s is Source => !!s);
}

// Domains accepted as authoritative for clinical sources.
export const AUTHORITATIVE_DOMAINS = [
  "who.int",
  "gov.in",
  "nic.in",
  "nhs.uk",
  "ifrc.org",
  "icmr.gov.in",
];
