import { type Page, expect, test } from "@playwright/test";

// The Virtual Doctor tested like a game character: the directive's final
// demonstration, interruptions, switching display mid-visit, a long session
// with detours, and the review / debug gating.

const ROOM = "/ai-hospital/departments/general-medicine/room";

async function begin(page: Page, view: "text" | "2d" = "text", extra = "") {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${ROOM}${extra}`);
  await page.getByLabel("Display").selectOption(view);
  await page.getByRole("button", { name: "Begin consultation" }).first().click();
  return errors;
}
const box = (page: Page) => page.getByRole("textbox", { name: /Your answer|Or answer in your own words/ }).first();
async function sayIt(page: Page, words: string) {
  await box(page).fill(words);
  await page.getByRole("button", { name: "Send" }).first().click();
}
const chart = (page: Page) => page.locator("#my-visit");

test("final demonstration: 'something feels wrong here' → body map → chest → middle → pressure → safety takes over", async ({ page }) => {
  const errors = await begin(page);
  await sayIt(page, "I don't know. Something feels wrong here.");
  await expect(page.getByRole("heading", { name: /where you feel it|where in your body/i })).toBeVisible();
  // Tap the picture: it asks to confirm the place before recording it.
  await page.getByRole("group", { name: "Body areas" }).getByRole("button", { name: "Chest" }).click();
  await expect(page.getByRole("heading", { name: /Which side/ })).toBeVisible();
  await page.getByRole("button", { name: "Middle" }).click();
  await expect(page.getByRole("heading", { name: /feel like/ })).toBeVisible();
  await page.getByRole("button", { name: "Pressure" }).click();
  // Chest + pressure: the safety engine asks at once — before any routine question.
  await expect(page.getByRole("heading", { name: /To be safe, I need to ask/ })).toBeVisible();
  await expect(chart(page)).toContainText("Chest — middle");
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  // Emergency guidance replaces the consultation (the chart steps aside).
  await expect(page.getByRole("region", { name: /Emergency/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /108/ }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("body map: a tap on the picture asks 'is that the right place?' and can be changed", async ({ page }) => {
  await begin(page);
  await sayIt(page, "I can't explain it");
  const figure = page.locator("figure svg path").first(); // head, front
  await figure.click();
  await expect(page.getByText(/is that the right place\?/)).toBeVisible();
  await page.getByRole("button", { name: "Choose again" }).click();
  await expect(page.getByText(/is that the right place\?/)).toHaveCount(0);
  await page.locator("figure svg path").nth(3).click(); // chest, front
  await expect(page.getByText(/Chest — is that the right place\?/)).toBeVisible();
  await page.getByRole("button", { name: "Yes, that's it" }).click();
  await expect(page.getByRole("heading", { name: /Which side/ })).toBeVisible();
});

test("interruptions: STOP repeatedly, Back, change of display mid-visit — memory survives", async ({ page }) => {
  const errors = await begin(page, "2d");
  await sayIt(page, "I've been coughing for three weeks");
  const stop = page.getByRole("button", { name: /Stop/ }).first();
  for (let i = 0; i < 5; i++) if (await stop.isEnabled()) await stop.click();
  await page.getByRole("button", { name: "None of these — continue" }).click();
  await page.getByRole("button", { name: "18 to 59 years" }).click();
  await page.getByRole("button", { name: /Back/ }).first().click();
  await expect(page.getByRole("button", { name: "18 to 59 years" })).toBeVisible();
  await page.getByRole("button", { name: "60 years or older" }).click();
  // Switch to text only in the middle: the visit is not restarted.
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Display").selectOption("text");
  await expect(chart(page)).toContainText("I've been coughing for three weeks");
  await expect(chart(page)).toContainText("60 years or older");
  await expect(chart(page)).toContainText("More than 2 weeks");
  // An emergency while the doctor is speaking takes over at once.
  await sayIt(page, "now I can't breathe and my lips are going blue");
  await expect(page.getByRole("region", { name: /Emergency/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("a long consultation (20+ turns) with detours stays coherent and the summary is right", async ({ page }) => {
  const errors = await begin(page);
  await sayIt(page, "My main problem is cough, but I also have back pain");
  await expect(page.getByText(/noted back pain as well/).first()).toBeVisible();
  const detours = ["what does that mean", "why do you ask", "can you say that again", "idk", "how does TB spread?"];
  let turns = 1;
  let d = 0;
  for (let i = 0; i < 60; i++) {
    if (await page.getByRole("heading", { name: "📋 Patient-prepared visit summary" }).count()) break;
    if (await page.getByRole("region", { name: /Emergency/ }).count()) break;
    // Every few turns, a detour that must not derail the visit.
    if (i % 3 === 1 && d < detours.length && (await box(page).count())) {
      await sayIt(page, detours[d++]);
      turns++;
      continue;
    }
    const tryClick = async (name: string | RegExp) => {
      const b = page.getByRole("button", { name, exact: typeof name === "string" }).first();
      if (await b.count()) {
        await b.click();
        return true;
      }
      return false;
    };
    const step =
      (await tryClick("None of these — continue")) ||
      (await tryClick("18 to 59 years")) ||
      (await tryClick("Female")) ||
      (await tryClick("No")) ||
      (await tryClick("About the same")) ||
      (await tryClick(/^Mild/)) ||
      (await tryClick("Skip"));
    if (!step) await page.getByRole("group", { name: "Answers" }).getByRole("button").first().click();
    turns++;
    await page.waitForTimeout(50);
  }
  expect(turns).toBeGreaterThanOrEqual(20);
  await expect(page.getByRole("heading", { name: "📋 Patient-prepared visit summary" })).toBeVisible();
  // The summary remembers the other problem and says it was not assessed.
  await expect(page.getByText(/Also mentioned \(not assessed/).first()).toBeVisible();
  await expect(chart(page)).toContainText("back pain");
  // A new consultation (for the other problem) starts fresh; My Visit keeps the summary.
  await page.getByRole("button", { name: "↺ Start a new consultation" }).click();
  await expect(page.getByRole("heading", { name: "📋 Patient-prepared visit summary" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Your answer" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("a contradiction is asked about: 'no fever' then 'my temperature was 39'", async ({ page }) => {
  await begin(page);
  await sayIt(page, "I've been coughing for a week, I don't have a fever");
  await page.getByRole("button", { name: "None of these — continue" }).click();
  await page.getByRole("button", { name: "18 to 59 years" }).click();
  await page.getByRole("button", { name: "Male", exact: true }).click();
  await page.getByRole("button", { name: "None of these — continue" }).click();
  await sayIt(page, "my temperature was 39 degrees this morning");
  await expect(page.getByRole("heading", { name: /Should I record that you have a measured fever\?/ })).toBeVisible();
  await page.getByRole("button", { name: "Yes, change it" }).click();
  await expect(chart(page)).toContainText("39°C");
});

test("clinical review mode explains each question; the debug panel is never in the production build", async ({ page }) => {
  await begin(page, "text", "?review&debug");
  await expect(page.getByRole("heading", { name: "Clinical review mode" })).toBeVisible();
  await sayIt(page, "I've been coughing for three weeks");
  await expect(page.getByText("RF-chest_pain").first()).toBeVisible(); // the danger-sign check
  await page.getByRole("button", { name: "None of these — continue" }).click();
  await page.getByRole("button", { name: "18 to 59 years" }).click();
  await page.getByRole("button", { name: "Female" }).click();
  await page.getByRole("button", { name: "None of these — continue" }).click();
  await expect(page.getByText(/^TQ-cough-/).first()).toBeVisible();
  await expect(page.getByText(/Needs clinician review/).first()).toBeVisible();
  await expect(page.getByText("Doctor debug (development only)")).toHaveCount(0);
});

test("voice can't play: the doctor carries on in text and says so once", async ({ page }) => {
  await page.addInitScript(() => {
    // A browser that offers only cloud voices (never used) — so no voice can play.
    const v = [{ name: "Cloud", lang: "en-IN", localService: false, default: true, voiceURI: "cloud" }];
    Object.defineProperty(window.speechSynthesis, "getVoices", { value: () => v });
  });
  await begin(page, "2d");
  await expect(page.getByText(/Voice is off on this device/)).toBeVisible();
  await sayIt(page, "I have a headache");
  await expect(chart(page)).toContainText("I have a headache");
});

test("background tab: the doctor stops talking, nothing is lost, and the visit carries on", async ({ page }) => {
  const errors = await begin(page, "2d");
  await sayIt(page, "I've been coughing for three weeks");
  const setVis = (v: "hidden" | "visible") =>
    page.evaluate((state) => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
      document.dispatchEvent(new Event("visibilitychange"));
    }, v);
  await setVis("hidden");
  await setVis("visible");
  await page.getByRole("button", { name: "None of these — continue" }).click();
  await expect(page.getByRole("button", { name: "18 to 59 years" })).toBeVisible();
  await expect(chart(page)).toContainText("I've been coughing for three weeks");
  expect(errors).toEqual([]);
});

const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

test("rotating the phone mid-visit: layout fits, the question stays reachable, memory survives", async ({ page }) => {
  const errors = await begin(page, "2d");
  const portrait = page.viewportSize()!;
  const landscape = { width: portrait.height, height: portrait.width };
  await sayIt(page, "I've been coughing for three weeks");
  for (const size of [landscape, portrait, landscape, portrait]) {
    await page.setViewportSize(size);
    // A rotation can switch between the phone and desktop layouts: wait for it.
    await page.locator(`[data-layout="${size.width >= 1024 ? "wide" : "narrow"}"]`).waitFor();
    expect(await noSideScroll(page)).toBe(true);
    const next = page.getByRole("button", { name: "None of these — continue" });
    await next.waitFor();
    await next.scrollIntoViewIfNeeded();
    await expect(next).toBeVisible();
  }
  await page.getByRole("button", { name: "None of these — continue" }).click();
  await page.setViewportSize(landscape);
  await page.getByRole("button", { name: "18 to 59 years" }).click();
  await page.setViewportSize(portrait);
  await expect(chart(page)).toContainText("I've been coughing for three weeks");
  await expect(chart(page)).toContainText("18 to 59 years");
  expect(errors).toEqual([]);
});

for (const mode of ["visual viewport (current browsers)", "whole window (older Android browsers)"] as const) {
  test(`phone keyboard open, ${mode}: the question and the answer box are both above the keyboard`, async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "the on-screen keyboard only exists on phones");
    const KB = 320;
    const older = mode.startsWith("whole");
    // test double: a keyboard that shortens the visual viewport only (current
    // browsers), or the whole window (older Android browsers)
    await page.addInitScript(() => {
      const vv = window.visualViewport!;
      const w = window as unknown as { __kb: number };
      w.__kb = 0;
      Object.defineProperty(vv, "height", { configurable: true, get: () => window.innerHeight - w.__kb });
    });
    const errors = await begin(page, "2d");
    const full = page.viewportSize()!;
    const stage = page.getByRole("img", { name: /Virtual health guide/ });
    const keyboard = async (open: boolean) => {
      if (older) await page.setViewportSize({ width: full.width, height: open ? full.height - KB : full.height });
      else
        await page.evaluate((h) => {
          (window as unknown as { __kb: number }).__kb = h;
          window.visualViewport!.dispatchEvent(new Event("resize"));
        }, open ? KB : 0);
    };
    const visible = full.height - KB; // what is left above the keyboard
    // What the phone does on focus: brings the answer box just above the keyboard.
    const focusLikeAPhone = async () => {
      await box(page).focus();
      await page.evaluate((v) => {
        const r = document.activeElement!.getBoundingClientRect();
        window.scrollBy(0, r.bottom - v + 8);
      }, visible);
    };
    const question = page.locator("#consult-question");
    // The question must be readable while typing: written out in full (the
    // heading, or its repeat just above the box on choice questions).
    // Checked once the layout has settled after the keyboard opens (a real
    // keyboard animates for ~250 ms; the room re-lays out on the next frame).
    const check = async () => {
      await focusLikeAPhone();
      await expect.poll(async () => {
        const b = await box(page).boundingBox();
        if (!b || b.y + b.height > visible) return "answer box under the keyboard";
        const r = await question.boundingBox();
        return r && r.height > 20 && r.y >= 0 && r.y + r.height <= visible ? "ok" : "question not readable";
      }, { timeout: 3000 }).toBe("ok");
    };
    const tallStage = (await stage.boundingBox())!.height;
    expect(tallStage).toBeGreaterThan(full.height * 0.3);
    await box(page).focus(); // the keyboard opens for a text box
    await keyboard(true);
    await expect.poll(async () => (await stage.boundingBox())!.height).toBeLessThan(tallStage * 0.6);
    await expect(question).toHaveText(/What is troubling you today/);
    await check();
    await sayIt(page, "I've been coughing for three weeks");
    await expect(question).toHaveText(/is any of these happening/i);
    // A typed answer on a later question.
    await page.getByRole("button", { name: "None of these — continue" }).click();
    await check();
    await keyboard(false);
    await expect.poll(async () => (await stage.boundingBox())!.height).toBeGreaterThan(full.height * 0.3);
    await expect(chart(page)).toContainText("I've been coughing for three weeks");
    expect(errors).toEqual([]);
  });
}

test.describe("3D download failure", () => {
  // The offline service worker fetches the model itself, past page.route —
  // blocked here so the simulated network failure reaches every request.
  test.use({ serviceWorkers: "block" });
test("the 3D doctor can't download mid-visit: the simple picture takes over and nothing is lost", async ({ page }) => {
  // test double: the network drops every request for the 3D models
  await page.route("**/models/**", (r) => r.abort("failed"));
  const errors = await begin(page, "2d");
  await sayIt(page, "I've been coughing for three weeks");
  await page.getByRole("button", { name: "None of these — continue" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Display").selectOption("high");
  await expect(page.getByRole("status").filter({ hasText: /could not (load|start)|Showing the simple picture/ })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "18 to 59 years" }).click();
  await expect(chart(page)).toContainText("I've been coughing for three weeks");
  await expect(chart(page)).toContainText("18 to 59 years");
  expect(errors).toEqual([]);
});
});

test("'sorry, I meant no' changes the last answer, says so, and does not answer the next question", async ({ page }) => {
  const errors = await begin(page, "2d");
  await sayIt(page, "I've been coughing for three weeks");
  await page.getByRole("button", { name: "None of these — continue" }).click();
  const heading = page.locator("#consult-question");
  for (let i = 0; i < 25; i++) {
    const q = (await heading.textContent()) ?? "";
    const tap = async (name: string | RegExp) => {
      const b = page.getByRole("button", { name, exact: typeof name === "string" });
      if (!(await b.count())) return false;
      await b.first().click();
      await expect(heading).not.toHaveText(q);
      return true;
    };
    if (/sweats|weight/i.test(q) && (await page.getByRole("button", { name: "Yes", exact: true }).count())) {
      await tap("Yes");
      const next = (await heading.textContent())!;
      await sayIt(page, "sorry, I meant no");
      await expect(page.getByText(/changed your last answer to “No”/).first()).toBeVisible();
      await expect(heading).toHaveText(next);
      await expect(chart(page)).toContainText(/Night sweats|weight loss/i);
      expect(errors).toEqual([]);
      return;
    }
    if (await tap("No")) continue;
    if (await tap("18 to 59 years")) continue;
    if (await tap("Female")) continue;
    if (await tap("Myself")) continue;
    if (await tap("None of these — continue")) continue;
    if (await tap("Skip")) continue;
    break;
  }
  throw new Error("did not reach the night-sweats question");
});

test("the VD3 target experience: 'something hurts around here' → help → body map → My Visit → correct it → emergency", async ({ page }) => {
  const errors = await begin(page, "2d");
  const question = page.locator("#consult-question");
  await expect(question).toHaveText("Hello. I'm your virtual health guide for General Medicine. What is troubling you today?");
  await sayIt(page, "I don't really know. Something hurts around here.");
  // The doctor does not fail: she offers help, and the body map appears.
  await expect(question).toHaveText(/^That's okay\. I'll help you describe it\./);
  const areas = page.getByRole("group", { name: "Body areas" });
  await expect(areas).toBeVisible();
  await areas.getByRole("button", { name: "Lower tummy" }).click();
  await expect(page.locator("#my-visit")).toContainText("Lower tummy");
  // Correct an earlier answer from My Visit: the doctor asks it again.
  const visit = page.locator("#my-visit");
  if (!(await visit.isVisible())) await page.getByRole("button", { name: /My Visit/ }).click();
  await visit.getByRole("button", { name: /Change: Where/ }).click();
  await expect(question).toHaveText(/let's change where it is/i);
  await page.getByRole("group", { name: "Body areas" }).getByRole("button", { name: "Upper tummy" }).click();
  await expect(visit).toContainText("Upper tummy");
  await expect(visit).not.toContainText("Lower tummy");
  // A red flag at any point: the whole consultation becomes calm Emergency Mode.
  await sayIt(page, "I am vomiting blood");
  await expect(page.getByRole("region", { name: /Emergency/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Call 108/ }).first()).toBeInViewport();
  await expect(page.locator("#consult-question")).toHaveCount(0);
  expect(errors).toEqual([]);
});
