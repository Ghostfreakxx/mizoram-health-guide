"use client";

import Link from "next/link";
import { useState } from "react";
import { type FollowUp, type FollowUpKind, buildICS, validate } from "../../lib/ics";
import { addReminders } from "../../lib/storage";
import { BigChoice } from "../components/ui";

const KINDS: { id: FollowUpKind; icon: string; label: string; titleLabel: string; placeholder: string }[] = [
  { id: "appointment", icon: "🏥", label: "Hospital or doctor appointment", titleLabel: "What is the appointment for?", placeholder: "e.g. Eye check-up" },
  { id: "follow-up", icon: "🔁", label: "Follow-up visit date", titleLabel: "Follow-up for", placeholder: "e.g. Blood pressure follow-up" },
  { id: "test", icon: "🧪", label: "Test or scan", titleLabel: "Which test?", placeholder: "e.g. Blood sugar test (fasting)" },
  { id: "vaccination", icon: "💉", label: "Vaccination", titleLabel: "Which vaccine? (as on the card)", placeholder: "e.g. Child's next vaccine" },
  { id: "medicine", icon: "💊", label: "Medicine reminder (from my prescription)", titleLabel: "Medicine name — exactly as on the prescription", placeholder: "Copy the name from the prescription" },
];

const blank = (kind: FollowUpKind): FollowUp => ({ id: `${Date.now()}`, kind, title: "", date: "", times: kind === "medicine" ? [""] : [], notes: "" });

export default function FollowUpApp() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [draft, setDraft] = useState<FollowUp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const kind = draft ? KINDS.find((k) => k.id === draft.kind)! : null;
  const field = "mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none focus:border-blue-700";

  function add() {
    if (!draft) return;
    const clean = { ...draft, times: draft.times.filter((t) => t !== "" || draft.kind === "medicine") };
    const e = validate(clean);
    if (e) return setError(e);
    setItems((x) => [...x, clean]);
    setDraft(null);
    setError(null);
  }

  function download() {
    const blob = new Blob([buildICS(items)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "health-reminders.ics";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Calendar file downloaded. Open it to add the reminders to your phone's calendar.");
  }

  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-slate-100 px-4 py-3 text-slate-700">
        Reminders only repeat what your doctor already told you. They never change your treatment. Nothing is sent anywhere.
      </p>

      {!draft ? (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-blue-950">What do you want to be reminded about?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {KINDS.map((k) => (
              <BigChoice key={k.id} onClick={() => { setDraft(blank(k.id)); setError(null); }} className="flex items-center gap-3">
                <span aria-hidden className="text-3xl">{k.icon}</span> {k.label}
              </BigChoice>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-blue-950">{kind!.icon} {kind!.label}</h2>
          {draft.kind === "medicine" && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-amber-950">
              Copy everything exactly from your prescription or medicine label. If anything is unclear, ask your doctor or
              pharmacist — do not guess. Never stop or change a medicine because of a reminder.
            </p>
          )}
          <label className="block text-lg font-semibold text-slate-800">
            {kind!.titleLabel}
            <input className={field} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={kind!.placeholder} maxLength={100} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-lg font-semibold text-slate-800">
              {draft.kind === "medicine" ? "Start date" : "Date"}
              <input type="date" className={field} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </label>
            {draft.kind === "medicine" ? (
              <label className="block text-lg font-semibold text-slate-800">
                End date (from the prescription)
                <input type="date" className={field} value={draft.endDate ?? ""} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
              </label>
            ) : (
              <label className="block text-lg font-semibold text-slate-800">
                Time (optional)
                <input type="time" className={field} value={draft.times[0] ?? ""} onChange={(e) => setDraft({ ...draft, times: e.target.value ? [e.target.value] : [] })} />
              </label>
            )}
          </div>
          {draft.kind === "medicine" && (
            <fieldset>
              <legend className="text-lg font-semibold text-slate-800">Times written on the prescription, or told by your doctor</legend>
              <div className="mt-2 space-y-2">
                {draft.times.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="time"
                      aria-label={`Time ${i + 1}`}
                      className={field}
                      value={t}
                      onChange={(e) => setDraft({ ...draft, times: draft.times.map((x, j) => (j === i ? e.target.value : x)) })}
                    />
                    {draft.times.length > 1 && (
                      <button type="button" onClick={() => setDraft({ ...draft, times: draft.times.filter((_, j) => j !== i) })} className="mt-1 rounded-xl border-2 border-slate-300 px-4 text-slate-700">
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {draft.times.length < 6 && (
                  <button type="button" onClick={() => setDraft({ ...draft, times: [...draft.times, ""] })} className="text-lg font-semibold text-blue-700 underline">
                    + Add another time
                  </button>
                )}
              </div>
            </fieldset>
          )}
          {draft.kind !== "medicine" && (
            <label className="block text-lg font-semibold text-slate-800">
              Place (optional)
              <input className={field} value={draft.place ?? ""} onChange={(e) => setDraft({ ...draft, place: e.target.value })} placeholder="e.g. hospital name and department" maxLength={120} />
            </label>
          )}
          <label className="block text-lg font-semibold text-slate-800">
            {draft.kind === "medicine" ? "Instructions — exactly as written (optional)" : "Notes (optional)"}
            <input className={field} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder={draft.kind === "medicine" ? "e.g. after food" : "e.g. bring old reports, come fasting"} maxLength={200} />
          </label>
          {error && <p role="alert" className="font-semibold text-red-800">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => { setDraft(null); setError(null); }} className="rounded-xl border-2 border-slate-300 px-4 py-3 text-lg font-semibold">Cancel</button>
            <button type="button" onClick={add} className="rounded-xl bg-blue-900 px-4 py-3 text-lg font-bold text-white">Add reminder</button>
          </div>
        </section>
      )}

      {items.length > 0 && (
        <section className="space-y-4 rounded-2xl border-2 border-blue-200 bg-blue-50 p-6">
          <h2 className="text-2xl font-bold text-blue-950">Your reminders ({items.length})</h2>
          <ul className="space-y-2">
            {items.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 text-lg">
                <span>
                  <strong>{f.title}</strong> — {f.date}
                  {f.kind === "medicine" ? ` to ${f.endDate}, at ${f.times.join(", ")}` : f.times[0] ? ` at ${f.times[0]}` : ""}
                </span>
                <button type="button" onClick={() => setItems((x) => x.filter((y) => y.id !== f.id))} className="text-red-700 underline">Remove</button>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={download} className="rounded-xl bg-blue-900 px-4 py-4 text-lg font-bold text-white hover:bg-blue-800">
              📅 Add to my phone calendar
            </button>
            <button
              type="button"
              onClick={() =>
                setStatus(
                  addReminders(items.map((f) => ({ id: f.id, kind: f.kind, title: f.title, date: f.date, time: f.times[0], notes: f.notes })))
                    ? "Saved to your Health Passport on this phone."
                    : "Saving is off. Turn it on in your Health Passport first, or just use the calendar file.",
                )
              }
              className="rounded-xl border-2 border-blue-900 px-4 py-4 text-lg font-semibold text-blue-900 hover:bg-white"
            >
              🗂️ Save to my Health Passport
            </button>
          </div>
          {status && (
            <p role="status" className="text-lg text-blue-950">
              {status} {status.includes("off") && <Link href="/ai-hospital/passport" className="underline">Open Health Passport</Link>}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
