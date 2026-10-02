import { describe, expect, it } from "vitest";
import { type FollowUp, buildICS, escapeText, validate } from "../../app/lib/ics";

const now = new Date("2026-10-02T04:00:00Z");
// Calendar lines are folded at 75 characters; unfold before searching.
const unfold = (ics: string) => ics.replace(/\r\n /g, "");
const base: FollowUp = { id: "a1", kind: "appointment", title: "Eye check-up", date: "2026-10-10", times: ["09:30"], place: "District Hospital", notes: "Bring old reports" };

describe("follow-up calendar file", () => {
  it("produces a valid calendar with an alarm", () => {
    const ics = buildICS([base], now);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("DTSTART:20261010T093000");
    expect(ics).toContain("SUMMARY:Appointment: Eye check-up");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("escapes commas, semicolons, and new lines", () => {
    expect(escapeText("a,b;c\nd")).toBe("a\\,b\\;c\\nd");
  });

  it("medicine reminders repeat daily only until the prescribed end date, one event per prescribed time", () => {
    const med: FollowUp = { id: "m1", kind: "medicine", title: "Medicine X", date: "2026-10-02", endDate: "2026-10-08", times: ["08:00", "20:00"], notes: "after food" };
    const ics = unfold(buildICS([med], now));
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("RRULE:FREQ=DAILY;UNTIL=20261008T235959");
    expect(ics).toContain("Do not change your medicines without asking your doctor");
    expect(ics).toContain("after food");
  });

  it("medicine reminders require prescription times and an end date (never invented)", () => {
    expect(validate({ id: "m", kind: "medicine", title: "X", date: "2026-10-02", times: [] })).not.toBeNull();
    expect(validate({ id: "m", kind: "medicine", title: "X", date: "2026-10-02", times: ["08:00"] })).not.toBeNull();
    expect(validate({ id: "m", kind: "medicine", title: "X", date: "2026-10-05", endDate: "2026-10-01", times: ["08:00"] })).not.toBeNull();
  });

  it("invalid items are skipped, not guessed", () => {
    const ics = buildICS([{ ...base, date: "" }, { ...base, id: "b", times: ["25:00"] }], now);
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("all-day reminders have no time", () => {
    const ics = buildICS([{ ...base, times: [] }], now);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261010");
  });
});
