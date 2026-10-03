// Child vaccination timetable, based on India's National Immunization Schedule.
//
// This only works out the usual ages for each visit from a date of birth. The
// child's Mother and Child Protection (MCP) card and the health worker are the
// final word. Nothing here is stored: the date of birth stays on the page.

export type Visit = {
  id: string;
  age: string;
  // When the visit is due, counted from the date of birth.
  after: { days?: number; weeks?: number; months?: number; years?: number };
  vaccines: string[];
  note?: string;
};

export const SOURCE_IDS = ["nis", "uip", "mohfw-mcp-card"];

export const CHILD_VISITS: Visit[] = [
  {
    id: "birth",
    age: "At birth",
    after: { days: 0 },
    vaccines: ["BCG", "Oral Polio (OPV-0)", "Hepatitis B (birth dose)"],
    note: "Given at the hospital or health centre soon after birth.",
  },
  { id: "6w", age: "6 weeks", after: { weeks: 6 }, vaccines: ["Oral Polio (OPV-1)", "Pentavalent-1", "Rotavirus-1", "fractional IPV-1", "Pneumococcal (PCV-1)"] },
  { id: "10w", age: "10 weeks", after: { weeks: 10 }, vaccines: ["Oral Polio (OPV-2)", "Pentavalent-2", "Rotavirus-2"] },
  { id: "14w", age: "14 weeks", after: { weeks: 14 }, vaccines: ["Oral Polio (OPV-3)", "Pentavalent-3", "Rotavirus-3", "fractional IPV-2", "Pneumococcal (PCV-2)"] },
  {
    id: "9m",
    age: "9 to 12 months",
    after: { months: 9 },
    vaccines: ["Measles-Rubella (MR-1)", "Pneumococcal booster", "fractional IPV-3", "Vitamin A (first dose)"],
    note: "Japanese Encephalitis (JE-1) is also given in districts where it is part of the programme.",
  },
  {
    id: "16m",
    age: "16 to 24 months",
    after: { months: 16 },
    vaccines: ["Measles-Rubella (MR-2)", "DPT booster-1", "Oral Polio booster"],
    note: "JE-2 in districts where JE vaccine is given. Vitamin A continues every 6 months up to 5 years.",
  },
  { id: "5y", age: "5 to 6 years", after: { years: 5 }, vaccines: ["DPT booster-2"] },
  { id: "10y", age: "10 years", after: { years: 10 }, vaccines: ["Td (tetanus and diphtheria)"] },
  { id: "16y", age: "16 years", after: { years: 16 }, vaccines: ["Td (tetanus and diphtheria)"] },
];

export const PREGNANCY_VACCINES = [
  "Td-1: early in pregnancy",
  "Td-2: 4 weeks after Td-1",
  "Td booster: instead of two doses, if you had two Td doses in a pregnancy within the last 3 years",
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(d: string): boolean {
  if (!DATE_RE.test(d)) return false;
  const t = Date.parse(`${d}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === d;
}

// Adds an interval to a YYYY-MM-DD date. Month and year steps that land past
// the end of a month (e.g. 31 Jan + 1 month) move to the last day of that month.
export function addInterval(date: string, after: Visit["after"]): string {
  const [y, m, d] = date.split("-").map(Number);
  const months = (after.months ?? 0) + (after.years ?? 0) * 12;
  const ty = y + Math.floor((m - 1 + months) / 12);
  const tm = ((m - 1 + months) % 12) + 1;
  const lastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  const base = Date.UTC(ty, tm - 1, Math.min(d, lastDay));
  const days = (after.days ?? 0) + (after.weeks ?? 0) * 7;
  return new Date(base + days * 86400000).toISOString().slice(0, 10);
}

export type Status = "past" | "due-now" | "upcoming";

export type ScheduledVisit = Visit & { due: string; status: Status };

export type ScheduleResult = { ok: true; visits: ScheduledVisit[] } | { ok: false; error: string };

// "today" is passed in so the result never depends on the server's clock.
export function childSchedule(birth: string, today: string): ScheduleResult {
  if (!isValidDate(birth)) return { ok: false, error: "Please enter the date of birth." };
  if (!isValidDate(today)) return { ok: false, error: "Could not read today's date." };
  if (birth > today) return { ok: false, error: "The date of birth cannot be in the future." };
  if (addInterval(birth, { years: 17 }) <= today) {
    return { ok: false, error: "This timetable is for children up to 16 years. Ask a health worker about vaccines for older people." };
  }
  // A visit counts as "due now" from its due date until the next visit is due.
  const dues = CHILD_VISITS.map((v) => addInterval(birth, v.after));
  const visits = CHILD_VISITS.map((v, i) => {
    const next = dues[i + 1];
    const status: Status = dues[i] > today ? "upcoming" : next && next <= today ? "past" : "due-now";
    return { ...v, due: dues[i], status };
  });
  return { ok: true, visits };
}
