// Lip sync checked against every line the doctor actually speaks: the
// director's plans for consultations through every room, the emergency, the
// result, and replies (why / what does that mean / health questions).

import { describe, expect, it } from "vitest";
import { LipSync, MAX_JAW, REST, type Viseme, segments, spokenForm, visemeAt } from "../../app/ai-hospital/consult-room/doctor/lipsync";
import { spokenLines } from "./spokenLines";

const LINES = spokenLines();
const activity = (v: Viseme) => v.jawOpen + v.lipsPart + v.mouthPress + v.mouthPucker + v.mouthFunnel;

describe("lip sync on every line the doctor speaks", () => {
  it("collects a real set of lines, including the emergency numbers", () => {
    expect(LINES.length).toBeGreaterThan(60);
    expect(LINES.some((l) => /108/.test(l) && /112/.test(l))).toBe(true);
  });

  it("every spoken word — numbers and symbols too — moves the mouth", () => {
    for (const line of LINES)
      for (const word of line.split(/\s+/).filter((w) => /[a-z0-9°%&]/i.test(w))) {
        expect(segments(word).length, `${word} in: ${line}`).toBeGreaterThan(0);
        const peak = Math.max(...Array.from({ length: 20 }, (_, i) => activity(visemeAt(word, (i / 20) * 0.5, 0.5))));
        expect(peak, `${word} in: ${line}`).toBeGreaterThan(0.05);
      }
  });

  it("shapes are finite and in range; the jaw never opens unnaturally wide", () => {
    const bad: string[] = [];
    for (const line of LINES) {
      const l = new LipSync();
      l.begin(line, 0);
      for (let f = 0; f < 60 * 30 && l.rhythm(f / 60).speaking; f++) {
        const v = l.visemeAt(f / 60);
        if (Object.values(v).some((x) => !Number.isFinite(x) || x < 0 || x > 1) || v.jawOpen > MAX_JAW) bad.push(`${f / 60}s ${JSON.stringify(v)} in: ${line}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("the mouth comes to rest by itself even if the voice never reports its end", () => {
    for (const line of LINES) {
      const l = new LipSync();
      l.begin(line, 0);
      const letters = spokenForm(line).replace(/[^a-z]/gi, "").length;
      const words = line.split(/\s+/).length;
      const bound = letters * 0.068 + words * 0.4 + 1; // generous upper bound on the estimate
      expect(l.rhythm(bound).speaking, line).toBe(false);
      expect(l.visemeAt(bound), line).toEqual(REST);
    }
  });

  it("stopping or interrupting at any moment closes the mouth at once", () => {
    for (const line of LINES.slice(0, 40)) {
      for (const at of [0.05, 0.4, 1.3]) {
        const l = new LipSync();
        l.begin(line, 0);
        l.visemeAt(at);
        l.end();
        expect(l.visemeAt(at + 0.001), line).toEqual(REST);
        expect(l.rhythm(at + 0.001).speaking).toBe(false);
      }
    }
  });

  it("the emergency numbers take speaking time and move the mouth ('Call 108 or 112 now')", () => {
    const span = (text: string) => {
      const l = new LipSync();
      l.begin(text, 0);
      let last = 0;
      for (let f = 0; f < 600; f++) if (l.rhythm(f / 100).speaking) last = f / 100;
      return last;
    };
    expect(span("Call 108 or 112 now.") - span("Call or now.")).toBeGreaterThan(1);
    const l = new LipSync();
    const text = "Call 108 or 112 now.";
    l.begin(text, 0);
    l.word(text.indexOf("108"), 0.3); // the voice reports the number starting
    const during = Array.from({ length: 30 }, (_, i) => activity(l.visemeAt(0.3 + i / 50)));
    expect(Math.max(...during)).toBeGreaterThan(0.1);
    expect(during.filter((a) => a < 0.01).length).toBeLessThan(10);
  });

  it("temperatures are spoken with the mouth moving ('39°C')", () => {
    expect(spokenForm("39°C")).toMatch(/three\s+nine\s+degrees\s+C/);
    expect(segments("39°C").length).toBeGreaterThan(segments("C").length + 6);
  });
});
