// The doctor's natural voice (optional): what may be sent to make it.
//
// When the site has an OpenAI key, the doctor's sentences can be spoken in a
// natural voice made by OpenAI's text-to-speech, through this site's
// /api/voice (the key stays on the server). Rules, shared by the room and the
// server route:
// - Only the doctor's own sentence is sent, one at a time, with its tone and
//   pace. Nothing else: no answers, no summary, no identifiers.
// - A sentence that repeats the patient's own words ("Sorry — you did tell
//   me: “…”") is never sent: the device's voice says it instead. So the
//   patient's own words never leave the device.
// - An emergency never waits for the network: the emergency line is prepared
//   when the consultation begins; if it is not ready, the device's voice
//   says it at once.
// - Any failure: the device's voice, and the consultation carries on.

import type { ConsultState } from "./consultation";

export const VOICE_PATH = "/api/voice";
export const VOICE_LIMITS = { text: 500, body: 2_000 } as const;
export const VOICE_PROVIDER = "OpenAI";

// How the sentence should sound (chosen from the doctor's state).
export const TONES = ["calm", "serious", "urgent"] as const;
export type Tone = (typeof TONES)[number];
export function toneFor(state: string): Tone {
  if (state === "emergency") return "urgent";
  if (state === "concerned") return "serious";
  return "calm";
}

export type VoiceRequest = { v: 1; text: string; tone: Tone; slow: boolean };

// Server side: accept only a request of exactly this shape and size.
export function validateVoiceRequest(body: unknown): VoiceRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.v !== 1 || typeof b.text !== "string" || typeof b.slow !== "boolean" || !(TONES as readonly unknown[]).includes(b.tone)) return null;
  const text = b.text.replace(/\s+/g, " ").trim();
  // Control characters are refused (tabs and new lines are fine).
  if (!text || text.length > VOICE_LIMITS.text || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(b.text)) return null;
  return { v: 1, text, tone: b.tone as Tone, slow: b.slow };
}

const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const grams = (words: string[], n: number) => {
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
};

// Does this sentence repeat something the patient typed or said? Either a
// whole message of two words or more, or any run of four words in a row.
export function patientWordsIn(sentence: string, patientTexts: string[]): boolean {
  const s = norm(sentence);
  if (!s) return false;
  const sw = s.split(" ");
  const sentenceGrams = grams(sw, 4);
  const padded = ` ${s} `;
  for (const raw of patientTexts) {
    const p = norm(raw);
    if (!p) continue;
    const pw = p.split(" ");
    if ((pw.length >= 2 || p.length >= 8) && padded.includes(` ${p} `)) return true;
    for (const g of grams(pw, 4)) if (sentenceGrams.has(g)) return true;
  }
  return false;
}

// Everything the patient wrote or said in this visit (free text only; the
// labels of buttons they tapped are the doctor's own words).
export function patientTexts(s: ConsultState): string[] {
  return [s.concernText, ...s.said, s.medicines, s.allergies, s.conditions, s.description, s.bodyWords, s.modifiers, ...s.otherConcerns].filter((x): x is string => !!x && !!x.trim());
}
