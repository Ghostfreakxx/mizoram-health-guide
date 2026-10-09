import { type Page, expect, test } from "@playwright/test";

// The doctor's natural voice in the real room. /api/voice is replaced by a
// stand-in that returns a short silent WAV (no key, no OpenAI): these tests
// check what the room sends, when, and what happens on failure. Synthetic
// patient only.

test.use({ serviceWorkers: "block" });

const ROOM = "/ai-hospital/departments/general-medicine/room?view=simple";
const box = (page: Page) => page.getByRole("textbox", { name: /Your answer|Or answer in your own words/ }).first();

function silentWav(seconds = 0.4, rate = 8000) {
  const n = Math.round(seconds * rate);
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 2, 40);
  return b;
}

type Sent = { text: string; tone: string; slow: boolean };
async function voiceServer(page: Page, mode: "ok" | "fail" | "off" = "ok") {
  const sent: Sent[] = [];
  await page.route("**/api/voice", async (route, req) => {
    if (req.method() === "GET") return route.fulfill({ json: { available: mode !== "off" } });
    sent.push(req.postDataJSON());
    if (mode !== "ok") return route.fulfill({ status: 502, json: { status: "failed" } });
    return route.fulfill({ body: silentWav(), contentType: "audio/wav" });
  });
  return sent;
}

test("the doctor speaks in the natural voice: only her sentences are sent, the emergency line is ready, the patient's words never leave", async ({ page }) => {
  const sent = await voiceServer(page);
  await page.goto(ROOM);
  await expect(page.getByRole("combobox", { name: "Doctor's voice" })).toHaveValue("natural");
  await expect(page.getByText(/natural voice is made online by OpenAI/).first()).toBeVisible();
  await page.getByRole("button", { name: "Begin consultation" }).click();
  // The greeting is spoken with the natural voice, and the emergency line is fetched ahead.
  await expect.poll(() => sent.length).toBeGreaterThan(1);
  await expect.poll(() => sent.some((s) => s.tone === "urgent" && /Call 108 or 112 now/.test(s.text))).toBe(true);
  await expect.poll(() => sent.filter((s) => s.tone === "calm").map((s) => s.text)).toContain("What is troubling you today?");
  // The patient's own words are never part of what is sent.
  const words = "zebra purple marble ache since Tuesday";
  await box(page).fill(words);
  await page.getByRole("button", { name: "Send" }).first().click();
  await page.waitForTimeout(1500);
  await box(page).fill("say that again, zebra purple marble ache since Tuesday?");
  await page.getByRole("button", { name: "Send" }).first().click();
  await page.waitForTimeout(1500);
  expect(sent.length).toBeGreaterThan(2);
  for (const s of sent) expect(s.text).not.toMatch(/zebra|purple|marble/i);
  // Choosing the device's voice: nothing more is sent.
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("combobox", { name: "Doctor's voice" }).selectOption("device");
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(300);
  const before = sent.length;
  await page.getByRole("button", { name: "Repeat" }).click();
  await page.waitForTimeout(800);
  expect(sent.length).toBe(before);
});

test("an emergency is said at once and opens Emergency Mode, whatever the network does", async ({ page }) => {
  const sent = await voiceServer(page);
  await page.goto(ROOM);
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await box(page).fill("my chest feels crushed and I can't breathe");
  await page.getByRole("button", { name: "Send" }).first().click();
  await expect(page.getByRole("region", { name: /Emergency/ })).toBeVisible();
  for (const s of sent) expect(s.text).not.toMatch(/crushed|breathe/i);
});

test("when the natural voice keeps failing, the device's voice takes over and the patient is told", async ({ page }) => {
  await voiceServer(page, "fail");
  await page.goto(ROOM);
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await expect(page.getByRole("status").filter({ hasText: "The natural voice isn't working right now" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#consult-question")).toBeVisible();
});

test("no natural voice on the site (the default): no choice shown, nothing sent", async ({ page }) => {
  const sent = await voiceServer(page, "off");
  await page.goto(ROOM);
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await expect(page.locator("#consult-question")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Doctor's voice" })).toHaveCount(0);
  await page.waitForTimeout(800);
  expect(sent).toHaveLength(0);
});
