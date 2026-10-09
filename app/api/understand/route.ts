// /api/understand — optional online help understanding one answer.
//
// GET  → { available }: is it switched on for this site? (No patient data.)
// POST → { answer: [option ids], certain } for one question and one reply,
//        sent by the room only after the patient agreed (app/lib/understand.ts
//        is the contract). Never logs, stores or caches what is sent.

import { type UnderstandReply, UNDERSTAND_LIMITS, validateRequest } from "../../lib/understand";
import { type ChatClient, clientFor, configFromEnv, understandWith } from "./model";

// Reads the server's environment on every request (switching it on or off
// needs no rebuild).
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const none = (status: string, http: number) => Response.json({ answer: [], certain: false, status }, { status: http, headers: NO_STORE });

// A little protection for the key: a few requests a minute from each
// address, and a ceiling for the whole site. Counts only; addresses are kept
// in memory for a minute, never logged.
const PER_ADDRESS = 20;
const PER_SITE = 600;
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

let cached: { key: string; client: ChatClient } | null = null;
function client(cfg: { key: string; timeoutMs: number }): ChatClient {
  if (!cached || cached.key !== cfg.key) cached = { key: cfg.key, client: clientFor(cfg) };
  return cached.client;
}

export async function GET() {
  return Response.json({ available: configFromEnv() !== null }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const cfg = configFromEnv();
  if (!cfg) return none("unavailable", 503);
  // Only this site's pages may ask (browsers mark cross-site requests).
  if (request.headers.get("sec-fetch-site") === "cross-site") return none("forbidden", 403);
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return none("bad-request", 415);
  const address = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
  if (!allowed(address)) return none("limited", 429);

  const raw = await request.text();
  if (raw.length > UNDERSTAND_LIMITS.body) return none("bad-request", 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return none("bad-request", 400);
  }
  const req = validateRequest(body);
  if (!req) return none("bad-request", 400);

  const asked = await understandWith(client(cfg), req, cfg);
  if (asked.status !== "ok") return none(asked.status, asked.status === "refused" ? 200 : 502);
  const reply: UnderstandReply = asked.reply;
  return Response.json({ ...reply, status: "ok" }, { headers: NO_STORE });
}
