import { type Page, expect, test } from "@playwright/test";

// 3D, voice and speech recognition are enhancements. Safety, the text
// consultation, the visit summary and navigation must work without them.

const ROOM = "/ai-hospital/departments/general-medicine/room";

async function noVoice(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    delete w.speechSynthesis;
    delete w.SpeechSynthesisUtterance;
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
  });
}

async function noWebGL(page: Page) {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    // test double: WebGL is unavailable on this "device"
    (HTMLCanvasElement.prototype as unknown as { getContext: (type: string, ...rest: unknown[]) => unknown }).getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (/webgl/i.test(type)) return null;
      return (orig as unknown as (...a: unknown[]) => unknown).call(this, type, ...rest);
    };
  });
}

async function answerUntilDone(page: Page) {
  for (let i = 0; i < 45; i++) {
    if (await page.getByRole("heading", { name: "📋 Patient-prepared visit summary" }).count()) return;
    if (await page.getByText("Urgent medical attention").count()) return;
    const options = [
      page.getByRole("button", { name: "No", exact: true }),
      page.getByRole("button", { name: "None of these — continue" }),
      page.getByRole("button", { name: "Myself" }),
      page.getByRole("button", { name: "18 to 59 years" }),
      page.getByRole("button", { name: "Female" }),
      page.getByRole("button", { name: "1 to 3 days" }),
      page.getByRole("button", { name: "About the same" }),
      page.getByRole("button", { name: /^Mild/ }),
      page.getByRole("button", { name: "Not measured" }),
      page.getByRole("button", { name: "Skip", exact: true }),
    ];
    let clicked = false;
    for (const o of options) {
      if (await o.count()) {
        await o.first().click();
        clicked = true;
        break;
      }
    }
    if (!clicked) await page.waitForTimeout(300);
  }
}

test("no voice and no speech recognition: the doctor speaks through subtitles; typing works end to end", async ({ page }) => {
  await noVoice(page);
  await page.goto(ROOM);
  await page.getByLabel("Display").selectOption("2d");
  await page.getByRole("button", { name: "Begin consultation" }).first().click();
  // Talk is unavailable with a plain reason; typing is offered.
  await expect(page.getByRole("button", { name: /Talk/ })).toBeDisabled();
  await page.getByRole("textbox", { name: "Your answer" }).fill("I have had a fever since yesterday");
  await page.getByRole("button", { name: "Send" }).click();
  await answerUntilDone(page);
  await expect(page.getByRole("heading", { name: "📋 Patient-prepared visit summary" })).toBeVisible({ timeout: 20000 });
});

test("no WebGL: the 2D doctor is used automatically and the consultation works", async ({ page }) => {
  await noWebGL(page);
  await page.goto(ROOM);
  await expect(page.getByRole("img", { name: /Virtual health guide/ })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Begin consultation" }).first().click();
  await page.getByRole("textbox", { name: "Your answer" }).fill("chest pain cant breath");
  await page.getByRole("button", { name: "Send" }).click();
  // Safety does not depend on graphics.
  await expect(page.getByText("Urgent medical attention")).toBeVisible();
  await expect(page.getByRole("link", { name: /108/ }).first()).toBeVisible();
});

test("Data Saver / slow connection: no 3D download; the 2D doctor and text consultation work", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", { value: { saveData: true, effectiveType: "2g" }, configurable: true });
  });
  const models: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/models/")) models.push(r.url());
  });
  await page.goto(ROOM);
  await page.getByRole("button", { name: "Begin consultation" }).first().click();
  await page.getByRole("textbox", { name: "Your answer" }).fill("idk");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: /That's okay\. Tell me what is bothering you most/ })).toBeVisible();
  expect(models).toEqual([]);
});

test("text only: the whole consultation is usable with no picture at all", async ({ page }) => {
  await noVoice(page);
  await page.goto(ROOM);
  await page.getByLabel("Display").selectOption("text");
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await expect(page.getByRole("img", { name: /Virtual health guide/ })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Your answer" }).fill("I took too many pills but I'm okay");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Urgent medical attention")).toBeVisible();
});
