// A small helper that turns an exact date/time into a short, friendly
// "how long ago" label — the same kind of thing you see on social media
// posts, like "5m" for five minutes ago, or "3h" for three hours ago,
// instead of a full date and time.

/**
 * Compact relative timestamp for tree rows: "now", "5m", "3h", "7d", "2w", "4mo", "1y".
 * @param {string} iso - a date/time written in ISO format (e.g. "2026-07-10T12:00:00Z").
 * @returns {string} a short label describing how long ago that was.
 */
export function relativeTime(iso) {
  // Convert the ISO date string into a number of milliseconds since 1970
  // (the standard way computers represent points in time internally).
  const then = new Date(iso).getTime();
  // If the date string was invalid/unparseable, "then" becomes NaN
  // ("Not a Number") — in that case, just show nothing rather than an error.
  if (Number.isNaN(then)) return '';

  // Figure out how many seconds have passed between "then" and right now.
  // Math.max(0, ...) protects against a negative number if the clock is
  // slightly off or the timestamp is somehow in the future.
  const seconds = Math.max(0, (Date.now() - then) / 1000);
  if (seconds < 60) return 'now';

  // Step through bigger and bigger units of time (minutes, hours, days,
  // weeks, months, years), picking whichever one is the best fit, and
  // rounding down (Math.floor) so "1.9 hours ago" shows as "1h" not "2h".
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m`;

  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h`;

  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}
