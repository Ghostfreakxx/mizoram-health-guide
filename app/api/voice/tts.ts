// The doctor's natural voice: OpenAI text-to-speech, called from the server
// only (the key never reaches the browser).
//
// Settings (environment variables on the server; never committed):
//   OPENAI_API_KEY=…         the project's key; the voice is on when it is set
//   DOCTOR_VOICE=off         switch the natural voice off without removing the key
//   OPENAI_TTS_MODEL         default: gpt-4o-mini-tts
//   OPENAI_TTS_VOICE         default: marin
//
// Nothing is logged or stored here; the audio is streamed straight back.

import OpenAI from "openai";
import type { Tone, VoiceRequest } from "../../lib/doctorVoice";

export const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
export const DEFAULT_TTS_VOICE = "marin";

// How she sounds. Fixed here (never taken from the request), one per tone.
export const INSTRUCTIONS: Record<Tone, string> = {
  calm:
    "Voice: a warm, calm, professional woman doctor at a government hospital in Mizoram, India. Accent: gentle, clear Indian English. " +
    "Pace: unhurried, with natural pauses, easy to follow for someone who is unwell or anxious. Tone: kind and attentive; never cheerful about symptoms. " +
    "Say numbers clearly.",
  serious:
    "Voice: a calm, caring woman doctor in Mizoram, India, explaining that the patient should see a doctor soon. Accent: clear Indian English. " +
    "Pace: steady and clear. Tone: serious and reassuring at once; no smile in the voice.",
  urgent:
    "Voice: a woman doctor in Mizoram, India, in an emergency. Accent: clear Indian English. Pace: steady and clear, not rushed. " +
    "Tone: firm, direct and calm, so the listener acts now. Say the phone numbers one digit at a time: one zero eight, one one two.",
};

export type TtsConfig = { key: string; model: string; voice: string; timeoutMs: number };

export function ttsConfigFromEnv(env: Record<string, string | undefined> = process.env): TtsConfig | null {
  if ((env.DOCTOR_VOICE ?? "").trim().toLowerCase() === "off") return null;
  const key = (env.OPENAI_API_KEY ?? "").trim();
  if (!key) return null;
  return {
    key,
    model: (env.OPENAI_TTS_MODEL ?? "").trim() || DEFAULT_TTS_MODEL,
    voice: (env.OPENAI_TTS_VOICE ?? "").trim() || DEFAULT_TTS_VOICE,
    timeoutMs: 10_000,
  };
}

// Only the part of the SDK client this uses (tests pass a fake).
export type SpeechClient = { audio: { speech: Pick<OpenAI["audio"]["speech"], "create"> } };

export function ttsClient(cfg: TtsConfig): SpeechClient {
  // No retries: the patient is waiting, and the device's voice takes over.
  return new OpenAI({ apiKey: cfg.key, timeout: cfg.timeoutMs, maxRetries: 0 });
}

const supportsInstructions = (model: string) => !/^tts-1/.test(model);

// The audio (MP3) for one sentence, or null on any failure.
export async function speechFor(client: SpeechClient, req: VoiceRequest, cfg: TtsConfig): Promise<Response | null> {
  try {
    const audio = await client.audio.speech.create({
      model: cfg.model,
      voice: cfg.voice,
      input: req.text,
      ...(supportsInstructions(cfg.model) ? { instructions: INSTRUCTIONS[req.tone] } : {}),
      response_format: "mp3",
      speed: req.slow ? 0.88 : 1,
    });
    return audio.ok && audio.body ? audio : null;
  } catch {
    // Key, network, rate-limit or model errors. Nothing is logged (the
    // sentence can mention the patient's symptoms).
    return null;
  }
}
