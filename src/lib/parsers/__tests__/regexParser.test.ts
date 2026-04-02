import { describe, it, expect } from "vitest";
import { regexParse } from "../regexParser";

// Pin "now" to Wednesday 2026-04-01 12:00 UTC so tests are deterministic.
const NOW = new Date(2026, 3, 1, 12, 0, 0); // April 1 2026 (month is 0-indexed)
const TZ = "America/New_York";

function expectSuccess(text: string, tz = TZ, now = NOW) {
  const result = regexParse(text, tz, now);
  if (!result.success) {
    throw new Error(`Expected regex to succeed for: "${text}"`);
  }
  return result.event;
}

function expectFallback(text: string, tz = TZ, now = NOW) {
  const result = regexParse(text, tz, now);
  expect(result.success).toBe(false);
}

// ─── Happy paths ─────────────────────────────────────────────────

describe("regexParser - happy paths", () => {
  it("parses 'Meeting tomorrow at 3pm'", () => {
    const event = expectSuccess("Meeting tomorrow at 3pm");
    expect(event.summary).toBe("Meeting");
    expect(event.start).toContain("2026-04-02T15:00:00");
    expect(event.end).toContain("2026-04-02T16:00:00");
  });

  it("parses 'Dinner Friday 7pm'", () => {
    // April 1 2026 is a Wednesday → next Friday = April 3
    const event = expectSuccess("Dinner Friday 7pm");
    expect(event.summary).toBe("Dinner");
    expect(event.start).toContain("2026-04-03T19:00:00");
  });

  it("parses 'Lunch today at noon'", () => {
    const event = expectSuccess("Lunch today at noon");
    expect(event.summary).toBe("Lunch");
    expect(event.start).toContain("2026-04-01T12:00:00");
    expect(event.end).toContain("2026-04-01T13:00:00");
  });

  it("parses 'Call with Alex 3:30pm'", () => {
    const event = expectSuccess("Call with Alex 3:30pm");
    expect(event.summary).toContain("Call");
    expect(event.start).toContain("T15:30:00");
  });

  it("parses 24-hour time '14:00'", () => {
    const event = expectSuccess("Standup 14:00");
    expect(event.start).toContain("T14:00:00");
  });

  it("parses absolute date 4/15 at 2pm", () => {
    const event = expectSuccess("Doctor appointment 4/15 at 2pm");
    expect(event.start).toContain("2026-04-15T14:00:00");
  });

  it("parses with explicit end time 'Team sync 9am to 10am'", () => {
    const event = expectSuccess("Team sync today 9am to 10am");
    expect(event.start).toContain("T09:00:00");
    expect(event.end).toContain("T10:00:00");
  });

  it("defaults end to 1 hour after start", () => {
    const event = expectSuccess("Coffee tomorrow at 8am");
    expect(event.start).toContain("2026-04-02T08:00:00");
    expect(event.end).toContain("2026-04-02T09:00:00");
  });

  it("includes default reminder", () => {
    const event = expectSuccess("Gym tomorrow at 6pm");
    expect(event.reminders).toEqual([{ method: "popup", minutes: 30 }]);
  });

  it("parses word-based reminder like 'remind me one hour before'", () => {
    const event = expectSuccess(
      "Doctor appointment tomorrow at 2pm remind me one hour before"
    );
    expect(event.summary).toBe("Doctor appointment");
    expect(event.reminders).toEqual([{ method: "popup", minutes: 60 }]);
  });

  it("parses compact reminder like 'alert me 1day before'", () => {
    const event = expectSuccess("Rent due 4/15 at 9am, alert me 1day before");
    expect(event.summary).toBe("Rent due");
    expect(event.start).toContain("2026-04-15T09:00:00");
    expect(event.reminders).toEqual([{ method: "popup", minutes: 1440 }]);
  });

  it("parses 'tmrw' abbreviation", () => {
    const event = expectSuccess("Haircut tmrw at 10am");
    expect(event.start).toContain("2026-04-02T10:00:00");
  });

  it("handles 'next Monday'", () => {
    // April 1 2026 is Wednesday → next Monday = April 6
    const event = expectSuccess("Standup next Monday at 9am");
    expect(event.start).toContain("2026-04-06T09:00:00");
  });

  it("ISO strings include timezone offset", () => {
    const event = expectSuccess("Call tomorrow at 3pm", "America/New_York");
    // EDT in April is -04:00
    expect(event.start).toMatch(/[+-]\d{2}:\d{2}$/);
  });
});

// ─── Fallback cases (regex should not succeed) ───────────────────

describe("regexParser - falls back to LLM", () => {
  it("returns false for text with no time", () => {
    expectFallback("Dinner with Sarah sometime next week");
  });

  it("returns false for vague relative language", () => {
    expectFallback("Plan the quarterly review in a couple of weeks");
  });

  it("returns false for empty string", () => {
    expectFallback("");
  });

  it("returns false for text with only a day, no time", () => {
    expectFallback("Meeting on Friday");
  });
});
