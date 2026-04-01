/**
 * Normalizes a Date to UTC midnight for its calendar day.
 * Matches `UsageLog.date` (`DateTime @db.Date`) — one logical day per UTC date.
 */
export function normalizeUtcDay(input: Date = new Date()): Date {
  return new Date(
    Date.UTC(
      input.getUTCFullYear(),
      input.getUTCMonth(),
      input.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}
