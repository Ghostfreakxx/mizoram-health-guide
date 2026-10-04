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
  await expect(page.getByText("These symptoms may need emergency medical attention").first()).toBeVisible();
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
  // "I've been…" already says who the visit is for: the doctor remembers it and does not ask again.
  await expect(page.getByRole("heading", { name: "How old are you?" })).toBeVisible();
  const chart = page.getByRole("complementary", { name: "Patient chart" });
  await expect(chart).toContainText("I've been coughing for about three weeks");
  await expect(chart).toContainText("Self");
  await expect(chart).toContainText("More than 2 weeks");
  await expect(chart).toContainText("Not provided");
  // Answer the rest: adult, female, nothing special, cough, then "No" / first option / skip.
  await page.getByRole("button", { name: "18 to 59 years" }).click();
  await page.getByRole("button", { name: "Female" }).click();
  await page.getByRole("button", { name: "None of these — continue" }).click();
  // The problem (a cough) was understood from the words: not asked again.
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
  // The site-wide floating chat is not shown inside a consultation room.
  await expect(page.getByRole("button", { name: "💬 Ask a question" })).toHaveCount(0);
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

test("consultation room: own-words answers are understood, or the doctor asks again", async ({ page }) => {
  await page.goto("/ai-hospital/departments/general-medicine/room");
  await page.getByLabel("Display").selectOption("text");
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await page.getByRole("textbox", { name: "Your answer" }).fill("I have had a headache since yesterday");
  await page.getByRole("button", { name: "Send" }).click();
  // A choice question can still be answered in words; unclear words get a gentle retry.
  const words = page.getByRole("textbox", { name: "Or answer in your own words" });
  await words.fill("banana");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("status").filter({ hasText: "I didn't quite understand that." })).toBeVisible();
  for (const name of ["Talk", "Type instead", "Repeat", "Stop"]) await expect(page.getByRole("button", { name: new RegExp(name) }).first()).toBeVisible();
});

test("consultation room: an emergency is shown in the page, with the doctor beside it", async ({ page }) => {
  await page.goto("/ai-hospital/departments/general-medicine/room");
  await page.getByLabel("Display").selectOption("2d");
  await page.getByRole("button", { name: "Begin consultation" }).first().click();
  await page.getByRole("textbox", { name: "Your answer" }).fill("I have severe chest pain right now");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("region", { name: /Emergency/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /108/ }).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /Urgent/ })).toBeVisible();
});

test("consultation room: the doctor helps when the patient can't explain, and safety acts on 'like pressure'", async ({ page }) => {
  await page.goto("/ai-hospital/departments/general-medicine/room");
  await page.getByLabel("Display").selectOption("text");
  await page.getByRole("button", { name: "Begin consultation" }).click();
  const box = page.getByRole("textbox", { name: "Your answer" });
  await box.fill("I don't really know how to explain it");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: /That's okay\. Tell me what is bothering you most/ })).toBeVisible();
  await page.getByRole("textbox", { name: "Or answer in your own words" }).fill("My chest feels strange");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: /Can you describe what it feels like\?/ })).toBeVisible();
  await page.getByRole("textbox", { name: "Or answer in your own words" }).fill("Like pressure");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: /To be safe, I need to ask/ })).toBeVisible();
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByRole("region", { name: /Emergency/ })).toBeVisible();
});

test("consultation room: explain, why, 'not sure', and verified health education", async ({ page }) => {
  await page.goto("/ai-hospital/departments/general-medicine/room");
  await page.getByLabel("Display").selectOption("text");
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await page.getByRole("textbox", { name: "Your answer" }).fill("I have a cough");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: /When did this start\?/ })).toBeVisible();
  await page.getByRole("button", { name: /Why do you ask\?/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "How long a problem has lasted" })).toBeVisible();
  await page.getByRole("button", { name: /I'm not sure/ }).click();
  await page.getByRole("button", { name: "None of these — continue" }).click();
  const words = page.getByRole("textbox", { name: "Or answer in your own words" });
  await words.fill("What is TB?");
  await page.getByRole("button", { name: "Send" }).click();
  const edu = page.getByRole("region", { name: "What is TB?" });
  await expect(edu).toContainText("not an assessment of you");
  await expect(edu).toContainText("spreads through the air");
  await words.fill("What is lupus?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("status").filter({ hasText: "I don't have verified information about that in my health guide yet" })).toBeVisible();
  // A diagnosis question is answered honestly and saved for the real doctor.
  await words.fill("Do I have TB?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("status").filter({ hasText: "I can't tell you what it is" })).toBeVisible();
  const chart = page.getByRole("complementary", { name: "Patient chart" });
  await expect(chart).toContainText("Not sure");
});

test("consultation room: 'I can't explain what's wrong' → the doctor helps describe it with the body map", async ({ page }) => {
  await page.goto("/ai-hospital/departments/general-medicine/room");
  await page.getByLabel("Display").selectOption("text");
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await page.getByRole("textbox", { name: "Your answer" }).fill("I can't explain what's wrong");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: /I'll help you describe it\. First, where in your body/ })).toBeVisible();
  await page.getByRole("group", { name: "Body areas" }).getByRole("button", { name: "Lower tummy" }).click();
  await expect(page.getByRole("heading", { name: /Which area — the left, the right, the middle, or both sides\?/ })).toBeVisible();
  await page.getByRole("button", { name: "Right", exact: true }).click();
  await expect(page.getByRole("heading", { name: /What does it feel like\?/ })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Patient chart" })).toContainText("Lower tummy — right side");
  // No helpline, no emergency: the doctor is still helping.
  await expect(page.getByText("Urgent medical attention")).toHaveCount(0);
});

test("consultation room: unknown topics and corrections keep the consultation going", async ({ page }) => {
  await page.goto("/ai-hospital/departments/general-medicine/room");
  await page.getByLabel("Display").selectOption("text");
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await page.getByRole("textbox", { name: "Your answer" }).fill("My stomach hurts");
  await page.getByRole("button", { name: "Send" }).click();
  const words = page.getByRole("textbox", { name: "Or answer in your own words" });
  await words.fill("here on the right");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: /When you say “on the right”, which part of your body do you mean\?/ })).toBeVisible();
  await page.getByRole("button", { name: "Right lower stomach" }).click();
  await words.fill("Actually, I said left, not right.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Okay. I've changed that to the left side." })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Patient chart" })).toContainText("Lower tummy — left side");
  await words.fill("What does my spleen do?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("status").filter({ hasText: "I don't have verified information about that in my health guide yet" })).toBeVisible();
  await expect(page.getByText("Urgent medical attention")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /When did the pain start\?/ })).toBeVisible();
});
