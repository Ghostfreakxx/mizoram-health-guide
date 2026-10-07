import { type Locator, type Page, expect, test } from "@playwright/test";

// Voice timing, measured rather than eyeballed. Headless browsers have no
// voices, so the page gets an instrumented speech engine: an on-device
// voice that "speaks" at roughly a real voice's pace (start after 30 ms,
// word boundaries, end after ~45 ms per character) and records the time of
// every speak and cancel. A fake recogniser stands in for the microphone.
// Every measurement is taken inside the page with performance.now().
// Synthetic consultation text only.

type Ev = { t: number; kind: "speak" | "start" | "end" | "cancel"; text?: string };

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const log: { t: number; kind: string; text?: string }[] = [];
    (window as unknown as { __tts: typeof log }).__tts = log;
    const now = () => performance.now();
    type U = {
      text: string;
      rate: number;
      onstart?: () => void;
      onend?: () => void;
      onerror?: (e: { error: string }) => void;
      onboundary?: (e: { name: string; charIndex: number }) => void;
    };
    let current: { u: U; timers: ReturnType<typeof setTimeout>[] } | null = null;
    class Utterance {
      text: string;
      rate = 1;
      pitch = 1;
      lang = "";
      voice: unknown = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    const voice = { name: "Test voice", lang: "en-IN", localService: true, default: true, voiceURI: "test" };
    const synth = {
      speaking: false,
      getVoices: () => [voice],
      addEventListener: () => {},
      speak(u: U) {
        log.push({ t: now(), kind: "speak", text: u.text });
        const timers: ReturnType<typeof setTimeout>[] = [];
        current = { u, timers };
        const per = 45 / (u.rate || 1);
        timers.push(
          setTimeout(() => {
            log.push({ t: now(), kind: "start", text: u.text });
            synth.speaking = true;
            u.onstart?.();
          }, 30),
        );
        let i = 0;
        for (const w of u.text.split(" ")) {
          const at = i;
          timers.push(setTimeout(() => u.onboundary?.({ name: "word", charIndex: at }), 30 + at * per));
          i += w.length + 1;
        }
        timers.push(
          setTimeout(() => {
            log.push({ t: now(), kind: "end", text: u.text });
            synth.speaking = false;
            current = null;
            u.onend?.();
          }, 30 + u.text.length * per),
        );
      },
      cancel() {
        log.push({ t: now(), kind: "cancel" });
        const c = current;
        current = null;
        synth.speaking = false;
        if (c) {
          c.timers.forEach(clearTimeout);
          c.u.onerror?.({ error: "interrupted" });
        }
      },
      pause() {},
      resume() {},
    };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance, configurable: true });
    class Recogniser {
      lang = "";
      interimResults = false;
      continuous = false;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          const r = Object.assign([{ transcript: "I have a headache", confidence: 0.95 }], { isFinal: true });
          this.onresult?.({ results: [r] });
          this.onend?.();
        }, 300);
      }
      stop() {}
      abort() {}
    }
    Object.defineProperty(window, "SpeechRecognition", { value: Recogniser, configurable: true });
  });
}

const events = (page: Page) => page.evaluate(() => (window as unknown as { __tts: Ev[] }).__tts.slice());
const clear = (page: Page) => page.evaluate(() => ((window as unknown as { __tts: Ev[] }).__tts.length = 0));
const speakingNow = (page: Page) => page.evaluate(() => (window.speechSynthesis as unknown as { speaking: boolean }).speaking);

// Clicks inside the page and returns the click time on the page's clock.
const clickAt = (target: Locator) =>
  target.evaluate((el: HTMLElement) => {
    const t = performance.now();
    el.click();
    return t;
  });

async function begin(page: Page) {
  await page.goto("/ai-hospital/departments/general-medicine/room?view=text");
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await expect(page.locator("#consult-question")).toHaveText(/What is troubling you today/);
}

async function waitSpeaking(page: Page) {
  await expect.poll(() => speakingNow(page), { timeout: 5000 }).toBe(true);
}

test.describe("voice timing (instrumented speech engine)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "measured in Chromium");

  test("the doctor answers promptly, and Stop, typing, Talk and an emergency cut her off at once", async ({ page }) => {
    test.setTimeout(90_000);
    await instrument(page);
    await begin(page);
    const report: Record<string, number> = {};

    // Greeting is spoken.
    await waitSpeaking(page);
    const greet = (await events(page)).find((e) => e.kind === "speak");
    expect(greet?.text).toMatch(/Hello/);

    // Stop → speech cancelled, status back to the patient.
    let t0 = await clickAt(page.getByRole("button", { name: "Stop" }));
    let ev = await events(page);
    let cut = ev.find((e) => e.kind === "cancel" && e.t >= t0);
    expect(cut, "Stop cancels speech").toBeTruthy();
    report["stop → speech cancelled (ms)"] = cut!.t - t0;
    expect(await speakingNow(page)).toBe(false);
    await expect(page.getByText("Speaking", { exact: true })).toHaveCount(0);

    // Send → the doctor starts to speak (includes her short "thinking" pause).
    await clear(page);
    await page.getByRole("textbox", { name: "Your answer" }).fill("I have had a cough for three weeks");
    t0 = await clickAt(page.getByRole("button", { name: "Send" }));
    await waitSpeaking(page);
    ev = await events(page);
    report["send → doctor starts speaking (ms)"] = ev.find((e) => e.kind === "start")!.t - t0;
    report["send → speech requested (ms)"] = ev.find((e) => e.kind === "speak")!.t - t0;

    // Each spoken piece is short: one sentence at a time.
    const longest = Math.max(...ev.filter((e) => e.kind === "speak").map((e) => e.text!.length));
    report["longest single utterance (chars)"] = longest;

    // Typing while she speaks → she stops.
    await waitSpeaking(page);
    await clear(page);
    t0 = await page.evaluate(() => performance.now());
    await page.locator("#consult-text").pressSequentially("w");
    ev = await events(page);
    cut = ev.find((e) => e.kind === "cancel");
    expect(cut, "typing cancels speech").toBeTruthy();
    report["typing → speech cancelled (ms, includes key dispatch)"] = cut!.t - t0;
    expect(await speakingNow(page)).toBe(false);
    await page.locator("#consult-text").fill("");

    // Repeat → she says the question again; Talk while speaking → she stops.
    await page.getByRole("button", { name: "Repeat" }).click();
    await waitSpeaking(page);
    await clear(page);
    t0 = await clickAt(page.getByRole("button", { name: "Talk" }));
    ev = await events(page);
    cut = ev.find((e) => e.kind === "cancel" && e.t >= t0);
    expect(cut, "Talk cancels speech").toBeTruthy();
    report["talk → speech cancelled (ms)"] = cut!.t - t0;
    expect(await speakingNow(page)).toBe(false);

    // Emergency words while she speaks → she stops, and the emergency line is
    // the very next thing she says, without a thinking pause.
    await page.getByRole("button", { name: "No, I'll type" }).click();
    await page.getByRole("button", { name: "Repeat" }).click();
    await waitSpeaking(page);
    await page.locator("#consult-text").fill("my chest feels crushed and I can't breathe");
    await clear(page);
    t0 = await clickAt(page.getByRole("button", { name: "Send" }));
    await expect(page.getByRole("region", { name: /Emergency/ })).toBeVisible();
    await expect.poll(async () => (await events(page)).some((e) => e.kind === "speak"), { timeout: 5000 }).toBe(true);
    ev = await events(page);
    const first = ev.find((e) => e.kind === "speak")!;
    report["emergency → emergency words spoken (ms)"] = first.t - t0;
    expect(first.t - t0, "no thinking pause before the emergency line").toBeLessThan(400);

    for (const [k, v] of Object.entries(report)) console.log(`[voice] ${k}: ${Math.round(v)}`);
    expect(report["stop → speech cancelled (ms)"]).toBeLessThan(100);
    expect(report["talk → speech cancelled (ms)"]).toBeLessThan(100);
    expect(report["send → doctor starts speaking (ms)"]).toBeLessThan(1000);
    expect(report["longest single utterance (chars)"]).toBeLessThan(240);
  });

  test("Talk fills the answer box for the patient to check; speech is never sent by itself", async ({ page }) => {
    await instrument(page);
    await begin(page);
    await page.getByRole("button", { name: "Stop" }).click();
    await page.getByRole("button", { name: /Talk/ }).click();
    await page.getByRole("button", { name: /I agree/ }).click();
    await expect(page.locator("#consult-text")).toHaveValue("I have a headache", { timeout: 5000 });
    await expect(page.locator("#consult-question")).toHaveText(/What is troubling you today/);
  });
});
