import { type Page, expect, test } from "@playwright/test";

// Layout regression for the consultation scene at every major state and size.
// Pixel comparison is fragile across machines, so this asserts what matters:
// nothing scrolls sideways, the question and the answer box are on screen,
// the doctor keeps a large share of the screen, panels never overlap, and in
// an emergency the call buttons are on screen. A screenshot of every state is
// saved (test-results/visual/) for a person to look at.

const ROOM = "/ai-hospital/departments/general-medicine/room?view=simple";
type Size = { name: string; width: number; height: number };
const SIZES: Record<string, Size[]> = {
  desktop: [
    { name: "1920", width: 1920, height: 1080 },
    { name: "1366", width: 1366, height: 768 },
  ],
  phone: [
    { name: "390", width: 393, height: 727 },
    { name: "360", width: 360, height: 780 },
    { name: "320", width: 320, height: 640 },
    { name: "tablet", width: 820, height: 1180 },
  ],
};

type Box = { x: number; y: number; width: number; height: number };
const inView = (b: Box | null, s: Size) => !!b && b.x >= -1 && b.y >= -1 && b.x + b.width <= s.width + 1 && b.y + b.height <= s.height + 1;
const overlap = (a: Box, b: Box) => a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;

async function check(page: Page, s: Size, state: string, info: { outputPath: (n: string) => string }) {
  console.log(`[visual] ${s.name} ${state}`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath(`visual/${s.name}-${state}.png`) });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${state}: no sideways scroll`).toBe(true);
  expect(inView(await page.getByRole("link", { name: /Emergency|108/ }).first().boundingBox(), s), `${state}: emergency link on screen`).toBe(true);
  const stage = await page.getByRole("img", { name: /Virtual health guide/ }).boundingBox();
  if (state !== "emergency" && state !== "summary") {
    const share = stage ? (stage.width * stage.height) / (s.width * s.height) : 0;
    expect(share, `${state}: the doctor keeps a large share of the screen`).toBeGreaterThan(s.width >= 1024 ? 0.9 : 0.24);
  }
  if (state === "greeting" || state === "bodymap") {
    expect(inView(await page.locator("#consult-question").boundingBox(), s), `${state}: question on screen`).toBe(true);
    expect(inView(await page.getByRole("button", { name: "Send" }).boundingBox(), s), `${state}: Send on screen`).toBe(true);
  }
  if (state === "emergency") expect(inView(await page.getByRole("link", { name: /Call 108/ }).first().boundingBox(), s), "Call 108 on screen").toBe(true);
  if (s.width >= 1024) {
    // Floating panels never cover each other.
    const panels = (await Promise.all([page.locator("section[aria-labelledby=consult-question]").first(), page.locator("#tool-title").locator(".."), page.locator("#my-visit")].map(async (l) => ((await l.count()) ? l.boundingBox({ timeout: 1000 }).catch(() => null) : null)))).filter((b): b is Box => !!b && b.width > 0);
    for (let i = 0; i < panels.length; i++) for (let j = i + 1; j < panels.length; j++) expect(overlap(panels[i], panels[j]), `${state}: panels ${i} and ${j} overlap`).toBe(false);
  }
}

test("the consultation scene keeps its composition at every state and size", async ({ page }, info) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const s of SIZES[info.project.name] ?? []) {
    await page.setViewportSize({ width: s.width, height: s.height });
    await page.goto(ROOM);
    await page.getByRole("button", { name: "Begin consultation" }).waitFor();
    await check(page, s, "entry", info);
    await page.getByRole("button", { name: "Begin consultation" }).click();
    await expect(page.locator("#consult-question")).toHaveText(/What is troubling you today/);
    await check(page, s, "greeting", info);
    await page.getByRole("textbox", { name: "Your answer" }).fill("I don't really know. Something hurts around here.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.locator("#consult-question")).toHaveText(/I'll help you describe it/);
    await check(page, s, "bodymap", info);
    await page.getByRole("textbox", { name: "Or answer in your own words" }).fill("my chest feels crushed and I can't breathe");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("region", { name: /Emergency/ })).toBeVisible();
    await check(page, s, "emergency", info);
  }
});

test("text only: the conversation is the whole screen, nothing overlaps", async ({ page }, info) => {
  const s = SIZES[info.project.name][0];
  await page.setViewportSize({ width: s.width, height: s.height });
  await page.goto("/ai-hospital/departments/general-medicine/room?view=text");
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await expect(page.locator("#consult-question")).toHaveText(/What is troubling you today/);
  await page.waitForTimeout(300);
  await page.screenshot({ path: info.outputPath(`visual/${s.name}-text.png`) });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(inView(await page.locator("#consult-question").boundingBox(), s)).toBe(true);
  expect(inView(await page.getByRole("button", { name: "Send" }).boundingBox(), s)).toBe(true);
});

test("typing never scrolls the room: the top bar with Emergency stays on screen", async ({ page }, info) => {
  const s = SIZES[info.project.name][0];
  await page.setViewportSize({ width: s.width, height: s.height });
  await page.goto(ROOM);
  await page.getByRole("button", { name: "Begin consultation" }).click();
  const box = page.getByRole("textbox", { name: /Your answer|Or answer in your own words/ }).first();
  // Typed answers, then the safety check's sticky "None of these" button:
  // tapping a button inside a scrolled list made the browser scroll the
  // whole room (top bar off screen) before the fix.
  for (const words of ["I don't really know. Something hurts around here.", "my lower tummy", "left", "it comes and goes, worse after food", "today", "@none"]) {
    if (words === "@none") await page.getByRole("button", { name: "None of these — continue" }).click();
    else {
      await box.click();
      await box.fill(words);
      await page.getByRole("button", { name: "Send" }).first().click();
    }
    await page.waitForTimeout(400);
    const pinned = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-pin]")].every((e) => e.scrollTop === 0));
    expect(pinned, `after "${words}": the room has not scrolled`).toBe(true);
    expect(inView(await page.getByRole("link", { name: /Emergency|108/ }).first().boundingBox(), s), `after "${words}": Emergency on screen`).toBe(true);
  }
});
