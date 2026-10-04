// THE helpline registry. Every phone number shown anywhere on the site comes
// from here (via lib/services.ts), with its organisation, purpose and source.
// Do not write phone numbers into components — use <CallLink id="…" />.
//
// Verification: each number points to a source record (lib/sources.ts). A
// number whose source has not yet been checked against the live official
// page is shown with that status on the Sources page. 108 and 112 are the
// national emergency numbers and are always shown in emergencies.

import { getService } from "./services";
import { getSource } from "./sources";

export type HelplineId = "ambulance-108" | "erss-112" | "telemanas" | "aids-helpline" | "quitline" | "tb-helpline";

export type Helpline = {
  id: HelplineId;
  name: string;
  number: string; // as displayed
  tel: string; // for tel: links
  purpose: string;
  urgent: boolean; // an emergency number
  sourceId: string;
  sourceTitle: string;
  checked: string | null; // date a person last checked the source
  verified: boolean;
};

const ORDER: HelplineId[] = ["ambulance-108", "erss-112", "telemanas", "tb-helpline", "aids-helpline", "quitline"];
const URGENT = new Set<HelplineId>(["ambulance-108", "erss-112"]);

function build(id: HelplineId): Helpline {
  const s = getService(id);
  if (!s?.phone) throw new Error(`Helpline ${id} has no phone in lib/services.ts`);
  const src = getSource(s.sourceId);
  return {
    id,
    name: s.name,
    number: s.phone.display,
    tel: s.phone.tel,
    purpose: s.description,
    urgent: URGENT.has(id),
    sourceId: s.sourceId,
    sourceTitle: src?.title ?? s.sourceId,
    checked: src?.checked ?? null,
    verified: src?.status === "verified",
  };
}

export const HELPLINES: Helpline[] = ORDER.map(build);
export const helpline = (id: HelplineId): Helpline => HELPLINES.find((h) => h.id === id)!;
