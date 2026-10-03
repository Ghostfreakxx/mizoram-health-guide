# Mizoram Health Guide

A digital public health awareness platform for citizens of Mizoram. It gives
simple, easy-to-read information on early warning signs, harmful habits, and
when to see a doctor, plus a Health Assistant chatbot for basic health questions.

> For awareness only. This site does not diagnose disease or prescribe
> medicine. In an emergency, call **108**.

## Features

- **Health topics:** cancer, tobacco & oral health, diabetes, heart health,
  and mental wellbeing, each with warning signs and simple advice.
- **Health Assistant:** a chatbot that answers common health awareness
  questions in plain English. It runs entirely in the browser from a built-in
  answer library (`app/components/healthAnswers.ts`), so it needs no API key
  and has no running cost. It never diagnoses or suggests medicines, and
  points to 108 / Tele-MANAS 14416 for emergencies.
- **Hospital & help directory:** emergency numbers and key hospitals.
- **Citizen health awareness survey:** planned.

## AI Hospital — Digital Front Door to Healthcare

`/ai-hospital` is an automated health-navigation and patient-preparation
platform: Reception → Triage → Department → Visit preparation → Real doctor.
It never diagnoses or prescribes.

- **Deterministic safety core** (`app/lib/safety/`): shared red flags,
  free-text red-flag detection, adaptive rule-based triage
  (RED/ORANGE/YELLOW/GREEN), receptionist parser, and fixed wording. No
  generative model makes clinical decisions.
- **Evidence registry** (`app/lib/sources.ts`): every rule points to a source
  record. Records stay `awaiting-verification` until a person checks them.
- **Verified-only data**: hospitals (`app/ai-hospital/data/hospitals.ts`, see
  `docs/HOSPITAL_DATA.md`) and teleconsult details
  (`app/ai-hospital/data/teleconsult.ts`) are hidden until verified.
- **Privacy by default**: no storage, analytics, or network calls with health
  data — enforced by tests.

### Phase 2

- **3D department tours** (`/ai-hospital/departments/[slug]/simulator`):
  React Three Fiber scenes built only from department content; the 3D code
  loads only on request, with a text tour and WebGL fallback.
- **Health Passport** (`/ai-hospital/passport`): stored only after explicit
  opt-in, via `app/lib/storage.ts` (the only module allowed to store health
  data), with delete-everything.
- **Follow-up reminders** (`/ai-hospital/follow-up`): offline `.ics` calendar
  files; medicine reminders copy the prescription and never change it.
- **Medicine information** and **Lab report explainer**: general information
  only — no doses, and lab values are shown exactly as typed, never judged.

### Phase 3

- **Live consultation with real doctors** (`/ai-hospital/consult`,
  `/ai-hospital/doctor-desk`): self-hosted Jitsi video, off until
  `NEXT_PUBLIC_LIVE_CONSULT_DOMAIN` is set. See `docs/LIVE_CONSULTATION.md`.
- **Offline / installable app**: service worker, offline page, install button.
- **Read aloud** on triage, results, emergency and tours.
- **Mizo language**: built in, but switched on only for reviewed translations.
  See `docs/TRANSLATION.md`.
- **Health Department dashboard** (`/ai-hospital/admin`): demonstration data
  only. `app/lib/metrics.ts` accepts category codes only (no text, identifiers
  or exact times) and hides any count below 5. Nothing is collected or sent
  until the Health Department decides where counts go.

### Virtual consultation rooms (flagship)

- `/ai-hospital/departments/<slug>/room` — General Medicine, Cardiology,
  Respiratory, Paediatrics, Mental Health, Obstetrics & Gynaecology. One
  shared system: virtual guide, conversation engine (`app/lib/consultation.ts`),
  live patient chart, visit summary, real-doctor handoff.
- The guide is a human 3D model built from MakeHuman CC0 data
  (`scripts/avatar/`, ~370 KB / ~230 KB), with eye contact, blinks,
  breathing, nods, gestures and lip-sync; 3D → 2D → text fallback.
- Reception (`/ai-hospital/reception`) is the front door and routes into the
  right room; the patient's words travel in memory only.
- Demo mode: add `?demo` to a room address. See
  `docs/government/DEMO_SCRIPT.md` and `docs/VIRTUAL_CONSULTATION.md`.
- Spoken answers (on-device only) are off by default:
  `NEXT_PUBLIC_VOICE_INPUT=on-device`.

## Safety tests (release requirement)

```bash
npm test
```

Runs the Vitest safety suite in `tests/safety/` (red-flag detection,
adversarial phrasing, triage rules, special populations, monotonicity,
fail-safe, language policy, source integrity, privacy checks). Never weaken a
safety rule to make a test pass.

## Browser and accessibility tests

```bash
npm run build && npm run test:e2e
```

Runs Playwright tests in `tests/e2e/`: an axe-core WCAG 2.1 A/AA scan of every
page on desktop and phone, plus key safety flows (emergency interruption,
crisis support, consent-gated Health Passport).

## Tech stack

- [Next.js](https://nextjs.org) (App Router) with TypeScript
- Tailwind CSS

## Running locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## Scripts

| Command         | What it does                     |
| --------------- | -------------------------------- |
| `npm run dev`   | Start the development server     |
| `npm run build` | Build for production             |
| `npm run start` | Run the production build         |
| `npm run lint`  | Check the code with ESLint       |
| `npm test`      | Run the safety test suite        |

## Deployment

The site is deployed on Vercel. No environment variables are needed.

## Project structure

```
app/
  page.tsx              Homepage
  layout.tsx            Shared layout (header, footer, chatbot)
  topics.ts             List of health topics
  <topic>/page.tsx      Health topic pages
  hospitals/page.tsx    Hospital & help directory
  components/           Shared UI components
  components/healthAnswers.ts  Health Assistant answer library
```
