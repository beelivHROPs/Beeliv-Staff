/**
 * Applicant dashboard: relative-time helpers.
 *
 * Per project-lead direction (2026-09-28): every date/timestamp in this
 * dashboard is computed relative to the actual current date, not a
 * hardcoded stale string. Mock seed data (mock-db.ts) stores real ISO
 * timestamps built from offsets off `new Date()` at store-init time (e.g.
 * "16 days ago", "in 4 days") — these helpers format those ISO strings for
 * display, computed fresh each time they're called.
 */

const DAY_MS = 86_400_000;

/** ISO timestamp `days` (can be negative for the past) from now, at a given hour/minute. */
export function isoOffset(days: number, hours = 9, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export function formatRelativePast(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
}

export function formatRelativeFuture(iso: string): string {
  // Calendar days, not 24h blocks: an event on Friday is "In 4 days" all of Monday.
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date(iso)) - startOf(new Date())) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  return formatDate(iso);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).replace("Sept", "Sep");
}
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).replace("Sept", "Sep");
}
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
export function weekdayName(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long" });
}
export function monthAbbrUpper(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}
export function dayOfMonth(iso: string): string {
  return String(new Date(iso).getDate()).padStart(2, "0");
}
export function formatDueLabel(iso: string): string {
  return `Due ${new Date(iso).toLocaleDateString("en-US", { weekday: "short" })}, ${formatDate(iso)}`;
}
