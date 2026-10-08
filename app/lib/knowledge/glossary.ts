// Plain-English glossary used by the virtual doctor.
//
// Each entry gives an everyday meaning of a word the doctor may use. These
// are lay wordings, not medical advice, and they never change urgency.
// CLINICIAN REVIEW: every entry starts as reviewed: false. A clinician should
// check each wording and set reviewed: true (see docs/VIRTUAL_CONSULTATION.md).
//
// To add a term: add one entry. `hard` marks words that get a
// "What does … mean?" button when they appear in a question.

export type Term = {
  id: string;
  term: string; // as shown to the patient
  match: RegExp; // how it appears in text
  meaning: string; // everyday words; completes "X means …"
  hard?: boolean;
  reviewed: boolean;
};

const t = (id: string, term: string, match: RegExp, meaning: string, hard = false): Term => ({ id, term, match, meaning, hard, reviewed: false });

export const GLOSSARY: Term[] = [
  // Breathing
  t("breathless", "short of breath", /\b(short of breath|shortness of breath|breathless\w*|difficulty breathing|hard to breathe|breathing difficulty)\b/i, "it feels difficult to breathe, or you feel you are not getting enough air", true),
  t("fast-breathing", "fast breathing", /\b(breathing (very )?fast|fast breathing|breathing faster)\b/i, "taking many quick breaths, more than usual, even when resting", true),
  t("chest-indrawing", "chest pulls in", /\bchest (pull|pulls) in\b/i, "the skin between or below the ribs sinks in with each breath", true),
  t("wheezing", "wheezing", /\bwheez\w*\b/i, "a whistling sound when breathing out", true),
  t("tightness", "tightness", /\b(tight|tightness)\b/i, "a squeezing or pressing feeling"),
  t("pressure", "pressure", /\bpressure\b(?! measured)/i, "a heavy, pressing or squeezing feeling"),
  t("phlegm", "phlegm", /\b(phlegm|sputum|mucus)\b/i, "the thick liquid you cough up", true),
  t("inhaler", "inhaler", /\binhalers?\b/i, "a small device you breathe medicine in from"),
  t("asthma", "asthma", /\basthma\b/i, "a long-term condition where the airways become narrow, making breathing hard at times"),
  // Whole body
  t("fever", "fever", /\bfever\b/i, "the body feels hotter than normal, sometimes with shivering"),
  t("chills", "chills", /\b(shivering|chills)\b/i, "feeling cold and shaking, even when it is not cold"),
  t("temperature", "temperature", /\btemperature\b/i, "how hot the body is, measured with a thermometer"),
  t("thermometer", "thermometer", /\bthermometers?\b/i, "a small tool for measuring how hot the body is"),
  t("dizzy", "dizzy", /\bdizz(y|iness)\b/i, "feeling light-headed, faint, or as if the room is spinning", true),
  t("faint", "fainting", /\bfaint\w*\b/i, "suddenly passing out for a short time", true),
  t("confusion", "confusion", /\bconfus\w*\b/i, "not thinking clearly, not knowing where they are, or not making sense", true),
  t("floppy", "floppy", /\bfloppy\b/i, "the body is weak and loose, like a rag doll", true),
  t("seizure", "fits (seizures)", /\b(fits(?! (best|you|me|well|the))|seizures?|convulsions?)\b/i, "sudden shaking of the body that cannot be controlled, or suddenly going stiff and not responding", true),
  t("numb", "numbness", /\bnumb\w*\b/i, "loss of feeling, like pins and needles", true),
  t("weak", "weakness", /\bweak(ness)?\b/i, "less strength than normal"),
  t("swelling", "swelling", /\b(swollen|swelling)\b/i, "puffed up, bigger than normal"),
  t("night-sweats", "night sweats", /\bnight sweats?\b/i, "waking up wet with sweat at night", true),
  t("weight-loss", "weight loss", /\b(weight loss|losing weight)\b/i, "getting thinner without trying to"),
  t("dehydration", "dehydration", /\b(dehydrat\w*|very dry mouth)\b/i, "the body has lost too much water", true),
  t("jaundice", "yellow eyes or skin", /\b(yellow eyes|yellow skin|jaundice)\b/i, "the white of the eyes or the skin looks yellow", true),
  t("rash-not-fading", "rash that does not fade", /\brash that does not fade\b/i, "spots on the skin that stay red when you press on them", true),
  t("rash", "rash", /\brash(es)?\b/i, "red or raised spots or patches on the skin"),
  t("stiff-neck", "stiff neck", /\bstiff neck\b/i, "the neck hurts and is hard to bend forward", true),
  t("bleeding", "bleeding", /\bbleed\w*\b/i, "blood coming out of the body"),
  // Stomach, urine
  t("vomit", "vomiting", /\bvomit\w*\b/i, "throwing up — food or liquid coming back out of the mouth", true),
  t("nausea", "nausea", /\b(nausea|nauseous)\b/i, "feeling like you are going to throw up", true),
  t("diarrhoea", "diarrhoea", /\bdiarrh\w*\b/i, "loose, watery stools (toilet) many times a day", true),
  t("constipation", "constipation", /\bconstipat\w*\b/i, "finding it hard to pass stools, or going less often than usual", true),
  t("stools", "stools", /\bstools?\b/i, "what comes out when you go to the toilet", true),
  t("urine", "urine", /\burine\b/i, "pee (passing water)", true),
  t("fluids", "fluids", /\bfluids?\b/i, "anything you drink, like water, tea or soup"),
  // Heart
  t("palpitations", "palpitations", /\b(palpitations?|irregular heartbeat|pounding heartbeat|heartbeat)\b/i, "the heart feels like it is racing, thumping, or skipping beats", true),
  t("blood-pressure", "blood pressure", /\bblood pressure\b/i, "the pressure of blood in the body, measured with a cuff on the arm"),
  t("high-bp", "high blood pressure", /\b(high blood pressure|hypertension)\b/i, "blood pressure that stays higher than normal; it often causes no symptoms", true),
  // Pregnancy and women
  t("contractions", "contractions", /\bcontractions?\b/i, "the belly tightening again and again with pain, as happens in labour", true),
  t("discharge", "discharge", /\bdischarge\b/i, "fluid coming out of the body, for example from the vagina or a wound", true),
  t("water-broken", "water has broken", /\bwater (has )?broken\b/i, "a gush or steady leak of fluid from the vagina during pregnancy", true),
  t("postpartum", "gave birth in the last 6 weeks", /\b(postpartum|gave birth|after delivery)\b/i, "the weeks after having a baby"),
  t("breastfeed", "breastfeeding", /\bbreastfe\w*\b/i, "feeding a baby milk from the breast"),
  // Long-term health and medicines
  t("allergy", "allergy", /\ballerg\w*\b/i, "when the body reacts badly to something, like a medicine or food — for example with a rash, swelling or difficulty breathing", true),
  t("chronic", "long-term condition", /\b(chronic|long-term (health )?condition|long-term illness)\b/i, "a health problem that lasts a long time, like diabetes or high blood pressure", true),
  t("diabetes", "diabetes", /\bdiabet\w*\b/i, "a long-term condition where the sugar in the blood stays too high"),
  t("immune", "weak immune system", /\b(immun\w*|weaker defence)\b/i, "the body's defence against infection is weaker than usual, for example because of HIV, cancer treatment or steroid medicines", true),
  t("steroids", "steroid medicines", /\bsteroids?\b/i, "strong medicines that reduce swelling; long use can weaken the body's defence against infection", true),
  t("medicines", "medicines", /\b(medicines?|medication)\b/i, "tablets, syrups, injections, inhalers or creams you take for your health"),
  t("prescription", "prescription", /\bprescriptions?\b/i, "a note from a doctor saying which medicine to take"),
  t("antibiotic", "antibiotics", /\bantibiotics?\b/i, "medicines that kill bacteria; they do not work against viruses like a cold", true),
  t("symptom", "symptom", /\bsymptoms?\b/i, "something you feel or notice that is not normal for you, like pain or a cough", true),
  t("infection", "infection", /\binfect\w*\b/i, "when germs get into the body and cause illness"),
  t("jhum", "jhum fields", /\bjhum\b/i, "shifting-cultivation fields"),
  t("asha", "ASHA", /\basha\b/i, "a trained community health worker in your village or area"),
  t("health-professional", "healthcare professional", /\bhealthcare professional|health worker\b/i, "a doctor, nurse or trained health worker"),
];

export function termsIn(text: string, opts: { hardOnly?: boolean; max?: number } = {}): Term[] {
  const out: Term[] = [];
  for (const g of GLOSSARY) {
    if (opts.hardOnly && !g.hard) continue;
    if (g.match.test(text) && !out.some((o) => o.meaning === g.meaning)) out.push(g);
    if (out.length >= (opts.max ?? 3)) break;
  }
  return out;
}

// "What does allergy mean?", "what is wheezing" → the term being asked about.
export function askedTerm(text: string): Term | null {
  const t = text.toLowerCase().replace(/[’‘"“”']/g, "");
  const m = t.match(/\bwhat (?:does|do) (?:the word |the term )?(.+?) mean\b|\bwhat is (?:the meaning of )?(?:an? )?(.+?)\??$|\bmeaning of (.+?)\??$/);
  const phrase = m ? (m[1] ?? m[2] ?? m[3] ?? "").trim() : "";
  if (!phrase) return null;
  return GLOSSARY.find((g) => g.match.test(phrase)) ?? null;
}
