// /api/voice — the doctor's natural voice (optional).
//
// GET  → { available }: is a natural voice set up on this site? (No patient data.)
// POST → MP3 audio of one of the doctor's sentences (app/lib/doctorVoice.ts
//        is the contract). Never logs, stores or caches what is sent; the
//        sentence is in the request body, never in the address.

import { VOICE_LIMITS, validateVoiceRequest } from "../../lib/doctorVoice";
import { type SpeechClient, speechFor, ttsClient, ttsConfigFromEnv } from "./tts";

// Reads the server's environment on every request (adding or removing the
// key needs no code change).
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const refuse = (status: string, http: number) => Response.json({ status }, { status: http, headers: NO_STORE });

// Protects the key: a consultation speaks a few sentences a minute (some
// fetched ahead), so this is generous for a patient and tight for misuse.
// Counts only, kept in memory for a minute; addresses are never logged.
const PER_ADDRESS = 120;
const PER_SITE = 3000;
const WINDOW_MS = 60_000;
let windowStart = 0;
let siteCount = 0;
const perAddress = new Map<string, number>();
function allowed(address: string, now = Date.now()): boolean {
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    siteCount = 0;
    perAddress.clear();
  }
  const n = perAddress.get(address) ?? 0;
  if (n >= PER_ADDRESS || siteCount >= PER_SITE) return false;
  perAddress.set(address, n + 1);
  siteCount++;
  return true;
}

let cached: { key: string; client: SpeechClient } | null = null;
function client(cfg: Parameters<typeof ttsClient>[0]): SpeechClient {
  if (!cached || cached.key !== cfg.key) cached = { key: cfg.key, client: ttsClient(cfg) };
  return cached.client;
}

export async function GET() {
  return Response.json({ available: ttsConfigFromEnv() !== null }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const cfg = ttsConfigFromEnv();
  if (!cfg) return refuse("unavailable", 503);
  // Only this site's pages may ask (browsers mark cross-site requests).
  if (request.headers.get("sec-fetch-site") === "cross-site") return refuse("forbidden", 403);
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return refuse("bad-request", 415);
  const address = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
  if (!allowed(address)) return refuse("limited", 429);

  const raw = await request.text();
  if (raw.length > VOICE_LIMITS.body) return refuse("bad-request", 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return refuse("bad-request", 400);
  }
  const req = validateVoiceRequest(body);
  if (!req) return refuse("bad-request", 400);

  const audio = await speechFor(client(cfg), req, cfg);
  if (!audio) return refuse("failed", 502);
  return new Response(audio.body, { headers: { ...NO_STORE, "Content-Type": "audio/mpeg" } });
}
