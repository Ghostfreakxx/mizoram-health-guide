# Roadmap

Ordered by impact on a person in Mizoram reaching the right care. Items
that need someone outside the code team say who.

## Before any pilot (blocking)

1. **Clinical review of every rule** — 310 items in `CLINICAL_REVIEW.md`
   (red flags, triage questions, policy rules, wording, glossary, education).
   *Needs: Health Department clinicians.* Record sign-offs in `SIGN_OFFS`.
2. **Verify local data** — helpline numbers, the three seeded facilities,
   eSanjeevani access steps, and the 60 source records against the live
   official pages. *Needs: Health Department / NHM Mizoram data owner.*
3. **Privacy and legal approval** for a pilot, including whether pilot
   counts are collected and where. *Needs: Health Department, legal.*
4. **Mizo**: translation of Reception, Emergency Mode and the consultation by
   qualified translators, reviewed by clinicians; a reviewed Mizo /
   Mizo-English phrase list for red-flag detection.
5. **Usability testing** with patients, ASHAs and health workers in Aizawl
   and at least one rural district, on low-end Android phones.

## Current milestone: VD3 — Virtual Doctor intelligence and character quality

No new features. One reference doctor (General Medicine), made exceptionally
good and tested hard; the other rooms inherit the same engine through
configuration (`consult-room/rooms.ts`). Four areas only:

- **Conversation depth** — accuracy (what was meant vs what was recorded,
  `docs/quality/CONVERSATION_ACCURACY.md`), ambiguity, corrections,
  interruptions, several problems, "I don't know", unusual wording,
  contradictions, long visits. Held-out phrase sets keep the numbers honest.
- **Character quality** — gaze, micro-expressions, blending, lip sync,
  posture, pauses, environment awareness, department-specific behaviour.
- **Clinical traceability** — every safety and routing behaviour, and every
  sentence about urgency, medicines or diagnosis, explainable, source-linked,
  on the review list and tested.
- **Real-world resilience** — weak internet, cheap phones, microphone /
  WebGL / API failure, offline, accessibility.

Done so far: the accuracy harness (found and fixed 3 unsafe misreadings:
"I'm not certain" and "I didn't check" recorded as "no", "I think so" as
"not sure"); summary fidelity in messy visits (found that "sorry, I meant
no" answered the next question and left the wrong answer — fixed);
the doctor's reactions to corrections, contradictions and "not sure";
spoken-line traceability (45 safety lines added to the review
list); lip sync on every spoken line (numbers were silent); phone keyboard
and rotation.

## Next engineering work

6. Facility directory: import verified facility list (level, ownership,
   services, emergency availability, coordinates) per district; "nearest
   facility of the right level" once data exists.
7. Resume an interrupted consultation from My Visit (state in tab memory).
8. A pilot telemetry collector that applies `sanitize()` / `aggregate()` and
   a small dashboard of suppressed counts (only after approval in 3).
9. Red-flag vocabulary growth from pilot conversations (with tests), and a
   reviewed list of local terms.
10. Health Library: move all topic content into the review registry item by
    item (each passage with its own status), and add topics prioritised by
    clinicians for Mizoram.

## Deferred (justify before building)

- More consultation rooms beyond the six — only when the triage content for
  that department is reviewed.
- Generative language features — only as an input helper or a phraser of
  approved content, behind the safety engine, with an offline fallback.
- Appointment booking — only with a real hospital system to connect to.
