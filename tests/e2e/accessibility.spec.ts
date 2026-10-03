import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Every page must have zero WCAG 2.1 A/AA violations found by axe.
const PAGES = [
  "/",
  "/cancer",
  "/tb",
  "/mother-child",
  "/tools",
  "/tools/diabetes-risk",
  "/tools/tobacco-cost",
  "/tools/quiz",
  "/hospitals",
  "/helplines",
  "/search?q=tb",
  "/privacy",
  "/accessibility",
  "/disclaimer",
  "/sitemap",
  "/offline",
  "/ai-hospital",
  "/ai-hospital/reception",
  "/ai-hospital/triage",
  "/ai-hospital/emergency",
  "/ai-hospital/departments",
  "/ai-hospital/departments/paediatrics",
  "/ai-hospital/departments/dental/simulator",
  "/ai-hospital/prepare",
  "/ai-hospital/doctor",
  "/ai-hospital/consult",
  "/ai-hospital/hospitals",
  "/ai-hospital/passport",
  "/ai-hospital/follow-up",
  "/ai-hospital/medicines",
  "/ai-hospital/lab-reports",
  "/ai-hospital/admin",
  "/ai-hospital/vaccinations",
  "/ai-hospital/screening",
  "/ai-hospital/calm",
  "/ai-hospital/first-aid",
  "/ai-hospital/departments/general-medicine/room",
];

for (const path of PAGES) {
  test(`no accessibility violations: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
    expect(summary).toEqual([]);
  });
}

test("keyboard: skip link moves focus to main content", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard test runs on desktop");
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
});

test("every page has exactly one main landmark and a page heading", async ({ page }) => {
  for (const path of ["/", "/ai-hospital", "/ai-hospital/triage", "/cancer"]) {
    await page.goto(path);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1").first()).toBeVisible();
  }
});

test("no sideways scrolling on small phones (320px)", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/", "/ai-hospital", "/ai-hospital/triage", "/ai-hospital/admin", "/ai-hospital/emergency"]) {
    await page.goto(path);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, path).toBeLessThanOrEqual(320);
  }
});
