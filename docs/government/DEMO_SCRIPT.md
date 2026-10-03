# Demonstration script — Mizoram AI Hospital (prototype)

About 10 minutes. Works on a laptop (Chrome or Edge) and on a phone.
Before you start: open the site once on the presentation device so the 3D
guide is cached, and turn the device volume on.

## 1. The front door (1 min)

1. Open **AI Hospital** from the top menu.
2. Point out: *Tell us what is wrong* (Reception), *Emergency*, the
   *General Medicine consultation*, and the privacy note.
3. Say: "AI Hospital helps people decide how urgently to seek care and
   where to go, and prepares information for a real doctor. It never
   diagnoses or prescribes. Fixed, sourced safety rules decide urgency."

## 2. Emergency interruption (1 min)

1. Open **General Medicine consultation** → **Begin consultation**.
   The guide greets the patient and introduces herself as a *virtual health
   guide*, not a doctor.
2. Type: **My chest feels very tight and I'm struggling to breathe.** → Send.
3. The consultation stops immediately: **Urgent medical attention**, Call 108,
   Call 112, what to do while waiting.
4. Press **This is not an emergency — go back**, then **↺ Start again**.

## 3. A full consultation (4 min)

1. Type: **I've had a cough for three weeks.** → Send.
2. Show the **live patient chart** on the right: the concern and
   "More than 2 weeks" were understood from the patient's words; everything
   else says *Not provided*.
3. Answer: none of the danger signs → Myself → 18 to 59 years → Female →
   none → *Cough or breathing problem* → **No** to each question → About the
   same → Mild → skip medicines, allergies and conditions.
4. The guide explains the result and says the handoff line. Show:
   - **Next: a real healthcare professional** (live doctor, eSanjeevani,
     hospital, reminders)
   - the **Patient-prepared visit summary** — *Not a medical diagnosis* —
     with Print / Save as PDF, Copy and Share
   - the chart's **System routing information**, kept separate from what the
     patient reported

## 4. Reception and departments (2 min)

1. Open **Reception**, tap the example **“I think I was exposed to HIV.”** →
   *Start your consultation*. The room for the matched department opens and
   the patient's words are carried over (in memory only — not in the address).
2. Mention the six consultation rooms (General Medicine, Cardiology,
   Respiratory, Paediatrics, Mental Health, Obstetrics & Gynaecology) — one
   shared system, different equipment and greetings.

## 5. Demo mode (optional, 2 min)

Open the room with `?demo` at the end of the address
(`/ai-hospital/departments/general-medicine/room?demo`). Choose a scenario
(A–H). The scripted *patient* answers play through the **real** engine — no
outcome is pre-written. Use **Reset demo** (or *End demo scenario — reset*
inside Emergency Mode).

| | Scenario | Expected |
|---|---|---|
| A | Routine fever | Urgent assessment today (fever in Mizoram is tested for malaria the same day) |
| B | Persistent cough | See a doctor soon; TB services suggested |
| C | Pregnancy warning sign | Emergency |
| D | Possible heart emergency | Emergency |
| E | Possible stroke | Emergency |
| F | Child illness | Urgent or soon, depending on answers |
| G | Possible HIV exposure | Urgent (time-sensitive treatment) |
| H | Mental-health crisis | Emergency with Tele-MANAS 14416 |

## 6. If something goes wrong

- 3D slow or not loading: the guide switches to a simple picture
  automatically, or choose *Display → Low data (2D)* or *Text only*. The
  consultation and safety checks are unaffected.
- No sound: press *🔇 Muted* to turn the voice on; subtitles always show.

## Points to make honestly

- **Prototype.** Not approved, endorsed or operated by the Government of
  Mizoram or the Health Department.
- **Sources** are listed at *AI Hospital → Sources and verification*; all are
  awaiting formal verification.
- **Clinical review** of the triage rules by Health Department clinicians is
  required before any real use.
- **Privacy:** nothing a patient types is sent or stored unless they choose
  to save or share it. No camera, no location, no tracking.
