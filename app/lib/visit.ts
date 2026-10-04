// "My Visit": the current visit, held in this tab's memory only.
//
// No login, no browser storage, nothing sent anywhere. Moving between pages
// inside the site keeps it; reloading, closing the tab or "Clear this visit"
// forgets it. Keeping a summary longer is the patient's choice (print, copy,
// share, or the consent-gated Health Passport).

import type { SummarySection } from "./summary";

export type Visit = {
  updatedAt: number;
  sections: SummarySection[];
  text: string; // plain text, for copy and share
  level?: string; // navigation urgency, if a triage was done
  recommendation?: string;
  departments?: string[];
};

let current: Visit | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function recordVisit(v: Omit<Visit, "updatedAt">) {
  if (current && current.text === v.text) return;
  current = { ...v, updatedAt: Date.now() };
  emit();
}

export function clearVisit() {
  current = null;
  emit();
}

export const getVisit = (): Visit | null => current;
export const getServerVisit = (): Visit | null => null;

export function subscribeVisit(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
