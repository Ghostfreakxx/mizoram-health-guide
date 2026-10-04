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

## When communication is hard: help first, never escalate for confusion

"I cannot understand you yet" and "you need a real doctor" are different
conclusions. Conversational difficulty never leads to a helpline.

**Three failure states** (`converse()` → `kind: "unclear"` with `difficulty`):

| Difficulty | Example | What the doctor does |
|---|---|---|
| language | "banana" | 1st: "I didn't quite understand that. Could you say it another way…" → 2nd: "I'm not completely sure I understood. Let me ask that another way." + a simpler wording → 3rd+: "Let's make it easier. Just tap the answer that is closest — or “I'm not sure”." |
| missing | "somewhere around there" (where?) | "I need to know where the problem is before I can guide you further…" + body map |
| knowledge | "What does my spleen do?" | "I don't have verified information about that in my health guide yet, and I don't want to guess about medical information. Let's carry on." + the current question |

**Clarification:** "I feel weird" → "I'm not completely sure what you mean
yet…" with quick answers and *Help me describe it*. "It hurts here" → "Where do
you feel it?" with the body map. "My head is doing something" → "Is it mainly
pain, dizziness, weakness, vision trouble, or something else?" → "I don't know"
→ "That's okay. Let's make it easier. Are you having pain?" (Yes / No / Not sure).

**Corrections:** "Actually, I said left, not right" → "Okay. I've changed that to
the left side." (also places and start times). Corrections are listed in the
summary.

**Clinical escalation rules** (`lib/escalation.ts`): a verified red flag
(Emergency Mode, 108/112); an ORANGE triage result (urgent); a YELLOW result
(sourced routing criteria: duration, worsening, age, pregnancy…); or the patient
asking for a real professional ("I want to talk to a real doctor" → the ways to
reach one, with the summary so far). `NOT_REASONS` lists what never escalates.

## Body map (`BodyMap.tsx`)

Front and back figures plus a labelled list. **Region and side are stored
separately** (`bodyArea`, `bodySide`). For chest, tummy, back, arms, legs and
head the doctor then asks the side (Left / Right / Both / Middle / Not sure);
the side is never guessed from where the picture was tapped. "Here on the
right" sets only a hint and asks "When you say “on the right”, which part of
your body do you mean?" with right-side areas; nothing is stored until the
patient picks one. An explicit "lower right side of my stomach" is taken as said.
No disease is ever inferred from a location.

## Help me describe it

Available from every symptom question (and when the patient says "I can't
explain it"): where (body map) → which side → what it feels like (options that
fit the region, e.g. chest: pressure, sharp pain, burning, tightness) → when →
all the time or comes and goes → what makes it better or worse → then the normal
questions (how strong uses the 0–10 scale). Pattern and triggers are standard
symptom-history questions recorded for the doctor only; they never change
urgency. Chest descriptions, and weakness or trouble seeing about the head, are
checked by the safety engine at once (chest pain / stroke-sign confirmation).

## How the doctor behaves (`consult-room/doctor/`)

- **One state table** (`EFFECTS` in `state.ts`) says, for every state, whether
  routine questions continue, whether Talk is allowed, what the caption shows
  and whether the voice may play — so subsystems cannot disagree. New
  INITIALIZING state while the room loads (the doctor is at her notes).
- **Gaze:** listening = steady eye contact with rare glances down; thinking =
  a glance at the chart and back *before* speaking (< 0.8 s); speaking = eyes
  on the patient as each phrase starts, brief natural look-aways, glances at
  the chart while explaining; emergency = steady, never looks away. Tiny
  fixational eye movements prevent a fixed stare.
- **Face:** restrained expressions per state, an eyebrow flash when greeting,
  brows lifting at the end of a question, blinks at phrase breaks and with
  larger gaze shifts.
- **Listening:** an acknowledging nod when an answer arrives; more frequent
  small nods while the patient is typing or talking; no hand movement.
- **Lip-sync** (`lipsync.ts`): one word schedule per sentence, re-anchored to
  the speech engine's word events (never runs ahead of the audio), blending
  between words (no "flapping"), anticipating the next sound, full lip closure
  for m/b/p, upper-lip shape for f/v, silent letters, stressed-word emphasis.
  Mouth shapes open faster than they close; the mouth stops with the audio.
  Limitation: the browser's voice gives no phonemes or audio access, and the
  model has no tongue/teeth controls — shapes are approximated from text.

## Speech confirmation

Recognised words always go into the answer box first and are only used after
**Send**. When the browser reports low confidence (< 0.75), the doctor shows
"I heard: “…” — Is that correct? [Yes] [Try again] [Edit]" and nothing enters
the consultation until the patient confirms. (`needsSpeechConfirmation` in
`voice.ts`.) **Limitation:** the microphone path cannot be exercised in the
headless test browser; the confirmation rule is unit-tested, the live
recogniser is not.

## Verified Health Knowledge (`lib/knowledge/`)

General questions are answered only from content already published on this
site after review: the topic pages, the Medicine Information guide and the Lab
Report Explainer — split into passages that keep their sources, organised by
category (symptoms, human body, infectious diseases, heart, lungs, digestion,
diabetes, blood pressure, cancer, HIV, TB, malaria, dengue, pregnancy, child
health, mental wellbeing, substance use, vaccination, nutrition, medicine safety,
tests and reports). Retrieval needs the topic to be named and a real word
overlap; weak matches are refused. Categories with no reviewed content yet
(e.g. human body, symptoms, digestive health, nutrition) honestly return the
knowledge limitation. To add knowledge, add reviewed content with sources.

The plain-English glossary (`lib/knowledge/glossary.ts`, ~60 terms) offers
"What does … mean?" buttons for hard words in the current question. **Every
entry is `reviewed: false` and awaits clinician review.**

## Messy language, memory and recall

- **Typing as people really type:** text-speak and misspellings are
  normalised for understanding ("idk", "somethin wrong wit my chest",
  "cant breath", "3 wks"). Red flags are checked on the raw AND the
  normalised words, so normalising can only add safety.
- **Control phrases:** "speak slower" / "normal speed", "ask that
  differently" / "say it more simply", "say that again".
- **"I already told you":** the doctor looks back through everything the
  patient said this visit (`said`). If it answers the current question she
  uses it ("Sorry — you did tell me…"); if two problems were named she asks
  which matters most; otherwise she says honestly she doesn't have it.
- **Words that already answer a warning-sign question** ("fever stopped but
  now much worse", "coughing up blood", "chills", "can't keep anything down")
  are recorded as *yes* — never *no* — marked "(from what you said)", and not
  asked again.
- **Questions only a professional can answer** — a prescription or dose, a
  diagnosis ("Do I have TB?"), whether a test is needed — get an honest,
  specific answer and are saved under "Questions for the doctor" in the
  summary. The consultation continues; no helpline is shown.
- **The real doctor's summary** also includes how it feels, the pattern,
  what makes it better or worse, the pain score, a measured temperature,
  everything the patient was not sure about, and their corrections.

## Doctor states (`consult-room/doctor/state.ts`)

One state machine drives the screen, the voice and the 3D/2D doctor:
IDLE · GREETING · LISTENING · PROCESSING · ASKING · EXPLAINING · REASSURING ·
CONCERNED · EMERGENCY · HANDOFF · COMPLETE, plus CLARIFYING (helpful,
attentive expression — never concerned — after a short thinking pause) and
EDUCATING (calm, general information). Each state has a restrained
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

The eight core scenarios (1–8) and four more (A–D) play only the *patient's* answers; every result comes from the
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
        │  every answer goes into the same Answers object as the triage engine expects
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

## Phones

The doctor stays in the upper part of the screen; Talk / Type / Repeat /
Stop / Explain / Back sit in a compact grid within thumb reach; the patient
chart is a bottom sheet ("Visit chart · 5 noted") that opens over the page.
Emergency guidance comes first on a phone, with the doctor below it.

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
