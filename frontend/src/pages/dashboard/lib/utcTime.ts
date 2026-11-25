/**
 * The dashboard words every window and time in UTC, as the API gives them, whatever the reader's
 * time zone is. The two formats are fixed here so no card can drift from the others.
 */
const dayFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const momentFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

/** `Nov 12, 2026`: the UTC day an instant falls on. */
export function utcDay(iso: string): string {
  return dayFormat.format(new Date(iso));
}

/** `Nov 18, 2026, 10:00`: an instant to the minute, without the zone (the caller adds "UTC"). */
export function utcMoment(iso: string): string {
  return momentFormat.format(new Date(iso));
}
