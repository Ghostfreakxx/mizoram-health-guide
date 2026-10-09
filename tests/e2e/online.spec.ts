import { type Page, type Request, expect, test } from "@playwright/test";

// VD5: optional online help understanding an answer. The site's
// /api/understand is replaced by a stand-in (no key, no real model): these
// tests check the room's side of the contract — asked only after the
// patient agrees, nothing recorded until they confirm, emergencies never
// wait for it, and failures carry on quietly. Synthetic patient only.

test.use({ serviceWorkers: "block" });

const ROOM = "/ai-hospital/departments/general-medicine/room?view=text";
const box = (page: Page) => page.getByRole("textbox", { name: /Your answer|Or answer in your own words/ }).first();
const question = (page: Page) => page.locator("#consult-question");
async function say(page: Page, words: string) {
  await box(page).fill(words);
  await page.getByRole("button", { name: "Send" }).first().click();
}

// The stand-in: switched on, and answers with `reply` (or fails).
async function online(page: Page, reply: { answer: string[]; certain: boolean } | "fail" | "off") {
  const sent: Record<string, unknown>[] = [];
  await page.route("**/api/understand", async (route, req: Request) => {
    if (req.method() === "GET") return route.fulfill({ json: { available: reply !== "off" } });
    sent.push(req.postDataJSON());
    if (reply === "fail" || reply === "off") return route.fulfill({ status: 502, json: { answer: [], certain: false, status: "failed" } });
    return route.fulfill({ json: { ...reply, status: "ok" } });
  });
  return sent;
}

async function toDuration(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(ROOM);
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await say(page, "I have a cough");
  await expect(question(page)).toContainText(/how long|When did/i);
}

test("asked only after agreeing; the patient confirms the suggestion; only the question and the words are sent", async ({ page }) => {
  const sent = await online(page, { answer: ["1-3-days"], certain: true });
  await toDuration(page);
  await say(page, "zing khat ah a tan, call me 9876543210");
  // The device could not understand it: the doctor offers online help — nothing sent yet.
  await expect(page.getByText("Use online help to understand your words?")).toBeVisible();
  expect(sent).toHaveLength(0);
  await page.getByRole("button", { name: "Yes, use online help" }).click();
  await expect(page.getByText("I think you mean:")).toBeVisible();
  await expect(page.getByRole("group", { name: "I think you mean:" })).toContainText("1 to 3 days");
  expect(sent).toHaveLength(1);
  expect(Object.keys(sent[0]).sort()).toEqual(["kind", "options", "question", "step", "v", "words"]);
  expect(sent[0].step).toBe("duration");
  expect(sent[0].words).toBe("zing khat ah a tan, call me [number]");
  expect(JSON.stringify(sent[0])).not.toContain("cough"); // no earlier answers
  // Nothing recorded until confirmed.
  await expect(question(page)).toContainText(/how long|When did/i);
  await page.getByRole("button", { name: "Yes, that's right" }).click();
  await expect(question(page)).not.toContainText(/how long|When did/i);
  await expect(page.locator("#my-visit")).toContainText("1 to 3 days");
});

test("'No, I'll choose' records nothing; 'No, thanks' means it is never used this visit", async ({ page }) => {
  const sent = await online(page, { answer: ["today"], certain: true });
  await toDuration(page);
  await say(page, "zing khat ah a tan");
  await page.getByRole("button", { name: "No, thanks" }).click();
  await say(page, "a tan ni hnih");
  await say(page, "hre lo mai");
  await expect(page.getByText("Use online help to understand your words?")).toHaveCount(0);
  expect(sent).toHaveLength(0);
  // Turned on later in Settings: the suggestion can still be turned down.
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: /Online help with my words/ }).click();
  await page.getByRole("button", { name: "Close" }).click();
  await say(page, "zing khat ah a tan");
  await expect(page.getByText("I think you mean:")).toBeVisible();
  await page.getByRole("button", { name: "No, I'll choose" }).click();
  await expect(page.getByText("I think you mean:")).toHaveCount(0);
  await expect(question(page)).toContainText(/how long|When did/i);
  expect(sent).toHaveLength(1);
});

test("emergency words never wait for (or reach) the network", async ({ page }) => {
  const sent = await online(page, { answer: ["today"], certain: true });
  await toDuration(page);
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: /Online help with my words/ }).click();
  await page.getByRole("button", { name: "Close" }).click();
  await say(page, "my chest feels crushed and I can't breathe");
  await expect(page.getByRole("region", { name: /Emergency/ })).toBeVisible();
  expect(sent).toHaveLength(0);
});

test("when online help fails, the consultation carries on by itself", async ({ page }) => {
  const sent = await online(page, "fail");
  await toDuration(page);
  await say(page, "zing khat ah a tan");
  await page.getByRole("button", { name: "Yes, use online help" }).click();
  await expect(page.getByRole("status").filter({ hasText: "I'm still not sure what you meant" })).toBeVisible();
  await expect(page.getByText("I think you mean:")).toHaveCount(0);
  expect(sent).toHaveLength(1);
  await page.getByRole("button", { name: "1 to 3 days" }).click();
  await expect(question(page)).not.toContainText(/how long|When did/i);
});

test("switched off on the site (the default): never offered", async ({ page }) => {
  await toDuration(page);
  await say(page, "zing khat ah a tan");
  await expect(page.getByRole("status").filter({ hasText: /didn't quite understand/ })).toBeVisible();
  await expect(page.getByText("Use online help to understand your words?")).toHaveCount(0);
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("button", { name: /Online help with my words/ })).toHaveCount(0);
});
