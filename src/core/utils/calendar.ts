// Small date helpers shared by the sidebar mini-calendar and the Calendar page.
// Everything works in the user's *local* time so a transaction's day matches
// what they see elsewhere (the transactions list groups by local date too).

/** Weekday column labels, Monday-first (matches the calendar UI). */
export const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Local YYYY-MM-DD key for a date (used for grouping + URL params). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Add months to a date, clamping the day to one that exists in the target month.
 *
 * Plain `setMonth` overflows instead of clamping: 31 January + 1 month lands on
 * 2 or 3 March, not the end of February. Anything anchored to a month-end day —
 * a subscription renewal, an EMI due date — then skips the short month entirely
 * and drifts a little further forward every time it is rolled.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  // Day 0 of the following month is the last day of the target month.
  const lastDayOfTarget = new Date(year, month + 1, 0).getDate();
  const result = new Date(date);
  // Setting all three parts together avoids an intermediate overflow.
  result.setFullYear(year, month, Math.min(date.getDate(), lastDayOfTarget));
  return result;
}

/** Whether two dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

/** Parse a local YYYY-MM-DD key back into a Date, or null if malformed. */
export function parseDateKey(key: string | null | undefined): Date | null {
  if (!key) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 42 dates (6 weeks) covering the given month, Monday-first, including the
 * leading/trailing days that spill in from adjacent months so the grid is full.
 */
export function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // Convert JS Sunday-first (0=Sun) to Monday-first (0=Mon).
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
