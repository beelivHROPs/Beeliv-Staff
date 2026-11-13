/** CalendarAdapter: what any backend must provide. The page and hooks only ever see this interface. */
import type { CalendarData, CalendarRange } from "./types";

export interface CalendarAdapter {
  subscribe(listener: () => void): () => void;
  /** Everything visible to this user inside the range. Throws RestrictedError when the user may not see the calendar. */
  getCalendar(range: CalendarRange): Promise<CalendarData>;
  /** Move / resize one event. Each module owns the real write; the mock keeps it in memory only. */
  moveEvent(id: string, start: string, end: string): Promise<void>;
}
