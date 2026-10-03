// Carries the patient's words from Reception into a consultation room.
// In memory only: never in the address bar, never in browser storage. It is
// read once and then forgotten. A full page reload simply loses it.

let pending: string | null = null;

export function setPendingConcern(text: string) {
  pending = text.trim().slice(0, 300) || null;
}

export function takePendingConcern(): string | null {
  const t = pending;
  pending = null;
  return t;
}

// Which consultation room to offer for a set of department slugs. General
// Medicine is the general front door until more rooms are built.
export function roomForDepartments(slugs: string[], hasRoom: (slug: string) => boolean): string {
  return slugs.find(hasRoom) ?? "general-medicine";
}
