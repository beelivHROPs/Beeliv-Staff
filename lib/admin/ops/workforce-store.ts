/**
 * DEV FIXTURE: the one staff-placement store behind both Operations screens
 * "Clients & Outlets" (deployed staff per client / outlet) and "Staff
 * Assignments". FICTIONAL. Clients, outlets and their ids come from the shared
 * HR fixture lists (`staff/mock`), so names and ids agree with the HR screens;
 * the HR adapters themselves are NOT called or edited (they only return the
 * clients assigned to one HR user, Operations needs all of them). A reassignment
 * written here is visible on every Operations screen; the HR fixtures are not
 * updated (the real backend is one source). Rules are PROVISIONAL mock
 * behaviour: docs/contracts/ops-staff-assignments.md.
 */
import { isoOffset } from "@/lib/applicant/time";
import { subscribePrototypeMode } from "../dev-controls";
import { MOCK_CLIENTS, MOCK_OUTLETS } from "../staff/mock";
import type { DocState, StaffStatus } from "../staff/types";
import type { AdapterEvent } from "../adapter";
import type { ISODateTime } from "../types";

export interface Placement {
  id: string;
  clientId: string;
  client: string;
  outletId: string;
  outlet: string;
  role: string;
  start: ISODateTime;
  end: ISODateTime | null;
  current: boolean;
  /** Who recorded it (name only). */
  changedBy: string;
  note: string | null;
}

export interface StaffRec {
  id: string;
  /** Server-generated in the real system. */
  reference: string;
  name: string;
  status: StaffStatus;
  /** Newest first. The one with `current: true` (if any) is where the person works now. */
  placements: Placement[];
  /** Bumps on every change. A save with an old one is refused (conflict). */
  revision: number;
  docIdx: number;
}

const SYSTEM = "Beeliv Operations (sample)";
export const ME = "Adaeze Sample (Head of Operations)";
export const COLLEAGUE = "Tobi Sample (Operations)";

const ROLE_NAMES = ["Waiter / Waitress", "Commis Chef", "Bar Attendant", "Front Desk Officer", "Floor Supervisor", "Steward"];

/** name, role index, outlet id, started N days ago, status, has an earlier placement */
type Seed = [string, number, string, number, StaffStatus, boolean];
const SEEDS: Seed[] = [
  ["Folake Sample", 1, "o-lounge-vi", 38, "active", false],
  ["Tola Sample", 4, "o-hotel-main", 52, "active", false],
  ["Adaeze Sample", 0, "o-hotel-main", 210, "active", true],
  ["Babatunde Sample", 2, "o-lounge-vi", 140, "active", false],
  ["Chiamaka Sample", 3, "o-hotel-main", 320, "active", false],
  ["Damilola Sample", 1, "o-hotel-garki", 95, "on-leave", false],
  ["Efe Sample", 0, "o-hotel-garki", 60, "active", false],
  ["Funmi Sample", 5, "o-hotel-main", 400, "active", true],
  ["Goodness Sample", 2, "o-lounge-vi", 22, "active", false],
  ["Hassan Sample", 0, "o-lounge-vi", 180, "suspended", false],
  ["Ireti Sample", 3, "o-hotel-garki", 75, "active", false],
  ["Jide Sample", 4, "o-lounge-vi", 260, "active", false],
  ["Kehinde Sample", 1, "o-hotel-main", 45, "active", false],
  ["Lola Sample", 0, "o-hotel-main", 15, "active", false],
  ["Mustapha Sample", 5, "o-hotel-garki", 120, "on-leave", false],
  ["Nneka Sample", 2, "o-hotel-main", 300, "active", true],
  ["Oluwaseun Sample", 3, "o-lounge-vi", 88, "active", false],
  ["Patience Sample", 0, "o-hotel-garki", 30, "active", false],
  ["Rasheed Sample", 1, "o-lounge-vi", 205, "active", false],
  ["Simi Sample", 4, "o-hotel-garki", 170, "active", false],
  ["Taiwo Sample", 5, "o-lounge-vi", 66, "active", false],
  ["Uzoma Sample", 0, "o-cafe-ph", 50, "active", false],
  ["Vera Sample", 2, "o-events-kano", 18, "active", false],
];
/** Approved staff with no placement yet. */
const AWAITING = ["Yetunde Sample", "Zubair Sample"];

const clientOf = (id: string) => MOCK_CLIENTS.find((c) => c.id === id)!;
const outletOf = (id: string) => MOCK_OUTLETS.find((o) => o.id === id)!;

function placement(id: string, outletId: string, role: string, startDays: number, endDays: number | null, changedBy: string, note: string | null): Placement {
  const o = outletOf(outletId);
  return {
    id,
    clientId: o.clientId,
    client: clientOf(o.clientId).name,
    outletId,
    outlet: o.name,
    role,
    start: isoOffset(-startDays, 9, 0),
    end: endDays === null ? null : isoOffset(-endDays, 9, 0),
    current: endDays === null,
    changedBy,
    note,
  };
}

let recs: StaffRec[] = [];
const listeners = new Set<(e: AdapterEvent) => void>();
const notify = () => listeners.forEach((l) => l("reset"));

function seed() {
  recs = SEEDS.map(([name, r, outletId, days, status, earlier], i) => {
    const id = `s-${String(i + 1).padStart(3, "0")}`;
    const placements = [placement(`${id}-p2`, outletId, ROLE_NAMES[r], days, null, SYSTEM, null)];
    if (earlier) {
      const other = outletId === "o-hotel-main" ? "o-hotel-garki" : "o-hotel-main";
      placements.push(placement(`${id}-p1`, other, ROLE_NAMES[r], days + 150, days, SYSTEM, "Moved to another outlet at the client's request (sample note)."));
    }
    return { id, reference: `BLV-STF-PLACEHOLDER-${i + 1}`, name, status, placements, revision: 1, docIdx: i };
  });
  AWAITING.forEach((name, k) => {
    recs.push({ id: `s-${String(31 + k).padStart(3, "0")}`, reference: `BLV-STF-PLACEHOLDER-${31 + k}`, name, status: "active", placements: [], revision: 1, docIdx: SEEDS.length + k });
  });
}
seed();
subscribePrototypeMode(() => {
  seed();
  notify();
});

export const subscribeWorkforce = (l: (e: AdapterEvent) => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const allStaff = (): StaffRec[] => recs;
export const staffById = (id: string): StaffRec | undefined => recs.find((r) => r.id === id);
export const currentOf = (r: StaffRec): Placement | null => r.placements.find((p) => p.current) ?? null;
/** Active or on leave counts as deployed; suspended does not. */
export const deployedWhere = (match: (p: Placement) => boolean): StaffRec[] =>
  recs.filter((r) => {
    const p = currentOf(r);
    return r.status !== "suspended" && !!p && match(p);
  });

export const clientName = (id: string) => clientOf(id).name;
export const outletsOfClient = (clientId: string) => MOCK_OUTLETS.filter((o) => o.clientId === clientId).map((o) => ({ id: o.id, name: o.name }));
export const allClients = () => MOCK_CLIENTS.map((c) => ({ id: c.id, name: c.name, outlets: outletsOfClient(c.id) }));
export const outletInfo = (id: string) => MOCK_OUTLETS.find((o) => o.id === id) ?? null;

/** Ends the current placement on the effective date and starts the new one. Never copies or deletes: the earlier record is kept as history. */
export function writePlacement(staffId: string, p: { outletId: string; role: string; effectiveDate: string; note: string | null; actor: string }): StaffRec {
  const r = staffById(staffId);
  if (!r) throw new Error("Staff member not found");
  const o = outletOf(p.outletId);
  const start = new Date(`${p.effectiveDate}T09:00:00`).toISOString();
  r.placements = [
    { id: `${r.id}-p-${r.revision + 1}`, clientId: o.clientId, client: clientOf(o.clientId).name, outletId: o.id, outlet: o.name, role: p.role, start, end: null, current: true, changedBy: p.actor, note: p.note },
    ...r.placements.map((x) => (x.current ? { ...x, current: false, end: start } : x)),
  ];
  r.revision += 1;
  notify();
  return r;
}

/** Another Operations user moves this person first (for the ?state=conflict preview). */
export function writeOtherChange(staffId: string, avoidOutletId: string): void {
  const r = staffById(staffId);
  if (!r) return;
  const o = MOCK_OUTLETS.find((x) => x.id !== avoidOutletId && x.id !== currentOf(r)?.outletId) ?? MOCK_OUTLETS[0];
  writePlacement(staffId, { outletId: o.id, role: currentOf(r)?.role ?? ROLE_NAMES[0], effectiveDate: new Date().toISOString().slice(0, 10), note: null, actor: COLLEAGUE });
}

/* ---------- documents (status only; never NIN / bank values) ---------- */

export const DOC_TYPES = ["Identity document", "Passport photograph", "Guarantor form", "Reference letter", "Employment agreement", "Bank details form"];
export function docStates(i: number): { type: string; state: DocState; updatedAt: ISODateTime | null }[] {
  const states: DocState[] = ["verified", "verified", i % 4 === 0 ? "needs-review" : "verified", i % 5 === 0 ? "missing" : "verified", i % 6 === 0 ? "resubmitted" : "verified", i % 7 === 0 ? "rejected" : "uploaded"];
  return DOC_TYPES.map((type, k) => ({ type, state: states[k], updatedAt: states[k] === "missing" ? null : isoOffset(-(10 + k * 7 + i), 10, 0) }));
}
