# Demonstration script — Mizoram AI Hospital (Prototype)

About 10–12 minutes, on a laptop (Chrome or Edge) or a phone. Before you
start: open the site once on the presentation device (so it is cached and
works even if the venue internet fails) and turn the volume on.

## 1. The front door (1 min)

1. Open the **home page**. Point out the four starting points: *Talk to the
   virtual doctor*, *Check my symptoms*, *Emergency help*, *Find healthcare*.
2. Open **About** briefly: the problem, the proposed role, the four safety
   layers, where a professional takes over, and what it is **not**.
3. Say: "It helps people go from *I have a problem* to *I know what to do
   next*. Fixed, sourced rules decide urgency. It never diagnoses or
   prescribes."

## 2. Reception (2 min)

1. **AI Hospital → Something is wrong** (Reception).
2. Type **my chest is paining and I can't breathe** → *Continue*. Emergency
   Mode appears at once — Call 108 / 112 and what to do while waiting.
3. Back at Reception, press **I can't explain it — help me describe it**:
   the consultation opens at the body map. (No medical words needed.)

## 3. Demo mode — the real engine (6 min)

Open `/ai-hospital/departments/general-medicine/room?demo` (add `&view=text`
on a slow projector). Play the core scenarios in order; each card says what
it demonstrates. The patient's side is scripted; **every reply, question and
result comes from the real safety and consultation engine.**

| # | Scenario | What to point out |
| --- | --- | --- |
| 1 | Can't explain the problem | Body map → side → feeling → timing → pattern; unclear words never trigger a handoff |
| 2 | Persistent cough | "Three weeks" is remembered, not asked again; TB pathway; free government service |
| 3 | Routine illness | Self-care with clear warning signs — no unnecessary referral |
| 4 | Possible emergency | Everything stops; 108 / 112 first |
| 5 | Pregnancy concern | Pregnancy danger sign → emergency |
| 6 | Child concern | Child danger-sign questions; a young child is never told self-care |
| 7 | Health education question | "How does TB spread?" answered from the verified Health Library, with its source, then the consultation continues |
| 8 | Visit summary | Medicines, allergies, conditions in the summary; Print / PDF / Copy / Share; open **My Visit** |

*More scenarios* has: fever in Mizoram (same-day malaria test), stroke in a
family member, possible HIV exposure, mental-health crisis (Tele-MANAS).

## 4. Find Care and review (2 min)

1. **Find Care**: "What type of care should I look for?" — your result from
   the consultation is highlighted. Helplines come from one registry with
   sources. Facilities show **only verified** details — today, none are, and
   the page says so.
2. Show `docs/CLINICAL_REVIEW.md` (or the CSV): every rule a clinician must
   approve, by ID, with its source and status. "Nothing is marked verified
   until a clinician signs it off."

## If something goes wrong

- 3D slow or not loading: it switches to a simple picture automatically, or
  choose *Display → Text only*. The consultation and safety checks are the
  same.
- No sound: subtitles always show; press *Voice on*.
- No internet: pages opened before still work, including Emergency,
  Reception and the text consultation.

## Say honestly

- **Prototype.** Not approved, endorsed or operated by the Government of
  Mizoram or the Health Department. No "first" claims.
- **No clinical review yet** — 244 items wait for clinicians.
- **Local data unverified** — helpline numbers, facilities and source records
  must be checked by the Health Department.
- **Privacy:** no accounts, no analytics, nothing typed is sent or stored
  unless the patient chooses to save or share it.
- **Evidence:** it does not yet claim any effect on visits, costs or
  outcomes. Privacy-preserving counts are built in (switched off) so a
  pilot can measure: consultations started and completed, where people stop,
  how often clarification helps, routing levels, emergencies shown, and
  low-bandwidth use.
