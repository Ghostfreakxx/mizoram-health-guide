import type { Tier } from "./capability";

// Bump when the model is rebuilt (scripts/avatar) so phones fetch the new one.
export const MODEL_VERSION = 11;

// Every 3D tier uses the same full-detail doctor (about 370 KB). Automatically
// simplified versions damaged the face (creased forehead, broken lips), which
// looks unsettling; quality tiers instead change rendering cost: resolution,
// shadows, reflections, skin micro-detail and how much of the room is drawn.
const DOCTOR = `/models/guide-high.glb?v=${MODEL_VERSION}`;
export const MODEL_URL: Record<Exclude<Tier, "fallback">, string> = { high: DOCTOR, medium: DOCTOR, low: DOCTOR };
