# Data and privacy

Health information is sensitive. The prototype collects the minimum: no
name, phone number, Aadhaar, address or account is needed for anything.

## Where data goes

| Data | Where it lives | Leaves the device? |
| --- | --- | --- |
| Words typed or spoken in Reception / consultation | React state in the open tab | No. Not in URLs, logs, storage or requests |
| Reception → consultation handoff | Module memory (`consult-room/handoff.ts`), read once | No |
| My Visit summary | Module memory (`lib/visit.ts`) for the tab | No; gone on reload/close/"Clear" |
| Visit summary print / copy / share | Only when the patient presses the button; share shows a preview first | Only to the app the patient picks |
| Health Passport, reminders | `localStorage` **only after** the patient turns saving on (`lib/storage.ts`, the only module allowed to store health data); "Delete everything" | No |
| Text size, contrast, language | `localStorage` (not health data) | No |
| Voice input (optional) | Browser speech service — in Chrome, audio goes to Google. The patient is told before turning it on | Yes, to the browser vendor, only if chosen |
| Doctor's voice | On-device voices only (online voices are never selected) | No |
| Live video (when configured) | Health Department's own video server; room code is random | To that server only |
| Pilot counts (when configured) | Allowlisted category codes + day (`lib/metrics.ts`) | To the configured collector only; off by default; honours DNT/GPC |
| Service worker cache | Public pages and code only | No |

## Audit (October 2026)

- `grep` for `fetch(`, `sendBeacon`, `localStorage`, `sessionStorage`,
  `document.cookie`, `indexedDB`, `console.*` across `app/`: only the
  allowed uses above. Two `console.error` calls in the 3D loader log model
  errors (no patient data). Error boundaries never log or send messages.
- No analytics or third-party scripts. CSP restricts connections to this
  site (plus the video server / collector when configured).
- URLs carry only non-health options (`?view=text`, `?start=describe`,
  `?demo`).
- **Fixed in this cycle:** the doctor's speech preferred "online" cloud
  voices, which could send its words (sometimes repeating the patient's) to
  a cloud service. Now on-device only, with a test.

## Telemetry rules (if switched on)

Allowed events: consultation started (view, entry), completed (level),
abandoned (stage), clarification (kind), display used (view, reason),
emergency shown (flag), failure (kind, site area), web vital (name,
rating, site area). Every field is a fixed code; the date has no time; no
IDs, cookies or storage link events. `sanitize()` drops anything else.
Aggregates hide counts under 5. Where counts go, and under what agreement,
is a Health Department decision — and needs privacy/legal approval first.
