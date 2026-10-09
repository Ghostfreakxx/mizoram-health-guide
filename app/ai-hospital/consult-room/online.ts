// The consultation's only network call, and only after the patient agrees
// for this visit: "online help understanding my words" (app/lib/understand.ts
// is the contract — what is sent, what may come back, and the safety
// policy). Sends exactly the request built by `requestFor()`; nothing is
// logged or stored, and any failure simply means "no suggestion".

import { UNDERSTAND_PATH, type UnderstandReply, type UnderstandRequest } from "../../lib/understand";

const ASK_TIMEOUT_MS = 8000;
const CHECK_TIMEOUT_MS = 4000;

function within(ms: number, outer?: AbortSignal): { signal: AbortSignal; done: () => void } {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  const stop = () => c.abort();
  outer?.addEventListener("abort", stop, { once: true });
  return { signal: c.signal, done: () => { clearTimeout(t); outer?.removeEventListener("abort", stop); } };
}

// Is it switched on for this site? Asks once (no patient data in it).
let availability: Promise<boolean> | null = null;
export function onlineAvailable(): Promise<boolean> {
  availability ??= (async () => {
    const w = within(CHECK_TIMEOUT_MS);
    try {
      const r = await fetch(UNDERSTAND_PATH, { cache: "no-store", credentials: "omit", signal: w.signal });
      const j: unknown = r.ok ? await r.json() : null;
      const on = !!j && typeof j === "object" && (j as { available?: unknown }).available === true;
      if (!on) availability = null; // checked again next visit
      return on;
    } catch {
      availability = null;
      return false;
    } finally {
      w.done();
    }
  })();
  return availability;
}

// One question, its options and the patient's (redacted) words → the
// model's reply, or null on any failure, timeout or cancellation.
export async function askOnline(req: UnderstandRequest, signal?: AbortSignal): Promise<UnderstandReply | null> {
  const w = within(ASK_TIMEOUT_MS, signal);
  try {
    const r = await fetch(UNDERSTAND_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      cache: "no-store",
      credentials: "omit",
      signal: w.signal,
    });
    if (!r.ok) return null;
    const j: unknown = await r.json();
    if (!j || typeof j !== "object") return null;
    const { answer, certain } = j as Record<string, unknown>;
    return Array.isArray(answer) && answer.every((a) => typeof a === "string") && typeof certain === "boolean" ? { answer: answer as string[], certain } : null;
  } catch {
    return null;
  } finally {
    w.done();
  }
}
