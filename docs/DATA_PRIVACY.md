# Data and privacy

Health information is sensitive. The prototype collects the minimum: no
name, phone number, Aadhaar, address or account is needed for anything.

## Where data goes

| Data | Where it lives | Leaves the device? |
| --- | --- | --- |
| Words typed or spoken in Reception / consultation | React state in the open tab | No. Not in URLs, logs, storage or requests — except the one below, only if the patient agrees |
| Online help with my words (optional, VD5) | One answer the device could not understand: that question, its answer choices and the patient's words, with long numbers, e-mail addresses and links removed (`lib/understand.ts`) | **Yes, to OpenAI** via this site's `/api/understand` — only when the site switches it on **and** the patient agrees for this visit. Not logged or stored by this site; sent with `store: false` |
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

## Online help understanding words (VD5, off by default)

The on-device engine understands most answers. When it cannot, and only if
the site has it switched on (`AI_UNDERSTANDING=on` and an OpenAI key on the
server) **and** the patient taps "Yes, use online help" (or turns it on in
Settings), the room asks an online model which answer on screen the words
meant.

- **Sent:** the question, its answer choices, and the patient's words for that
  one answer, after removing long numbers (phone, Aadhaar, PIN code), e-mail
  addresses and links. Nothing else: no earlier answers, no summary, no
  name, no device or account identifier. The patient is asked not to write
  their name or phone number. Names cannot be removed automatically.
- **Never sent:** words with a danger sign (Emergency Mode opens on the
  device first, before anything could be sent), confirmations of danger
  words, free-text answers (medicines, allergies, the first description),
  anything when the patient has not agreed.
- **Returned:** only ids of the answer choices on screen (Structured
  Outputs); checked again on the server and in the room. Nothing is recorded
  until the patient taps "Yes, that's right". A reassuring answer to a
  danger-sign question is suggested only when the model is certain.
- **This site:** the route keeps nothing and logs nothing (no words, no
  addresses); a per-address request count is held in memory for a minute
  to protect the key.
- **OpenAI:** requests are sent with `store: false`. OpenAI's own API data
  retention and use terms apply (for example, abuse-monitoring retention);
  check the current terms and whether zero data retention is available for
  the project. Data is processed outside India.
- **Consent:** asked in plain words at the moment it would help, at most
  twice a visit; "No, thanks" means never this visit; held in memory only
  (asked again next visit); can be turned off in Settings at any time. The
  privacy notes in the room say when it is on.

**Before real patients:** privacy and legal approval is required (sending
health information to a processor outside India — including under the
Digital Personal Data Protection Act, 2023), plus a data processing
agreement with the provider. Until then it must stay off on any site real
patients use.

## Telemetry rules (if switched on)

Allowed events: consultation started (view, entry), completed (level),
abandoned (stage), clarification (kind), display used (view, reason),
emergency shown (flag), failure (kind, site area), web vital (name,
rating, site area). Every field is a fixed code; the date has no time; no
IDs, cookies or storage link events. `sanitize()` drops anything else.
Aggregates hide counts under 5. Where counts go, and under what agreement,
is a Health Department decision — and needs privacy/legal approval first.
