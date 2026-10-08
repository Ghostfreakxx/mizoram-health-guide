import { type Page, expect, test } from "@playwright/test";

// VD4 real-world validation: a 25+ turn consultation that mixes two
// problems in the first sentence, facts volunteered at the wrong moment,
// detours (what does that mean / why / say again / not sure), an edit in My
// Visit, the medicines follow-up — and then an emergency, which must take
// over at once with everything remembered. Synthetic patient only.

const ROOM = "/ai-hospital/departments/general-medicine/room?view=text";
const box = (page: Page) => page.getByRole("textbox", { name: /Your answer|Or answer in your own words/ }).first();
const visit = (page: Page) => page.locator("#my-visit");
const question = (page: Page) => page.locator("#consult-question");

async function say(page: Page, words: string) {
  await box(page).fill(words);
  await page.getByRole("button", { name: "Send" }).first().click();
}

// Answers whatever is on screen the way an ordinary patient might.
async function answer(page: Page) {
  const q = (await question(page).textContent()) ?? "";
  if (/other medicines|any other allergies|other long-term|medicines you're taking|allergies to medicines|long-term health condition/i.test(q)) return say(page, "no others");
  for (const name of [/^None of these/, "18 to 59 years", "Female", "No", "About the same", /^Mild/, "Not measured", "Started today"]) {
    const b = page.getByRole("button", { name, exact: typeof name === "string" }).first();
    if (await b.count()) return b.click();
  }
  const group = page.getByRole("group", { name: "Answers" }).getByRole("button");
  if (await group.count()) return group.first().click();
  return page.getByRole("button", { name: "Skip" }).first().click();
}

test("a 25+ turn consultation: memory, detours, an edit, then an emergency takes over", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(ROOM);
  await page.getByRole("button", { name: "Begin consultation" }).click();

  let turns = 0;
  // 1. Two problems and a medicine in the first sentence.
  await say(page, "I have had a headache and fever for three days, I took paracetamol");
  turns++;
  await expect(question(page)).toContainText("You mentioned a fever and a headache. Which one is troubling you most?");
  await page.getByRole("button", { name: /Fever/ }).first().click();
  turns++;
  // 2. A detour on the safety check, then the check itself.
  await say(page, "what does that mean?");
  turns++;
  await expect(page.getByRole("status").filter({ hasText: /anything very serious/ })).toBeVisible();
  await page.getByRole("button", { name: "None of these — continue" }).click();
  turns++;
  await page.getByRole("button", { name: "18 to 59 years" }).click();
  turns++;
  // 3. Volunteered at the wrong moment: noted and said back, same question again.
  await say(page, "I'm diabetic");
  turns++;
  await expect(page.getByText(/I've noted diabetes under your health conditions/)).toBeVisible();
  await expect(question(page)).toContainText("female or male");
  await page.getByRole("button", { name: "Female" }).click();
  turns++;

  // 4. Carry on, with detours every few turns, and one edit in My Visit.
  const detours = ["why do you ask?", "can you say that again", "idk"];
  let edited = false;
  let sawHeadacheMention = false;
  let sawMedicineMention = false;
  for (let i = 0; turns < 25 && i < 60; i++) {
    const q = (await question(page).textContent()) ?? "";
    if (/You mentioned a headache\. Is it severe\?/.test(q)) sawHeadacheMention = true;
    if (/You mentioned paracetamol\./.test(q)) sawMedicineMention = true;
    if (i % 4 === 1 && detours.length) {
      await say(page, detours.shift()!);
    } else if (!edited && i === 6) {
      const change = visit(page).getByRole("button", { name: "Change: Started" });
      // Phones: My Visit is a bottom sheet — open it first.
      if (!(await change.isVisible())) await page.getByRole("button", { name: /My Visit/ }).first().click();
      await change.click();
      await expect(page.getByText(/let's change when it started/)).toBeVisible();
      await page.getByRole("button", { name: "Started today" }).click();
      edited = true;
    } else {
      await answer(page);
    }
    turns++;
    if (await page.getByRole("heading", { name: "📋 Patient-prepared visit summary" }).count()) break;
  }
  expect(turns).toBeGreaterThanOrEqual(25);
  expect(sawHeadacheMention, "the doctor referred back to the headache").toBe(true);

  // 5. Memory: everything said along the way is in My Visit.
  await expect(visit(page)).toContainText("headache");
  await expect(visit(page)).toContainText("paracetamol");
  await expect(visit(page)).toContainText("diabetes");
  await expect(visit(page)).toContainText("Today");

  // 6. The summary or an emergency: if the visit is still going, an
  // emergency now takes over at once and nothing said is lost.
  if (!(await page.getByRole("heading", { name: "📋 Patient-prepared visit summary" }).count())) {
    await say(page, "now my chest feels crushed and I can't breathe");
    await expect(page.getByRole("region", { name: /Emergency/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Call 108/ }).first()).toBeVisible();
    await expect(question(page)).toHaveCount(0);
  } else {
    expect(sawMedicineMention, "the medicines question built on what was said").toBe(true);
  }
  expect(errors).toEqual([]);
});
