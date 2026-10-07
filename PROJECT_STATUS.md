# Project status — Mizoram AI Hospital (Prototype)

Last updated: 7 October 2026. Update at every major development pass.

**Overall: a strong prototype.** The safety architecture, consultation and
navigation work end to end and are heavily tested. It is **not** pilot-ready
until clinical review, local-data verification and privacy approval are done
(see Blocked).

Legend: PRODUCTION-READY · WORKING BUT NEEDS REVIEW · IN DEVELOPMENT ·
BLOCKED · NEEDS CLINICIAN REVIEW · NEEDS GOVERNMENT DATA · DEFERRED

| Capability | Status | Notes |
| --- | --- | --- |
| Safety engine (red flags, triage, fail-safe) | WORKING BUT NEEDS REVIEW · NEEDS CLINICIAN REVIEW | Deterministic; 545 unit tests incl. regression corpus and 760 simulated consultations. 0 of 310 clinical items reviewed |
| Digital Reception | WORKING BUT NEEDS REVIEW | Free text → safety check → understood → consultation; "I can't explain it" entry |
| Virtual Doctor (consultation engine) | WORKING BUT NEEDS REVIEW | Answer accuracy measured: 0 wrong / 0 unsafe recordings; 88.5% of answers understood first time on a never-tuned phrase set (`docs/quality/CONVERSATION_ACCURACY.md`); summary matches the patient's final answers in 1,500 messy simulated visits. Memory with provenance, corrections, contradiction checks, multiple problems, clarification ladder, education from library, honest professional answers |
| Virtual Doctor (3D / 2D / text presentation) | WORKING BUT NEEDS REVIEW | VD3: full-screen consultation scene (no site chrome), camera frames the doctor in the space the panels leave, My Visit with "Change" (safety checks rerun), dynamic quality (resolution, then tier), layout regression at 1920/1366/820/393/360/320 px, voice interruption measured (Stop/Talk ≈ 0 ms). Software-only rendering is slow (2–7 fps for 3D at 1366×768); not yet measured on a real low-cost phone |
| Help me describe it | WORKING BUT NEEDS REVIEW | Body map (front/back), side, feeling, timing, pattern, triggers |
| Emergency Mode | WORKING BUT NEEDS REVIEW · NEEDS CLINICIAN REVIEW | Interrupts everything; guidance text needs review |
| Virtual departments (17 info pages, 6 rooms) | WORKING BUT NEEDS REVIEW · NEEDS CLINICIAN REVIEW | |
| Find Care | WORKING BUT NEEDS REVIEW · NEEDS GOVERNMENT DATA | Care-type guidance works; facility directory has 3 unverified names only |
| Helpline registry | NEEDS GOVERNMENT DATA | 6 numbers, all awaiting re-verification |
| Visit summary + My Visit | WORKING BUT NEEDS REVIEW | Print/PDF/copy/share; tab memory only |
| Health Library | WORKING BUT NEEDS REVIEW · NEEDS CLINICIAN REVIEW | 235 passages, 57 glossary terms; sources awaiting verification |
| Clinical review system | PRODUCTION-READY (as a tool) | Generated list + CSV, tested; in-room review mode (`?review`); no sign-offs yet |
| Offline / low bandwidth | WORKING BUT NEEDS REVIEW | Core pages and text consultation work offline (tested) |
| Accessibility | WORKING BUT NEEDS REVIEW | axe clean on every page; keyboard, reduced motion, text-only; not yet tested with real screen-reader users |
| Privacy | WORKING BUT NEEDS REVIEW | Audit done; legal/privacy approval not obtained |
| Security | WORKING BUT NEEDS REVIEW | CSP, HSTS, 0 production audit findings; no external pen-test |
| Pilot instrumentation / error reporting | IN DEVELOPMENT | Client side done and tested; off; no collector exists |
| Demo mode (8 scenarios) | WORKING BUT NEEDS REVIEW | All through the real engine |
| Health Passport, reminders | WORKING BUT NEEDS REVIEW | Opt-in storage; deprioritised |
| Live video consultation | BLOCKED | Needs the Health Department's own video server |
| Mizo language | BLOCKED | Needs qualified translators + clinical review |
| Appointment booking | DEFERRED | No hospital system to connect to |

## Blocked on people outside the code team

1. Clinical review of 310 items (`docs/CLINICAL_REVIEW.md`).
2. Verification of 10 government-data items and 60 source records.
3. Privacy / legal approval for any pilot.
4. Mizo translation and phrase list.
5. A video server (only if live consultations are wanted).

## Measured (phone viewport, 4× CPU slowdown; Slow 4G ≈ 1.6 Mbps / 150 ms)

| Page | JS (compressed) | All transfer | First paint | Load |
| --- | ---: | ---: | ---: | ---: |
| Home | 213 KB | 325 KB | 0.9 s | 1.8 s |
| Reception | 249 KB | 350 KB | 0.9 s | 2.0 s |
| Emergency | 191 KB | 291 KB | 0.8 s | 1.8 s |
| Find Care | 197 KB | 320 KB | 0.8 s | 1.8 s |
| Consultation, text only | 286 KB | 376 KB | 1.0 s | 2.1 s |
| Consultation, 3D (after start) | 540 KB + 195 KB model | 791 KB | 0.8 s | 2.1 s (+ model) |

On 3G (≈ 0.75 Mbps / 300 ms): first paint ≈ 1.5 s on every page, load
3.4–4.2 s. JS heap ≈ 9.5 MB on ordinary pages, ≈ 22 MB with the 3D doctor.
"All transfer" includes one web font (≈ 30 KB) and small prefetches of
linked pages. Measured with Playwright + Chrome DevTools throttling on a
development container — real phones will differ; a pilot should collect
web-vital ratings (built in, switched off).
