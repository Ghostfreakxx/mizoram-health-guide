// Anonymous, aggregate usage counts — the rules a future Health Department
// dashboard must follow. There is no dashboard and no collection yet.
//
// Rules (enforced by tests):
// - An event is a fixed set of category codes. There is no free text, no name,
//   phone, device ID, IP address, exact time, or anything typed by a person.
// - The date is kept to the day. Events cannot be linked to each other.
// - sanitize() drops any event that does not exactly match the allowlist.
// - aggregate() hides every count below the suppression threshold, so small
//   groups (e.g. one village, one rare condition) cannot be singled out, and
//   never leaves a single hidden cell that could be worked out by subtraction.
// - Nothing in the app collects or sends these events yet. Where counts go,
//   and under what agreement, is a Health Department decision.

import { LEVEL_ORDER, type Level, AGE_GROUPS, type AgeGroup, complaints } from "./safety/triage";
import { redFlags, type RedFlagId } from "./safety/redFlags";
import { departments } from "../ai-hospital/data/departments";

export const DISTRICTS = [
  "Aizawl",
  "Champhai",
  "Hnahthial",
  "Khawzawl",
  "Kolasib",
  "Lawngtlai",
  "Lunglei",
  "Mamit",
  "Saitual",
  "Serchhip",
  "Siaha",
] as const;
export type District = (typeof DISTRICTS)[number];

export type MetricEvent =
  | { type: "triage_result"; day: string; complaint: string; level: Level; ageGroup: AgeGroup; district?: District }
  | { type: "emergency_shown"; day: string; flag: RedFlagId }
  | { type: "department_view"; day: string; slug: string };

export const MIN_COUNT = 5;

const COMPLAINT_IDS = new Set(complaints.map((c) => c.id));
const FLAG_IDS = new Set<string>(redFlags.map((f) => f.id));
const SLUGS = new Set(departments.map((d) => d.slug));
const AGE_IDS = new Set<string>(AGE_GROUPS.map((a) => a.id));
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const FIELDS: Record<MetricEvent["type"], { required: string[]; optional: string[] }> = {
  triage_result: { required: ["type", "day", "complaint", "level", "ageGroup"], optional: ["district"] },
  emergency_shown: { required: ["type", "day", "flag"], optional: [] },
  department_view: { required: ["type", "day", "slug"], optional: [] },
};

function validDay(d: unknown): d is string {
  if (typeof d !== "string" || !DAY_RE.test(d)) return false;
  const t = Date.parse(`${d}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === d;
}

// Returns a clean copy of the event, or null if anything is unexpected.
export function sanitize(input: unknown): MetricEvent | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const e = input as Record<string, unknown>;
  const spec = FIELDS[e.type as MetricEvent["type"]];
  if (!spec) return null;
  const keys = Object.keys(e);
  if (keys.some((k) => !spec.required.includes(k) && !spec.optional.includes(k))) return null;
  if (spec.required.some((k) => !(k in e))) return null;
  if (!validDay(e.day)) return null;

  switch (e.type) {
    case "triage_result": {
      if (!COMPLAINT_IDS.has(e.complaint as string)) return null;
      if (!LEVEL_ORDER.includes(e.level as Level)) return null;
      if (!AGE_IDS.has(e.ageGroup as string)) return null;
      if ("district" in e && !DISTRICTS.includes(e.district as District)) return null;
      const out: MetricEvent = { type: "triage_result", day: e.day, complaint: e.complaint as string, level: e.level as Level, ageGroup: e.ageGroup as AgeGroup };
      if ("district" in e) out.district = e.district as District;
      return out;
    }
    case "emergency_shown":
      return FLAG_IDS.has(e.flag as string) ? { type: "emergency_shown", day: e.day, flag: e.flag as RedFlagId } : null;
    case "department_view":
      return SLUGS.has(e.slug as string) ? { type: "department_view", day: e.day, slug: e.slug as string } : null;
  }
  return null;
}

// A count that is null was suppressed (fewer than the threshold).
export type Cell = { key: string; label: string; count: number | null };

export type Aggregate = {
  minCount: number;
  triageTotal: number | null;
  emergencyTotal: number | null;
  levels: Cell[];
  complaints: Cell[];
  ageGroups: Cell[];
  districts: Cell[];
  emergencies: Cell[];
  departments: Cell[];
  daily: { day: string; count: number | null }[];
};

const suppress = (n: number, min: number) => (n >= min ? n : null);

function tally<T>(items: T[], keyOf: (t: T) => string | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of items) {
    const k = keyOf(t);
    if (k !== undefined) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function cells(order: { key: string; label: string }[], counts: Map<string, number>, min: number, sort: boolean): Cell[] {
  const out: Cell[] = order.map(({ key, label }) => ({ key, label, count: suppress(counts.get(key) ?? 0, min) }));
  // Secondary suppression: with a total shown, a single hidden cell could be
  // worked out by subtraction, so hide the next-smallest cell as well.
  if (out.filter((c) => c.count === null).length === 1) {
    const visible = out.filter((c) => c.count !== null);
    if (visible.length) visible.reduce((a, b) => (b.count! < a.count! ? b : a)).count = null;
  }
  return sort ? out.sort((a, b) => (b.count ?? -1) - (a.count ?? -1)) : out;
}

export function aggregate(raw: unknown[], opts: { minCount?: number; from?: string; to?: string } = {}): Aggregate {
  const min = Math.max(opts.minCount ?? MIN_COUNT, MIN_COUNT); // never below the floor
  const events = raw
    .map(sanitize)
    .filter((e): e is MetricEvent => !!e)
    .filter((e) => (!opts.from || e.day >= opts.from) && (!opts.to || e.day <= opts.to));

  const triage = events.filter((e) => e.type === "triage_result");
  const emerg = events.filter((e) => e.type === "emergency_shown");
  const views = events.filter((e) => e.type === "department_view");
  const days = [...new Set(triage.map((e) => e.day))].sort();
  const perDay = tally(triage, (e) => e.day);

  return {
    minCount: min,
    triageTotal: suppress(triage.length, min),
    emergencyTotal: suppress(emerg.length, min),
    levels: cells(LEVEL_ORDER.map((l) => ({ key: l, label: l })), tally(triage, (e) => e.level), min, false),
    complaints: cells(complaints.map((c) => ({ key: c.id, label: c.label })), tally(triage, (e) => e.complaint), min, true),
    ageGroups: cells(AGE_GROUPS.map((a) => ({ key: a.id, label: a.label })), tally(triage, (e) => e.ageGroup), min, false),
    districts: cells(DISTRICTS.map((d) => ({ key: d, label: d })), tally(triage, (e) => e.district), min, true),
    emergencies: cells(redFlags.map((f) => ({ key: f.id, label: f.label })), tally(emerg, (e) => e.flag), min, true),
    departments: cells(departments.map((d) => ({ key: d.slug, label: d.name })), tally(views, (e) => e.slug), min, true),
    daily: days.map((day) => ({ day, count: suppress(perDay.get(day) ?? 0, min) })),
  };
}
