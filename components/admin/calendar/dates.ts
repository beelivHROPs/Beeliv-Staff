/** Small date helpers for the calendar kit. Weeks start on Monday. All values are local-clock `Date`s or epoch ms. */
export const MIN = 60_000;
export const DAY_MS = 86_400_000;

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const addMonths = (d: Date, n: number) => {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
};
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** Stable key for a day, YYYY-MM-DD (local). */
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** ISO 8601 week number. */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / DAY_MS + 1) / 7);
}

/** The 6 (or 5) Monday-first weeks covering a month. */
export function monthWeeks(d: Date): Date[][] {
  const first = startOfMonth(d);
  const gridStart = startOfWeek(first);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const n = Math.ceil(((startOfWeek(last).getTime() - gridStart.getTime()) / DAY_MS + 7) / 7);
  return Array.from({ length: n }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i)));
}

const pad = (n: number) => String(n).padStart(2, "0");
export const clock = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const fmtMonth = (d: Date) => d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
export const fmtDayLong = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
export const fmtDayShort = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
export const fmtWeekRange = (a: Date, b: Date) => {
  const sameM = a.getMonth() === b.getMonth();
  const left = a.toLocaleDateString("en-GB", sameM ? { day: "numeric" } : { day: "numeric", month: "short" });
  const right = b.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${left} to ${right}`;
};

/** Initials for the small avatar on chips, e.g. "Funke Sample" -> "FS". */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
