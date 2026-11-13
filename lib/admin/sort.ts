/**
 * Sorting + date/time helpers shared by the Admin list adapters and screens.
 * Sort always compares FULL ISO timestamps (date + time), never date-only strings.
 */
export interface SortOption {
  value: string;
  label: string;
}

/** Compare two ISO timestamps ascending. Missing values always sort last, whatever the direction. */
export function cmpIso(a: string | null | undefined, b: string | null | undefined, dir: "asc" | "desc"): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const d = new Date(a).getTime() - new Date(b).getTime();
  return dir === "asc" ? d : -d;
}

export const cmpText = (a: string, b: string, dir: "asc" | "desc" = "asc") => (dir === "asc" ? a.localeCompare(b) : b.localeCompare(a));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const two = (n: number) => String(n).padStart(2, "0");

/** "12 Oct, 14:30" (24-hour, local time). */
export function formatDateTime(iso: string | null | undefined, fallback = "Not set"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** "12 Oct 2026, 14:30". */
export function formatDateTimeFull(iso: string | null | undefined, fallback = "Not set"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${two(d.getHours())}:${two(d.getMinutes())}`;
}
