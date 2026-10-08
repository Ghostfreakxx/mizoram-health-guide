# VD4 — live experience audit (before)

How: production build (`next start`), headless Chromium with software WebGL,
1366×768 desktop and 390×844 phone (touch), in 3D (high), 2D and text-only
modes. A scripted patient walked three synthetic consultations to the end
(`headache + fever`, `vague "something hurts here"`, `confused "idk"`),
logging every question and option and screenshotting every turn.
Screenshots: `docs/quality/vd4/before-*.jpg`.

Ranked by patient impact → safety → visual quality → effort. Each defect
links to what was seen.

| # | Defect (seen) | Impact | Area |
|---|---|---|---|
| 1 | **Phone: the whole consultation slid up ~140 px mid-visit; the top bar with the Emergency/108 button disappeared** (`before-phone-shifted.jpg`). Cause: the full-screen container is `overflow:hidden`, which browsers still scroll when a text box takes focus. | Safety | Layout |
| 2 | "I have had a headache and fever for three days" → *"Which of these fits best? It sounds closest to: fever"* + a list of every problem group (`before-text-category-list.jpg`). The second symptom (headache) is then forgotten: not in My Visit, not in the summary's symptoms. | High | Conversation, memory |
| 3 | Information volunteered at the "wrong" moment is lost: "I took paracetamol yesterday" (asked about sex) → *"I'm not completely sure I understood"*; later the doctor asks "Do you know what medicines you're taking?" as if never told. | High | Memory |
| 4 | Safety questions are read out as form fragments: *"Severe headache?"*, *"Cannot keep any fluids down?"*, *"Has the fever gone down, but the person now feels…"* (third person to the patient), and never refer to what the patient already said (*"You mentioned a headache — is it severe?"*). | High | Dialogue quality |
| 5 | After one clarification, every later question gets a dictionary definition glued on: *"Thanks. Vomiting blood, or black or bloody stools? By “vomiting”, I mean throwing up — food or liquid coming back out of the mouth."* — long and robotic, spoken aloud. | Medium | Dialogue quality |
| 6 | "i dont understand" after "Tell me what is bothering you most…" → the identical sentence again (no simpler step, no offer of the body map). | Medium | Help |
| 7 | "it comes and goes, worse after food" (asked what it feels like) is stored only as a description; pattern and what makes it worse are not recorded. | Medium | Memory |
| 8 | Safety check = 12 long red buttons; on a phone only one is visible without scrolling (`before-phone-check.jpg`). | Medium | Safety UX |
| 9 | Desktop 3D: the doctor shrinks from large (entry) to small and half hidden behind the question card once the consultation starts; crude block props (exam couch, boxes) dominate the right side (`before-desktop-greeting.jpg`). | High (visual) | Scene, camera |
| 10 | Text-only: the "Voice is off" notice covers the conversation; the latest message is hidden under the question card; at the summary half the screen is empty (`before-text-overlap.jpg`). | Medium | Layout |
| 11 | Summary: three overlapping blocks (next steps, result card + editable "doctor summary" form, printed summary) — long; mentioned symptoms and medicines missing. | Medium | Patient tools |
| 12 | Hair reads as a solid helmet/cap — no hair edge, no strands. | High (visual) | Doctor |
| 13 | Mouth at rest: thin dark slit with a white line (teeth) — uncanny at the greeting. | Medium | Doctor |
| 14 | White coat is a featureless white shape: no collar/lapel shading, puffy sleeves. | Medium | Doctor |
| 15 | Lighting flat and whites overexposed; no image-based lighting; no contact shadow on low/medium. | Medium | Scene |
| 16 | No explicit SUMMARIZING state; "handoff" covers it; the status pill says "Speaking" in text-only mode where nothing is spoken. | Low | Director |
| 17 | "Start again" (wipes the visit) sits among the helper chips — easy to tap by mistake. | Medium | UI |
| 18 | A term chip for a different step (*What does “fits (seizures)” mean?*) is offered on the problem-group step. | Low | UI |
| 19 | Phone: answer-box placeholder wraps and is cut; the box is narrow between Talk and Send. | Low | Mobile |
| 20 | Free-text answers to a list question that contain two problems (e.g. "fever and headache") cannot be resolved except by tapping. | Medium | Conversation |

Not defects (checked): emergency words interrupt speech in ~20 ms; Stop
cancels speech at once (measured, `tests/e2e/voice.spec.ts`); micro-saccades
and gaze breaks exist (`doctor/gaze.ts`); every answer is safety-checked
before the next question.

Blocked (documented, not fixable here): MakeHuman's hair/skin asset host
(download.tuxfamily.org) and the `makehuman-assets` repository are not
reachable from this environment's network policy, so strand-hair assets
cannot be fetched; procedural hair is built instead. CC0 Poly Haven HDRIs
are available through npm (`@pmndrs/assets`, CC0-1.0).
