// Lab Report Explainer data. Explains WHAT a test measures and WHY it is done.
// It never interprets a person's result, never compares values automatically,
// and always preserves the laboratory's own values, units, and ranges.

export type LabTest = {
  id: string;
  name: string;
  also?: string;
  measures: string;
  whyDone: string;
  notes: string[];
  questions: string[];
  sourceIds: string[];
};

const COMMON_QUESTIONS = [
  "What does this result mean for me?",
  "Do I need any more tests, or a repeat test?",
  "Do I need to change anything, or come back?",
];

export const labTests: LabTest[] = [
  { id: "hb", name: "Haemoglobin", also: "Hb", measures: "The protein in red blood cells that carries oxygen around the body.", whyDone: "Often checked in pregnancy, during check-ups, and when someone feels very tired or looks pale.", notes: ["Normal ranges differ for men, women, children, and in pregnancy."], questions: COMMON_QUESTIONS, sourceIds: ["medlineplus-labs"] },
  { id: "glucose", name: "Blood sugar (glucose)", also: "FBS, RBS, PPBS", measures: "The amount of sugar in the blood at the time of the test.", whyDone: "Used to check for diabetes and to follow diabetes treatment.", notes: ["Fasting (FBS), random (RBS), and after-meal (PPBS) tests have different ranges.", "Write down whether you had eaten before the test."], questions: COMMON_QUESTIONS, sourceIds: ["medlineplus-labs"] },
  { id: "hba1c", name: "HbA1c", measures: "Average blood sugar over roughly the last 2 to 3 months.", whyDone: "Used to check for diabetes and to see how well diabetes is controlled over time.", notes: [], questions: COMMON_QUESTIONS, sourceIds: ["medlineplus-labs"] },
  { id: "platelets", name: "Platelet count", measures: "Platelets are small blood cells that help blood to clot.", whyDone: "Often checked during fevers such as dengue, and in general blood counts.", notes: ["During dengue, doctors may repeat this test more than once."], questions: COMMON_QUESTIONS, sourceIds: ["medlineplus-labs", "who-dengue-2009"] },
  { id: "wbc", name: "White blood cell count", also: "WBC, TLC", measures: "White blood cells help the body fight infection.", whyDone: "Part of a complete blood count, often done when someone has an infection or fever.", notes: [], questions: COMMON_QUESTIONS, sourceIds: ["medlineplus-labs"] },
  { id: "creatinine", name: "Creatinine", measures: "A waste product that healthy kidneys remove from the blood.", whyDone: "Used to check how well the kidneys are working, especially with diabetes or high blood pressure.", notes: [], questions: COMMON_QUESTIONS, sourceIds: ["medlineplus-labs"] },
  { id: "tsh", name: "TSH (thyroid test)", measures: "A hormone that controls the thyroid gland.", whyDone: "Used to check how the thyroid is working.", notes: [], questions: COMMON_QUESTIONS, sourceIds: ["medlineplus-labs"] },
  { id: "lipids", name: "Lipid profile (cholesterol)", measures: "Different types of fat in the blood, such as cholesterol and triglycerides.", whyDone: "Used to help judge the risk of heart disease and stroke.", notes: ["You may be asked not to eat before this test."], questions: COMMON_QUESTIONS, sourceIds: ["medlineplus-labs"] },
  { id: "malaria", name: "Malaria test", also: "RDT or blood smear", measures: "Looks for malaria parasites in the blood.", whyDone: "Done when someone has fever, especially in malaria areas.", notes: ["If the test is positive, the health worker will explain the treatment.", "If fever continues after a negative test, go back to the health worker."], questions: COMMON_QUESTIONS, sourceIds: ["nvbdcp-malaria"] },
  { id: "dengue", name: "Dengue test", also: "NS1, IgM", measures: "Looks for signs of dengue virus infection in the blood.", whyDone: "Done when someone has fever with symptoms that may be dengue.", notes: ["Different dengue tests work best at different days of illness — the doctor will choose."], questions: COMMON_QUESTIONS, sourceIds: ["who-dengue-2009"] },
  { id: "tb", name: "TB test (sputum)", also: "CBNAAT, Truenat, smear", measures: "Looks for TB bacteria in phlegm (sputum).", whyDone: "Done when someone has a cough for 2 weeks or more, or other TB symptoms.", notes: ["Testing and treatment are free under the National TB Elimination Programme."], questions: COMMON_QUESTIONS, sourceIds: ["ntep-presumptive-tb"] },
  { id: "hiv", name: "HIV test", measures: "Looks for signs of HIV infection.", whyDone: "Done for anyone who may have been exposed, and routinely in pregnancy.", notes: ["A counsellor explains the result privately.", "A first 'reactive' result is always checked with further tests before anything is confirmed."], questions: COMMON_QUESTIONS, sourceIds: ["naco-guidelines"] },
];

export const RANGE_EXPLANATION =
  "The reference range printed on your report is the range the laboratory found in most healthy people, using its own machines and methods. Different laboratories can use different ranges and units. A result outside the range does not always mean there is a problem, and a result inside it does not always mean everything is fine. Only your doctor can say what your result means for you.";

export type LabEntry = { value: string; unit: string; range: string };

// Echoes exactly what the person copied from the report — never rounded,
// converted, compared, or labelled high/low.
export function preserveEntry(e: LabEntry): LabEntry {
  return { value: e.value, unit: e.unit, range: e.range };
}
