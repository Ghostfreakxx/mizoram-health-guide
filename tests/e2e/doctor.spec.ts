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
const chart = (page: Page) => page.getByRole("complementary", { name: "Patient chart" });

test("final demonstration: 'something feels wrong here' → body map → chest → middle → pressure → safety takes over", async ({ page }) => {
  const errors = await begin(page);
  await sayIt(page, "I don't know. Something feels wrong here.");
  await expect(page.getByRole("heading", { name: /Where do you feel it|where in your body/i })).toBeVisible();
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
    if (!step) await page.locator("main button.min-h-14").first().click();
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
  await expect(page.getByText(/Voice isn't available right now/)).toBeVisible();
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
