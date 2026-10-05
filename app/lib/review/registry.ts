// The clinical and data review registry.
//
// Every rule, piece of health wording and item of local data that a
// clinician or a government officer must check, derived directly from the
// live definitions the app uses. Nothing here is typed twice, so the review
// list cannot drift from what the app actually does.
//
// Export for reviewers: `npm run review:export` writes
// docs/CLINICAL_REVIEW.md (readable) and docs/review/review-items.csv
// (for a spreadsheet). A test fails if the committed files are out of date.
//
// Sign-offs: a reviewer's decision is recorded in SIGN_OFFS below — by a
// person, with their role and the date. Never pre-fill it.

import { teleconsultServices } from "../../ai-hospital/data/teleconsult";
import { hospitals, verificationStatus } from "../../ai-hospital/data/hospitals";
import { HELPLINES } from "../helplines";
import { GLOSSARY } from "../knowledge/glossary";
import { PASSAGES } from "../knowledge";
import { allEducation } from "../education";
import { getSource } from "../sources";
import { LEVEL_TEXT, SAFETY_NET } from "../safety/language";
import { redFlags } from "../safety/redFlags";
import { AGE_GROUPS, POLICY_RULES, type Context, complaints, populationQuestions } from "../safety/triage";

export type ReviewStatus = "verified" | "needs-clinician-review" | "needs-government-verification" | "deprecated";

export type ReviewKind =
  | "red-flag"
  | "triage-start"
  | "triage-question"
  | "triage-policy"
  | "self-care"
  | "wording"
  | "glossary"
  | "education"
  | "helpline"
  | "facility"
  | "teleconsult";

export type ReviewItem = {
  id: string; // stable, quotable in a review meeting ("TQ-cough-blood")
  kind: ReviewKind;
  title: string;
  rule: string; // what the app does, in plain words
  sourceIds: string[];
  sources: { title: string; organisation: string; checked: string | null; verified: boolean }[];
  reviewer: "clinician" | "government";
  status: ReviewStatus;
  definedIn: string; // file to change
  signOff?: SignOff;
};

export type SignOff = { itemId: string; role: string; date: string; decision: "approved" | "changes-needed" | "deprecated"; note?: string };

// Real sign-offs only. Empty until a qualified reviewer has checked an item.
export const SIGN_OFFS: SignOff[] = [];

const LEVEL_WORDS: Record<string, string> = {
  RED: "Emergency",
  ORANGE: "Urgent — be seen today",
  YELLOW: "See a health worker within a few days",
  GREEN: "Self-care with warning signs",
};

function sourcesOf(ids: string[]) {
  return ids.map((id) => {
    const s = getSource(id);
    return s
      ? { title: s.title, organisation: s.organisation, checked: s.checked, verified: s.status === "verified" }
      : { title: `MISSING SOURCE: ${id}`, organisation: "—", checked: null, verified: false };
  });
}

function item(i: Omit<ReviewItem, "sources" | "status" | "signOff"> & { dataVerified?: boolean }): ReviewItem {
  const signOff = SIGN_OFFS.find((s) => s.itemId === i.id);
  const sources = sourcesOf(i.sourceIds);
  let status: ReviewStatus;
  if (signOff?.decision === "deprecated") status = "deprecated";
  else if (i.reviewer === "government") status = i.dataVerified ? "verified" : "needs-government-verification";
  else status = signOff?.decision === "approved" && sources.every((s) => s.verified) ? "verified" : "needs-clinician-review";
  const { dataVerified: _unused, ...rest } = i;
  void _unused;
  return { ...rest, sources, status, signOff };
}

const effectText = (e: { emergency: string } | { level: string; now?: boolean }) =>
  "emergency" in e
    ? `EMERGENCY — ${redFlags.find((f) => f.id === e.emergency)?.title ?? e.emergency}`
    : `${LEVEL_WORDS[e.level]}${e.now ? " (now)" : ""}`;

export function reviewRegistry(): ReviewItem[] {
  const out: ReviewItem[] = [];

  for (const f of redFlags) {
    out.push(
      item({
        id: `RF-${f.id}`,
        kind: "red-flag",
        title: f.title,
        rule: `Emergency Mode opens at once when this is found in anything the patient types or says, or ticked in the checklist: "${f.label}". Guidance shown while waiting: ${f.guidance.join(" / ")}`,
        sourceIds: f.sourceIds,
        reviewer: "clinician",
        definedIn: "app/lib/safety/redFlags.ts (free-text words: app/lib/safety/detect.ts)",
      }),
    );
  }

  for (const c of complaints) {
    out.push(
      item({
        id: `TS-${c.id}`,
        kind: "triage-start",
        title: `${c.label}: starting urgency`,
        rule: `Before any answers, "${c.label}" starts at: ${LEVEL_WORDS[c.base]}${c.baseNow ? " (now)" : ""}.${c.baseReason ? ` Reason shown: "${c.baseReason.text}".` : ""} Departments: ${c.departments.join(", ")}.`,
        sourceIds: c.baseReason?.sourceIds ?? [],
        reviewer: "clinician",
        definedIn: "app/lib/safety/triage.ts",
      }),
    );
    for (const q of c.questions) {
      const unsure = q.unsure ?? ("emergency" in q.yes ? { level: "ORANGE", now: true } : q.yes);
      out.push(
        item({
          id: `TQ-${q.id}`,
          kind: "triage-question",
          title: `${c.label}: "${q.text}"`,
          rule: `Yes → ${effectText(q.yes)}. Not sure → ${effectText(unsure)}. No → no change.${q.showIf ? " Asked only for some patients (see code)." : ""} Summary wording: "${q.positive}" / "${q.negative}".`,
          sourceIds: q.sourceIds,
          reviewer: "clinician",
          definedIn: "app/lib/safety/triage.ts",
        }),
      );
    }
    for (const [n, sc] of c.selfCare.entries()) {
      out.push(
        item({
          id: `SC-${c.id}-${n + 1}`,
          kind: "self-care",
          title: `${c.label}: self-care advice ${n + 1}`,
          rule: `Shown only with a self-care result: "${sc.text}"`,
          sourceIds: sc.sourceIds,
          reviewer: "clinician",
          definedIn: "app/lib/safety/triage.ts",
        }),
      );
    }
  }

  // Danger-sign questions for particular groups (babies, young children,
  // pregnancy, after birth, weak immunity), asked before the problem's own
  // questions. Who they apply to is worked out from the live rule.
  const GROUPS: [string, Context][] = [
    ["babies under 2 months", { who: "other", age: "young-infant", special: [], complaint: "other" }],
    ["children 2 months–4 years", { who: "other", age: "child-under-5", special: [], complaint: "other" }],
    ["pregnant women", { who: "self", age: "adult", sex: "female", special: ["pregnant"], complaint: "other" }],
    ["women who gave birth in the last 6 weeks", { who: "self", age: "adult", sex: "female", special: ["postpartum"], complaint: "other" }],
    ["people with a weak immune system", { who: "self", age: "adult", special: ["immunocompromised"], complaint: "other" }],
    ["everyone", { who: "self", age: "adult", special: [], complaint: "other" }],
  ];
  for (const q of populationQuestions) {
    const who = GROUPS.filter(([, c]) => !q.showIf || q.showIf(c)).map(([g]) => g);
    const asked = who.includes("everyone") ? "everyone" : who.join(", ") || "(see code)";
    const unsure = q.unsure ?? ("emergency" in q.yes ? { level: "ORANGE", now: true } : q.yes);
    out.push(
      item({
        id: `TQ-${q.id}`,
        kind: "triage-question",
        title: `Danger sign (${asked}): "${q.text}"`,
        rule: `Asked for: ${asked}, before the problem's own questions. Yes → ${effectText(q.yes)}. Not sure → ${effectText(unsure)}. No → no change. Summary wording: "${q.positive}" / "${q.negative}".`,
        sourceIds: q.sourceIds,
        reviewer: "clinician",
        definedIn: "app/lib/safety/triage.ts (populationQuestions)",
      }),
    );
  }

  for (const r of Object.values(POLICY_RULES)) {
    out.push(
      item({
        id: r.id,
        kind: "triage-policy",
        title: r.text,
        rule: `When: ${r.applies}. Effect: raises urgency to at least ${LEVEL_WORDS[r.level]}${"now" in r && r.now ? " (now)" : ""}. Policy rules can only raise urgency, never lower it.`,
        sourceIds: [...r.sourceIds],
        reviewer: "clinician",
        definedIn: "app/lib/safety/triage.ts (POLICY_RULES)",
      }),
    );
  }

  for (const [level, t] of Object.entries(LEVEL_TEXT)) {
    out.push(
      item({
        id: `W-level-${level}`,
        kind: "wording",
        title: `Result wording: ${LEVEL_WORDS[level]}`,
        rule: [t.title, t.message, t.nowMessage].filter(Boolean).join(" / "),
        sourceIds: [],
        reviewer: "clinician",
        definedIn: "app/lib/safety/language.ts",
      }),
    );
  }
  out.push(
    item({
      id: "W-safety-net",
      kind: "wording",
      title: "Safety-net advice shown with every non-emergency result",
      rule: SAFETY_NET.join(" / "),
      sourceIds: [],
      reviewer: "clinician",
      definedIn: "app/lib/safety/language.ts",
    }),
  );
  out.push(
    item({
      id: "W-age-groups",
      kind: "wording",
      title: "Age groups used for triage",
      rule: AGE_GROUPS.map((a) => a.label).join(" / "),
      sourceIds: ["who-imci"],
      reviewer: "clinician",
      definedIn: "app/lib/safety/triage.ts",
    }),
  );

  for (const t of GLOSSARY) {
    out.push(
      item({
        id: `GL-${t.id}`,
        kind: "glossary",
        title: `"${t.term}"`,
        rule: `Explained to patients as: "${t.term} means ${t.meaning}."`,
        sourceIds: [],
        reviewer: "clinician",
        definedIn: "app/lib/knowledge/glossary.ts",
      }),
    );
  }

  for (const e of allEducation()) {
    out.push(
      item({
        id: `ED-${e.id}`,
        kind: "education",
        title: e.question,
        rule: `Answer given: "${e.text.join(" ")}" (from ${e.topic.title})`,
        sourceIds: [],
        reviewer: "clinician",
        definedIn: "app/lib/education.ts + app/content/",
      }),
    );
  }
  out.push(
    item({
      id: "ED-library",
      kind: "education",
      title: `Health Library passages used to answer questions (${PASSAGES.length})`,
      rule: "Topic pages in app/content/ are split into passages; the virtual doctor quotes them word for word with the page's own sources. Review the topic pages themselves.",
      sourceIds: [],
      reviewer: "clinician",
      definedIn: "app/content/*.ts, app/lib/knowledge/index.ts",
    }),
  );

  for (const h of HELPLINES) {
    out.push(
      item({
        id: `HL-${h.id}`,
        kind: "helpline",
        title: `${h.name}: ${h.number}`,
        rule: `Shown as a tap-to-call number. Purpose: ${h.purpose}`,
        sourceIds: [h.sourceId],
        reviewer: "government",
        dataVerified: h.verified,
        definedIn: "app/lib/services.ts (via app/lib/helplines.ts)",
      }),
    );
  }

  for (const h of hospitals) {
    out.push(
      item({
        id: `FAC-${h.id}`,
        kind: "facility",
        title: `${h.name.value} (${h.district.value})`,
        rule: "Only fields with evidence are shown. Needed: facility level, ownership, address, phone, emergency availability, services, location.",
        sourceIds: [],
        reviewer: "government",
        dataVerified: verificationStatus(h) === "VERIFIED",
        definedIn: "app/ai-hospital/data/hospitals.ts",
      }),
    );
  }

  for (const s of teleconsultServices) {
    out.push(
      item({
        id: `TC-${s.id}`,
        kind: "teleconsult",
        title: s.name,
        rule: `Address and how-to steps are hidden until checked. Waiting to be checked: ${s.unverifiedNotes.join("; ")}.`,
        sourceIds: [s.sourceId],
        reviewer: "government",
        dataVerified: s.officialUrl.verified && s.verifiedFacts.length > 0,
        definedIn: "app/ai-hospital/data/teleconsult.ts",
      }),
    );
  }

  return out;
}

export const KIND_LABEL: Record<ReviewKind, string> = {
  "red-flag": "Emergency red flags",
  "triage-start": "Triage: starting urgency per problem",
  "triage-question": "Triage: questions and their effect",
  "triage-policy": "Triage: policy rules",
  "self-care": "Self-care advice",
  wording: "Result wording",
  glossary: "Plain-word explanations (glossary)",
  education: "Health education answers",
  helpline: "Helpline numbers",
  facility: "Health facilities",
  teleconsult: "Online consultation services",
};

export function reviewSummary(items = reviewRegistry()) {
  const by = (s: ReviewStatus) => items.filter((i) => i.status === s).length;
  return {
    total: items.length,
    verified: by("verified"),
    clinician: by("needs-clinician-review"),
    government: by("needs-government-verification"),
    deprecated: by("deprecated"),
    missingSources: items.filter((i) => i.sources.some((s) => s.title.startsWith("MISSING SOURCE"))).map((i) => i.id),
  };
}
