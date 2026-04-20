/** Date/time utilities for Playwright tests. */

// Read backend config from env (defaults match docker-compose.yml).
const OWNER_TIMEZONE = process.env.OWNER_TIMEZONE ?? 'Europe/Moscow';
const WORK_START_HOUR = parseInt(process.env.WORK_START_HOUR ?? '9', 10);

/** Returns the UTC offset in hours for OWNER_TIMEZONE on a given date. */
function tzOffsetHours(date: string): number {
  const d = new Date(`${date}T12:00:00Z`);
  const utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
  const local = new Date(d.toLocaleString('en-US', { timeZone: OWNER_TIMEZONE }));
  return (local.getTime() - utc.getTime()) / 3_600_000;
}

/** Returns today's date in UTC as YYYY-MM-DD. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns a date within the 14-day booking window.
 * @param offset Number of days from today (1–13). Default 1 = tomorrow.
 */
export function dateInWindow(offset = 1): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Returns a date outside the 14-day booking window (today + 20 days). */
export function dateOutOfWindow(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 20);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the first working slot start time for a given date,
 * formatted as an ISO 8601 UTC string.
 * Computes from OWNER_TIMEZONE and WORK_START_HOUR (env / docker-compose).
 */
export function firstWorkingSlotUTC(date: string): string {
  const utcHour = WORK_START_HOUR - tzOffsetHours(date);
  const h = String(utcHour).padStart(2, '0');
  return `${date}T${h}:00:00.000Z`;
}

/** Exported so tests can derive expected UTC hours without hardcoding. */
export function workStartUTCHour(date: string): number {
  return WORK_START_HOUR - tzOffsetHours(date);
}

/**
 * Returns an ISO 8601 UTC datetime string for `now + N minutes`.
 * Useful for testing lead-time constraints.
 */
export function nowPlusMinutesISO(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000);
  return d.toISOString();
}

/**
 * Returns a URL-safe slug valid for event types.
 * Uses Date.now() to ensure uniqueness across test runs.
 */
export function randomSlug(): string {
  return `test-${Date.now().toString(36)}`;
}
