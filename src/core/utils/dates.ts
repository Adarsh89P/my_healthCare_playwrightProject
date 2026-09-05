/**
 * Date helpers shared across projects.
 *
 * Tests should never hardcode a calendar date - a date that is "in the future"
 * when the test is written stops being so, and the test rots silently. Derive
 * dates from today instead.
 */

/** Returns a new Date `days` after today (negative values go back in time). */
export function daysFromToday(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * A near-future date guaranteed to fall inside the *current* calendar month.
 *
 * Useful for date pickers that only render one month at a time: rather than
 * paging the widget forward, pick a day that is already on screen. Near the end
 * of a month this walks backwards instead so the returned date stays in range.
 */
export function nearFutureDateInCurrentMonth(preferredOffset = 1): Date {
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const candidate = today.getDate() + preferredOffset;

  const day =
    candidate <= lastDayOfMonth ? candidate : Math.max(1, today.getDate() - preferredOffset);
  return new Date(today.getFullYear(), today.getMonth(), day);
}

/** Formats as dd/mm/yyyy. */
export function formatDDMMYYYY(date: Date, separator = '/'): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return [day, month, date.getFullYear()].join(separator);
}

/** Formats as yyyy-mm-dd (ISO calendar date). */
export function formatISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Appends a timestamp so generated data is unique across runs. */
export function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}
