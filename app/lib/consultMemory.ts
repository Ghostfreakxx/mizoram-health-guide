// What the patient tells the doctor along the way, kept as plain facts for
// My Visit and the summary — whatever question happens to be on screen.
//
// "I have a headache and fever", "I took paracetamol yesterday", "I'm
// diabetic", "it comes and goes, worse after food" are all remembered, so the
// doctor never asks for something already said and the summary is complete.
//
// Strict rules (tests/safety/memory.test.ts):
// - Only what the patient clearly said. Callers pass text with negated
//   phrases already removed ("no fever" never becomes fever).
// - Nothing here changes urgency. Danger signs are found by the safety
//   engine (`safety/detect.ts`) on the full words, never by this file.
// - Medicines are recorded by name only. The doctor never comments on a
//   medicine, a dose, or whether to take it.

// Symptoms in everyday words → the label used in the summary.
const SYMPTOMS: [string, RegExp][] = [
  ["fever", /\b(fever\w*|feverish|high temperature)\b/],
  ["headache", /\b(headaches?|head ?aches?|migraine|head (is )?(hurt\w*|pain\w*|aching|pounding)|pain in (my|the|his|her) head)\b/],
  ["cough", /\b(cough\w*)\b/],
  ["runny or blocked nose", /\b(runny nose|blocked nose|stuffy nose|sneez\w*|nose is running)\b/],
  ["sore throat", /\b(sore throat|throat (pain|hurts|is sore)|pain in (my|the) throat)\b/],
  ["breathing difficulty", /\b(short of breath|breathless\w*|difficulty breathing|hard to breathe|trouble breathing)\b/],
  ["chest pain", /\b(chest (pain|hurts|ache)|pain in (my|the|his|her) chest)\b/],
  ["stomach pain", /\b((stomach|tummy|belly|abdominal) ?(pain|aches?|cramps?|hurts)|pain in (my|the|his|her) (stomach|tummy|belly))\b/],
  ["vomiting", /\b(vomit\w*|throwing up|threw up|puk\w*)\b/],
  ["feeling sick (nausea)", /\b(nause\w*|feel(ing)? sick|queasy)\b/],
  ["diarrhoea", /\b(diarrh\w*|loose (motions?|stools?)|watery (stools?|motions?))\b/],
  ["dizziness", /\b(dizz\w*|giddy|giddiness|light-?headed)\b/],
  ["tiredness", /\b(tired\w*|fatigue\w*|exhausted|no energy)\b/],
  ["body aches", /\b(body ?aches?|body pains?|aching all over|muscle (pains?|aches?))\b/],
  ["back pain", /\b(back ?pain|back ?aches?|back (hurts|is hurting)|pain in (my|the|his|her) back)\b/],
  ["joint pain", /\b(joint pains?|joints? (hurt|ache|pain))\b/],
  ["rash", /\b(rash\w*)\b/],
  ["itching", /\b(itch\w*)\b/],
  ["chills", /\b(chills|shiver\w*)\b/],
  ["loss of appetite", /\b(no appetite|not hungry|loss of appetite|lost my appetite|can'?t eat)\b/],
  ["burning when passing urine", /\b(burn\w* (when|while) (i )?(pass\w* urine|pee\w*|urinat\w*)|pain(ful)? (when|while) (i )?(pee|urinat\w*))\b/],
  ["ear pain", /\b(ear ?aches?|ear pain|pain in (my|the) ear)\b/],
  ["toothache", /\b(tooth ?aches?|teeth (hurt|pain)|tooth (hurts|pain))\b/],
  ["swelling", /\b(swollen|swelling)\b/],
];

export function symptomsIn(positive: string): string[] {
  return SYMPTOMS.filter(([, re]) => re.test(positive)).map(([label]) => label);
}

// Medicines by name. Common names in Mizoram's pharmacies and health centres;
// a class word ("antibiotic", "painkiller", "cough syrup") is kept as said.
const MEDICINE_NAMES = [
  "paracetamol", "crocin", "dolo", "calpol", "ibuprofen", "brufen", "combiflam", "aspirin", "disprin", "diclofenac",
  "metformin", "glimepiride", "gliclazide", "insulin", "amlodipine", "telmisartan", "losartan", "atenolol", "metoprolol",
  "atorvastatin", "rosuvastatin", "omeprazole", "pantoprazole", "rabeprazole", "ranitidine", "digene", "gelusil",
  "ors", "cetirizine", "levocetirizine", "montelukast", "salbutamol", "asthalin", "amoxicillin", "azithromycin",
  "augmentin", "ciprofloxacin", "doxycycline", "metronidazole", "albendazole", "chloroquine", "primaquine",
  "artesunate", "thyroxine", "eltroxin", "levothyroxine", "prednisolone", "iron tablets?", "folic acid", "calcium tablets?",
  "antibiotics?", "painkillers?", "pain killers?", "cough syrup", "antacids?", "inhaler", "bp tablets?", "sugar tablets?",
  "herbal medicine", "traditional medicine",
];
const MEDICINE = new RegExp(`\\b(${MEDICINE_NAMES.join("|")})\\b`, "g");

const tidy = (m: string) => m.replace(/\s+/g, " ").trim().replace(/^ors$/, "ORS").replace(/^bp /, "BP ");

export function medicinesIn(positive: string): string[] {
  return [...new Set([...positive.matchAll(MEDICINE)].map((m) => tidy(m[1])))];
}

// Long-term conditions the patient says they have (not family members').
const CONDITIONS: [string, RegExp][] = [
  ["diabetes", /\b(diabet\w*|sugar (patient|problem|disease)|high sugar)\b/],
  ["high blood pressure", /\b(high (blood pressure|bp)|hypertension|bp patient|blood pressure patient)\b/],
  ["asthma", /\b(asthma\w*)\b/],
  ["TB (tuberculosis)", /\b(tb|tuberculosis)\b(?! test)/],
  ["HIV", /\b(hiv positive|living with hiv|i have hiv|i am hiv)\b/],
  ["heart disease", /\b(heart (disease|problem|patient)|had a heart attack)\b/],
  ["kidney disease", /\b(kidney (disease|problem|failure))\b/],
  ["thyroid problem", /\b(thyroid)\b/],
  ["epilepsy", /\b(epilep\w*)\b/],
];
const FAMILY = /\b(my|his|her) (mother|father|mom|mum|dad|parents?|grand\w+|brother|sister|uncle|aunt|family)\b[^.]{0,30}\b(has|had|have)\b/;

export function conditionsIn(positive: string): string[] {
  if (FAMILY.test(positive)) return [];
  return CONDITIONS.filter(([, re]) => re.test(positive)).map(([label]) => label);
}

export function allergiesIn(positive: string): string[] {
  const out: string[] = [];
  for (const m of positive.matchAll(/\ballergic to ([a-z][a-z -]{1,30}?)(?=[,.;!?]|$| and | but | so | when )/g)) out.push(m[1].trim());
  for (const m of positive.matchAll(/\b([a-z]{3,20}) allergy\b/g)) if (!/^(an?|no|any|the|my|food|drug|medicine)$/.test(m[1])) out.push(m[1]);
  return [...new Set(out)];
}

// All the time, or comes and goes.
export function patternIn(positive: string): "constant" | "comes-and-goes" | null {
  if (/\b(comes and goes|come and go|on and off|off and on|now and then|comes? back|goes away and comes back)\b/.test(positive)) return "comes-and-goes";
  if (/\b(all the time|constant\w*|non ?stop|doesn'?t stop|does not stop|continuous\w*|all day)\b/.test(positive)) return "constant";
  return null;
}

// What makes it better or worse, in the patient's words ("worse after food").
export function modifiersIn(positive: string): string | null {
  const m = positive.match(/\b((?:gets? |becomes? |is |it'?s )?(?:worse|better|worst|eases?|easier|bad|starts?|comes? on))\s+(?:when|after|with|if|during|while|on|before|at)\b[^.,;!?|]{2,40}/);
  return m ? m[0].replace(/^(it'?s|is) /, "").trim() : null;
}
