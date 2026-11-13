/**
 * Calendar data shapes (presentation contracts only). Event TYPES are data from
 * the adapter (configurable), never hard-coded in components. Times are ISO
 * strings; the calendar reads them in the browser's clock and labels the grid
 * "Africa/Lagos (WAT)" (needs Beeliv confirmation: a fixed-zone conversion is
 * not applied in the mock). Every event is keyed by the SOURCE record's internal
 * id and links to that record; references (BLV-...) are never composed here.
 */

/** Colour family for a type. The component maps a tone to design tokens (works in light and dark). */
export type CalendarTone = "violet" | "plum" | "green" | "teal" | "amber" | "gold" | "slate" | "ink";

export interface CalendarEventType {
  id: string;
  label: string;
  tone: CalendarTone;
  /** Whether events of this type may be dragged / resized (the owning module still decides what is saved). */
  movable: boolean;
}

export interface CalendarPerson {
  id: string;
  name: string;
}

export interface CalendarEvent {
  /** Internal id of the event (usually the source record id). */
  id: string;
  typeId: string;
  title: string;
  /** Second line: stage, outlet, role... */
  subtitle?: string | null;
  start: string;
  end: string;
  allDay?: boolean;
  people?: CalendarPerson[];
  client?: { id: string; name: string } | null;
  /** Short status text shown in the detail card (plain language). */
  status?: string | null;
  /** True when HR must act now: shown with the red AttentionBadge. */
  attention?: boolean;
  /** Link to the source record. */
  href?: string | null;
  /** Label for the link, e.g. "Open interview". */
  hrefLabel?: string | null;
  /** Extra detail rows for the detail card. */
  details?: { label: string; value: string }[];
}

export interface CalendarRange {
  from: string;
  to: string;
}

export interface CalendarData {
  types: CalendarEventType[];
  events: CalendarEvent[];
  facets: { clients: { id: string; name: string }[]; people: CalendarPerson[] };
  /** The signed-in user, for "Only mine". */
  me: CalendarPerson;
}
