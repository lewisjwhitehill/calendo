import type { ParsedEvent } from "./types";

export type RegexParserResult =
  | { success: true; event: ParsedEvent }
  | { success: false };

// ─── Day-of-week helpers ─────────────────────────────────────────

const DAYS_OF_WEEK = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const DAY_ABBREV: Record<string, number> = {};
DAYS_OF_WEEK.forEach((d, i) => {
  DAY_ABBREV[d] = i;
  DAY_ABBREV[d.slice(0, 3)] = i; // sun, mon, …
});

// ─── Regex building blocks ───────────────────────────────────────

// Matches "today", "tomorrow", day names, "next <day>", or MM/DD, MM-DD, MM/DD/YYYY
const RELATIVE_DAY =
  /(?<relDay>today|tomorrow|tmrw|tmr)/i;

const WEEKDAY =
  /(?:(?:next|this)\s+)?(?<weekday>sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)/i;

const ABSOLUTE_DATE =
  /(?<month>\d{1,2})[/-](?<day>\d{1,2})(?:[/-](?<year>\d{2,4}))?/;

// Matches "3pm", "3:30pm", "15:00", "noon", "midnight"
const TIME_PATTERN =
  /(?<hour>\d{1,2})(?::(?<minute>\d{2}))?\s*(?<ampm>am|pm)?|(?<named>noon|midnight)/i;

// Optional end time: "to 5pm", "- 5pm", "until 5pm"
const END_TIME_PATTERN =
  /(?:to|until|-|–|—)\s*(?:(?<eHour>\d{1,2})(?::(?<eMinute>\d{2}))?\s*(?<eAmpm>am|pm)?|(?<eNamed>noon|midnight))/i;

// ─── Time parsing ────────────────────────────────────────────────

function parseTimeMatch(
  hour: string | undefined,
  minute: string | undefined,
  ampm: string | undefined,
  named: string | undefined
): { hours: number; minutes: number } | null {
  if (named) {
    if (named.toLowerCase() === "noon") return { hours: 12, minutes: 0 };
    if (named.toLowerCase() === "midnight") return { hours: 0, minutes: 0 };
  }

  if (hour == null) return null;

  let h = parseInt(hour, 10);
  const m = minute ? parseInt(minute, 10) : 0;

  if (ampm) {
    const a = ampm.toLowerCase();
    if (a === "pm" && h < 12) h += 12;
    if (a === "am" && h === 12) h = 0;
  } else if (h <= 7) {
    // Bare number 1-7 without am/pm is almost always PM in casual speech
    h += 12;
  }

  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { hours: h, minutes: m };
}

// ─── Date resolution ─────────────────────────────────────────────

function resolveDate(
  text: string,
  today: Date,
  timeZone: string
): Date | null {
  // Relative days
  const relMatch = text.match(RELATIVE_DAY);
  if (relMatch?.groups?.relDay) {
    const rel = relMatch.groups.relDay.toLowerCase();
    const d = new Date(today);
    if (rel === "tomorrow" || rel === "tmrw" || rel === "tmr") {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  // Weekday names
  const wdMatch = text.match(WEEKDAY);
  if (wdMatch?.groups?.weekday) {
    const target = DAY_ABBREV[wdMatch.groups.weekday.toLowerCase()];
    if (target == null) return null;
    const d = new Date(today);
    const current = d.getDay();
    let diff = target - current;
    if (diff <= 0) diff += 7; // always advance to next occurrence
    d.setDate(d.getDate() + diff);
    return d;
  }

  // Absolute dates (MM/DD or MM/DD/YYYY)
  const absMatch = text.match(ABSOLUTE_DATE);
  if (absMatch?.groups) {
    const month = parseInt(absMatch.groups.month, 10);
    const day = parseInt(absMatch.groups.day, 10);
    let year = absMatch.groups.year
      ? parseInt(absMatch.groups.year, 10)
      : today.getFullYear();
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day);
  }

  // No date found — assume today
  return null;
}

// ─── Extract summary ─────────────────────────────────────────────

function extractSummary(text: string): string {
  // Strip time / date portions and prepositions to isolate the event name
  let summary = text
    .replace(RELATIVE_DAY, "")
    .replace(WEEKDAY, "")
    .replace(ABSOLUTE_DATE, "")
    .replace(END_TIME_PATTERN, "")
    .replace(TIME_PATTERN, "")
    .replace(
      /\b(at|on|from|next|this|in the|morning|afternoon|evening)\b/gi,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();

  // Trim leading/trailing punctuation or prepositions
  summary = summary.replace(/^[-–—,.\s]+|[-–—,.\s]+$/g, "").trim();

  return summary || "Event";
}

// ─── TZ offset formatting ────────────────────────────────────────

function formatWithTzOffset(
  date: Date,
  hours: number,
  minutes: number,
  timeZone: string
): string {
  // Build a wall-clock date in the target timezone
  const wall = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0
  );

  // Use Intl to discover the UTC offset for this wall-clock instant
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  });
  const parts = formatter.formatToParts(wall);
  const tzPart = parts.find((p) => p.type === "timeZoneName");

  // tzPart.value is like "GMT+05:30" or "GMT-08:00" or "GMT"
  let offset = "+00:00";
  if (tzPart?.value) {
    const m = tzPart.value.match(/GMT([+-]\d{1,2}(?::\d{2})?)/);
    if (m) {
      let raw = m[1]; // e.g. "+5:30" or "-8"
      // Normalize: ensure ±HH:MM
      const parts2 = raw.match(/^([+-])(\d{1,2})(?::(\d{2}))?$/);
      if (parts2) {
        const sign = parts2[1];
        const hh = parts2[2].padStart(2, "0");
        const mm = parts2[3] ?? "00";
        raw = `${sign}${hh}:${mm}`;
      }
      offset = raw;
    }
  }

  const yyyy = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(hours).padStart(2, "0");
  const mi = String(minutes).padStart(2, "0");

  return `${yyyy}-${mo}-${dd}T${hh}:${mi}:00${offset}`;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Attempts to parse a natural-language event string using regex patterns.
 * Returns `{ success: true, event }` when a date+time can be extracted,
 * or `{ success: false }` when the input is too ambiguous for regex.
 */
export function regexParse(
  text: string,
  timeZone: string,
  now: Date = new Date()
): RegexParserResult {
  // Build "today" in the user's timezone
  const todayStr = now.toLocaleDateString("en-CA", { timeZone });
  const [y, m, d] = todayStr.split("-").map(Number);
  const today = new Date(y, m - 1, d);

  // ── 1. Find the date (optional — defaults to today) ───────────
  const date = resolveDate(text, today, timeZone) ?? today;

  // Strip absolute dates from text so TIME_PATTERN doesn't match
  // the month digit in "4/15" as a bare hour.
  const textForTime = text.replace(ABSOLUTE_DATE, " ");

  // ── 2. Find a time (required for regex path) ──────────────────
  const timeMatch = textForTime.match(TIME_PATTERN);
  if (!timeMatch) return { success: false };

  const startTime = parseTimeMatch(
    timeMatch.groups?.hour,
    timeMatch.groups?.minute,
    timeMatch.groups?.ampm,
    timeMatch.groups?.named
  );
  if (!startTime) return { success: false };

  // ── 3. Look for an explicit end time ──────────────────────────
  const endMatch = textForTime.match(END_TIME_PATTERN);
  let endTime: { hours: number; minutes: number } | null = null;
  if (endMatch) {
    endTime = parseTimeMatch(
      endMatch.groups?.eHour,
      endMatch.groups?.eMinute,
      endMatch.groups?.eAmpm,
      endMatch.groups?.eNamed
    );
  }

  if (!endTime) {
    // Default: 1 hour after start
    endTime = {
      hours: startTime.hours + 1,
      minutes: startTime.minutes,
    };
    if (endTime.hours >= 24) {
      endTime.hours = 23;
      endTime.minutes = 59;
    }
  }

  // ── 4. Build ISO strings with correct TZ offset ───────────────
  const startIso = formatWithTzOffset(
    date,
    startTime.hours,
    startTime.minutes,
    timeZone
  );
  const endIso = formatWithTzOffset(
    date,
    endTime.hours,
    endTime.minutes,
    timeZone
  );

  // ── 5. Extract summary ────────────────────────────────────────
  const summary = extractSummary(text);

  return {
    success: true,
    event: {
      summary,
      start: startIso,
      end: endIso,
      reminders: [{ method: "popup", minutes: 30 }],
    },
  };
}
