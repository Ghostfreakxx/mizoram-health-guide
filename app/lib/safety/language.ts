// Fixed, pre-written navigation wording. Results are never composed freely,
// and every message describes what to do next — never a diagnosis.

import type { Level } from "./triage";

export const LEVEL_TEXT: Record<
  Level,
  { label: string; title: string; message: string; nowMessage?: string; icon: string }
> = {
  RED: {
    label: "RED — Emergency",
    title: "Emergency",
    message:
      "Based on the information you provided, this may be an emergency. Call 108 or 112 now, or go to the nearest hospital emergency department.",
    icon: "🚨",
  },
  ORANGE: {
    label: "ORANGE — Urgent assessment",
    title: "Urgent medical assessment",
    message:
      "Based on the information you provided, seeking urgent medical assessment is recommended today. Go to a hospital or health centre today.",
    nowMessage:
      "Based on the information you provided, seeking urgent medical assessment is recommended now. Go to a hospital or health centre as soon as possible — do not wait.",
    icon: "⏰",
  },
  YELLOW: {
    label: "YELLOW — Consultation recommended",
    title: "See a doctor soon",
    message:
      "Based on the information you provided, a consultation with a doctor is recommended within the next few days. An online consultation may be a good first step.",
    icon: "📅",
  },
  GREEN: {
    label: "GREEN — Self-care with safety advice",
    title: "Usually suitable for self-care",
    message:
      "Based on the information you provided, this is usually suitable for self-care at home. Watch for the warning signs below, and see a doctor if things change.",
    icon: "🏠",
  },
};

export const FAILSAFE_MESSAGE =
  "We could not complete the check. If you feel very unwell or think this may be an emergency, call 108 or 112 now. Otherwise, please see a doctor or health worker today.";

export const SAFETY_NET = [
  "You get worse, or new symptoms appear",
  "You are not getting better after 3 days",
  "You are worried for any reason",
];

// Patterns that must never appear in anything AI Hospital tells a user.
export const BANNED_PATTERNS: RegExp[] = [
  /\byou (probably |likely |definitely |may |might |could )?have (a |an )?(?!been|had|a fever|fever|any|the right|your|no|questions)[a-z]+ (disease|infection|cancer|diabetes|tb|tuberculosis|malaria|dengue|hiv|aids|syndrome|disorder)\b/i,
  /\byou (probably|likely|definitely) have\b/i,
  /\bthis is definitely\b/i,
  /\byour diagnosis is\b/i,
  /\byou are (diagnosed|suffering from)\b/i,
  /\b\d{1,3}\s?% (chance|probability|likely)\b/i,
  /\bprobability of\b/i,
  /\b\d+(\.\d+)?\s?(mg|mcg|ml|tablets?)\s?(per|a|every|twice|once|three times)\b/i,
  /\btake \d+/i,
  // Naming a condition as the person's ("You have pneumonia"). Questions such
  // as "Do you have…" or "Have you been told you have…" are allowed.
  /(?<!\b(do|if|whether|told|that|think|may|might|could) )\byou (probably |likely |definitely |certainly )?have (pneumonia|cancer|diabetes|tb|tuberculosis|malaria|dengue|hiv|aids|covid|typhoid|hepatitis|asthma|a heart attack|a stroke|an infection|appendicitis|jaundice)\b/i,
  /\bI (can )?diagnose\b/i,
  /\byou (do not|don't|dont|no longer) need (a |to see a |any )?(real )?(doctor|hospital|medical care)\b/i,
];

export function violatesLanguagePolicy(text: string): RegExp | null {
  return BANNED_PATTERNS.find((p) => p.test(text)) ?? null;
}
