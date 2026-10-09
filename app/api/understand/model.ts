// The online model behind /api/understand: OpenAI's Chat Completions API
// with Structured Outputs, so the reply can only be ids of the options on
// screen. Server-only (the key never reaches the browser).
//
// Settings (environment variables on the server; never committed):
//   AI_UNDERSTANDING=on          switch the feature on (off when unset)
//   OPENAI_API_KEY=…             the project's key
//   OPENAI_MODEL                 default: gpt-5.4-mini
//   OPENAI_REASONING_EFFORT      default: low ("default" leaves it to the model)
//
// Privacy: `store: false` (not kept for distillation or evals), no logging
// of the words or the reply, and the prompt is short (no long cached prefix).

import OpenAI from "openai";
import { SYSTEM_PROMPT, type UnderstandReply, type UnderstandRequest, acceptReply, replySchema, userPrompt } from "../../lib/understand";

export const DEFAULT_MODEL = "gpt-5.4-mini";
const EFFORTS = ["none", "minimal", "low", "medium", "high"] as const;
type Effort = (typeof EFFORTS)[number];

export type ModelConfig = { model: string; effort: Effort | null; timeoutMs: number };

export function configFromEnv(env: Record<string, string | undefined> = process.env): (ModelConfig & { key: string }) | null {
  if ((env.AI_UNDERSTANDING ?? "").trim().toLowerCase() !== "on") return null;
  const key = (env.OPENAI_API_KEY ?? "").trim();
  if (!key) return null;
  const e = (env.OPENAI_REASONING_EFFORT ?? "low").trim().toLowerCase();
  return {
    key,
    model: (env.OPENAI_MODEL ?? "").trim() || DEFAULT_MODEL,
    effort: (EFFORTS as readonly string[]).includes(e) ? (e as Effort) : null,
    timeoutMs: 7000,
  };
}

// Only the part of the SDK client this uses (tests pass a fake).
export type ChatClient = Pick<OpenAI, "chat">;

export function clientFor(cfg: { key: string; timeoutMs: number }): ChatClient {
  // No retries: the patient is waiting, and the room carries on without it.
  return new OpenAI({ apiKey: cfg.key, timeout: cfg.timeoutMs, maxRetries: 0 });
}

export type Asked = { status: "ok"; reply: UnderstandReply } | { status: "refused" | "failed" };

export async function understandWith(client: ChatClient, req: UnderstandRequest, cfg: ModelConfig): Promise<Asked> {
  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await client.chat.completions.create({
      model: cfg.model,
      messages: [
        { role: "developer", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt(req) },
      ],
      response_format: { type: "json_schema", json_schema: { name: "patient_answer", strict: true, schema: replySchema(req) } },
      ...(cfg.effort ? { reasoning_effort: cfg.effort } : {}),
      max_completion_tokens: 2000,
      store: false,
    });
  } catch {
    // Network, timeout, key, rate limit or model errors: the room carries on
    // with its own wording. Nothing is logged (it could contain the words).
    return { status: "failed" };
  }
  const choice = completion.choices[0];
  if (!choice) return { status: "failed" };
  if (choice.message.refusal) return { status: "refused" };
  if (choice.finish_reason !== "stop" || !choice.message.content) return { status: "failed" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(choice.message.content);
  } catch {
    return { status: "failed" };
  }
  const ids = acceptReply(req, parsed);
  const certain = !!(parsed && typeof parsed === "object" && (parsed as { certain?: unknown }).certain === true);
  return { status: "ok", reply: { answer: ids ?? [], certain: ids ? certain : false } };
}
