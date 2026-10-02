// Mizo (lus) support with a safety gate.
//
// - A Mizo string is used only when its status is "reviewed" (by a fluent
//   Mizo speaker AND a health reviewer), with reviewer and date recorded.
// - A surface (e.g. Emergency Mode) switches to Mizo only when 100% of its
//   safety-critical strings are reviewed; otherwise it stays fully English.
//   No half-translated emergency screens.

import { type Surface, catalog, catalogByKey } from "./catalog";
import lusJson from "./lus.json";

export type Locale = "en" | "lus";
export type Translation = { text: string; status: "draft" | "reviewed"; reviewer?: string; reviewedOn?: string; notes?: string };
export type Translations = Record<string, Translation>;

export const LOCALES: { id: Locale; label: string; nativeLabel: string }[] = [
  { id: "en", label: "English", nativeLabel: "English" },
  { id: "lus", label: "Mizo", nativeLabel: "Mizo" },
];

export const lus: Translations = lusJson as Translations;

// Numbers that must appear unchanged in any translation (phone numbers etc.).
export function protectedTokens(text: string): string[] {
  return text.match(/\b\d{3,}(?:-\d+)*\b/g) ?? [];
}

export function isUsable(key: string, t: Translation | undefined): t is Translation {
  if (!t || t.status !== "reviewed" || !t.text.trim() || !t.reviewer?.trim() || !t.reviewedOn?.trim()) return false;
  const source = catalogByKey.get(key);
  if (!source) return false;
  return protectedTokens(source.text).every((n) => t.text.includes(n));
}

export function coverage(surface: Surface, translations: Translations = lus) {
  const entries = catalog.filter((e) => e.surface === surface && e.critical);
  const reviewed = entries.filter((e) => isUsable(e.key, translations[e.key])).length;
  return { total: entries.length, reviewed, percent: entries.length ? Math.floor((reviewed / entries.length) * 100) : 0 };
}

export function surfaceReady(surface: Surface, translations: Translations = lus): boolean {
  const c = coverage(surface, translations);
  return c.total > 0 && c.reviewed === c.total;
}

// The language a surface will actually be shown in.
export function effectiveLocale(locale: Locale, surface: Surface, translations: Translations = lus): Locale {
  return locale === "lus" && surfaceReady(surface, translations) ? "lus" : "en";
}

export function translate(locale: Locale, key: string, translations: Translations = lus): string {
  const source = catalogByKey.get(key)?.text ?? key;
  if (locale !== "lus") return source;
  const t = translations[key];
  return isUsable(key, t) ? t.text : source;
}

export function anySurfaceReady(translations: Translations = lus): boolean {
  return (["emergency", "triage"] as Surface[]).some((s) => surfaceReady(s, translations));
}
