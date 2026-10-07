"use client";

import { useState } from "react";
import type { Option } from "../../lib/consultation";

// "Can you show me where?" — tap the body (front or back) or use the list.
// Region and side are stored separately; the side is asked next, never
// guessed from where on the picture the patient tapped (left/right is easy
// to mirror). Structured input for the summary only; never a diagnosis.
//
// Picture taps are easy to get wrong on a small phone, so a tap highlights the
// area (on both figures) and asks "Is that the right place?" before anything
// is recorded. The labelled buttons (keyboard and screen readers) record
// directly. After recording, the place can still be changed by saying so
// ("No, it's my back") or with Back.

type Region = { id: string; d: string };

const FRONT: Region[] = [
  { id: "head", d: "M74 18 Q100 -2 126 18 L126 38 L74 38 Z" },
  { id: "face", d: "M74 38 L126 38 Q126 70 100 74 Q74 70 74 38 Z" },
  { id: "neck", d: "M88 74 L112 74 L114 90 L86 90 Z" },
  { id: "chest", d: "M58 92 Q100 82 142 92 L140 150 L60 150 Z" },
  { id: "upper-abdomen", d: "M60 150 L140 150 L138 188 L62 188 Z" },
  { id: "lower-abdomen", d: "M62 188 L138 188 L136 224 L64 224 Z" },
  { id: "pelvis", d: "M64 224 L136 224 L124 250 L76 250 Z" },
  { id: "arms", d: "M58 92 L40 110 L26 230 L40 236 L58 150 Z M142 92 L160 110 L174 230 L160 236 L142 150 Z" },
  { id: "legs", d: "M76 250 L98 250 L96 390 L76 390 Z M102 250 L124 250 L124 390 L104 390 Z" },
];

const BACK: Region[] = [
  { id: "head", d: "M74 18 Q100 -2 126 18 L126 70 Q100 78 74 70 Z" },
  { id: "neck", d: "M88 74 L112 74 L114 90 L86 90 Z" },
  { id: "back", d: "M58 92 Q100 82 142 92 L138 224 L62 224 Z" },
  { id: "pelvis", d: "M62 224 L138 224 L124 250 L76 250 Z" },
  { id: "arms", d: "M58 92 L40 110 L26 230 L40 236 L58 150 Z M142 92 L160 110 L174 230 L160 236 L142 150 Z" },
  { id: "legs", d: "M76 250 L98 250 L96 390 L76 390 Z M102 250 L124 250 L124 390 L104 390 Z" },
];

function Figure({ title, regions, options, selected, onTap }: { title: string; regions: Region[]; options: Option[]; selected: string | null; onTap: (id: string) => void }) {
  return (
    <figure className="text-center">
      <svg viewBox="0 0 200 400" className="mx-auto h-60 w-auto touch-manipulation" aria-hidden>
        {regions.map((r) => (
          <path
            key={`${title}-${r.id}`}
            d={r.d}
            onClick={() => onTap(r.id)}
            className={`cursor-pointer stroke-white transition-colors ${selected === r.id ? "fill-blue-600" : "fill-slate-200 hover:fill-blue-300"}`}
            strokeWidth={2}
          >
            <title>{options.find((o) => o.id === r.id)?.label}</title>
          </path>
        ))}
      </svg>
      <figcaption className="text-sm font-semibold text-slate-600">{title}</figcaption>
    </figure>
  );
}

export default function BodyMap({ options, onPick }: { options: Option[]; onPick: (id: string) => void }) {
  // Right-side (or left-side) areas after "on the right": a short list only.
  const sided = options.some((o) => o.id.includes("|"));
  const [selected, setSelected] = useState<string | null>(null);
  const label = options.find((o) => o.id === selected)?.label;
  return (
    <div className="space-y-4">
      {!sided && (
        <div>
          <div className="grid grid-cols-2 gap-2" aria-hidden>
            <Figure title="Front" regions={FRONT} options={options} selected={selected} onTap={setSelected} />
            <Figure title="Back" regions={BACK} options={options} selected={selected} onTap={setSelected} />
          </div>
          {selected && label && (
            <div role="group" aria-label="Confirm the place" className="mt-2 rounded-xl border-2 border-blue-600 bg-blue-50 p-3 text-center">
              <p className="font-semibold text-blue-950">
                {label} — is that the right place?
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onPick(selected)} className="min-h-11 rounded-lg bg-blue-900 px-3 font-bold text-white">
                  Yes, that&apos;s it
                </button>
                <button type="button" onClick={() => setSelected(null)} className="min-h-11 rounded-lg border-2 border-blue-900 bg-white px-3 font-semibold text-blue-900">
                  Choose again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Body areas">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o.id)}
            className={`min-h-12 rounded-xl border px-3 py-2 text-left text-[15px] font-semibold leading-tight text-slate-900 hover:border-blue-500 hover:bg-blue-50 ${selected === o.id ? "border-blue-600 bg-blue-50" : "border-slate-300 bg-white"}`}
          >
            {o.label}
          </button>
        ))}
        {!sided && (
          <button type="button" onClick={() => onPick("skip")} className="min-h-12 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-left text-[15px] font-semibold text-slate-700">
            Skip this question
          </button>
        )}
      </div>
    </div>
  );
}
