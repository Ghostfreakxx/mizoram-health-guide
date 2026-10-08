// How the virtual guide SAYS each danger-sign question.
//
// The clinical rules (`safety/triage.ts`) keep their written, reviewed
// wording — that is what the Triage Desk shows and what clinicians sign off.
// Read aloud, that wording sounds like a form ("Severe headache?",
// "Cannot keep any fluids down?") and sometimes talks about "the person" to
// the person. Here each question has the same meaning in spoken, everyday
// English, addressed to the patient ("you") or about them ("they") when
// someone asks for another person.
//
// Rules for this file (tested in tests/safety/spoken.test.ts):
// - Same question, same meaning: nothing added, nothing removed. Every
//   condition named in the rule is named here. A "yes" here must mean the
//   same as a "yes" to the written question.
// - Plain words a patient uses; no new medical terms.
// - Every entry is on the clinical review list next to its rule
//   (W-spoken-<rule id>), so a clinician reviews both together.
// - A question without an entry is read as written (never invented).

export type Spoken = string | readonly [self: string, other: string];

export const SPOKEN: Record<string, Spoken> = {
  // Babies under 2 months (asked of the parent or carer)
  "yi-feeding": "Is the baby not feeding well, or unable to breastfeed?",
  "yi-movement": "Does the baby move only when you touch them, or not move at all?",
  "yi-breathing": "Is the baby breathing very fast, or does their chest pull in with each breath?",
  "yi-temp": "Does the baby feel hot, with a fever, or feel unusually cold when you touch them?",
  // Children 2 months to 4 years
  "c5-drink": "Is the child unable to drink or breastfeed?",
  "c5-vomit": "Does the child vomit everything they eat or drink?",
  "c5-lethargic": "Is the child very sleepy, floppy, or difficult to wake?",
  "c5-chest": "When the child breathes in, does their chest pull in?",
  "any-fits": ["Have you had any fits, or seizures, with this illness?", "Have they had any fits, or seizures, with this illness?"],
  // Pregnancy and after birth
  "preg-bleeding": ["Are you having any bleeding from the vagina?", "Is she having any bleeding from the vagina?"],
  "preg-headache": [
    "Do you have a severe headache, blurred vision, fits, or swelling of your face and hands?",
    "Does she have a severe headache, blurred vision, fits, or swelling of her face and hands?",
  ],
  "preg-water": ["Has your water broken, or are you having regular, painful contractions?", "Has her water broken, or is she having regular, painful contractions?"],
  "preg-movement": "Is the baby moving less than usual?",
  "preg-fever": ["Do you have a high fever?", "Does she have a high fever?"],
  "pp-bleeding": ["Are you having heavy bleeding from the vagina?", "Is she having heavy bleeding from the vagina?"],
  "pp-fits": ["Have you had fits, a severe headache, blurred vision, or difficulty breathing?", "Has she had fits, a severe headache, blurred vision, or difficulty breathing?"],
  "pp-harm": ["Have you had any thoughts of harming yourself or the baby?", "Has she had any thoughts of harming herself or the baby?"],
  "pp-fever": [
    "Do you have a fever, a bad-smelling discharge, or a painful, swollen leg?",
    "Does she have a fever, a bad-smelling discharge, or a painful, swollen leg?",
  ],
  "immuno-fever": ["Do you have a fever, or do you feel hot and shivery?", "Do they have a fever, or feel hot and shivery?"],
  // Fever
  "fever-neck": [
    "Do you have a stiff neck, or a rash that does not fade when you press on it?",
    "Do they have a stiff neck, or a rash that does not fade when you press on it?",
  ],
  "fever-confused": ["Are you feeling confused, or is it very hard to wake you up?", "Are they confused, or very difficult to wake?"],
  "fever-bleeding": [
    "Any bleeding from your gums or nose, blood in your vomit, or black stools?",
    "Any bleeding from their gums or nose, blood in their vomit, or black stools?",
  ],
  "fever-breathing": ["Are you breathing faster than normal, or feeling short of breath?", "Are they breathing faster than normal, or short of breath?"],
  "fever-vomit": ["Do you have severe stomach pain, or are you vomiting again and again?", "Do they have severe stomach pain, or are they vomiting again and again?"],
  "fever-weaker": [
    "Has the fever gone down, but now you feel much weaker, very sleepy, or restless?",
    "Has the fever gone down, but now they seem much weaker, very sleepy, or restless?",
  ],
  "fever-headache": ["Do you have a severe headache?", "Do they have a severe headache?"],
  "fever-chills": ["Are you having shivering and chills?", "Are they having shivering and chills?"],
  "fever-travel": [
    "Have you recently been in the forest, jhum fields, or border areas — or had many mosquito bites?",
    "Have they recently been in the forest, jhum fields, or border areas — or had many mosquito bites?",
  ],
  "fever-tb": [
    "Have you had a cough for 2 weeks or more, night sweats, or weight loss?",
    "Have they had a cough for 2 weeks or more, night sweats, or weight loss?",
  ],
  // Cough or breathing
  "cough-severe": ["Is it very hard to breathe, or are your lips turning blue?", "Is it very hard for them to breathe, or are their lips turning blue?"],
  "cough-blood": ["Are you coughing up blood?", "Are they coughing up blood?"],
  "cough-chestpain": ["Do you get chest pain when you breathe or cough?", "Do they get chest pain when they breathe or cough?"],
  "cough-wheeze": ["Are you wheezing, or does your chest feel tight?", "Are they wheezing, or does their chest feel tight?"],
  "cough-fever": ["Do you have a fever with the cough?", "Do they have a fever with the cough?"],
  "cough-2weeks": "Has the cough lasted 2 weeks or more?",
  "cough-sweats": ["Are you having night sweats, or losing weight without trying?", "Are they having night sweats, or losing weight without trying?"],
  // Chest, heart, blood pressure
  "heart-now": ["Do you have chest pain, pressure, or tightness right now?", "Do they have chest pain, pressure, or tightness right now?"],
  "heart-spread": ["Is the pain spreading to your arm, neck, jaw, back, or stomach?", "Is the pain spreading to their arm, neck, jaw, back, or stomach?"],
  "heart-sweat": [
    "With the chest discomfort, are you sweating, feeling sick, or short of breath?",
    "With the chest discomfort, are they sweating, feeling sick, or short of breath?",
  ],
  "heart-exertion": [
    "Do you get chest discomfort when you are active, which goes away when you rest?",
    "Do they get chest discomfort when they are active, which goes away when they rest?",
  ],
  "heart-veryhigh": ["Has your blood pressure been measured at 180/120 or higher?", "Has their blood pressure been measured at 180/120 or higher?"],
  "heart-irregular": [
    "Is your heartbeat very fast, pounding, or irregular, with dizziness?",
    "Is their heartbeat very fast, pounding, or irregular, with dizziness?",
  ],
  "heart-swelling": ["Are your feet or ankles swollen, and are you breathless?", "Are their feet or ankles swollen, and are they breathless?"],
  "heart-high": ["Has your blood pressure been measured at 140/90 or higher?", "Has their blood pressure been measured at 140/90 or higher?"],
  // Stomach
  "stomach-blood": ["Have you vomited blood, or had black or bloody stools?", "Have they vomited blood, or had black or bloody stools?"],
  "stomach-pain": ["Do you have severe stomach pain that does not go away?", "Do they have severe stomach pain that does not go away?"],
  "stomach-dry": [
    "Are you passing very little urine, is your mouth very dry, or do you feel dizzy when you stand up?",
    "Are they passing very little urine, is their mouth very dry, or do they feel dizzy when they stand up?",
  ],
  "stomach-fluids": ["Are you unable to keep any drinks down?", "Are they unable to keep any drinks down?"],
  "stomach-bloody": ["Do you have diarrhoea with blood in it?", "Do they have diarrhoea with blood in it?"],
  "stomach-yellow": ["Have your eyes or skin turned yellow?", "Have their eyes or skin turned yellow?"],
  "stomach-swallow": ["Do you have difficulty swallowing, or are you losing weight without trying?", "Do they have difficulty swallowing, or are they losing weight without trying?"],
  // Headache or dizziness
  "head-worst": ["Did a very severe headache start suddenly — the worst you have ever had?", "Did a very severe headache start suddenly — the worst they have ever had?"],
  "head-stroke": [
    "Is your face drooping, is an arm or leg weak, or is your speech slurred?",
    "Is their face drooping, is an arm or leg weak, or is their speech slurred?",
  ],
  "head-neck": ["Do you have the headache with a fever and a stiff neck?", "Do they have the headache with a fever and a stiff neck?"],
  "head-injury": [
    "Did the headache come after a head injury, with vomiting or drowsiness?",
    "Did the headache come after a head injury, with vomiting or drowsiness?",
  ],
  "head-faint": ["Have you fainted, or nearly fainted?", "Have they fainted, or nearly fainted?"],
  "head-vision": ["Is your vision blurred, or are you seeing double?", "Is their vision blurred, or are they seeing double?"],
  "head-repeat": ["Have the headaches kept coming back for weeks?", "Have the headaches kept coming back for weeks?"],
  // Injury
  "inj-head": [
    "Was there a head injury with vomiting, drowsiness, confusion, or passing out?",
    "Was there a head injury with vomiting, drowsiness, confusion, or passing out?",
  ],
  "inj-snake": "Was it a snake bite?",
  "inj-bleed": "Is there heavy bleeding that does not stop when you press on it?",
  "inj-animal": ["Were you bitten or scratched by a dog, cat, monkey, or other animal?", "Were they bitten or scratched by a dog, cat, monkey, or other animal?"],
  "inj-bone": [
    "Could a bone be broken — or can you not move it, or put weight on it?",
    "Could a bone be broken — or can they not move it, or put weight on it?",
  ],
  "inj-deep": "Is it a deep cut, or a cut that gapes open?",
  "inj-burn": [
    "Is the burn bigger than the palm of your hand, or on the face, hands, feet, or private parts?",
    "Is the burn bigger than the palm of their hand, or on the face, hands, feet, or private parts?",
  ],
  "inj-infected": "Is the wound red, hot, swollen, or does it have pus?",
  // Ear, nose, throat
  "ent-airway": ["Do you have difficulty breathing, or are you unable to swallow your saliva?", "Do they have difficulty breathing, or are they unable to swallow their saliva?"],
  "ent-hearing": ["Have you suddenly lost your hearing?", "Have they suddenly lost their hearing?"],
  "ent-ear": ["Do you have ear pain with a high fever, or swelling behind the ear?", "Do they have ear pain with a high fever, or swelling behind the ear?"],
  "ent-nose": [
    "Is there a nosebleed that doesn't stop after pinching your nose for 15 minutes?",
    "Is there a nosebleed that doesn't stop after pinching the nose for 15 minutes?",
  ],
  "ent-voice": ["Has your voice been hoarse for more than 3 weeks?", "Has their voice been hoarse for more than 3 weeks?"],
  // Mouth and teeth
  "mouth-swell": [
    "Is your face or neck swollen, with difficulty swallowing or breathing?",
    "Is their face or neck swollen, with difficulty swallowing or breathing?",
  ],
  "mouth-ulcer": [
    "Do you have a mouth ulcer, or a white or red patch, that has lasted more than 2 weeks?",
    "Do they have a mouth ulcer, or a white or red patch, that has lasted more than 2 weeks?",
  ],
  "mouth-open": ["Do you have difficulty opening your mouth fully?", "Do they have difficulty opening their mouth fully?"],
  "mouth-lump": ["Do you have a lump in your mouth or neck?", "Do they have a lump in their mouth or neck?"],
  "mouth-tooth": ["Do you have a severe toothache, or swelling around a tooth?", "Do they have a severe toothache, or swelling around a tooth?"],
  // Eyes
  "eye-sudden": ["Have you suddenly lost vision in one or both eyes?", "Have they suddenly lost vision in one or both eyes?"],
  "eye-chemical": "Did a chemical splash into the eye, or was the eye injured?",
  "eye-painful": ["Is the eye red and painful, with blurred vision?", "Is the eye red and painful, with blurred vision?"],
  "eye-gradual": ["Is your vision slowly getting blurry, or is it hard to read?", "Is their vision slowly getting blurry, or is it hard for them to read?"],
  // Skin
  "skin-allergy": [
    "Is there a rash with swelling of your lips or face, or difficulty breathing?",
    "Is there a rash with swelling of their lips or face, or difficulty breathing?",
  ],
  "skin-nonfading": ["Is there a rash that does not fade when you press on it, with a fever?", "Is there a rash that does not fade when pressed, with a fever?"],
  "skin-blisters": "Are there painful blisters, or is the rash spreading quickly?",
  "skin-numb": "Is there a pale or reddish patch where the skin has lost feeling?",
  "skin-mole": "Is a mole or patch changing in size, shape, or colour?",
  "skin-long": "Has an itchy rash lasted more than 2 weeks?",
  // Joints, back, bones
  "bone-cauda": [
    "With the back pain, is there numbness around your private parts, or have you lost control of your bladder or bowels?",
    "With the back pain, is there numbness around their private parts, or have they lost control of their bladder or bowels?",
  ],
  "bone-weak": ["Is there new weakness or numbness in your legs?", "Is there new weakness or numbness in their legs?"],
  "bone-hot": ["Is a joint hot and swollen, and do you have a fever?", "Is a joint hot and swollen, and do they have a fever?"],
  "bone-fall": ["After a fall or injury, are you unable to move it or put weight on it?", "After a fall or injury, are they unable to move it or put weight on it?"],
  // Urine
  "urine-none": ["Are you unable to pass urine at all?", "Are they unable to pass urine at all?"],
  "urine-fever": ["Is there pain or burning, with a fever or back pain?", "Is there pain or burning, with a fever or back pain?"],
  "urine-blood": "Is there blood in the urine?",
  "urine-thirst": ["Are you passing urine often and feeling very thirsty?", "Are they passing urine often and feeling very thirsty?"],
  // Pregnancy concern
  "preg-urine": ["Do you have burning when you pass urine?", "Does she have burning when she passes urine?"],
  "preg-mood": ["Are you feeling very sad, worried, or unable to cope?", "Is she feeling very sad, worried, or unable to cope?"],
  // Child
  "child-fast": "Is the child breathing fast?",
  "child-dehydrated": "Does the child have diarrhoea with sunken eyes, or are they drinking very eagerly?",
  "child-fever": "Does the child have a fever?",
  "child-weight": "Is the child not growing, or not gaining weight?",
  // Stress, sadness, worry
  "mental-suicide": ["Have you had thoughts of suicide, or of harming yourself?", "Have they had thoughts of suicide, or of harming themselves?"],
  "mental-psychosis": ["Are you hearing or seeing things others don't, or feeling very confused?", "Are they hearing or seeing things others don't, or very confused?"],
  "mental-selfcare": ["Are you unable to eat, sleep, or look after yourself?", "Are they unable to eat, sleep, or look after themselves?"],
  "mental-2weeks": [
    "Have you felt sad, hopeless, or anxious on most days for 2 weeks or more?",
    "Have they felt sad, hopeless, or anxious on most days for 2 weeks or more?",
  ],
  "mental-substances": ["Are you using alcohol or drugs to cope?", "Are they using alcohol or drugs to cope?"],
  // Lump, bleeding, weight loss
  "cancer-heavy": "Is there heavy bleeding that will not stop?",
  "cancer-blood": ["Are you vomiting or coughing up blood?", "Are they vomiting or coughing up blood?"],
  "cancer-lump": "Is there a new lump anywhere in the body?",
  "cancer-weight": ["Are you losing weight without trying?", "Are they losing weight without trying?"],
  "cancer-unusual": [
    "Is there bleeding after menopause, between periods, or in your urine or stool?",
    "Is there bleeding after menopause, between periods, or in their urine or stool?",
  ],
  "cancer-wound": "Is there a wound or mouth ulcer that does not heal?",
  // Alcohol or drugs
  "sub-overdose": "Has someone taken too much and now cannot be woken, or is breathing slowly?",
  "sub-fits": ["Have you had fits after stopping alcohol?", "Have they had fits after stopping alcohol?"],
  "sub-withdrawal": [
    "After stopping, is there severe shaking, confusion, or seeing things?",
    "After stopping, is there severe shaking, confusion, or seeing things?",
  ],
  "sub-needles": ["Have you shared needles or syringes?", "Have they shared needles or syringes?"],
  "sub-stop": ["Do you want to stop, but find you can't?", "Do they want to stop, but find they can't?"],
  // HIV and sexual health
  "hiv-72h": ["Could you have been exposed to HIV in the last 72 hours — 3 days?", "Could they have been exposed to HIV in the last 72 hours — 3 days?"],
  "hiv-older": ["Could you have been exposed more than 3 days ago?", "Could they have been exposed more than 3 days ago?"],
  "hiv-symptoms": [
    "Do you have sores, unusual discharge, or pain in the private parts?",
    "Do they have sores, unusual discharge, or pain in the private parts?",
  ],
  "hiv-tb": [
    "Are you living with HIV, and do you have a fever, cough, or weight loss?",
    "Are they living with HIV, and do they have a fever, cough, or weight loss?",
  ],
};

// When the patient already mentioned the symptom the question is about, the
// doctor says so first ("You mentioned a headache.") — it shows she listened,
// and the question then asks only the part still unknown, which together
// means the same as the written rule. Matched on the patient's words with
// "no …" phrases removed, so a denial never counts as a mention.
export type Mention = { said: RegExp; lead: string; ask: Spoken };
export const MENTIONS: Record<string, Mention> = {
  "fever-headache": { said: /\b(headache|head ?ache|head (is )?(hurt\w*|pain\w*|ach\w*)|pain in (my|the) head)\b/, lead: "You mentioned a headache.", ask: ["Is it severe?", "Is it severe?"] },
  "fever-chills": { said: /\b(feel(ing)? cold|cold and hot|hot and cold)\b/, lead: "You mentioned feeling cold.", ask: ["Are you having shivering and chills?", "Are they having shivering and chills?"] },
  "fever-vomit": { said: /\b(vomit\w*|throw\w* up|threw up|stomach (pain|ache)|tummy (pain|ache))\b/, lead: "You mentioned your stomach.", ask: ["Do you have severe stomach pain, or are you vomiting again and again?", "Do they have severe stomach pain, or are they vomiting again and again?"] },
  "head-neck": { said: /\b(fever\w*|high temperature|feverish)\b/, lead: "You mentioned a fever.", ask: ["Do you also have a stiff neck?", "Do they also have a stiff neck?"] },
  "stomach-pain": { said: /\b(stomach|tummy|belly|abdom\w*)\s+(pain|ache|hurts?|cramp\w*)|\b(pain|ache|cramp\w*) in (my|the) (stomach|tummy|belly)\b/, lead: "You mentioned stomach pain.", ask: ["Is it severe, and does it not go away?", "Is it severe, and does it not go away?"] },
  "cough-fever": { said: /\b(fever\w*|high temperature|feverish)\b/, lead: "You mentioned a fever.", ask: ["Is the fever there with the cough?", "Is the fever there with the cough?"] },
};

export const spokenFor = (entry: Spoken, other: boolean) => (typeof entry === "string" ? entry : entry[other ? 1 : 0]);

// The spoken question for a rule, or the written one if there is none.
export function spokenQuestion(id: string, written: string, opts: { other: boolean; said?: string }): { say: string; mentioned: boolean } {
  const m = MENTIONS[id];
  if (m && opts.said && m.said.test(opts.said)) return { say: `${m.lead} ${spokenFor(m.ask, opts.other)}`, mentioned: true };
  const s = SPOKEN[id];
  return { say: s ? spokenFor(s, opts.other) : written, mentioned: false };
}
