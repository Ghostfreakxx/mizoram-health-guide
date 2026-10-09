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

## Full-screen consultation (VD3)

The room page (`/ai-hospital/departments/<slug>/room`) is its own scene: the
site header, footer and bottom navigation are hidden (`components/ChromeGate.tsx`)
and the consultation fills the screen (`100dvh`). What stays on screen:

- **Top bar** — Leave, department · "Virtual consultation", a status pill
  (Your turn / Speaking / Thinking… / Listening to you…), My Visit (with a
  count), Settings, and **Emergency** (on very small phones: "108").
- **The doctor** — the 3D camera frames head, shoulders and upper body
  inside the free area left by the panels (`Doctor3D.tsx` → `setViewOffset`),
  so she is never hidden behind a panel and stays dominant.
- **The question dock** — the question, quick answers, the answer box with
  Talk / Send / Skip, helpers (Help me describe it, I'm not sure, What does
  this mean?, Why do you ask?) and Repeat / Stop / Back.
- **Tools** (body map, long answer lists, checklists, health information)
  appear in a column at the left on wide screens; on phones the body map is
  a temporary full-screen tool above the answer box ("Hide the picture").
- **My Visit** (`MyVisit.tsx`) — a side panel on wide screens and a bottom
  sheet on phones. Everything the patient said, in plain groups, each with
  **Change**: the doctor asks that question again ("Of course — let's change
  where it is.") and every safety check runs again on the new answer.
- **Emergency** replaces the dock with the calm emergency card (Call 108 on
  screen on a 320 px phone too); no flashing, no sound.
- **Entry** — loading steps, "Begin consultation" and "Continue without 3D
  (faster)". `?view=high|medium|low|simple|text` forces a display level.

## VD4: layout, memory and how the doctor speaks

**Wide screens.** The conversation is a column on the right: the last few
lines of the conversation (also the subtitles when there is no voice) above
the current question, the answer choices and the answer box. Tools (body
map, long answer lists, checklists) and My Visit are on the left. The camera
frames the doctor, unobstructed, in the space between. The entry card uses
the same column, so the framing does not jump when the visit starts.

**Memory (`lib/consultMemory.ts`).** Whatever question is on screen, the
doctor keeps what the patient says in passing: symptoms ("a headache and
fever"), medicines by name ("I took paracetamol"), long-term conditions
("I'm diabetic" — not a family member's), allergies, whether it comes and
goes, and what makes it worse ("worse after food"). Nothing is taken from a
denial ("no fever"). Nothing here changes urgency: the safety checks read
every word first, and a medicine mention with a danger sign ("overdose")
opens Emergency Mode. Facts volunteered at another question are said back
("Thank you. I've noted paracetamol under your medicines.") and the same
question is asked again; later questions build on them ("You mentioned
paracetamol. Are you taking any other medicines?"). My Visit shows "You
mentioned …"; the summary lists them.

**Two problems at once.** "A headache and fever" → "You mentioned a fever
and a headache. Which one is troubling you most?" with just those two (and
"Something else"); the other stays in the summary as a symptom.

**Spoken questions (`lib/consultSpeech.ts`).** Every danger-sign rule keeps
its written, reviewed wording (`safety/triage.ts`, shown in the Triage
Desk). The doctor says the same question in everyday English, to "you" or
about "them" ("Do you have a stiff neck, or a rash that does not fade when
you press on it?"), and refers back when the patient already mentioned it
("You mentioned a headache. Is it severe?"). Tests check every rule has a
spoken form, every spoken form keeps the rule's key words (with a short,
explicit list of plain-word swaps such as "fluids" → "drinks"), and none
speaks of "the person" to the patient. The spoken forms are listed beside
each rule in the clinical review export (`docs/CLINICAL_REVIEW.md`).

**Word meanings** are written under the question after the patient once
needed an explanation — no longer read out with every question.

**Director contract (`tests/safety/director-contract.test.ts`).** Ten states,
each caused by a real event: GREETING (visit begins), PROCESSING (an answer
arrives), ASKING (the next question), LISTENING (waiting), CLARIFYING (what
does this mean / why / not understood), EXPLAINING (a routine result),
CONCERNED (an urgent result), EMERGENCY (a red flag: no pause, interrupts
everything), SUMMARIZING (the hand-off), COMPLETE. No smile while concerned,
urgent or thinking; nods only while the patient is talking or typing.

## Phones

Portrait: the doctor in the upper part (36–50% of the height, depending on
the phone), the question and answer box in a white panel below, within
thumb reach. With the keyboard open the doctor shrinks to a strip and the
panel follows the visual viewport, so the question and Send stay visible.
Below 360 px the Talk / Repeat / Stop / Back buttons become icons (with
labels for screen readers).

## Device tiers (`consult-room/capability.ts`)

| Tier | Who gets it | What they see |
|---|---|---|
| high | desktops / strong devices | soft shadows, room reflections, skin micro-detail, full room, up to 2× resolution |
| medium | phones and laptops (≤4 GB or ≤4 cores) | same doctor, reflections, no shadows, ≤1.4× resolution |
| low | 3G, ≤2 GB, or phones with ≤4 cores | same doctor, minimal room, 1× resolution, no antialiasing |
| fallback | no WebGL, Data Saver, 2G, <2 GB, ≤2 cores | 2D doctor (SVG) driven by the same planner |
| text only | person's choice | no picture at all |

All 3D tiers load the same doctor: automatically simplified models creased
the face (an uncanny look), so tiers change rendering cost instead.

**Dynamic quality** (`FpsGuard` in `Doctor3D.tsx`): after a 2 s warm-up the
frame rate is checked every 4 s. Below 22 fps the stage first renders at a
lower resolution (75%, then 60%); if that is still too slow it steps down
one tier (high → medium → low → 2D). Under 4 fps, or under 8 fps twice, it
steps down without trying resolution. A level the person chose themselves is
never stepped down for slowness (resolution still adapts). A lost graphics
context steps down one tier; any other 3D error shows the 2D guide. The
conversation state is never lost.

The 2D guide redraws at most 30 times a second and only writes what visibly
changed (it is a full-screen SVG repainted in software).

The person can always switch under **Settings → Display**.

### Measured (production build, 1366×768, headless Chromium, software WebGL)

There is no graphics chip in the test machine, so frame rates are a
worst case; real phones with a GPU are much faster. Measured with
`next start`, cold cache (VD4, 8 Oct 2026).

| Display | Downloaded | JS | Doctor model | Frame rate | JS heap | Send → next question |
|---|---|---|---|---|---|---|
| text only | 334 KB | 284 KB | — | 60 fps | 6 MB | ~50 ms |
| 2D guide | 334 KB | 284 KB | — | 60 fps | 6 MB | ~45 ms |
| 3D low | 810 KB | 557 KB | 203 KB (376 KB file) | 6.3 fps | 13 MB | ~140 ms |
| 3D medium | 810 KB | 557 KB | 203 KB | 1.4 fps | 14–18 MB | ~800 ms |
| 3D high | 810 KB | 557 KB | 203 KB | 1.5 fps | 15 MB | ~970 ms |

In software rendering the medium and high levels are not usable; "auto"
steps down to low or the 2D guide by itself (dynamic quality, above). The
3D code and model load only when a 3D level is used.

Before VD3 (same machine, commit `c003b26`): 810 KB downloaded, 546 KB JS,
195 KB model; "auto" always ended in the 2D guide because a quality change
was mistaken for a graphics failure (fixed). The doctor model is 362 KB
(meshopt; 198 KB over the wire with compression) — before: 359 KB.

**Voice** (`tests/e2e/voice.spec.ts`, instrumented speech engine; measured
inside the page): Stop → speech cancelled 0 ms; Talk → 0 ms; typing → ~15 ms
(includes the key event); emergency words → the emergency line is spoken in
~17 ms with no thinking pause; Send → the doctor starts speaking ~0.6 s
(a deliberate 0.35–0.9 s "thinking" pause — it was 0.6–1.4 s); the longest
single utterance is one sentence (≤ 240 characters, typically < 100).

Before release, measure on a low-cost Android phone (e.g. 3 GB RAM) on 3G.

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
- Natural voice (when the site has `OPENAI_API_KEY`; `consult-room/naturalVoice.ts`,
  `app/api/voice/`, contract in `lib/doctorVoice.ts`): each sentence is spoken
  with audio from OpenAI text-to-speech (default `gpt-4o-mini-tts`, voice
  `marin`, a calm Indian English doctor; "serious" and "urgent" tones for
  concern and emergencies). Everything still to be said is fetched as soon as
  a line starts, so sentences follow without gaps; Repeat plays from memory.
  Played with Web Audio, started by the "Begin consultation" tap (phones need
  a tap before any sound). Lip sync is fitted to the real length of each
  sentence's audio. Pause, Stop, Slower (a slower generated pace) all work.
  - **Emergencies never wait:** the emergency line's audio is fetched when the
    consultation begins; if it is not ready, the device's voice says it at once.
  - **The patient's words never leave:** a sentence that repeats them (a whole
    message, or four words in a row) is spoken by the device's voice.
  - **Failures:** the device's voice says that sentence; after three failures
    in a row the natural voice stops for the visit, with a short notice.
  - The patient chooses "Natural (online)" or "This device" before beginning
    or in Settings.
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
  With the natural voice on, the doctor's own sentences are sent for speech
  (never the patient's words) — see "Voice" above and `DATA_PRIVACY.md`.

## Safety tests

`tests/safety/consultation.test.ts`: the guide never diagnoses or prescribes
(every line on every complaint path), free-text and checklist red flags stop
the consultation, negated danger words are asked about, the result is always
the triage engine's result, the panel shows only supplied information, the
guide never smiles in an emergency, and reduced motion keeps the head still.

## Virtual Doctor 2.0 — character system

One engine, three presentations (3D / simple picture / text), shared by
every department room (`consult-room/rooms.ts` configures greeting, focus
problems, equipment and attire; nothing else differs).

```
patient words / taps
  → converse()            lib/consultation.ts   safety first, then corrections, meaning, "why",
                                                 "I already told you", answers, education, clarification
  → ConsultState          one visit memory: facts with provenance, corrections, other concerns,
                          denials ("no fever"), open contradiction (recheck), what was explained
  → nextTurn()            the next useful question (reviewed question sets only)
  → basisOf()             lib/consultBasis.ts   rule IDs + sources + purpose for every turn
  → planTurn/planReply    consult-room/doctor/director.ts   what the doctor does (lines, states,
                          pauses; emergencies never delayed)
  → DoctorState           doctor/state.ts       one table: performance, effects (voice, Talk, captions)
  → performAt()           doctor/perform.ts     face, gaze (gaze.ts), body (body.ts), blinks
  → speech + lip sync     voice.ts, doctor/lipsync.ts (on-device voices only; captions always)
```

Memory that changes behaviour:

- Known facts are not asked again; the doctor says once that she remembers.
- Corrections replace the stored fact and are acknowledged ("I've changed
  that to the left side").
- **Contradictions are asked about** (`recheck`): an earlier "no" vs later
  words, or "no fever" vs a later reading — never silently overwritten,
  never silently ignored. A resolved "yes" is re-checked for emergencies.
- **Negations are respected**: "a cough but no fever" never records a fever.
- **More than one problem**: the questions follow the main one; others are
  noted, said back, and put in the summary as "not assessed".
- Every chart fact has a provenance: confirmed / from the patient's words /
  uncertain / not provided.

Reactions to what the patient just did (VD3):

- **Correction or an extra problem** → `acknowledging`: a small nod, a
  glance at the chart as if writing it down, back to the patient before the
  question; says exactly what changed.
- **Two answers differ** → `checking`: steady eye contact, calm and helpful,
  less head movement — checking with the patient, never doubting them; never
  a concerned or urgent face.
- **The first "not sure" of a visit** → said once: "That's okay — 'not sure'
  is a useful answer. I've noted it." (not repeated, and dropped when the
  next line already reassures).

Character behaviour: the `showing` state glances at the body map while
presenting it; the `review` gaze glances at the chart after an answer;
voice failure falls back to captions with a one-time notice; the loading
screen offers "Continue in lightweight mode".

Review and debugging:

- `?review` — **clinical review mode**: the current step, why it is asked,
  rule IDs with review status, sources, and recorded facts with provenance.
- `?debug` — developer panel (state, gaze, speech, fps, memory). Development
  builds only; it is not in the production bundle (tested).

Testing: `tests/safety/simulations.test.ts` runs 400 seeded simulated
patients (routine, confused, contradictory, correction-heavy,
multi-problem, educational, emergency) with invariants at every step;
`tests/e2e/doctor.spec.ts` covers the final demonstration scenario,
interruptions, display switching mid-visit, a 20+ turn session,
contradictions, review mode, voice failure, rotation, the phone keyboard
(both browser behaviours) and the 3D model failing to download mid-visit.

### Communication style and session behaviour

- **Personalised explanation** changes how the doctor talks, never what is
  medically said: "tell me more" after a health answer says the rest of the
  same verified passage; "short answer" gives its first sentence; "keep it
  short" drops the extra hints from later questions (the questions are
  unchanged). All tested (`tests/safety/personalised.test.ts`).
- **After the summary**, "Start a new consultation" begins a fresh visit
  (for another problem or someone else); My Visit keeps the last summary.
- **Phones**: when the on-screen keyboard opens (detected for both the
  current "visual viewport" behaviour and older Android browsers that shrink
  the whole window; never for pinch-zoom), the doctor area shrinks, the
  question is written out in compact type just above the answer box (and
  repeated above the box on choice questions), the control bar stops
  floating and the chart tab steps aside. Tested: the question and the box
  both fit above a 320 px keyboard on every question checked. Closing is
  re-checked a moment after focus leaves the box, so a tap on Send is never
  lost to a layout jump (a bug the test caught).
- **Rotation** mid-visit keeps the layout within the screen (no sideways
  scroll), the question reachable and the memory intact (tested).
- **Background tab**: the doctor stops talking (unsaid words go into the
  conversation), the microphone closes and 3D rendering pauses; nothing
  replays by itself on return.

### Lip sync on every spoken line

`tests/safety/lipsync-lines.test.ts` collects every line the director gives
to the voice (consultations in every room, replies, the result, the
emergency) and checks: every word moves the mouth, shapes stay in range, the
mouth rests by itself even if the voice never reports its end, and stopping
at any moment closes it at once. This found that numbers and symbols had no
mouth shapes ("108", "39°C"); they are now voiced digit by digit for the
mouth. It also found that the spoken emergency line did not name a number to
call: it now says "Call 108 or 112 now, or go to the nearest hospital
emergency department" (the Emergency result's wording, unchanged; review
item `W-emergency-spoken`).

### Long-session measurement

183 turns over seven consecutive consultations in one tab (3D, with
interruptions, detours and restarts), JS heap after garbage collection:
21.9 MB at start → 23.4 (1) → 24.2 → 24.6 → 25.0 → 25.1 → 25.4 → 25.6 MB (7).
Growth slows each round (≈ 0.2–0.3 MB per consultation by the end); no
errors. Frame rate here was measured on software rendering (no GPU) and is
not meaningful for phones — measure on real devices.
