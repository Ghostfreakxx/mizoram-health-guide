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

## Guide states (`doctorMotion.ts`)

WAITING · GREETING · LISTENING · THINKING · ASKING · EXPLAINING · URGENT ·
HANDOFF · COMPLETE. The screen (state chip, journey bar) and the guide's
behaviour follow the same state.

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
consult-room/doctorMotion.ts        ← blink, breathing, nods, gaze, gestures (pure)
consult-room/Doctor3D.tsx | Doctor2D.tsx | text only
consult-room/voice.ts               ← on-device speech output; input reserved
```

The avatar only *presents* what the engine decided. It has no medical logic.

## 3D approach

- **three.js + React Three Fiber** (already used by the 3D tours). Works in
  every modern mobile browser with WebGL; no plug-ins.
- The 3D code is loaded with `next/dynamic` only when the room opens.
- The guide is a **real human model** built from MakeHuman CC0 data
  (`scripts/avatar/`, ~370 KB high / ~230 KB balanced, meshopt-compressed,
  one skeleton, 16 facial morph targets). The room is built from code.
- Errors in 3D fall back to the 2D guide (error boundary). WebGL missing →
  2D guide automatically.

## Device tiers (`consult-room/capability.ts`)

| Tier | Who gets it | What they see |
|---|---|---|
| full | desktop / strong devices | 3D guide and full room, up to 2× resolution |
| standard | phones, ≤4 GB memory or ≤4 cores | 3D guide, simpler room, ≤1.25× resolution, no antialiasing |
| lite | no WebGL, Data Saver, 2G, <2 GB memory, ≤2 cores | 2D guide (SVG), same consultation |
| text only | person's choice | no picture at all |

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
modelled), or license one from a character marketplace. `Doctor3D.tsx`'s
`<Guide />` is the only part that changes — `poseAt()` already outputs blink,
brow, smile, mouth-open, head and gesture values that map onto blendshapes and
bones. The 2D and text tiers stay as they are.

## Voice

- Output: the phone's own text-to-speech (`speechSynthesis`) — nothing is sent
  anywhere. Mute, replay, pause and subtitles are always available. Lips only
  move while the voice is actually speaking.
- Input: built (`listenOnDevice` in `voice.ts`) but **off by default**
  (`NEXT_PUBLIC_VOICE_INPUT=on-device` to enable). It only uses on-device
  recognition (`processLocally`); the availability check is never run on page
  load because it crashed browser tabs in testing. Browser speech
  recognition in some browsers sends audio to an outside cloud service. It
  needs a Health Department decision (on-device or government-hosted
  recogniser) and an explicit microphone button with the browser's permission
  prompt. Spoken text would go through `respond()` exactly like typed text.
- Mizo: no Mizo voice ships on phones today; the voice uses Indian English. Mizo
  subtitles follow the translation review process (docs/TRANSLATION.md).

## Privacy

- The camera is never used. "Eye contact" means the guide looks at the 3D
  camera position (the patient's viewpoint) — no face or gaze tracking.
- The microphone is never used.
- Nothing typed is stored or sent; the information panel lives in page memory.

## Safety tests

`tests/safety/consultation.test.ts`: the guide never diagnoses or prescribes
(every line on every complaint path), free-text and checklist red flags stop
the consultation, negated danger words are asked about, the result is always
the triage engine's result, the panel shows only supplied information, the
guide never smiles in an emergency, and reduced motion keeps the head still.
