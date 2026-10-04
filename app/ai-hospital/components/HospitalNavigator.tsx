"use client";

import { useState } from "react";
import CallLink from "../../components/ui/CallLink";
import { getDepartment } from "../data/departments";
import { DISTRICTS, FACILITY_LEVELS, displayable, hospitals, mapLink, verificationStatus } from "../data/hospitals";

export default function HospitalNavigator() {
  const [district, setDistrict] = useState<string>("");
  const [query, setQuery] = useState("");
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [level, setLevel] = useState<string>("");

  const list = hospitals.filter((h) => {
    const d = displayable(h);
    if (district && h.district.value !== district) return false;
    if (query && !h.name.value.toLowerCase().includes(query.toLowerCase().trim())) return false;
    if (emergencyOnly && d.emergency !== true) return false;
    // Only a verified level can match; an unverified one is never guessed.
    if (level && d.level !== level) return false;
    return true;
  });
  const verifiedCount = hospitals.filter((h) => verificationStatus(h) === "VERIFIED").length;

  const field = "mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none focus:border-blue-700";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-amber-950">
        <p className="text-lg font-bold">This directory is being built with verified information only.</p>
        <p className="mt-1">
          {verifiedCount === 0
            ? "No hospital has been fully verified yet. Contact details, services, and emergency availability will appear only after they are confirmed from an official source."
            : `${verifiedCount} of ${hospitals.length} hospitals are fully verified.`}{" "}
          In an emergency, call <CallLink id="ambulance-108" /> or <CallLink id="erss-112" />.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-lg font-semibold text-blue-950">
          District
          <select className={field} value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">All districts</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="block text-lg font-semibold text-blue-950">
          Type of facility
          <select className={field} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Any type</option>
            {FACILITY_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="block text-lg font-semibold text-blue-950">
          Hospital name
          <input className={field} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" maxLength={60} />
        </label>
        <label className="flex items-center gap-3 self-end rounded-xl border-2 border-slate-300 px-4 py-3 text-lg font-semibold text-slate-800">
          <input type="checkbox" checked={emergencyOnly} onChange={(e) => setEmergencyOnly(e.target.checked)} className="h-5 w-5 accent-blue-800" />
          Verified emergency only
        </label>
      </div>

      <p className="text-slate-600" aria-live="polite">{list.length} {list.length === 1 ? "hospital" : "hospitals"} shown</p>
      {list.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center text-lg text-slate-700">
          No verified facility matches yet. Facility types and emergency services are shown only once confirmed from an official source. In an emergency, call{" "}
          <CallLink id="ambulance-108" />.
        </p>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {list.map((h) => {
          const status = verificationStatus(h);
          const d = displayable(h);
          return (
            <li key={h.id} className="rounded-2xl border-2 border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-xl font-bold text-blue-950">{h.name.value}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "VERIFIED" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>
                  {status === "VERIFIED" ? "✓ VERIFIED" : "NEEDS VERIFICATION"}
                </span>
              </div>
              <p className="mt-1 text-slate-600">{h.district.value} district{d.level ? ` · ${d.level}` : ""}{d.ownership ? ` · ${d.ownership}` : ""}</p>
              <dl className="mt-4 space-y-2 text-lg">
                {d.address && <div><dt className="text-sm text-slate-600">Address</dt><dd>{d.address}</dd></div>}
                {d.phone && <div><dt className="text-sm text-slate-600">Phone</dt><dd><a href={`tel:${d.phone.replace(/[^0-9+]/g, "")}`} className="font-bold text-blue-800 underline">{d.phone}</a></dd></div>}
                {d.emergency !== undefined && <div><dt className="text-sm text-slate-600">Emergency</dt><dd>{d.emergency ? "Emergency services available" : "No emergency department"}</dd></div>}
                {d.departments && (
                  <div>
                    <dt className="text-sm text-slate-600">Departments</dt>
                    <dd>{d.departments.map((s) => getDepartment(s)?.plainName ?? s).join(", ")}</dd>
                  </div>
                )}
                {d.coordinates && (
                  <div>
                    <a href={mapLink(d.coordinates)} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">
                      Directions on map ↗
                    </a>
                  </div>
                )}
              </dl>
              {status !== "VERIFIED" && (
                <p className="mt-4 text-sm text-slate-600">Address, phone, and services will be shown once confirmed from an official source.</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
