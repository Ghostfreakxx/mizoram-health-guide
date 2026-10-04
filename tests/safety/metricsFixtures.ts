import { LEVEL_ORDER, AGE_GROUPS, complaints } from "../../app/lib/safety/triage";
import { redFlags } from "../../app/lib/safety/redFlags";
import { departments } from "../../app/ai-hospital/data/departments";
import { DISTRICTS, type MetricEvent } from "../../app/lib/metrics";

// Generated test events (not real usage) for checking the suppression rules
// against a large, realistic-shaped input.

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

export function demoEvents(endDay = "2026-09-30", days = 30, seed = 7): MetricEvent[] {
  const rand = mulberry32(seed);
  const end = Date.parse(`${endDay}T00:00:00Z`);
  const complaintIds = complaints.map((c) => c.id);
  const complaintW = complaintIds.map((_, i) => Math.max(1, 14 - i));
  const districtW = [40, 8, 3, 3, 7, 5, 14, 4, 4, 5, 3];
  const ages = AGE_GROUPS.map((a) => a.id);
  const ageW = [1, 8, 10, 40, 14];
  const flags = redFlags.map((f) => f.id);
  const slugs = departments.map((d) => d.slug);
  const out: MetricEvent[] = [];

  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(end - d * 86400000).toISOString().slice(0, 10);
    const weekday = new Date(end - d * 86400000).getUTCDay();
    const n = Math.round(45 + rand() * 20 + (weekday === 0 ? -15 : 0) + (days - d) * 0.6);
    for (let i = 0; i < n; i++) {
      out.push({
        type: "triage_result",
        day,
        complaint: pick(rand, complaintIds, complaintW),
        level: pick(rand, LEVEL_ORDER, [3, 12, 40, 45]),
        ageGroup: pick(rand, ages, ageW),
        district: pick(rand, [...DISTRICTS], districtW),
      });
      if (rand() < 0.04) out.push({ type: "emergency_shown", day, flag: pick(rand, flags, flags.map((_, j) => Math.max(1, 10 - j))) });
      if (rand() < 0.7) out.push({ type: "department_view", day, slug: pick(rand, slugs, slugs.map((_, j) => Math.max(1, 12 - j))) });
    }
  }
  return out;
}
