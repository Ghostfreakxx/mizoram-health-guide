# Live consultations with real doctors

AI Hospital can connect patients to **registered doctors** by live video. AI
Hospital never acts as the doctor. The feature is **off** until it is set up.

## How it works

1. A doctor opens **Doctor's Desk** (`/ai-hospital/doctor-desk`) and starts a
   consultation. A random room code is created (e.g. `mhg-…`). It contains no
   personal or health information.
2. The doctor sends the patient link by WhatsApp or SMS.
3. The patient opens the link, sees the 3D consulting room, confirms consent
   (not for emergencies; not recorded by AI Hospital), and joins.
4. Video goes **directly between the patient and the Health Department's
   video server**. AI Hospital's website never receives or stores the video.

## What the Health Department needs to provide

- **Doctors**: registered medical practitioners on a duty roster, following the
  Telemedicine Practice Guidelines (2020). The Doctor's Desk shows the
  guideline checklist (identify yourself and your registration number, confirm
  consent, redirect emergencies, keep records).
- **A self-hosted Jitsi Meet server** (free, open source), ideally on
  government cloud in India (NIC / MeghRaj) so consultation traffic stays in
  India. The public `meet.jit.si` service is deliberately **not** accepted.
- **Doctor sign-in on the video server** (Jitsi "secure domain" or JWT
  authentication) so only authorised doctors can start consultations, with
  patients admitted as guests or through the lobby.
- **TURN server** (part of a standard Jitsi install) so calls work on mobile
  networks.
- A privacy review under the DPDP Act, 2023, and a decision on whether
  consultations may be recorded (default: no).

## Switching it on

Set this environment variable in Vercel (Settings → Environment Variables) and
redeploy:

```
NEXT_PUBLIC_LIVE_CONSULT_DOMAIN=consult.example.gov.in
```

## Later improvements

- A waiting-room queue so patients can request a consultation without a link
  (needs a database and doctor authentication on this website).
- Appointment booking and SMS reminders.
- Mizo-speaking doctors flagged in the roster.
