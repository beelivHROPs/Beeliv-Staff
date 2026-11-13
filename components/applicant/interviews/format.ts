import { fmtDay, interviewDayLabel, interviewTimeRange } from "@/components/applicant/applications/shared";

/** "Friday, 23 Oct · 10:00 – 10:45 AM (WAT)" */
export function whenLabel(iso: string, durationMinutes?: number): string {
  return `${interviewDayLabel(iso)} · ${interviewTimeRange(iso, durationMinutes)}`;
}

/** "19 Oct 2026, 3:42 PM (WAT)" — when a message was sent. */
export function sentStamp(iso: string): string {
  return `${fmtDay(iso)}, ${interviewTimeRange(iso)}`;
}

const WAT = "Africa/Lagos";
function wat(iso: string | number, o: Intl.DateTimeFormatOptions): string {
  // Newer ICU puts a narrow no-break space before AM/PM; normalise it.
  return new Date(iso).toLocaleString("en-US", { timeZone: WAT, ...o }).replace(/ /g, " ");
}

/** The pieces of an interview date for the large date block, in WAT: "FRI" / "23" / "October". */
export function dateBlock(iso: string) {
  return {
    weekday: wat(iso, { weekday: "short" }).toUpperCase(),
    weekdayLong: wat(iso, { weekday: "long" }),
    day: wat(iso, { day: "numeric" }),
    month: wat(iso, { month: "long" }),
    year: wat(iso, { year: "numeric" }),
  };
}

/** Start and end clock times in WAT: { start: "10:00 AM", end: "10:45 AM" | null }. */
export function clockRange(iso: string, durationMinutes?: number) {
  const start = wat(iso, { hour: "numeric", minute: "2-digit" });
  const end = durationMinutes ? wat(new Date(iso).getTime() + durationMinutes * 60_000, { hour: "numeric", minute: "2-digit" }) : null;
  return { start, end };
}

/** Whole WAT calendar days from `now` to `iso` (0 = today). */
function watDayDiff(iso: string, now: number): number {
  const key = (t: string | number) => {
    const [m, d, y] = wat(t, { month: "numeric", day: "numeric", year: "numeric" }).split("/").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((key(iso) - key(now)) / 86_400_000);
}

/** A soft, plain countdown: "Today", "Tomorrow", "In 4 days", or "Starts in 20 min" inside the last hour. */
export function startsIn(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "Time has started";
  if (ms < 60 * 60_000) return `Starts in ${Math.max(1, Math.round(ms / 60_000))} min`;
  const d = watDayDiff(iso, now);
  if (d <= 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `In ${d} days`;
}
