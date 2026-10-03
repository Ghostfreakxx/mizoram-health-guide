"use client";

import { useEffect, useState } from "react";
import { type FollowUp, buildICS } from "../../lib/ics";
import { type ScheduledVisit, childSchedule } from "../../lib/vaccines";

const STATUS: Record<ScheduledVisit["status"], { label: string; style: string; icon: string }> = {
  past: { label: "Earlier visit — check the card", style: "border-slate-300 bg-white", icon: "🗂️" },
  "due-now": { label: "Due now", style: "border-amber-500 bg-amber-50", icon: "📌" },
  upcoming: { label: "Coming up", style: "border-blue-200 bg-white", icon: "📅" },
};

const fmt = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function localToday() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export default function VaccinationPlanner() {
  const [birth, setBirth] = useState("");
  const [today, setToday] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the date is read on the device, after hydration
    setToday(localToday());
  }, []);

  const result = birth && today ? childSchedule(birth, today) : null;

  function download(visits: ScheduledVisit[]) {
    const items: FollowUp[] = visits
      .filter((v) => v.status === "upcoming")
      .map((v) => ({
        id: `vacc-${v.id}`,
        kind: "vaccination",
        title: `Child vaccination visit (${v.age})`,
        date: v.due,
        times: [],
        notes: `Usually given: ${v.vaccines.join(", ")}. Take the child's MCP card. Confirm with your health worker.`,
      }));
    const blob = new Blob([buildICS(items)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "child-vaccination-visits.ics";
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`Calendar file with ${items.length} visit${items.length === 1 ? "" : "s"} downloaded. Open it to add them to your phone's calendar.`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
        <label htmlFor="birth" className="block text-xl font-bold text-blue-950">Child&apos;s date of birth</label>
        <p className="mt-1 text-slate-600">It stays on this page. It is not saved or sent anywhere.</p>
        <input
          id="birth"
          type="date"
          value={birth}
          max={today || undefined}
          onChange={(e) => {
            setBirth(e.target.value);
            setStatus("");
          }}
          className="mt-3 w-full max-w-xs rounded-xl border-2 border-slate-300 px-4 py-3 text-lg"
        />
        {result && !result.ok && <p role="alert" className="mt-3 text-lg font-semibold text-red-800">{result.error}</p>}
      </div>

      {result?.ok && (
        <>
          <ol className="space-y-3" aria-label="Vaccination visits">
            {result.visits.map((v) => {
              const s = STATUS[v.status];
              return (
                <li key={v.id} className={`rounded-2xl border-2 p-5 ${s.style}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{v.age}</h3>
                    <p className="text-base font-semibold text-slate-700">
                      <span aria-hidden>{s.icon}</span> {s.label} · from {fmt(v.due)}
                    </p>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {v.vaccines.map((x) => (
                      <li key={x} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-950">{x}</li>
                    ))}
                  </ul>
                  {v.note && <p className="mt-2 text-slate-700">{v.note}</p>}
                  {v.status === "past" && (
                    <p className="mt-2 text-slate-700">
                      Check the MCP card. If any vaccine was missed, ask your health worker — some can still be given later, and some cannot.
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          {result.visits.some((v) => v.status === "upcoming") && (
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
              <button type="button" onClick={() => download(result.visits)} className="rounded-xl bg-blue-900 px-5 py-4 text-lg font-bold text-white hover:bg-blue-800">
                🔔 Add coming visits to my calendar
              </button>
              <p className="mt-2 text-slate-700">Creates a calendar file on your phone. Nothing is sent anywhere.</p>
              <p role="status" className="mt-2 font-semibold text-green-800">{status}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
