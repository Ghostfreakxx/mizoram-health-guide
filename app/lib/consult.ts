// Live consultation with REAL doctors (not AI).
//
// AI Hospital never acts as the doctor. Live video consultations connect a
// patient to a registered medical practitioner through a video server the
// Health Department controls (self-hosted Jitsi Meet, e.g. on government
// cloud in India). The feature is OFF until that server is configured.
// See docs/LIVE_CONSULTATION.md.

export type ConsultConfig = { enabled: boolean; domain: string | null };

const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function readConfig(domain: string | undefined = process.env.NEXT_PUBLIC_LIVE_CONSULT_DOMAIN): ConsultConfig {
  const d = (domain ?? "").trim().toLowerCase();
  // Public demo servers are not acceptable for health consultations.
  if (!d || !DOMAIN_RE.test(d) || d === "meet.jit.si") return { enabled: false, domain: null };
  return { enabled: true, domain: d };
}

// Room codes are random and carry no personal or health information.
export const ROOM_RE = /^mhg-[a-z0-9]{20}$/;

export function isValidRoomId(id: string): boolean {
  return ROOM_RE.test(id);
}

export function newRoomId(randomBytes: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(20);
  return `mhg-${[...bytes].map((b) => alphabet[b % alphabet.length]).join("")}`;
}

// What the patient must agree to before joining a live consultation.
export const PATIENT_CONSENT = [
  "I want a video consultation with a registered doctor.",
  "I understand this is not for emergencies. In an emergency I will call 108 or 112.",
  "The doctor may ask me to visit a hospital in person if needed.",
  "The consultation is not recorded by AI Hospital.",
];

export function canJoin(consents: boolean[]): boolean {
  return consents.length === PATIENT_CONSENT.length && consents.every(Boolean);
}

// Checklist shown to doctors, based on the Telemedicine Practice Guidelines (2020).
export const DOCTOR_CHECKLIST = [
  "Tell the patient your full name and medical registration number.",
  "Confirm the patient's name and age, and who is speaking if it is a caregiver.",
  "Confirm the patient agrees to a video consultation.",
  "If this is an emergency, tell the patient to call 108 or 112 or go to the nearest emergency immediately.",
  "Decide whether the problem can be managed by video, or needs an in-person visit.",
  "Keep a record of the consultation as required for your practice.",
  "If you prescribe, follow the medicine rules for teleconsultation.",
];

// WhatsApp link for a doctor to send the consultation link. It contains only
// the random room link — no names or health details.
export function whatsappInvite(link: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`Your doctor consultation link (Mizoram Health Guide): ${link}`)}`;
}
