# Safety model

## What the system is allowed to do

Help a person recognise an emergency, decide how urgently to be seen and
where, describe the problem, and arrive with a clear summary. It is
navigation, not diagnosis.

It never: names a diagnosis for the patient ("you have…"), prescribes,
gives doses, says someone does not need a doctor, simulates an examination
or a measurement, or claims government approval. `lib/safety/language.ts`
holds banned patterns; tests run every engine line through them.

## Layers

1. **Red-flag detection** (`detect.ts`) runs on every message at every step,
   before anything else. Typos are repaired with a small edit distance
   (protected words prevent "feeling" → "feeding"). Reassurance never cancels
   a flag ("chest pain but I'm fine" is an emergency). A negated flag ("no
   chest pain") is **asked about**, never treated as safe. Some flags
   (suicide, infant, pregnancy, postpartum, overdose) are never negatable.
2. **Ask-first patterns.** Words that may or may not mean an emergency now
   ("breathing problem", "short of breath", "black stools") always trigger a
   direct yes/no safety question. A question *about a word* ("what does
   shortness of breath mean?") does not.
3. **Emergency checklist** before routine questions.
4. **Triage** (`triage.ts`): each answer can only raise urgency. Named policy
   rules (`POLICY_RULES`, e.g. `P-INFANT`, `P-MISSING`) also only raise it.
   Higher-risk groups never receive self-care. Missing course-of-illness
   answers never lead to self-care. "Not sure" about a danger sign → urgent.
5. **Fail-safe**: any error → "see a health worker today; 108/112 if very
   unwell".
6. **No earlier answer can hide a clear red flag.** An earlier "no" to an
   unclear mention never suppresses a later explicit one. If the patient left
   Emergency Mode ("this is not an emergency"), the same flag mentioned again
   is asked about directly — never ignored.
7. **Contradictions are asked, not guessed** (`recheck`), and a new
   statement is never read as "yes" to an unrelated question on screen.
8. **Emergency Mode** interrupts everything: questioning stops, speech stops,
   108 / 112 and what to do while waiting are shown first. It cannot be
   overridden by later answers.

## Conversational difficulty ≠ clinical urgency

`escalationFor()` (`lib/escalation.ts`) is the only function that decides a
handoff, and only for: emergency red flag, urgent triage result, routing
criteria, self-care result, or the patient asking for a professional.
Unclear words, "I don't know", failed speech recognition or a missing
knowledge answer are **not** reasons (`NOT_REASONS`). Instead the doctor
climbs a clarification ladder: ask another way → simpler → choices → Help
me describe it (body map, side, feeling, timing, pattern) — and keeps going.

## What is tested

`tests/safety/` (Vitest, 511 tests) — among them:

| File | Covers |
| --- | --- |
| `regression-corpus.test.ts` | Emergencies in broken / misspelt / Indian English; reassurance; negation; ask-first; conversation difficulty never escalates; corrections; nothing invented |
| `no-give-up.test.ts` | Clarification ladder, Help me describe it, knowledge gaps, speech confirmation |
| `messy-language.test.ts` | Typos, fillers, corrections ("no sorry left") |
| `conversation.test.ts`, `consult.test.ts` | Memory, no repeated questions, missing stays missing |
| `triage.test.ts`, `detect.test.ts`, `integrity.test.ts` | Engine invariants, every source exists, language policy |
| `demo.test.ts`, `acceptance.test.ts` | Every demo scenario through the real engine; the acceptance journeys |
| `simulations.test.ts` | 400 seeded simulated consultations; invariants at every step (found and fixed four safety bugs) |
| `patient-memory.test.ts`, `director.test.ts` | Contradictions, negation, other problems, provenance; behaviour rules (emergency never delayed) |
| `review-registry.test.ts` | Review list current; no missing sources; nothing verified without sign-off |

Browser tests (`tests/e2e/`, Playwright, phone and desktop): emergency
interruption, Reception, text-only, no-3D, no-voice, Data Saver, offline,
My Visit, demo mode, accessibility (axe) on every page.

## Known limits (honest)

- Detection is vocabulary-based. A danger described in words the patterns do
  not know is caught later by the checklist and triage questions, not at the
  first message. New phrasings must be added with a test.
- Mizo and Mizo-English phrasing is **not** covered yet: it needs a reviewed
  phrase list from qualified translators and clinicians.
- No rule has been reviewed by a clinician yet (see `CLINICAL_REVIEW.md`).
- Source records have not been re-checked against the live official pages.
