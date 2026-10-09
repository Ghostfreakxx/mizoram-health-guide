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
| Doctor's voice (device) | On-device voices only (the browser's online voices are never selected) | No |
| Doctor's voice (natural, when the site has `OPENAI_API_KEY`) | Each of the doctor's own sentences, one at a time, with its tone and pace (`lib/doctorVoice.ts`) | **Yes, to OpenAI** via this site's `/api/voice`. Never the patient's own words (a sentence that repeats them is spoken by the device). The patient can choose "This device" before beginning or in Settings |
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

## The doctor's natural voice (when set up)

With `OPENAI_API_KEY` on the server, the doctor speaks in a natural voice
made by OpenAI's text-to-speech. The room asks this site's `/api/voice` for
the audio of each sentence; the server calls OpenAI with its key.

- **Sent:** the doctor's own sentence (for example "You mentioned a headache.
  Is it severe?"), its tone (calm / serious / urgent) and pace. These
  sentences are the doctor's words, but they can mention the patient's
  symptoms. No name, account, device or address goes with them (requests
  come from this site's server). Not in the address: always in the request
  body.
- **Never sent:** the patient's own typed or spoken words. A sentence that
  repeats any of them (a whole message, or four words in a row) is spoken by
  the device's voice instead — tested in `tests/safety/natural-voice.test.ts`
  and in the browser.
- **This site:** the route keeps nothing and logs nothing; the audio is
  streamed straight back (`Cache-Control: no-store`). A per-address request
  count is held in memory for a minute to protect the key.
- **OpenAI:** its API data terms apply (for example, abuse-monitoring
  retention). Check the current terms for the project, and zero data
  retention if it is available. Processing is outside India.
- **Choice:** shown before the consultation begins ("Doctor's voice: Natural
  (online) / This device") with a plain explanation, and in Settings at any
  time. "This device" sends nothing.

**Before real patients:** privacy and legal approval (the sentences can
mention symptoms and are processed outside India — including under the
Digital Personal Data Protection Act, 2023), and a data processing agreement
with OpenAI.

## Telemetry rules (if switched on)

Allowed events: consultation started (view, entry), completed (level),
abandoned (stage), clarification (kind), display used (view, reason),
emergency shown (flag), failure (kind, site area), web vital (name,
rating, site area). Every field is a fixed code; the date has no time; no
IDs, cookies or storage link events. `sanitize()` drops anything else.
Aggregates hide counts under 5. Where counts go, and under what agreement,
is a Health Department decision — and needs privacy/legal approval first.
