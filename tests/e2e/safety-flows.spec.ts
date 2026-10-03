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

test("consultation room: 'chest feels very tight… struggling to breathe' interrupts at once", async ({ page }) => {
  await page.goto("/ai-hospital/departments/general-medicine/room");
  await page.getByLabel("Display").selectOption("text");
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await page.getByRole("textbox", { name: "Your answer" }).fill("My chest feels very tight and I'm struggling to breathe.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Urgent medical attention")).toBeVisible();
  await expect(page.getByText("Your answers include warning signs")).toBeVisible();
  await expect(page.getByRole("link", { name: /108/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "This is not an emergency — go back" })).toBeVisible();
  // Routine questions are not shown.
  await expect(page.getByText("Is this for you, or for someone else?")).toHaveCount(0);
});

test("consultation room: a three-week cough gets follow-up questions, a chart and a visit summary", async ({ page }) => {
  await page.goto("/ai-hospital/departments/general-medicine/room");
  await page.getByLabel("Display").selectOption("text");
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await page.getByRole("textbox", { name: "Your answer" }).fill("I've been coughing for about three weeks");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByRole("button", { name: "None of these — continue" }).click();
  await expect(page.getByRole("heading", { name: "Is this for you, or for someone else?" })).toBeVisible();
  const chart = page.getByRole("complementary", { name: "Patient chart" });
  await expect(chart).toContainText("I've been coughing for about three weeks");
  await expect(chart).toContainText("More than 2 weeks");
  await expect(chart).toContainText("Not provided");
  // Answer the rest: myself, adult, female, nothing special, cough, then "No" / first option / skip.
  await page.getByRole("button", { name: "Myself" }).click();
  await page.getByRole("button", { name: "18 to 59 years" }).click();
  await page.getByRole("button", { name: "Female" }).click();
  await page.getByRole("button", { name: "None of these — continue" }).click();
  await page.getByRole("button", { name: /Cough or breathing problem/ }).click();
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole("heading", { name: "📋 Patient-prepared visit summary" }).count()) break;
    if (await page.getByText("Urgent medical attention").count()) break;
    const no = page.getByRole("button", { name: "No", exact: true });
    const skip = page.getByRole("button", { name: "Skip", exact: true });
    if (await no.count()) await no.click();
    else if (await skip.count()) await skip.click();
    else if (await page.getByRole("button", { name: "About the same" }).count()) await page.getByRole("button", { name: "About the same" }).click();
    else if (await page.getByRole("button", { name: /^Mild/ }).count()) await page.getByRole("button", { name: /^Mild/ }).click();
    else await page.locator("main button.min-h-14").first().click();
  }
  await expect(page.getByRole("heading", { name: "📋 Patient-prepared visit summary" })).toBeVisible();
  await expect(page.getByText("PATIENT-PREPARED VISIT SUMMARY", { exact: true })).toBeVisible();
  await expect(page.getByText("Not a medical diagnosis").first()).toBeVisible();
  await expect(page.getByText("Next: a real healthcare professional")).toBeVisible();
  await expect(chart).toContainText("System routing information");
  await expect(chart).toContainText("Navigation urgency");
});

test("consultation room: never asks for camera or microphone, and works with no 3D", async ({ page }) => {
  const asked: string[] = [];
  await page.exposeFunction("__perm", (n: string) => asked.push(n));
  await page.addInitScript(() => {
    const md = navigator.mediaDevices;
    if (md) md.getUserMedia = async () => { (window as unknown as { __perm: (n: string) => void }).__perm("getUserMedia"); throw new Error("blocked"); };
  });
  await page.goto("/ai-hospital/departments/general-medicine/room");
  await page.getByLabel("Display").selectOption("text");
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await page.getByRole("textbox", { name: "Your answer" }).fill("headache");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Your consultation information stays on this device")).toBeVisible();
  expect(asked).toEqual([]);
});

test("demo mode plays a scenario through the real engine and resets", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); // no smooth scrolling while presenting
  await page.goto("/ai-hospital/departments/general-medicine/room?demo");
  await page.getByLabel("Display").selectOption("text");
  await page.getByRole("button", { name: /D\. Possible heart emergency/ }).click();
  await expect(page.getByText("Urgent medical attention")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "End demo scenario — reset" }).click();
  await expect(page.getByText("Urgent medical attention")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /B\. Persistent cough/ })).toBeVisible();
});

test("reception hands the patient's words to the consultation room (in memory, not the URL)", async ({ page }) => {
  await page.goto("/ai-hospital/reception");
  await page.getByLabel("What is the problem?").fill("I have been coughing for three weeks.");
  await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByRole("button", { name: /Start your consultation/ }).click();
  // A cough is routed to the Respiratory room; nothing about it is in the address.
  await expect(page).toHaveURL(/\/ai-hospital\/departments\/respiratory\/room$/);
  await expect(page.getByText("From Reception:")).toBeVisible();
  await page.getByLabel("Display").selectOption("text");
  await page.getByRole("button", { name: "Begin consultation" }).click();
  const chart = page.getByRole("complementary", { name: "Patient chart" });
  await expect(chart).toContainText("I have been coughing for three weeks.", { timeout: 20000 });
  await expect(chart).toContainText("More than 2 weeks");
});

test("reception: 'My mother has been having chest pain' goes straight to Emergency Mode", async ({ page }) => {
  await page.goto("/ai-hospital/reception");
  await page.getByRole("button", { name: "“My mother has been having chest pain.”" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByRole("link", { name: /108/ }).first()).toBeVisible();
});
