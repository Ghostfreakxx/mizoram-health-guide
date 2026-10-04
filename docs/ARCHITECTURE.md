# Architecture

Mizoram AI Hospital — Prototype. Next.js 16 (App Router), React 19,
TypeScript, Tailwind CSS 4. three.js / React Three Fiber for the optional 3D
doctor. No database, no server API, no accounts: every page is static and
every health decision runs in the patient's browser.

## The one rule

```
patient words / taps
      ↓
input normalisation          lib/consultHelp.ts (normalizeWords: typos, "cant", Indian-English forms)
      ↓
structured visit state       lib/consultation.ts (ConsultState — one record per visit)
      ↓
deterministic safety engine  lib/safety/detect.ts + redFlags.ts   ← runs on EVERY message, first
      ↓
triage / routing engine      lib/safety/triage.ts (questions, POLICY_RULES, levels)
      ↓
approved wording only        lib/safety/language.ts (LEVEL_TEXT, SAFETY_NET, banned patterns)
      ↓
presentation                 consult-room/* (3D / 2D / text) — cannot change any decision
```

No generative model is in this path. If one is added later (for
understanding words, translation or phrasing), it must sit **before** the
safety engine as an input helper or **after** it as a phraser of approved
content — never between the patient and a clinical decision.

## Modules

| Area | Files | Notes |
| --- | --- | --- |
| Safety | `app/lib/safety/` | `detect.ts` (free-text red flags, typo repair, negation → "ask"), `redFlags.ts` (16 flags + guidance + sources), `triage.ts` (19 problems, 101 questions, named `POLICY_RULES`, fail-safe), `reception.ts` (who / age / duration / complaint from free text), `language.ts` |
| Consultation | `app/lib/consultation.ts`, `consultHelp.ts`, `escalation.ts` | `converse()` orders every message: safety → corrections / control / meaning / why → "I don't know" → answer → health question → clarification ladder. `escalationFor()` is the only place a handoff reason is decided |
| Knowledge | `app/lib/knowledge/`, `app/lib/education.ts`, `app/content/` | Health Library pages are the single source; the doctor quotes passages verbatim with their sources. Glossary for plain-word explanations |
| Review | `app/lib/review/` | Registry of every reviewable rule and datum, generated docs (`npm run review:export`) |
| Data | `app/lib/services.ts`, `helplines.ts`, `sources.ts`, `app/ai-hospital/data/` | One helpline registry; facilities with per-field evidence; teleconsult facts hidden until verified |
| Visit | `app/lib/visit.ts`, `app/lib/summary.ts` | My Visit lives in tab memory only; the summary is a pure function of what the patient said |
| Telemetry | `app/lib/metrics.ts`, `app/lib/telemetry.ts` | Allowlisted category codes; off unless configured |
| UI | `app/components/ui/` | Design system (buttons, cards, notices, sections), `CallLink` |
| Doctor | `app/ai-hospital/consult-room/` | `ConsultationRoom.tsx` (one layout, all tiers), `doctor/` (state machine, gaze, face, body, lip sync), `Doctor3D` / `Doctor2D`, `capability.ts` (tier), `voice.ts` |

## Three experiences, one engine

| Tier | When | What loads |
| --- | --- | --- |
| Full (3D) | capable device, good connection | room page + three.js (≈ 540 KB JS) + model (≈ 195 KB) |
| Light (2D) | Data Saver, 2G, low memory, no WebGL, 3D failure, or chosen | room page only; SVG doctor |
| Text only | `?view=text`, or chosen | room page only; no picture |

All three call the same `converse()` / `nextTurn()` / `triage()`. A 3D
failure steps down automatically (error boundary → 2D) and the consultation
continues. Voice output and input are optional; typing always works.

## Pages

| Area | Routes |
| --- | --- |
| Front door | `/`, `/ai-hospital` (lobby), `/ai-hospital/reception`, `/ai-hospital/emergency` |
| Consultation | `/ai-hospital/departments/[slug]/room` (6 rooms; `?view=text|simple`, `?start=describe`, `?demo`) |
| Departments | `/ai-hospital/departments`, `/ai-hospital/departments/[slug]` (17) |
| Care | `/find-care`, `/ai-hospital/doctor`, `/ai-hospital/prepare`, `/my-visit` |
| Library | `/health-library`, topic pages (`/tb`, `/hiv`, …), `/tools/diabetes-risk`, first aid, medicines, lab reports, vaccinations, screening, calm |
| Records (opt-in) | `/ai-hospital/passport`, `/ai-hospital/follow-up` |
| Staff / live | `/ai-hospital/doctor-desk`, `/ai-hospital/consult` (off unless a video server is configured) |
| Trust | `/about`, `/privacy`, `/disclaimer`, `/accessibility`, `/ai-hospital/sources` |

Removed addresses redirect (`next.config.ts`).

## Failure behaviour

| Failure | Behaviour |
| --- | --- |
| 3D asset / WebGL fails | Error boundary → 2D doctor; reported as `failure: 3d-load` |
| Voice unavailable or refused | Subtitles + typing; reported as `voice-input` |
| Speech has no on-device voice | Text only (no cloud voices) |
| Triage throws | Fail-safe result: "see a health worker today; 108/112 if very unwell" |
| Any page throws | Error page with 108 / 112 first |
| Offline | Service worker serves cached emergency, Reception, consultation, Find Care, Library (no answers cached) |
| Server down | Pages already cached keep working; nothing depends on an API |
| Helpline / facility changes | Edit one registry entry; review list and tests update |

## Scale

Static pages served from a CDN; all computation on the device. The
server load per consultation is a handful of static file requests, so 20,
500 or 10,000 concurrent users is a CDN question, not an application one.
The only optional server-side components are the telemetry collector and
the live video server, both run by the Health Department.
