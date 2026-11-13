"use client";

/** Calendar data hook. Reuses the shared fetch-state helper from Interviews (loading | ready | empty | error | restricted). */
import { useResource, type Resource } from "../interviews/hooks";
import * as service from "./service";
import type { CalendarData, CalendarRange } from "./types";

const subscribe = (cb: () => void) => service.subscribeCalendar(cb);

export function useCalendar(range: CalendarRange): Resource<CalendarData> {
  return useResource(() => service.getCalendar(range), range, subscribe, (d) => d === null || d.events.length === 0);
}

export const moveCalendarEvent = service.moveCalendarEvent;
