export function toPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "5 minutes ago", "2 hours ago", ... Falls back to a date after a week. Invalid input gives "". */
export function formatTimeAgo(iso: string, now: number = Date.now()): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';

  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  if (seconds < MINUTE) return 'just now';
  if (seconds < HOUR) return plural(Math.floor(seconds / MINUTE), 'minute');
  if (seconds < DAY) return plural(Math.floor(seconds / HOUR), 'hour');
  if (seconds < 7 * DAY) return plural(Math.floor(seconds / DAY), 'day');
  return new Date(time).toLocaleDateString('en-US');
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
}
