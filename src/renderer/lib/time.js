/** Compact relative timestamp for tree rows: "now", "5m", "3h", "7d", "2w", "4mo", "1y". */
export function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.max(0, (Date.now() - then) / 1000);
  if (seconds < 60) return 'now';

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
