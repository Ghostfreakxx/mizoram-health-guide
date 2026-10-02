// The ONLY place AI Hospital may store health information.
//
// Rules (enforced by tests):
// - Nothing is stored unless the person has explicitly turned on saving.
// - Data stays in this browser on this device. It is never sent anywhere.
// - deleteAll() removes everything AI Hospital has stored.

export type Vaccination = { name: string; date: string };
export type SavedSummary = { id: string; createdAt: string; text: string };
export type Reminder = {
  id: string;
  kind: "appointment" | "medicine" | "follow-up" | "test" | "vaccination";
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  notes?: string;
};

export type Passport = {
  name: string;
  bloodGroup: string;
  allergies: string;
  medicines: string;
  conditions: string;
  emergencyContact: { name: string; phone: string };
  vaccinations: Vaccination[];
  summaries: SavedSummary[];
  reminders: Reminder[];
};

export const EMPTY_PASSPORT: Passport = {
  name: "",
  bloodGroup: "",
  allergies: "",
  medicines: "",
  conditions: "",
  emergencyContact: { name: "", phone: "" },
  vaccinations: [],
  summaries: [],
  reminders: [],
};

const PREFIX = "aih:";
const CONSENT_KEY = `${PREFIX}consent`;
const PASSPORT_KEY = `${PREFIX}passport`;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

function store(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function hasConsent(s: StorageLike | null = store()): boolean {
  try {
    return !!s && s.getItem(CONSENT_KEY) !== null;
  } catch {
    return false;
  }
}

export function grantConsent(s: StorageLike | null = store()): boolean {
  try {
    if (!s) return false;
    s.setItem(CONSENT_KEY, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

export function loadPassport(s: StorageLike | null = store()): Passport | null {
  if (!hasConsent(s)) return null;
  try {
    const raw = s!.getItem(PASSPORT_KEY);
    if (!raw) return { ...EMPTY_PASSPORT };
    const parsed = JSON.parse(raw) as Partial<Passport>;
    return { ...EMPTY_PASSPORT, ...parsed, emergencyContact: { ...EMPTY_PASSPORT.emergencyContact, ...parsed.emergencyContact } };
  } catch {
    return { ...EMPTY_PASSPORT };
  }
}

// Returns false (and stores nothing) when saving has not been turned on.
export function savePassport(p: Passport, s: StorageLike | null = store()): boolean {
  if (!hasConsent(s)) return false;
  try {
    s!.setItem(PASSPORT_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

export function saveSummary(text: string, s: StorageLike | null = store()): boolean {
  const p = loadPassport(s);
  if (!p) return false;
  const entry: SavedSummary = { id: `${Date.now()}`, createdAt: new Date().toISOString(), text };
  return savePassport({ ...p, summaries: [entry, ...p.summaries].slice(0, 20) }, s);
}

export function addReminders(reminders: Reminder[], s: StorageLike | null = store()): boolean {
  const p = loadPassport(s);
  if (!p) return false;
  return savePassport({ ...p, reminders: [...p.reminders, ...reminders] }, s);
}

// Removes everything AI Hospital has stored, including the consent itself.
export function deleteAll(s: StorageLike | null = store()): void {
  if (!s) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => s.removeItem(k));
  } catch {
    // Nothing else we can do; the browser's own "clear site data" also works.
  }
}
