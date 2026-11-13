/** CalendarService: the single door the hooks use. Adds NO business rules. To go live: change the one `adapter` line. */
import type { CalendarAdapter } from "./adapter";
import { mockCalendarAdapter } from "./mock";

const adapter: CalendarAdapter = mockCalendarAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeCalendar: CalendarAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const getCalendar: CalendarAdapter["getCalendar"] = (r) => adapter.getCalendar(r);
export const moveCalendarEvent: CalendarAdapter["moveEvent"] = (id, s, e) => adapter.moveEvent(id, s, e);
