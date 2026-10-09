import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { converse, nextTurn, respond, startConsultation } from "../../app/lib/consultation";
import { patientTexts, patientWordsIn, toneFor, validateVoiceRequest } from "../../app/lib/doctorVoice";
import { DEFAULT_TTS_MODEL, DEFAULT_TTS_VOICE, INSTRUCTIONS, type SpeechClient, speechFor, ttsConfigFromEnv } from "../../app/api/voice/tts";
import { naturalSpeech } from "../../app/ai-hospital/consult-room/naturalVoice";
import type { SpeechOutput } from "../../app/ai-hospital/consult-room/voice";
import { LipSync } from "../../app/ai-hospital/consult-room/doctor/lipsync";
import { violatesLanguagePolicy } from "../../app/lib/safety/language";

// The doctor's natural voice (OpenAI text-to-speech through /api/voice).
// Synthetic patients only; the network, the model and the audio are fakes.

const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms));

describe("what may be sent: the doctor's sentences, never the patient's words", () => {
  const said = ["I took paracetamol yesterday for the pain", "my name is Lalremruati Sailo", "zebra"];
  it("a sentence that repeats the patient's words is caught", () => {
    expect(patientWordsIn("Sorry — you did tell me: “I took paracetamol yesterday for the pain”. I've noted it.", said)).toBe(true);
    expect(patientWordsIn("You said “my name is Lalremruati Sailo”.", said)).toBe(true);
    expect(patientWordsIn("Earlier: I took paracetamol yesterday, you said.", said)).toBe(true); // four words in a row
  });
  it("the doctor's own words are not (even when they name a symptom the patient mentioned)", () => {
    expect(patientWordsIn("I've noted paracetamol under your medicines.", said)).toBe(false);
    expect(patientWordsIn("You mentioned a headache. Is it severe?", ["I have had a headache and fever for three days"])).toBe(false);
    expect(patientWordsIn("When did this start?", said)).toBe(false);
    // A one-word message is not matched inside other words.
    expect(patientWordsIn("Is it a zebra crossing?", ["zebra"])).toBe(false);
  });
  it("every free-text field the patient filled is checked", () => {
    let s = respond(startConsultation("General Medicine"), "concern", "sharp pain near my left kidney since Tuesday");
    const o = converse(s, nextTurn(s), "my neighbour Mr Lalthanga said it is stones");
    if ("state" in o) s = o.state;
    const texts = patientTexts(s);
    expect(texts).toContain("sharp pain near my left kidney since Tuesday");
    expect(texts.some((t) => t.includes("Lalthanga"))).toBe(true);
  });
  it("tone follows the doctor's state", () => {
    expect(toneFor("emergency")).toBe("urgent");
    expect(toneFor("concerned")).toBe("serious");
    expect(toneFor("asking")).toBe("calm");
  });
  it("the server accepts only one short sentence, a known tone and a pace", () => {
    expect(validateVoiceRequest({ v: 1, text: "  When did this start?  ", tone: "calm", slow: false })).toEqual({ v: 1, text: "When did this start?", tone: "calm", slow: false });
    expect(validateVoiceRequest({ v: 1, text: "x".repeat(501), tone: "calm", slow: false })).toBeNull();
    expect(validateVoiceRequest({ v: 1, text: "Hi", tone: "angry", slow: false })).toBeNull();
    expect(validateVoiceRequest({ v: 1, text: "Hi\u0007", tone: "calm", slow: false })).toBeNull();
    expect(validateVoiceRequest({ v: 1, text: "", tone: "calm", slow: false })).toBeNull();
    expect(validateVoiceRequest({ text: "Hi", tone: "calm", slow: false })).toBeNull();
    expect(validateVoiceRequest(null)).toBeNull();
  });
  it("how she sounds is fixed on the server, one instruction per tone, and says nothing medical", () => {
    for (const t of ["calm", "serious", "urgent"] as const) {
      expect(INSTRUCTIONS[t]).toMatch(/Indian English/);
      expect(violatesLanguagePolicy(INSTRUCTIONS[t])).toBeNull();
    }
    expect(INSTRUCTIONS.urgent).toMatch(/one zero eight/);
  });
});

describe("the OpenAI call (server)", () => {
  const cfg = { key: "sk-test", model: DEFAULT_TTS_MODEL, voice: DEFAULT_TTS_VOICE, timeoutMs: 10_000 };
  const fake = (impl: () => Promise<Response>) => {
    const create = vi.fn(impl);
    return { client: { audio: { speech: { create } } } as unknown as SpeechClient, create };
  };
  it("the sentence, the voice, the tone's instructions, MP3, and a slower pace when asked", async () => {
    const { client, create } = fake(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "audio/mpeg" } }));
    const r = await speechFor(client, { v: 1, text: "Call 108 now.", tone: "urgent", slow: true }, cfg);
    expect(r?.ok).toBe(true);
    expect(create.mock.calls[0]).toEqual([{ model: "gpt-4o-mini-tts", voice: "marin", input: "Call 108 now.", instructions: INSTRUCTIONS.urgent, response_format: "mp3", speed: 0.88 }]);
  });
  it("older models get no instructions; any error means 'no audio'", async () => {
    const { client, create } = fake(async () => new Response(new Uint8Array([1])));
    await speechFor(client, { v: 1, text: "Hello.", tone: "calm", slow: false }, { ...cfg, model: "tts-1-hd" });
    expect(create.mock.calls[0][0 as never]).not.toHaveProperty("instructions");
    expect(await speechFor(fake(async () => Promise.reject(new Error("401"))).client, { v: 1, text: "Hello.", tone: "calm", slow: false }, cfg)).toBeNull();
  });
  it("on when the key is set; DOCTOR_VOICE=off switches it off; model and voice can be chosen", () => {
    expect(ttsConfigFromEnv({})).toBeNull();
    expect(ttsConfigFromEnv({ OPENAI_API_KEY: " " })).toBeNull();
    expect(ttsConfigFromEnv({ OPENAI_API_KEY: "sk-test", DOCTOR_VOICE: "off" })).toBeNull();
    expect(ttsConfigFromEnv({ OPENAI_API_KEY: "sk-test" })).toMatchObject({ model: "gpt-4o-mini-tts", voice: "marin" });
    expect(ttsConfigFromEnv({ OPENAI_API_KEY: "sk-test", OPENAI_TTS_MODEL: "tts-1-hd", OPENAI_TTS_VOICE: "coral" })).toMatchObject({ model: "tts-1-hd", voice: "coral" });
  });
});

// The route, with the OpenAI SDK replaced by a fake class.
const sdk = vi.hoisted(() => ({ calls: [] as unknown[], fail: false }));
vi.mock("openai", () => ({
  default: class {
    audio = {
      speech: {
        create: async (body: unknown) => {
          sdk.calls.push(body);
          if (sdk.fail) throw new Error("quota");
          return new Response(new Uint8Array([73, 68, 51]), { headers: { "content-type": "audio/mpeg" } });
        },
      },
    };
  },
}));

describe("/api/voice", () => {
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    new Request("http://localhost/api/voice", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.1.0.1", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
  const ok = { v: 1, text: "When did this start?", tone: "calm", slow: false };
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-not-real");
    vi.stubEnv("DOCTOR_VOICE", "");
    sdk.calls.length = 0;
    sdk.fail = false;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("GET says whether a natural voice is set up (no patient data)", async () => {
    const { GET } = await import("../../app/api/voice/route");
    expect(await (await GET()).json()).toEqual({ available: true });
    vi.stubEnv("OPENAI_API_KEY", "");
    const off = await GET();
    expect(await off.json()).toEqual({ available: false });
    expect(off.headers.get("cache-control")).toBe("no-store");
  });
  it("POST: MP3 audio for one sentence, not cached; 503 without a key; 502 when OpenAI fails", async () => {
    const { POST } = await import("../../app/api/voice/route");
    const r = await POST(post(ok));
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("audio/mpeg");
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(new Uint8Array([73, 68, 51]));
    expect(sdk.calls).toHaveLength(1);
    sdk.fail = true;
    expect((await POST(post(ok, { "x-forwarded-for": "10.1.0.2" }))).status).toBe(502);
    vi.stubEnv("OPENAI_API_KEY", "");
    expect((await POST(post(ok))).status).toBe(503);
  });
  it("POST: refuses other sites, other shapes and other sizes — without calling OpenAI", async () => {
    const { POST } = await import("../../app/api/voice/route");
    const h = { "x-forwarded-for": "10.1.0.3" };
    expect((await POST(post(ok, { ...h, "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await POST(post("{", h))).status).toBe(400);
    expect((await POST(post({ ...ok, tone: "shout" }, h))).status).toBe(400);
    expect((await POST(post({ ...ok, text: "x".repeat(3000) }, h))).status).toBe(413);
    expect((await POST(new Request("http://localhost/api/voice", { method: "POST", body: "{}", headers: { "content-type": "text/plain" } }))).status).toBe(415);
    expect(sdk.calls).toHaveLength(0);
  });
  it("POST: a limit per address protects the key", async () => {
    const { POST } = await import("../../app/api/voice/route");
    const codes: number[] = [];
    for (let i = 0; i < 122; i++) codes.push((await POST(post(ok, { "x-forwarded-for": "10.1.0.9" }))).status);
    expect(codes.slice(0, 120).every((c) => c === 200)).toBe(true);
    expect(codes.slice(120)).toEqual([429, 429]);
  });
});

// ---------------- The room's player, with fake audio and network ----------------

class FakeSource {
  buffer: { duration: number } | null = null;
  onended: (() => void) | null = null;
  started = false;
  connect() {}
  start() {
    this.started = true;
    setTimeout(() => this.onended?.(), 30);
  }
  stop() {
    this.onended?.();
  }
}
class FakeCtx {
  state = "running";
  destination = {};
  sources: FakeSource[] = [];
  static last: FakeCtx | null = null;
  constructor() {
    FakeCtx.last = this;
  }
  async resume() {
    this.state = "running";
  }
  async suspend() {
    this.state = "suspended";
  }
  async decodeAudioData() {
    return { duration: 1.25 };
  }
  createBufferSource() {
    const s = new FakeSource();
    this.sources.push(s);
    return s;
  }
}

function device() {
  const spoken: string[] = [];
  const out: SpeechOutput = {
    available: true,
    speak: (text, h) => {
      spoken.push(text);
      h?.onStart?.();
      h?.onEnd?.();
    },
    stop: () => {},
    pause: () => {},
    resume: () => {},
  };
  return { out, spoken };
}

describe("the natural voice in the room", () => {
  let fetches: { url: string; body: unknown }[];
  let respond: () => Promise<Response>;
  beforeEach(() => {
    fetches = [];
    respond = async () => new Response(new Uint8Array([1, 2, 3]));
    vi.stubGlobal("window", { AudioContext: FakeCtx });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        fetches.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
        return respond();
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const make = (texts: string[] = []) => {
    const d = device();
    const gaveUp = vi.fn();
    const v = naturalSpeech(d.out, { patientTexts: () => texts, onGiveUp: gaveUp });
    v.unlock();
    v.enabled = true;
    return { v, d, gaveUp };
  };
  const events = () => {
    const e: string[] = [];
    return { e, h: { onStart: () => e.push("start"), onEnd: () => e.push("end"), onDuration: (s: number) => e.push(`duration ${s}`) } };
  };

  it("off (no key on the site, or the patient chose the device): the device speaks, nothing is sent", async () => {
    const { v, d } = make();
    v.enabled = false;
    v.speak("When did this start?");
    await tick();
    expect(d.spoken).toEqual(["When did this start?"]);
    expect(fetches).toHaveLength(0);
  });
  it("on: only the sentence, its tone and pace go to this site's /api/voice; the audio plays with its length for lip sync", async () => {
    const { v, d } = make();
    const { e, h } = events();
    v.speak("When did this start?", h, 0.92, { tone: "calm" });
    await tick(60);
    expect(fetches).toEqual([{ url: "/api/voice", body: { v: 1, text: "When did this start?", tone: "calm", slow: false } }]);
    expect(e).toEqual(["start", "duration 1.25", "end"]);
    expect(d.spoken).toEqual([]);
    // Said again (Repeat): from memory, nothing sent.
    v.speak("When did this start?", undefined, 0.92, { tone: "calm" });
    await tick();
    expect(fetches).toHaveLength(1);
  });
  it("a sentence repeating the patient's words is said by the device — never sent, not even ahead of time", async () => {
    const { v, d } = make(["I took paracetamol yesterday for the pain"]);
    const line = "Sorry — you did tell me: “I took paracetamol yesterday for the pain”.";
    v.prefetch([line]);
    v.speak(line);
    await tick();
    expect(fetches).toHaveLength(0);
    expect(d.spoken).toEqual([line]);
  });
  it("an emergency never waits: the device says it at once unless the audio is ready", async () => {
    const { v, d } = make();
    const line = "Call 108 or 112 now, or go to the nearest hospital emergency department.";
    respond = () => new Promise((r) => setTimeout(() => r(new Response(new Uint8Array([1]))), 40));
    v.speak(line, undefined, 0.92, { tone: "urgent" });
    expect(d.spoken).toEqual([line]); // at once, before the network answers
    await tick(80);
    // Now ready (fetched in the background, as the room does when the visit begins): played at once.
    const { e, h } = events();
    v.speak(line, h, 0.92, { tone: "urgent" });
    expect(e.slice(0, 1)).toEqual(["start"]);
    expect(d.spoken).toHaveLength(1);
  });
  it("on failure the device speaks; after three failures in a row the natural voice stops for the visit", async () => {
    respond = async () => new Response("no", { status: 502 });
    const { v, d, gaveUp } = make();
    for (const t of ["One.", "Two.", "Three."]) {
      v.speak(t);
      await tick();
    }
    expect(d.spoken).toEqual(["One.", "Two.", "Three."]);
    expect(gaveUp).toHaveBeenCalledTimes(1);
    expect(v.enabled).toBe(false);
    v.speak("Four.");
    await tick();
    expect(fetches).toHaveLength(3);
  });
  it("Stop while the audio is on its way: nothing plays afterwards", async () => {
    respond = () => new Promise((r) => setTimeout(() => r(new Response(new Uint8Array([1]))), 30));
    const { v } = make();
    const { e, h } = events();
    v.speak("How long has it been?", h);
    v.stop();
    await tick(60);
    expect(e).toEqual([]);
    expect(FakeCtx.last?.sources.some((s) => s.started)).toBe(false);
  });
  it("sentences fetched ahead are not fetched twice", async () => {
    const { v } = make();
    v.prefetch(["Okay.", "When did this start?"], { tone: "calm", rate: 0.92 });
    await tick();
    v.speak("Okay.", undefined, 0.92, { tone: "calm" });
    v.speak("When did this start?", undefined, 0.92, { tone: "calm" });
    await tick();
    expect(fetches.map((f) => (f.body as { text: string }).text)).toEqual(["Okay.", "When did this start?"]);
  });
});

describe("lip sync follows the real length of the audio", () => {
  it("the mouth keeps moving until the generated audio ends", () => {
    const l = new LipSync();
    l.begin("Okay. When did this start?", 0, 1);
    expect(l.rhythm(2.6).speaking).toBe(false); // estimated: finished by now
    l.fit(3);
    expect(l.rhythm(2.6).speaking).toBe(true); // the real audio is 3 s long
    expect(l.rhythm(3.4).speaking).toBe(false);
  });
});
