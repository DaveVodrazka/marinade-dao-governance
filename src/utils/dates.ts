/**
 * Date formatting. All absolute dates are shown in UTC so server and client
 * render identically and users across time zones see the same timestamp.
 */

const DATE_TIME = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const DATE_ONLY = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "Oct 7, 2026, 18:00 UTC" or "Oct 7, 2026" */
export function formatDate(
  date: Date | undefined,
  { time = true }: { time?: boolean } = {},
): string {
  if (!date || Number.isNaN(date.getTime())) return "–";
  return time ? `${DATE_TIME.format(date)} UTC` : DATE_ONLY.format(date);
}

/** Compact duration: "2d 14h", "3h 5m", "45m", "<1m". */
export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const minutes = Math.floor(abs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
  if (hours > 0) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

/**
 * "in 2d 14h" / "3d ago". Coarse beyond 30 days ("4 months ago").
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diff = date.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const day = 86_400_000;
  let text: string;
  if (abs >= 365 * day) {
    const years = Math.floor(abs / (365 * day));
    text = `${years} year${years === 1 ? "" : "s"}`;
  } else if (abs >= 30 * day) {
    const months = Math.floor(abs / (30 * day));
    text = `${months} month${months === 1 ? "" : "s"}`;
  } else {
    text = formatDuration(abs);
  }
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

/** "2d 14h remaining" or "ended". */
export function formatTimeRemaining(end: Date, now: Date = new Date()): string {
  const diff = end.getTime() - now.getTime();
  return diff > 0 ? `${formatDuration(diff)} remaining` : "ended";
}
