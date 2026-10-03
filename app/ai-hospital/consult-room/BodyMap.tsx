"use client";

import type { Option } from "../../lib/consultation";

// "Where are you experiencing the problem?" — tap the body or use the list.
// Structured input for the summary only; never a diagnosis.

const REGIONS: { id: string; d: string }[] = [
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

export default function BodyMap({ options, onPick }: { options: Option[]; onPick: (id: string) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-start">
      <svg viewBox="0 0 200 400" className="mx-auto h-72 w-auto" aria-hidden>
        {REGIONS.map((r) => (
          <path
            key={r.id}
            d={r.d}
            onClick={() => onPick(r.id)}
            className="cursor-pointer fill-slate-200 stroke-white transition-colors hover:fill-blue-300"
            strokeWidth={2}
          >
            <title>{options.find((o) => o.id === r.id)?.label}</title>
          </path>
        ))}
      </svg>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button key={o.id} type="button" onClick={() => onPick(o.id)} className="min-h-12 rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-left font-semibold text-slate-900 hover:border-blue-500 hover:bg-blue-50">
            {o.label}
          </button>
        ))}
        <button type="button" onClick={() => onPick("skip")} className="min-h-12 rounded-xl border-2 border-dashed border-slate-300 px-4 py-2 text-left font-semibold text-slate-700">
          Skip this question
        </button>
      </div>
    </div>
  );
}
