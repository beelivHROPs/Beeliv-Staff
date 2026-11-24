/**
 * Staff "My Assignment" (docs/contracts/day1-assignment-client-shifts.sql, public.staff_my_assignment). Pure: no I/O, so it is
 * unit-tested offline (tests/day1-assignment-shifts.test.cjs). The database derives the person from the session; the browser
 * sends nothing about who it is, so the action takes NO input fields at all.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null);
const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : "");
const date = (v: unknown) => (typeof v === "string" && DATE.test(v.slice(0, 10)) ? v.slice(0, 10) : "");

export type MyAssignmentCurrent = { id: string; clientName: string; outletName: string; city: string; role: string; department: string; startDate: string };
export type MyAssignmentPast = { id: string; clientName: string; outletName: string; role: string; department: string; startDate: string; endDate: string };
export type MyAssignment = { ok: true; reference: string | null; current: MyAssignmentCurrent | null; history: MyAssignmentPast[] };

/** The request body must be an empty object: no person id, no client, no outlet (the server knows who is asking). */
export function validMyAssignmentInput(input: unknown): boolean {
  const r = rec(input);
  return !!r && Object.keys(r).length === 0;
}

/** Keeps only the documented fields; anything malformed is dropped (never repaired, never invented). */
export function projectMyAssignment(data: unknown): MyAssignment {
  const d = rec(data) ?? {};
  const c = rec(d.current);
  const current: MyAssignmentCurrent | null = c && UUID.test(str(c.id)) && date(c.startDate)
    ? { id: str(c.id), clientName: str(c.clientName), outletName: str(c.outletName), city: str(c.city), role: str(c.role), department: str(c.department), startDate: date(c.startDate) }
    : null;
  const history = (Array.isArray(d.history) ? d.history : []).slice(0, 200).flatMap((raw): MyAssignmentPast[] => {
    const h = rec(raw);
    if (!h || !UUID.test(str(h.id)) || !date(h.startDate) || !date(h.endDate)) return [];
    return [{ id: str(h.id), clientName: str(h.clientName), outletName: str(h.outletName), role: str(h.role), department: str(h.department), startDate: date(h.startDate), endDate: date(h.endDate) }];
  });
  const reference = typeof d.reference === "string" && d.reference.trim() ? d.reference.trim().slice(0, 40) : null;
  return { ok: true, reference, current, history };
}
