# Virtual consultation room (prototype: General Medicine)

`/ai-hospital/departments/general-medicine/room` · demo mode: add `?demo`

## Patient journey

Reception → Consultation (greeting) → danger-sign check → who / age / sex /
pregnancy → main problem → body area (where useful) → **duration** → adaptive
triage questions, one at a time → change and severity → medicines, allergies,
long-term conditions → triage result (spoken) → handoff line → real-doctor
options + **patient-prepared visit summary** (print / PDF / copy / share) →
follow-up. A red flag at any point → **Urgent medical attention**
(full-screen Emergency Mode) immediately.

## A helpful conversation (`app/lib/consultation.ts`, `consultHelp.ts`, `education.ts`)

The doctor's purpose is to help the patient explain the problem, understand
the questions, notice urgency, and prepare a summary for a real doctor.
Everything the patient types or says goes through `converse()`:

1. **Safety first** — red-flag detection on every message, at every step.
2. **"What does this mean?" / "Why are you asking?" / "Say that again"** —
   plain-English re-wording from a small glossary; short reasons that never
   reveal scoring. After one explanation, later questions keep a plain-word hint.
3. **"I don't know", "I forgot", "I can't explain it"** — valid answers,
   recorded as *Not sure / Not remembered / Could not describe*, never
   invented. Missing course-of-illness answers can never lead to self-care.
4. **An answer** to the current question (buttons, words, body map, a 0–10
   pain scale, or a measured temperature in °C/°F).
5. **A health question** ("What is TB?") — answered only from the reviewed
   topic pages, word for word, shown as *general information, not an
   assessment of you*; anything else gets "I don't have enough information to
   answer that safely".

Conversation flow: what brought you → (if vague) "tell me what is bothering
you most" → (if the feeling is unclear) "Can you describe what it feels like?"
→ where → when → the danger-sign check → who / age / sex → focused
questions → better or worse → how bad → medicines, allergies, conditions →
recap ("You told me about…") and the engine's result. A description is also
checked *in context* ("like pressure" about the chest → "chest pressure"),
and the patient is asked to confirm before routine questions continue.

Memory: facts said anywhere (how long, who, age, the problem) are kept and not
asked again; the doctor says once "You mentioned that the cough started…".
Adapting, only from the patient's own words: short answers → short questions;
"I'm scared / please help" → acknowledged once, optional history left out
(and marked "Not asked" for the doctor).

## Doctor states (`consult-room/doctor/state.ts`)

One state machine drives the screen, the voice and the 3D/2D doctor:
IDLE · GREETING · LISTENING · PROCESSING · ASKING · EXPLAINING · REASSURING ·
CONCERNED · EMERGENCY · HANDOFF · COMPLETE, plus CLARIFYING (helpful
expression, re-saying a question) and EDUCATING (calm, general information). Each state has a restrained
expression (neutral, welcoming, listening, thinking, reassuring, concerned,
urgent), a gaze policy, a posture and a gesture level (`PERFORMANCE`). The
state never decides anything medical: the screen sets it from the engine's
result (RED/ORANGE → concerned, GREEN → reassuring, otherwise explaining).

Sequencing: Begin → *Preparing your consultation…* (progress) → greeting (the
doctor looks up from the chart, then speaks) → listening → processing (~0.5 s
glance at the chart) → asking → … → explaining → handoff → complete. An
emergency skips every pause: speech stops, the emergency line is said at once
and the emergency guidance appears in the page with the concerned doctor
beside it (first on a phone).

## Demo mode (`app/lib/demoScenarios.ts`)

Scenarios A–H play only the *patient's* answers; every result comes from the
real engine. `tests/safety/demo.test.ts` checks each expected outcome. Reset:
"Reset demo", or "End demo scenario — reset" inside Emergency Mode.

The patient sits across the desk from a virtual guide. The guide asks
questions, keeps a note of the answers, and shows the safest next step. It is
labelled "Virtual guide · not a real doctor" at all times.

## Architecture

```
patient types (or, later, speaks)
        │
        ▼
app/lib/consultation.ts   ← what to ask next, how to phrase it (pure, tested)
        │  every answer goes into the same Answers object as the Triage Desk
        ▼
app/lib/safety/*          ← detectRedFlags, receive, triage  (AUTHORITATIVE)
        │
        ├─ RED / danger sign → Emergency Mode immediately (no more questions)
        └─ otherwise         → ResultView + "Prepare for Doctor" summary
        │
        ▼
consult-room/ConsultationRoom.tsx   ← screen, controls, information panel
consult-room/ConversationControls  ← Talk · Type instead · Repeat · Stop · Slower
consult-room/doctor/               ← the virtual doctor (pure planners + one renderer)
   state.ts    states and their performance      gaze.ts   where she looks
   face.ts     expressions and blinking          body.ts   breathing, posture, hands
   lipsync.ts  visemes timed to the voice         perform.ts one frame of all the above
   scene.ts    shared room layout                 DoctorAvatar.tsx  three.js renderer
consult-room/Doctor3D.tsx | Doctor2D.tsx | text only
consult-room/voice.ts               ← speech output; Talk input with consent
consult-room/capability.ts         ← quality manager (high/medium/low/fallback)
consult-room/preload.ts, RoomLink  ← warms up the 3D doctor from links to a room
```

The avatar only *presents* what the engine decided. It has no medical logic.

## 3D approach

- **three.js + React Three Fiber** (already used by the 3D tours). Works in
  every modern mobile browser with WebGL; no plug-ins.
- The 3D code is loaded with `next/dynamic` only when the room opens.
- The guide is a **real human model** built from MakeHuman CC0 data
  (`scripts/avatar/`, ~370 KB / ~32k triangles for every 3D tier, meshopt-compressed,
  one skeleton, 16 facial morph targets). The room is built from code.
- Errors in 3D fall back to the 2D guide (error boundary). WebGL missing →
  2D guide automatically.

## Device tiers (`consult-room/capability.ts`)

| Tier | Who gets it | What they see |
|---|---|---|
| high | desktops / strong devices | soft shadows, room reflections, skin micro-detail, full room, up to 2× resolution |
| medium | phones and laptops (≤4 GB or ≤4 cores) | same doctor, reflections, no shadows, ≤1.4× resolution |
| low | 3G, ≤2 GB, or phones with ≤4 cores | same doctor, minimal room, 1× resolution, no antialiasing |
| fallback | no WebGL, Data Saver, 2G, <2 GB, ≤2 cores | 2D doctor (SVG) driven by the same planner |
| text only | person's choice | no picture at all |

All 3D tiers load the same doctor: automatically simplified models creased
the face (an uncanny look), so tiers change rendering cost instead. Below
22 fps for 4 s the stage steps down one tier by itself.

The person can always switch with the **Display** control.

### Measured (production build)

| | Downloaded | Frame rate in a software-only browser (worst case) |
|---|---|---|
| 2D guide | 362 KB total page | 60 fps |
| 3D room | +~240 KB (compressed JS) | 16 fps |

Phones with a graphics chip render the code-built room much faster than the
software renderer used for this measurement. Before release, measure on a
low-cost Android phone (e.g. 3 GB RAM) on 3G.

## Shared across departments

Everything except a small style record is shared, so 17 rooms do not mean 17
downloads:

- the guide (body, face, animation), lighting, camera, desk, chair, cabinet,
  window, signage component — **shared**
- per department (`consult-room/rooms.ts`): wall/floor/accent colours, sign
  text, and a short list of props (e.g. ECG display for Cardiology, lung chart
  for Respiratory, toy shelf for Paediatrics). Props are small code-built
  objects; only the props for the open room are drawn.
- Emergency is not a seated room: it opens Emergency Mode directly.

## Getting to a *realistic* digital human

A photo-real person cannot be built from code shapes. It needs a professionally
made, rigged human model:

- a head and upper-body mesh with facial blendshapes (the 52 ARKit
  shapes cover blinking, brows, smiles and visemes for lip-sync), plus an arm rig
- compressed for the web: glTF + Draco/meshopt geometry + KTX2 textures,
  target **3–6 MB** for the full tier and a lighter LOD for phones
- **licensed for government use**, with attribution if required

Options: commission a model of a Mizo doctor (with consent of the person
modelled), or license one from a character marketplace. Only
`doctor/DoctorAvatar.tsx` changes — `performAt()` already outputs blink,
expression, viseme, gaze, head and hand values that map onto blendshapes and
bones. The 2D and text tiers stay as they are.

## Voice

- Output: the phone's own text-to-speech (`speechSynthesis`), preferring an
  Indian English voice at a calm rate (0.92; **Slower** = 0.78). Lips follow the
  engine's word-boundary events with letter-pair visemes; without them, timing
  is estimated from the text, including pauses at punctuation. Lips only move
  while the voice is actually speaking. Mute, Repeat, Stop, Pause and
  subtitles are always available.
- Interruption: typing, **Talk**, **Type instead** or **Stop** stops the doctor
  at once; anything not yet said is still written in the conversation.
- Input (**Talk**): `NEXT_PUBLIC_VOICE_INPUT` = `consent` (default) | `on-device`
  | `off`. In `consent` mode, the first press explains in plain words that the
  browser's speech service (in Chrome: Google) turns the audio into text, and
  listening starts only after the patient agrees (remembered in page memory
  only). The words appear in the answer box to be checked or corrected before
  **Send**, then go through exactly the same safety checks as typed text
  (`respondText`: red flags first, then the answer). Set `off` if the Health
  Department does not accept a third-party speech service.
- Mizo: no Mizo voice ships on phones today; the voice uses Indian English. Mizo
  subtitles follow the translation review process (docs/TRANSLATION.md).

## Privacy

- The camera is never used. "Eye contact" means the guide looks at the 3D
  camera position (the patient's viewpoint) — no face or gaze tracking.
- The microphone is used only after the patient presses Talk (and, in
  `consent` mode, agrees to the explanation); the privacy line says when it is on.
- Nothing typed is stored or sent; the information panel lives in page memory.

## Safety tests

`tests/safety/consultation.test.ts`: the guide never diagnoses or prescribes
(every line on every complaint path), free-text and checklist red flags stop
the consultation, negated danger words are asked about, the result is always
the triage engine's result, the panel shows only supplied information, the
guide never smiles in an emergency, and reduced motion keeps the head still.
