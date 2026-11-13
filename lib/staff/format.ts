/**
 * Display formatting only (no rules). Dates arrive as "YYYY-MM-DD" and are
 * parsed as LOCAL calendar dates so no timezone shift can move a day.
 */
import type { ClockTime, ISODate, ISODateTime } from "./types";

export function parseDate(d: ISODate): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export function toISODate(date: Date): ISODate {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function addDays(d: ISODate, n: number): ISODate {
  const x = parseDate(d);
  x.setDate(x.getDate() + n);
  return toISODate(x);
}

/** "10:00" -> "10:00 AM". */
export function formatClock(t: ClockTime): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatClockRange(start: ClockTime, end: ClockTime): string {
  return `${formatClock(start)} - ${formatClock(end)}`;
}

export function formatDateTimeClock(iso: ISODateTime): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
}

export function weekday(d: ISODate, style: "short" | "long" = "short"): string {
  return parseDate(d).toLocaleDateString("en-GB", { weekday: style });
}

export function dayMonth(d: ISODate): string {
  return parseDate(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).replace("Sept", "Sep");
}

export function dayNumber(d: ISODate): number {
  return parseDate(d).getDate();
}

export function longDate(d: ISODate): string {
  return parseDate(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).replace("Sept", "Sep");
}

/** "Due Fri 3 Oct" / "Due today" / "Overdue" - wording only, no policy. */
export function dueLabel(d: ISODate): string {
  const diff = Math.round((parseDate(d).getTime() - parseDate(todayISO()).getTime()) / 86_400_000);
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff < 0) return "Past due";
  return `Due ${longDate(d)}`;
}

export function greetingForNow(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning," : h < 17 ? "Good afternoon," : "Good evening,";
}

export function timeAgo(iso: ISODateTime): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function displayName(p: { firstName: string; preferredName: string | null }): string {
  return p.preferredName || p.firstName;
}
