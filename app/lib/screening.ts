// Free screening for common long-term diseases (NP-NCD), by age and sex.
// It only says which free checks a person can ask for. It never estimates
// risk and never says a person has, or does not have, a disease.

export type Sex = "female" | "male" | "other";

export type Screening = { id: string; name: string; what: string };

export const SOURCE_IDS = ["np-ncd", "ayushman-arogya-mandir"];

export const MIN_AGE = 30;

const EVERYONE: Screening[] = [
  { id: "bp", name: "Blood pressure check", what: "A cuff on your arm measures your blood pressure. It takes a few minutes and does not hurt." },
  { id: "sugar", name: "Blood sugar check (for diabetes)", what: "A drop of blood from your finger is tested." },
  { id: "oral", name: "Mouth check (for oral cancer)", what: "A health worker looks inside your mouth for patches or sores. Especially important if you use tobacco, kuhva, or betel nut." },
];

const WOMEN: Screening[] = [
  { id: "breast", name: "Breast check (for breast cancer)", what: "A trained health worker examines the breasts. You can ask for a female health worker." },
  { id: "cervix", name: "Cervix check (for cervical cancer)", what: "A short internal examination by a trained health worker or doctor. You can ask for a female health worker." },
];

export type ScreeningResult =
  | { ok: true; eligible: true; checks: Screening[] }
  | { ok: true; eligible: false; message: string }
  | { ok: false; error: string };

export function screeningFor(age: number, sex: Sex | null): ScreeningResult {
  if (!Number.isInteger(age) || age < 0 || age > 120) return { ok: false, error: "Please enter your age in years." };
  if (!sex) return { ok: false, error: "Please choose an option." };
  if (age < MIN_AGE) {
    return {
      ok: true,
      eligible: false,
      message: `The free screening programme is for people aged ${MIN_AGE} and above. If you have any symptoms or worries, see a health worker or doctor at any age.`,
    };
  }
  // "Other": offer every check; the person and health worker decide together.
  return { ok: true, eligible: true, checks: sex === "male" ? EVERYONE : [...EVERYONE, ...WOMEN] };
}
