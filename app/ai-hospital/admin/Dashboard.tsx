"use client";

import { useMemo, useState } from "react";
import { type Cell, aggregate, demoEvents } from "../../lib/metrics";

// Chart colours (validated with the data-visualisation palette checks).
const SERIES = "#2a78d6";
const INK = { primary: "#0b0b0b", secondary: "#52514e", muted: "#898781", grid: "#e1e0d9", baseline: "#c3c2b7" };
// Urgency levels are states, so they use the reserved status colours, always
// with an icon and a written label.
const LEVEL_STYLE: Record<string, { color: string; icon: string; name: string }> = {
  RED: { color: "#d03b3b", icon: "🚨", name: "Emergency now" },
  ORANGE: { color: "#ec835a", icon: "⚠️", name: "Urgent, same day" },
  YELLOW: { color: "#fab219", icon: "🕒", name: "See a doctor soon" },
  GREEN: { color: "#0ca30c", icon: "✅", name: "Self-care, with safety advice" },
};

const END_DAY = "2026-09-30";
const RANGES = [7, 14, 30] as const;

function dayMinus(day: string, n: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
}

const fmt = (n: number | null) => (n === null ? "Fewer than 5" : n.toLocaleString("en-IN"));
const shortDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

function Panel({ title, note, children, table }: { title: string; note?: string; children: React.ReactNode; table: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-[#fcfcfb] p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      {note && <p className="mt-0.5 text-sm text-slate-600">{note}</p>}
      <div className="mt-4">{children}</div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-blue-800">Show as table</summary>
        <div className="mt-2 overflow-x-auto">{table}</div>
      </details>
    </section>
  );
}

function CellTable({ cells, label, total }: { cells: Cell[]; label: string; total: number | null }) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-slate-200 text-slate-600">
          <th scope="col" className="py-1 pr-3 font-semibold">{label}</th>
          <th scope="col" className="py-1 pr-3 text-right font-semibold">Count</th>
          <th scope="col" className="py-1 text-right font-semibold">Share</th>
        </tr>
      </thead>
      <tbody>
        {cells.map((c) => (
          <tr key={c.key} className="border-b border-slate-100">
            <th scope="row" className="py-1 pr-3 font-normal text-slate-800">{LEVEL_STYLE[c.key]?.name ?? c.label}</th>
            <td className="py-1 pr-3 text-right tabular-nums text-slate-900">{fmt(c.count)}</td>
            <td className="py-1 text-right tabular-nums text-slate-600">{c.count !== null && total ? `${Math.round((c.count / total) * 100)}%` : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Horizontal bars: one series, one colour, sorted, values labelled at the bar end.
function Bars({ cells, total, colorOf }: { cells: Cell[]; total: number | null; colorOf?: (key: string) => string }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...cells.map((c) => c.count ?? 0));
  return (
    <ul className="space-y-[2px]" onMouseLeave={() => setHover(null)}>
      {cells.map((c) => {
        const lvl = LEVEL_STYLE[c.key];
        const pct = c.count !== null && total ? Math.round((c.count / total) * 100) : null;
        return (
          <li
            key={c.key}
            className={`relative grid grid-cols-[minmax(7rem,38%)_1fr] items-center gap-3 rounded px-1 py-1 ${hover === c.key ? "bg-slate-100" : ""}`}
            onMouseEnter={() => setHover(c.key)}
          >
            <span className="truncate text-sm" style={{ color: INK.secondary }} title={c.label}>
              {lvl && <span aria-hidden className="mr-1">{lvl.icon}</span>}
              {lvl?.name ?? c.label}
            </span>
            <span className="flex items-center gap-2">
              {c.count !== null ? (
                <>
                  <span
                    aria-hidden
                    className="h-4 rounded-r-[4px]"
                    style={{ width: `${(c.count / max) * 80}%`, minWidth: 2, background: colorOf?.(c.key) ?? SERIES }}
                  />
                  <span className="text-sm font-semibold tabular-nums" style={{ color: INK.primary }}>{fmt(c.count)}</span>
                </>
              ) : (
                <span className="text-sm italic" style={{ color: INK.secondary }}>Fewer than 5 (hidden)</span>
              )}
            </span>
            {hover === c.key && (
              <span aria-hidden className="pointer-events-none absolute right-1 top-[-2.2rem] z-10 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg">
                <b>{lvl?.name ?? c.label}</b> · {fmt(c.count)}{pct !== null ? ` · ${pct}% of total` : ""}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Daily completions: one line, crosshair + tooltip on hover.
function Trend({ daily }: { daily: { day: string; count: number | null }[] }) {
  const [i, setI] = useState<number | null>(null);
  const W = 720, H = 220, L = 40, R = 12, T = 12, B = 28;
  const max = Math.max(10, ...daily.map((d) => d.count ?? 0));
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;
  const ticks = [0, top / 2, top];
  const x = (k: number) => L + (daily.length <= 1 ? 0 : (k / (daily.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / top) * (H - T - B);

  // Break the line at hidden (suppressed) days.
  const segments: string[] = [];
  let cur = "";
  daily.forEach((d, k) => {
    if (d.count === null) {
      if (cur) segments.push(cur);
      cur = "";
    } else cur += `${cur ? "L" : "M"}${x(k).toFixed(1)},${y(d.count).toFixed(1)}`;
  });
  if (cur) segments.push(cur);

  const labelEvery = Math.ceil(daily.length / 6);
  const hovered = i !== null ? daily[i] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Triage completions per day, ${daily.length} days. Full numbers are in the table below.`}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const k = Math.round(((px - L) / (W - L - R)) * (daily.length - 1));
          setI(Math.max(0, Math.min(daily.length - 1, k)));
        }}
        onMouseLeave={() => setI(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? INK.baseline : INK.grid} strokeWidth={1} />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={INK.muted}>{t}</text>
          </g>
        ))}
        {daily.map((d, k) =>
          k % labelEvery === 0 ? (
            <text key={d.day} x={x(k)} y={H - 8} textAnchor="middle" fontSize={11} fill={INK.muted}>{shortDay(d.day)}</text>
          ) : null,
        )}
        {segments.map((p) => (
          <path key={p} d={p} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {hovered && i !== null && (
          <g>
            <line x1={x(i)} x2={x(i)} y1={T} y2={H - B} stroke={INK.baseline} strokeWidth={1} />
            {hovered.count !== null && <circle cx={x(i)} cy={y(hovered.count)} r={4} fill={SERIES} stroke="#fcfcfb" strokeWidth={2} />}
          </g>
        )}
      </svg>
      {hovered && i !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg"
          style={{ left: `${(x(i) / W) * 100}%` }}
        >
          <b>{shortDay(hovered.day)}</b> · {fmt(hovered.count)}
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#fcfcfb] p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-sm text-slate-600">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const events = useMemo(() => demoEvents(END_DAY, 30), []);
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const a = useMemo(() => aggregate(events, { from: dayMinus(END_DAY, range - 1), to: END_DAY }), [events, range]);

  const lvl = Object.fromEntries(a.levels.map((c) => [c.key, c.count]));
  const urgent = lvl.RED !== null && lvl.ORANGE !== null && a.triageTotal ? Math.round(((lvl.RED + lvl.ORANGE) / a.triageTotal) * 100) : null;
  const topReason = a.complaints.find((c) => c.count !== null);
  const districtTotal = a.districts.reduce((s, c) => s + (c.count ?? 0), 0) || null;
  const emergencyTotal = a.emergencyTotal;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Time range">
        <span className="text-sm font-semibold text-slate-700">Time range:</span>
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={range === r}
            onClick={() => setRange(r)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${range === r ? "border-blue-800 bg-blue-800 text-white" : "border-slate-300 bg-white text-slate-800 hover:border-blue-500"}`}
          >
            Last {r} days
          </button>
        ))}
        <span className="text-sm text-slate-600">to {shortDay(END_DAY)} 2026</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Triage completed" value={fmt(a.triageTotal)} sub={`in the last ${range} days`} />
        <Tile label="Sent to urgent or emergency care" value={urgent === null ? "—" : `${urgent}%`} sub="Emergency now + urgent, same day" />
        <Tile label="Emergency guidance shown" value={fmt(emergencyTotal)} sub="Danger signs recognised" />
        <Tile label="Most common reason" value={topReason?.label ?? "—"} sub={topReason ? `${fmt(topReason.count)} people` : undefined} />
      </div>

      <Panel
        title="Triage completed per day"
        note="One line: the number of people who finished the Triage Desk each day."
        table={
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th scope="col" className="py-1 pr-3 font-semibold">Day</th>
                <th scope="col" className="py-1 text-right font-semibold">Count</th>
              </tr>
            </thead>
            <tbody>
              {a.daily.map((d) => (
                <tr key={d.day} className="border-b border-slate-100">
                  <th scope="row" className="py-1 pr-3 font-normal text-slate-800">{shortDay(d.day)}</th>
                  <td className="py-1 text-right tabular-nums">{fmt(d.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <Trend daily={a.daily} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Urgency of triage results"
          note="Where the Triage Desk directed people. This is navigation advice, not diagnoses."
          table={<CellTable cells={a.levels} label="Result" total={a.triageTotal} />}
        >
          <Bars cells={a.levels} total={a.triageTotal} colorOf={(k) => LEVEL_STYLE[k].color} />
        </Panel>
        <Panel title="Emergency guidance shown, by danger sign" note="Times Emergency Mode opened, by the danger sign recognised." table={<CellTable cells={a.emergencies} label="Danger sign" total={emergencyTotal} />}>
          <Bars cells={a.emergencies} total={emergencyTotal} />
        </Panel>
        <Panel title="Reason for using the Triage Desk" note="The main problem people chose." table={<CellTable cells={a.complaints} label="Reason" total={a.triageTotal} />}>
          <Bars cells={a.complaints} total={a.triageTotal} />
        </Panel>
        <div className="space-y-6">
          <Panel title="District (only if the person chose to share it)" note="District level only. No village, locality, or location data." table={<CellTable cells={a.districts} label="District" total={districtTotal} />}>
            <Bars cells={a.districts} total={districtTotal} />
          </Panel>
          <Panel title="Age group" table={<CellTable cells={a.ageGroups} label="Age group" total={a.triageTotal} />}>
            <Bars cells={a.ageGroups} total={a.triageTotal} />
          </Panel>
        </div>
      </div>

      <Panel title="Department pages opened" note="Which department guides people read. Helps plan signage and staffing information." table={<CellTable cells={a.departments} label="Department" total={a.departments.reduce((s, c) => s + (c.count ?? 0), 0) || null} />}>
        <Bars cells={a.departments} total={a.departments.reduce((s, c) => s + (c.count ?? 0), 0) || null} />
      </Panel>
    </div>
  );
}
