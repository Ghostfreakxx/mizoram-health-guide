# VD3 — Virtual Doctor rebuild: report

General Medicine is the reference room; the other five rooms inherit
everything through `rooms.ts` (style record) and the shared engine.
Synthetic test scenarios only. Measurements: production build (`next start`),
headless Chromium, **software WebGL (no graphics chip)** — a worst case.

Before/after screenshots (BEFORE = commit `c003b26`, AFTER = this pass):
[desktop greeting](vd3/desk1920-1-greeting.jpg) ·
[desktop body map](vd3/desk1920-2-bodymap.jpg) ·
[laptop emergency](vd3/lap1366-3-emergency.jpg) ·
[tablet](vd3/tab820-1-greeting.jpg) ·
[phone greeting](vd3/ph390-1-greeting.jpg) ·
[phone body map](vd3/ph390-2-bodymap.jpg) ·
[320 px emergency](vd3/ph320-3-emergency.jpg).
`tests/e2e/visual.spec.ts` saves a fresh set on every run
(`test-results/**/visual/`).

## 1. Doctor model
Rebuilt from the CC0 MakeHuman base with our own script
(`scripts/avatar/build_guide.py`): a woman of about 35 from Mizoram — warmer
skin (`#cf9b7a`), a soft round lower face (the chin no longer comes to a
point), ears close to the head, natural nose width, fuller lips. Same
32.7k triangles, one model for every 3D tier. Matte cotton coat; desk
props moved to the back of the desk so nothing sits in front of her.

## 2. Face
No smile baked into the resting face: the smile appeared in emergencies.
Expressions come only from morph targets. The greeting smile was toned down
(0.32 → 0.24) after a review of the screenshots. Thinner, lighter brows.

## 3. Eyes / gaze
Resting lids lowered slightly (relaxed, not staring); wetter eye material
(clearcoat, specular) for a catch-light from the key light; gaze targets
the patient, the chart screen, the tool being shown, and down when thinking
(`doctor/gaze.ts`, unchanged logic, retuned).

## 4. Animation
Layered and procedural (`doctor/body.ts`, `face.ts`, `gaze.ts`,
`director.ts`): breathing, slow weight shift, nods only while the patient is
typing or talking, an acknowledging nod when an answer arrives, phrase-timed
hand gestures while speaking, finger settle. Nothing random on a fixed loop.
The director (`director.ts`) plans each turn: thinking pause, state while
speaking, state after. Emergency skips every pause.

## 5. Lip sync
Unchanged engine (viseme timeline + word boundaries); now measured:
speech events start the mouth and Stop/typing/Talk close it at once
(the mouth resets with `lips.end()` in every cancel path).

## 6. Voice
Measured with an instrumented speech engine (`tests/e2e/voice.spec.ts`):

| | Time |
|---|---|
| Stop → speech cancelled | 0 ms |
| Talk → speech cancelled | 0 ms |
| typing → speech cancelled | ~17 ms (includes the key event) |
| emergency words → emergency line spoken | ~19 ms, no pause |
| Send → doctor starts speaking | ~610 ms (was ~1,000 ms) |
| longest single utterance | 68 characters (one sentence at a time) |

The thinking pause is now 0.35–0.9 s (was 0.6–1.4 s).

## 7. Consultation UI
The room is its own full-screen scene: no site header, footer or bottom
navigation. A thin top bar (Leave · department · status · My Visit ·
Settings · Emergency); the doctor fills the screen; one question dock at
the bottom; tools in a left column; My Visit on the right. Display and
privacy live under Settings. The old journey bar, control grid and "Not
provided" chart are gone.

## 8. Room
Same code-built room; props on the doctor's side of the desk, smaller and
further back; the BP cuff is a folded cuff, not a ring.

## 9. Lighting
Portrait lighting: a warm key light from front-left at face height (eye
catch-lights, soft shadow under the jaw), a cool low fill, a warm rim from
the window, low flat ambient (it made the skin look waxy).

## 10. Conversation
Opens with "What is troubling you today?"; "I don't really know. Something
hurts around here." → "That's okay. I'll help you describe it." → body map.
The doctor names the tool she shows. Shorter replies; "Why do you ask?"
and "What does this mean?" always available.

## 11. Memory
My Visit lists only what the patient said, in plain groups. Every answer
has **Change**: the doctor asks again ("Of course — let's change where it
is.") and the safety checks run again on the new answer (`reopen()` in
`consultation.ts`, 3 unit tests + the end-to-end target scenario). The
20+-turn session test still passes.

## 12. Body map
Front and back figures with a list; on a phone it opens as a temporary
full-screen tool above the answer box ("Hide the picture"); on a wide
screen it sits in the left column so the doctor is never covered.

## 13. Emergency
The dock is replaced by the calm emergency card: Call 108 / Call 112 on
screen at every tested size including 320 × 640; the doctor stays in view
(dimmed); no flashing, no sound; the question and other notices disappear.

## 14. Mobile
Portrait composition: doctor 36–50% of the height (depends on the phone),
then a white panel with the question and the answer box in thumb reach.
Keyboard open: the doctor shrinks to a strip and the panel follows the
visual viewport. My Visit is a bottom sheet. Icon-only secondary buttons
below 360 px (with labels for screen readers). Shorter placeholder on
small screens so it never wraps.

## 15. Performance (1366 × 768, software WebGL)

| Display | Frame rate | JS heap | Send → next question |
|---|---|---|---|
| text only | 60 fps | 6 MB | 35 ms |
| 2D guide | 34 fps (**8 fps before** the redraw fix in this pass) | 7 MB | ~230 ms |
| 3D low | 7 fps; 14 fps with dynamic resolution at 1100 × 700 | 17 MB | ~120 ms |
| 3D medium / high | ~2 fps | 13–19 MB | ~700 ms |

**Dynamic quality** (new): after a 2 s warm-up, below 22 fps the stage drops
to 75% then 60% resolution, then a tier (high → medium → low → 2D). Under
4 fps it steps down at once. A tier the person chose is never stepped down
(resolution still adapts). The conversation is never lost.

## 16. 3D payload

| | Before | After |
|---|---|---|
| Doctor model (meshopt) | 359 KB file / 195 KB transferred | 362 KB / 198 KB |
| JS for the room | 546 KB | 549 KB |
| Whole page, 3D | 810 KB | 796 KB |
| Whole page, text / 2D | — | 326 KB |

## 17. FPS before / after
Before, "auto" always ended in the 2D guide: a quality change remounted
the canvas and its deliberate context loss was mistaken for a failure
(fixed). So the BEFORE number for everyone was the 2D guide, at 47 fps in a
smaller box. AFTER: 2D guide full-screen 34 fps; 3D as above. No GPU
measurement is possible in this environment.

## 18. Accessibility
axe checks pass on the room; every icon-only button has a label; the
question is a live heading; Emergency is reachable from the top bar at all
sizes; reduced motion stops idle movement; text-only mode shows the whole
conversation. Not yet tried with real screen-reader users.

## 19. Tests
545 unit tests; 167 browser tests passing (3 skipped by design) across
desktop and phone projects. New in VD3: layout invariants at 1920, 1366,
820, 393, 360 and 320 px for entry, greeting, body map and emergency, plus
text mode (no sideways scroll, question and Send on screen, the doctor
keeps ≥90% (wide) / ≥24% (phone) of the screen, panels never overlap,
Call 108 visible); the target experience end to end; voice timing; My
Visit edit (`reopen`).

## 20. Known limitations
- **Realism.** A procedural CC0 head with vertex-colour skin: no skin pores,
  subsurface scattering, strand hair or cloth simulation. The hair still
  reads as smooth and solid. A photoreal doctor needs an artist-made or
  scanned head with a licence that allows web use — a budget/licensing
  decision for the project owner.
- **Performance on real phones is not measured.** Software rendering here
  is 10–30× slower than a phone GPU; numbers above are a floor. Measure on a
  low-cost Android phone before any pilot.
- Voice timing uses an instrumented engine; real voices add their own
  start latency (typically 100–400 ms on Android).
- Mizo language, clinical review and government data remain blocked (see
  `PROJECT_STATUS.md`).
- An earlier commit message said "557 unit tests"; the real count at that
  commit was 542.

## Ratings (honest, 1–10)

| | Score | Why / what would raise it |
|---|---|---|
| Visual quality | 7 | Clean, calm full-screen scene and HUD; the 3D doctor and room are still clearly "game-like". |
| Doctor realism | 5 | Believable proportions and colouring for Mizoram, but no skin detail, solid hair, flat cloth. Needs a professionally made head (decision needed). |
| Animation | 6 | Purposeful, never random; but procedural — no captured motion, small gesture vocabulary. |
| Conversation | 8 | Help-first, never gives up, corrections and edits rerun safety, measured accuracy. |
| Immersion | 7 | Chrome removed, doctor dominant; limited by realism. |
| Mobile | 8 | Portrait composition, keyboard, bottom sheet, 320 px emergency all tested. |
| Performance | 6 | Dynamic quality and fast fallbacks; 3D unmeasured on real GPUs and slow in software. |
| Safety | 9 | Deterministic core unchanged, every edit reruns checks, emergency interrupts speech in ~20 ms. Clinical sign-off still pending. |
| Government demo quality | 7 | Demonstrates the journey end to end safely; a more realistic doctor and a real-phone performance check would make it an 8+. |

Below 8 and not fixable in code alone: **realism** (needs an artist-made or
licensed scanned head) and **performance on real devices** (needs a
physical low-cost phone). Everything else below 8 continues in the next pass.
