import { expect, test } from "@playwright/test";

// After one visit online, the core of the service keeps working with no
// network: emergency help, Reception's safety check, and the text-only
// consultation (all rules run in the browser). Nothing typed is cached.
test("offline: emergency, Reception and the text consultation still work", async ({ page, context }) => {
  test.setTimeout(120000);
  await page.goto("/");
  // Wait until the service worker has saved the core pages.
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker?.ready;
    if (!reg) return false;
    const keys = await caches.keys();
    for (const k of keys) {
      const c = await caches.open(k);
      if ((await c.match("/ai-hospital/reception")) && (await c.match("/ai-hospital/departments/general-medicine/room"))) return true;
    }
    return false;
  }, undefined, { timeout: 60000, polling: 1000 });

  await context.setOffline(true);

  await page.goto("/ai-hospital/emergency");
  await expect(page.getByRole("link", { name: /108/ }).first()).toBeVisible();

  await page.goto("/ai-hospital/reception");
  await page.getByLabel("What is the problem?").fill("my chest is paining and I can't breathe");
  await page.getByRole("button", { name: "Continue →" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();

  await page.goto("/ai-hospital/departments/general-medicine/room?view=text");
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await page.getByRole("textbox", { name: "Your answer" }).fill("I have had a cough for three weeks");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("button", { name: /None of these — continue/ })).toBeVisible();

  // Nothing the patient typed was stored by the service worker.
  const leaked = await page.evaluate(async () => {
    for (const k of await caches.keys()) {
      const c = await caches.open(k);
      for (const r of await c.keys()) if (/cough|chest|paining/i.test(decodeURIComponent(r.url))) return r.url;
    }
    return null;
  });
  expect(leaked).toBeNull();
  await context.setOffline(false);
});
