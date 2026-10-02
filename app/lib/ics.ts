// Builds an iCalendar (.ics) file for reminders. Pure and offline: the file is
// created on the device and imported into the phone's own calendar app.
//
// Medicine reminders only repeat what the person copied from an existing
// prescription. This code never chooses medicines, doses, or schedules.

export type FollowUpKind = "appointment" | "medicine" | "follow-up" | "test" | "vaccination";

export type FollowUp = {
  id: string;
  kind: FollowUpKind;
  title: string; // e.g. "Eye check-up", or the medicine name exactly as prescribed
  date: string; // YYYY-MM-DD (start date for medicines)
  times: string[]; // HH:MM; empty = all-day
  endDate?: string; // YYYY-MM-DD, medicines only
  place?: string;
  notes?: string; // e.g. instructions exactly as written on the prescription
};

const KIND_LABEL: Record<FollowUpKind, string> = {
  appointment: "Appointment",
  medicine: "Medicine (as prescribed)",
  "follow-up": "Follow-up",
  test: "Test",
  vaccination: "Vaccination",
};

export function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

// Lines longer than 75 characters are folded (RFC 5545).
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 74) parts.push((i === 0 ? "" : " ") + line.slice(i, i + 74));
  return parts.join("\r\n");
}

const compactDate = (d: string) => d.replace(/-/g, "");
const compactTime = (t: string) => `${t.replace(":", "")}00`;

function isDate(d?: string): d is string {
  return !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
}
function isTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export function validate(f: FollowUp): string | null {
  if (!f.title.trim()) return "Please enter a name for the reminder.";
  if (!isDate(f.date)) return "Please choose a date.";
  if (f.times.some((t) => !isTime(t))) return "Please check the times.";
  if (f.kind === "medicine") {
    if (f.times.length === 0) return "Please enter the times written on your prescription.";
    if (!isDate(f.endDate)) return "Please enter the end date written on your prescription, or ask your doctor.";
    if (f.endDate < f.date) return "The end date must be after the start date.";
  }
  return null;
}

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildICS(items: FollowUp[], now: Date = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mizoram Health Guide//AI Hospital//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const f of items) {
    if (validate(f)) continue;
    const summary = `${KIND_LABEL[f.kind]}: ${f.title.trim()}`;
    const description = [
      f.notes?.trim(),
      f.kind === "medicine" ? "Reminder copied from your prescription. Do not change your medicines without asking your doctor." : "",
    ]
      .filter(Boolean)
      .join("\n");
    const slots = f.times.length ? f.times : [""];
    slots.forEach((time, i) => {
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${f.id}-${i}@mizoram-health-guide`);
      lines.push(`DTSTAMP:${stamp(now)}`);
      if (time) {
        // Floating local time: shown at this clock time on the person's phone.
        lines.push(`DTSTART:${compactDate(f.date)}T${compactTime(time)}`);
        lines.push("DURATION:PT15M");
      } else {
        lines.push(`DTSTART;VALUE=DATE:${compactDate(f.date)}`);
      }
      if (f.kind === "medicine" && f.endDate) lines.push(`RRULE:FREQ=DAILY;UNTIL=${compactDate(f.endDate)}T235959`);
      lines.push(fold(`SUMMARY:${escapeText(summary)}`));
      if (description) lines.push(fold(`DESCRIPTION:${escapeText(description)}`));
      if (f.place?.trim()) lines.push(fold(`LOCATION:${escapeText(f.place.trim())}`));
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", fold(`DESCRIPTION:${escapeText(summary)}`), `TRIGGER:${time ? "-PT10M" : "-PT9H"}`, "END:VALARM");
      lines.push("END:VEVENT");
    });
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
