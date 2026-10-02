"use client";

import { useEffect, useState } from "react";
import {
  EMPTY_PASSPORT,
  type Passport,
  deleteAll,
  grantConsent,
  hasConsent,
  loadPassport,
  savePassport,
} from "../../lib/storage";

const BLOOD_GROUPS = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Don't know"];

export default function PassportApp() {
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState<Passport>({ ...EMPTY_PASSPORT });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [card, setCard] = useState(false);
  const [openSummary, setOpenSummary] = useState<string | null>(null);
  const [vName, setVName] = useState("");
  const [vDate, setVDate] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const consent = hasConsent();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the person's own saved data after mount
    setSaving(consent);
    if (consent) setP(loadPassport() ?? { ...EMPTY_PASSPORT });
    setReady(true);
  }, []);

  // Save automatically, but only when the person has turned saving on.
  useEffect(() => {
    if (ready && saving) savePassport(p);
  }, [p, ready, saving]);

  const update = (patch: Partial<Passport>) => setP((prev) => ({ ...prev, ...patch }));
  const field = "mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none focus:border-blue-700";

  function download() {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-health-passport.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!ready) return <p className="text-lg text-slate-600">Loading…</p>;

  return (
    <div className="space-y-6">
      {/* Saving control */}
      <section className={`rounded-2xl border-2 p-6 ${saving ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
        {saving ? (
          <>
            <p className="text-xl font-bold text-emerald-950">✓ Saving is ON — your passport is saved on this phone only</p>
            <p className="mt-1 text-emerald-950">It is never sent anywhere. Anyone who uses this phone could open it.</p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-amber-950">Saving is OFF</p>
            <p className="mt-1 text-amber-950">
              You can fill this in and use it now. If you want it to be here next time, turn on saving. It will be saved on
              this phone only — never sent anywhere. Anyone who uses this phone could open it. You can delete it at any time.
            </p>
            <button
              type="button"
              onClick={() => {
                if (grantConsent()) {
                  setSaving(true);
                  setMessage("Saving turned on.");
                } else setMessage("This browser does not allow saving. You can still print or download a copy.");
              }}
              className="mt-4 rounded-xl bg-blue-900 px-6 py-3 text-lg font-bold text-white hover:bg-blue-800"
            >
              Turn on saving on this phone
            </button>
          </>
        )}
        {message && <p className="mt-2 text-sm" role="status">{message}</p>}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-bold text-blue-950">About me</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-lg font-semibold text-slate-800">
            Name (optional)
            <input className={field} value={p.name} onChange={(e) => update({ name: e.target.value })} maxLength={80} />
          </label>
          <label className="block text-lg font-semibold text-slate-800">
            Blood group
            <select className={field} value={p.bloodGroup} onChange={(e) => update({ bloodGroup: e.target.value })}>
              {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b || "Choose"}</option>)}
            </select>
            <span className="mt-1 block text-sm font-normal text-slate-600">Only enter it if it was confirmed by a laboratory test.</span>
          </label>
        </div>
        <label className="block text-lg font-semibold text-slate-800">
          Allergies
          <input className={field} value={p.allergies} onChange={(e) => update({ allergies: e.target.value })} placeholder="e.g. none, penicillin, peanuts" maxLength={300} />
        </label>
        <label className="block text-lg font-semibold text-slate-800">
          Medicines I take (as prescribed by my doctor)
          <textarea className={field} rows={2} value={p.medicines} onChange={(e) => update({ medicines: e.target.value })} placeholder="Name and how to take it, exactly as written on the prescription" maxLength={600} />
        </label>
        <label className="block text-lg font-semibold text-slate-800">
          Long-term health conditions
          <input className={field} value={p.conditions} onChange={(e) => update({ conditions: e.target.value })} placeholder="e.g. diabetes, asthma" maxLength={300} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-lg font-semibold text-slate-800">
            Emergency contact name
            <input className={field} value={p.emergencyContact.name} onChange={(e) => update({ emergencyContact: { ...p.emergencyContact, name: e.target.value } })} maxLength={80} />
          </label>
          <label className="block text-lg font-semibold text-slate-800">
            Emergency contact phone
            <input className={field} inputMode="tel" value={p.emergencyContact.phone} onChange={(e) => update({ emergencyContact: { ...p.emergencyContact, phone: e.target.value } })} maxLength={20} />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-bold text-blue-950">Vaccinations</h2>
        {p.vaccinations.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {p.vaccinations.map((v, i) => (
              <li key={`${v.name}${i}`} className="flex items-center justify-between py-2 text-lg">
                <span>{v.name}{v.date && <span className="text-slate-600"> — {v.date}</span>}</span>
                <button type="button" onClick={() => update({ vaccinations: p.vaccinations.filter((_, j) => j !== i) })} className="text-red-700 underline">Remove</button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto]">
          <input className={field} value={vName} onChange={(e) => setVName(e.target.value)} placeholder="Vaccine name, as on your card" aria-label="Vaccine name" maxLength={80} />
          <input className={field} type="date" value={vDate} onChange={(e) => setVDate(e.target.value)} aria-label="Date given" />
          <button
            type="button"
            disabled={!vName.trim()}
            onClick={() => { update({ vaccinations: [...p.vaccinations, { name: vName.trim(), date: vDate }] }); setVName(""); setVDate(""); }}
            className="mt-1 rounded-xl bg-blue-900 px-5 py-3 text-lg font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-bold text-blue-950">Saved visit summaries</h2>
        {p.summaries.length === 0 ? (
          <p className="text-lg text-slate-600">None yet. After using the Triage Desk or Visit Preparation, tap “Save to my Health Passport”.</p>
        ) : (
          <ul className="space-y-2">
            {p.summaries.map((s) => (
              <li key={s.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{new Date(s.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                  <span className="flex gap-4">
                    <button type="button" onClick={() => setOpenSummary(openSummary === s.id ? null : s.id)} className="text-blue-700 underline">{openSummary === s.id ? "Hide" : "View"}</button>
                    <button type="button" onClick={() => update({ summaries: p.summaries.filter((x) => x.id !== s.id) })} className="text-red-700 underline">Delete</button>
                  </span>
                </div>
                {openSummary === s.id && <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{s.text}</pre>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => setCard(true)} className="rounded-xl bg-red-700 px-4 py-4 text-lg font-bold text-white hover:bg-red-800">🆘 Show emergency card</button>
        <button type="button" onClick={download} className="rounded-xl border-2 border-slate-300 px-4 py-4 text-lg font-semibold text-slate-800 hover:bg-slate-50">⬇ Download a copy</button>
        <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-xl border-2 border-red-300 px-4 py-4 text-lg font-semibold text-red-800 hover:bg-red-50">🗑 Delete everything</button>
      </section>

      {confirmDelete && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="del-h" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 id="del-h" className="text-xl font-bold text-red-900">Delete your Health Passport?</h2>
            <p className="mt-2 text-lg text-slate-700">This removes everything AI Hospital has saved on this phone, and turns saving off. It cannot be undone.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-xl border-2 border-slate-300 px-4 py-3 text-lg font-semibold">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  deleteAll();
                  setSaving(false);
                  setP({ ...EMPTY_PASSPORT });
                  setConfirmDelete(false);
                  setMessage("Everything has been deleted from this phone.");
                }}
                className="rounded-xl bg-red-700 px-4 py-3 text-lg font-bold text-white"
              >
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}

      {card && (
        <div role="dialog" aria-modal="true" aria-label="Emergency card" className="fixed inset-0 z-[90] overflow-y-auto bg-white p-6">
          <div className="mx-auto max-w-xl space-y-4 text-2xl">
            <p className="rounded-xl bg-red-700 px-4 py-3 text-center text-2xl font-black text-white">EMERGENCY INFORMATION</p>
            {p.name && <p><strong>Name:</strong> {p.name}</p>}
            {p.bloodGroup && <p><strong>Blood group:</strong> {p.bloodGroup}</p>}
            <p><strong>Allergies:</strong> {p.allergies || "Not recorded"}</p>
            {p.conditions && <p><strong>Conditions:</strong> {p.conditions}</p>}
            {p.medicines && <p><strong>Medicines:</strong> {p.medicines}</p>}
            {(p.emergencyContact.name || p.emergencyContact.phone) && (
              <p>
                <strong>Contact:</strong> {p.emergencyContact.name}{" "}
                {p.emergencyContact.phone && <a href={`tel:${p.emergencyContact.phone.replace(/[^0-9+]/g, "")}`} className="font-bold text-blue-800 underline">{p.emergencyContact.phone}</a>}
              </p>
            )}
            <p className="text-base text-slate-600">Entered by the patient. Not verified by a doctor.</p>
            <button type="button" onClick={() => setCard(false)} className="w-full rounded-xl border-2 border-slate-300 py-4 text-lg font-semibold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
