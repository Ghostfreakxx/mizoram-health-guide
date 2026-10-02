import { expect, test } from "@playwright/test";

test("emergency checklist opens Emergency Mode with 108", async ({ page }) => {
  await page.goto("/ai-hospital/triage");
  await page.getByRole("button", { name: /Chest pain, pressure, or tightness right now/ }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByText("Call 108").first()).toBeVisible();
});

test("a red-flag answer mid-questionnaire interrupts triage", async ({ page }) => {
  await page.goto("/ai-hospital/triage");
  await page.getByRole("button", { name: /None of these/ }).click();
  await page.getByRole("button", { name: /Myself/ }).click();
  await page.getByRole("button", { name: /18 to 59/ }).click();
  await page.getByRole("button", { name: /^Male$/ }).click();
  await page.getByRole("button", { name: /None of these/ }).click();
  await page.getByRole("button", { name: /Chest discomfort/ }).click();
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
});

test("receptionist: suicidal message goes straight to crisis support", async ({ page }) => {
  await page.goto("/ai-hospital/reception");
  await page.getByLabel("What is the problem?").fill("I want to die but don't call anyone");
  await page.getByRole("button", { name: "Continue →" }).click();
  await expect(page.getByText("Tele-MANAS 14416").first()).toBeVisible();
});

test("Health Assistant: typo'd emergency still gets 108", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ask a Question" }).first().click();
  await page.getByLabel("Your health question").fill("cheast pian but im fine");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText("108");
});

test("Health Passport stores nothing until saving is turned on", async ({ page }) => {
  await page.goto("/ai-hospital/passport");
  await page.getByLabel("Allergies").fill("penicillin");
  const before = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("aih:")));
  expect(before).toEqual([]);
  await page.getByRole("button", { name: "Turn on saving on this phone" }).click();
  await page.getByLabel("Allergies").fill("penicillin");
  await page.reload();
  await expect(page.getByLabel("Allergies")).toHaveValue("penicillin");
  await page.getByRole("button", { name: "Delete everything" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete everything" }).click();
  const after = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("aih:")));
  expect(after).toEqual([]);
});

test("live consultation is off unless configured", async ({ page }) => {
  await page.goto("/ai-hospital/consult");
  await expect(page.getByText("Not available yet.")).toBeVisible();
});
