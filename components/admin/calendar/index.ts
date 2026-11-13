/**
 * AdminCalendar kit (reusable). Used by /admin/calendar, the Interviews week view,
 * and intended for Scheduling and Leave.
 *
 *   <AdminCalendar
 *     events={CalendarEvent[]}            // all events; ISO start / end, allDay optional
 *     types={CalendarEventType[]}         // configurable: { id, label, tone, movable }
 *     view="month" | "week" | "day" | "agenda"
 *     date={Date}                         // the selected day; visible period follows it
 *     onViewChange={(view) => ...}
 *     onDateChange={(date) => ...}
 *     onEventClick?={(event) => ...}      // click / Enter on an event
 *     detail?={true}                      // built-in detail card with a link to event.href; false = you handle onEventClick
 *     onSlotCreate?={(start, end) => ...} // click / drag an empty slot (week, day); double-click a month cell
 *     onEventChange?={(event, startISO, endISO) => ...}  // drag-to-move / resize, only for types with movable = true
 *     renderEvent?={(event, { view, type, compact, conflict }) => ReactNode}  // replaces chip contents only
 *     sidePanelExtra?={ReactNode}         // under the legend on desktop (>= 1280)
 *     hours?={[6, 22]} loading?
 *     hiddenTypeIds? onHiddenTypeIdsChange? // controlled legend visibility; omit for internal state
 *   />
 *
 * Tone -> colour: tones map to design tokens (tint, edge and text derived with color-mix),
 * so they follow light and dark mode. Red is never a tone: use `attention: true` on an event
 * (AttentionBadge). Double-booking (same person, overlapping time) is highlighted automatically.
 * Times are read in the browser clock and labelled Africa/Lagos (WAT).
 *
 * Data contracts live in lib/admin/calendar/types.ts (CalendarEvent, CalendarEventType, ...).
 * Keyboard: arrows move between days, Enter opens the day, PageUp / PageDown change month.
 */
export { AdminCalendar, type AdminCalendarProps } from "./AdminCalendar";
export type { CalendarView, RenderEventContext } from "./EventChip";
export { CalendarPage } from "./CalendarPage";
