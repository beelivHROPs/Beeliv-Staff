/**
 * DEV FIXTURE for the Calendar. Everything is FICTIONAL ("Sample" people) and
 * generated relative to today. Interviews / assessments come from the real
 * Interviews mock and vacancy closing dates from the real Vacancies mock, so
 * links open real fixture records. Leave, shifts, document deadlines,
 * announcements and "other" are local fixtures (their modules own the records;
 * hrefs point at the module list pages until detail routes exist).
 * Moves are held in memory and reset on reload. Replace with a Supabase adapter
 * implementing CalendarAdapter; no screen changes.
 */
import { listInterviews } from "../interviews/service";
import { previewGate } from "../interviews/mock";
import { listVacancies } from "../vacancies/service";
import type { CalendarAdapter } from "./adapter";
import type { CalendarData, CalendarEvent, CalendarEventType, CalendarPerson } from "./types";

/** Defaults need Beeliv confirmation: the set of event types is data and can change without code changes. */
const TYPES: CalendarEventType[] = [
  { id: "interview", label: "Interviews", tone: "violet", movable: true },
  { id: "assessment", label: "Assessments", tone: "plum", movable: true },
  { id: "shift", label: "Shifts and roster", tone: "green", movable: false },
  { id: "leave", label: "Leave", tone: "amber", movable: false },
  { id: "vacancy", label: "Vacancy closing", tone: "gold", movable: false },
  { id: "document", label: "Document deadlines", tone: "teal", movable: false },
  { id: "announcement", label: "Announcements", tone: "slate", movable: true },
  { id: "other", label: "Other", tone: "ink", movable: true },
];

const ME: CalendarPerson = { id: "7d2c1f0e-0000-4000-8000-00000000a001", name: "Funke Sample" };
const KELECHI: CalendarPerson = { id: "7d2c1f0e-0000-4000-8000-00000000a002", name: "Kelechi Sample" };
const AMINA: CalendarPerson = { id: "stf-amina", name: "Amina Sample" };
const TUNDE: CalendarPerson = { id: "stf-tunde", name: "Tunde Sample" };
const CHIOMA: CalendarPerson = { id: "stf-chioma", name: "Chioma Sample" };
const IBRAHIM: CalendarPerson = { id: "stf-ibrahim", name: "Ibrahim Sample" };

const HOTEL = { id: "c-demo-hotel-abuja", name: "Demo Hotel Abuja" };
const LOUNGE = { id: "c-demo-lounge-lagos", name: "Demo Lounge Lagos" };

const slug = (s: string) => `c-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

function stamp(dayOffset: number, h: number, m = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
/** All-day events: start at local midnight, end (exclusive) at midnight after the last day. */
const allDay = (from: number, to = from) => ({ start: stamp(from, 0), end: stamp(to + 1, 0), allDay: true });

function weekday(offset: number): number {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.getDay();
}

function fixtures(): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (let o = -21; o <= 49; o++) {
    const wd = weekday(o); // 0 = Sunday
    if (wd === 1 || wd === 3 || wd === 5) {
      out.push({ id: `shift-m-${o}`, typeId: "shift", title: "Morning shift", subtitle: HOTEL.name, start: stamp(o, 6), end: stamp(o, 14), people: [AMINA, TUNDE], client: HOTEL, status: "Fully staffed", href: "/admin/workforce/scheduling", hrefLabel: "Open scheduling", details: [{ label: "Roles", value: "Waiter, Front Desk" }] });
    }
    if (wd === 1 || wd === 3 || wd === 5) {
      // Mock case: a second, identical "Morning shift" (other client) so Week/Day can show the merged "3 people" row.
      out.push({ id: `shift-m2-${o}`, typeId: "shift", title: "Morning shift", subtitle: LOUNGE.name, start: stamp(o, 6), end: stamp(o, 14), people: [CHIOMA], client: HOTEL, status: "Fully staffed", href: "/admin/workforce/scheduling", hrefLabel: "Open scheduling" });
    }
    if (wd === 5 || wd === 6) {
      out.push({ id: `shift-e-${o}`, typeId: "shift", title: "Evening shift", subtitle: LOUNGE.name, start: stamp(o, 16), end: stamp(o, 22), people: [CHIOMA, IBRAHIM], client: LOUNGE, status: o === 3 || o === 4 ? "1 position open" : "Fully staffed", attention: o === 3 || o === 4, href: "/admin/workforce/scheduling", hrefLabel: "Open scheduling", details: [{ label: "Roles", value: "Bar Attendant, Waiter" }] });
    }
    if (wd === 1) {
      out.push({ id: `meet-${o}`, typeId: "other", title: "HR weekly meeting", subtitle: "Beeliv office", start: stamp(o, 10), end: stamp(o, 11), people: [ME, KELECHI], status: "Recurring weekly", details: [{ label: "Where", value: "Beeliv office, Abuja" }] });
    }
  }
  // Same-time pile-up today: three events overlapping to show side-by-side layout and a conflict.
  out.push(
    { id: "other-brief", typeId: "other", title: "Client briefing call", subtitle: HOTEL.name, start: stamp(0, 9, 30), end: stamp(0, 10, 30), people: [ME], client: HOTEL, status: "Confirmed", details: [{ label: "Where", value: "Video call" }] },
    { id: "other-training", typeId: "other", title: "Onboarding session", subtitle: "Training room", start: stamp(0, 10), end: stamp(0, 12), people: [KELECHI, AMINA], status: "Confirmed" },
    { id: "other-lunch", typeId: "other", title: "Panel preparation", subtitle: "Beeliv office", start: stamp(1, 13), end: stamp(1, 14, 30), people: [ME, KELECHI] },
  );
  out.push(
    { id: "leave-1", typeId: "leave", title: "Annual leave", subtitle: "Amina Sample", ...allDay(2, 4), people: [AMINA], client: HOTEL, status: "Approved", href: "/admin/workforce/leave", hrefLabel: "Open leave" },
    { id: "leave-2", typeId: "leave", title: "Sick leave", subtitle: "Tunde Sample", ...allDay(-3, -2), people: [TUNDE], client: HOTEL, status: "Approved", href: "/admin/workforce/leave", hrefLabel: "Open leave" },
    { id: "leave-3", typeId: "leave", title: "Leave request", subtitle: "Chioma Sample", ...allDay(9, 11), people: [CHIOMA], client: LOUNGE, status: "Waiting for a decision", attention: true, href: "/admin/workforce/leave", hrefLabel: "Open leave" },
    { id: "leave-4", typeId: "leave", title: "Annual leave", subtitle: "Funke Sample", ...allDay(16, 20), people: [ME], status: "Approved", href: "/admin/workforce/leave", hrefLabel: "Open leave" },
    { id: "doc-1", typeId: "document", title: "Food handler certificates due", subtitle: "Demo Lounge Lagos staff", ...allDay(5), client: LOUNGE, status: "3 documents outstanding", attention: true, href: "/admin/recruitment/documentation", hrefLabel: "Open documentation" },
    { id: "doc-2", typeId: "document", title: "Reference checks due", subtitle: "Waiter / Waitress shortlist", ...allDay(12), status: "On track", href: "/admin/recruitment/documentation", hrefLabel: "Open documentation" },
    { id: "ann-1", typeId: "announcement", title: "New uniform policy takes effect", subtitle: "All staff", ...allDay(7), status: "Published", href: "/admin/notifications", hrefLabel: "Open notifications" },
    { id: "ann-2", typeId: "announcement", title: "Staff town hall", subtitle: "Beeliv office", start: stamp(14, 15), end: stamp(14, 16), people: [ME], status: "Scheduled", href: "/admin/notifications", hrefLabel: "Open notifications" },
  );
  return out;
}

const overrides = new Map<string, { start: string; end: string }>();
const listeners = new Set<() => void>();

export const mockCalendarAdapter: CalendarAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  async getCalendar(range) {
    const mode = await previewGate();
    const facetsBase = { clients: [HOTEL, LOUNGE], people: [ME, KELECHI, AMINA, TUNDE, CHIOMA, IBRAHIM] };
    if (mode === "empty") return { types: TYPES, events: [], facets: facetsBase, me: ME } satisfies CalendarData;

    const events: CalendarEvent[] = [];

    const ints = await listInterviews({ search: "", tab: "all", stageId: "", vacancyId: "", interviewerId: "", range, sort: "soonest", page: 1, pageSize: 200 });
    for (const r of ints.rows) {
      if (!r.at) continue;
      const practical = r.stageId === "practical";
      const start = new Date(r.at);
      const client = { id: slug(r.client), name: r.client };
      events.push({
        id: r.id,
        typeId: practical ? "assessment" : "interview",
        title: r.candidateName,
        subtitle: `${r.stageName}, ${r.vacancy}`,
        start: r.at,
        end: new Date(start.getTime() + (r.durationMins || 45) * 60_000).toISOString(),
        people: r.interviewer ? [r.interviewer] : [],
        client,
        status: r.status === "completed" ? "Completed" : r.status === "cancelled" ? "Cancelled" : "Scheduled",
        attention: r.needsAttention,
        href: `/admin/recruitment/interviews/${r.id}`,
        hrefLabel: "Open interview",
        details: [{ label: "Vacancy", value: r.vacancy }, ...(r.method ? [{ label: "How", value: r.method === "in-person" ? "In person" : r.method === "video" ? "Video call" : "Phone call" }] : []), ...(r.location ? [{ label: "Where", value: r.location }] : [])],
      });
    }

    const vac = await listVacancies({ search: "", tab: "open", status: "", department: "", clientId: "", recruiterId: "", sort: "closing", page: 1, pageSize: 200 });
    for (const v of vac.rows) {
      const [y, m, d] = v.closesOn.split("-").map(Number);
      const day = new Date(y, m - 1, d);
      events.push({
        id: `vac-${v.id}`,
        typeId: "vacancy",
        title: `${v.title} closes`,
        subtitle: v.client.name,
        start: day.toISOString(),
        end: new Date(y, m - 1, d + 1).toISOString(),
        allDay: true,
        client: v.client,
        people: v.recruiter ? [v.recruiter] : [],
        status: v.status === "closing-soon" ? "Closing soon" : "Open",
        href: `/admin/recruitment/vacancies/${v.id}`,
        hrefLabel: "Open vacancy",
        details: [{ label: "Openings", value: String(v.openings) }],
      });
    }

    events.push(...fixtures());
    const inRange = events
      .map((e) => (overrides.has(e.id) ? { ...e, ...overrides.get(e.id)! } : e))
      .filter((e) => e.end > range.from && e.start < range.to);

    const interviewers = new Map<string, CalendarPerson>(facetsBase.people.map((p) => [p.id, p]));
    for (const e of inRange) for (const p of e.people ?? []) interviewers.set(p.id, p);
    const clients = new Map(facetsBase.clients.map((c) => [c.id, c]));
    for (const e of inRange) if (e.client) clients.set(e.client.id, e.client);
    return { types: TYPES, events: inRange, facets: { clients: [...clients.values()], people: [...interviewers.values()] }, me: ME };
  },

  async moveEvent(id, start, end) {
    overrides.set(id, { start, end });
  },
};
