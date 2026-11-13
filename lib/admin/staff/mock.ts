/**
 * DEV FIXTURE for the HR Staff slice. Everything is FICTIONAL. `BLV-...`
 * references are PLACEHOLDERS standing in for server-generated values. Status
 * values, attendance states, leave states and the "who may issue warnings" rule
 * are PROVISIONAL / not in the spec and need Beeliv confirmation. Replace this
 * file with a Supabase adapter implementing StaffAdapter.
 *
 * Scope: the signed-in HR user (Funke Sample) is assigned to two clients. One
 * extra staff member sits at an UNASSIGNED client to prove the adapter never
 * returns out-of-scope records (the 360 resolves null for that id).
 *
 * One StaffAssignment store (`assignments`) feeds the directory, the 360 and the
 * Assignments page: a reassignment writes one new record, nothing is copied.
 */
import { isoOffset } from "@/lib/applicant/time";
import { cmpIso } from "../sort";
import type { AdapterEvent } from "../adapter";
import { RestrictedError } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { getDepartments, getRoles } from "../lists/store";
import { getAdminIdentity } from "../ops/identity";
import { getAdminScope } from "../scope";
import type { StaffAdapter } from "./adapter";
import type {
  ActivityRecord,
  AssignedHr,
  AssignInput,
  AssignmentRecord,
  AssignmentRow,
  AssignmentsPage,
  AssignmentsQuery,
  DocState,
  PersonRef,
  StaffDetail,
  StaffDocRow,
  StaffDocsPage,
  StaffDocsQuery,
  StaffDocument,
  StaffFacets,
  StaffPage,
  StaffQuery,
  StaffRow,
  StaffStatus,
} from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();

const FUNKE: PersonRef = { id: "7d2c1f0e-0000-4000-8000-00000000a001", name: "Funke Sample" };
const KELECHI: PersonRef = { id: "7d2c1f0e-0000-4000-8000-00000000a002", name: "Kelechi Sample" };

/** Exported so the Clients mock reports the same clients, outlets and HR users. */
export const MOCK_CLIENTS = [
  { id: "c-demo-hotel", name: "Demo Hotel Abuja", inScope: true },
  { id: "c-demo-lounge", name: "Demo Lounge Lagos", inScope: true },
  { id: "c-demo-cafe", name: "Demo Cafe Port Harcourt", inScope: false },
  /** In scope but with no HR assigned yet (shows the "No HR assigned" flag). */
  { id: "c-demo-events", name: "Demo Events Centre Kano", inScope: true },
];
export const MOCK_OUTLETS = [
  { id: "o-hotel-main", name: "Main building", clientId: "c-demo-hotel", hr: { primary: FUNKE, additional: 1 } as AssignedHr },
  { id: "o-hotel-garki", name: "Garki annex", clientId: "c-demo-hotel", hr: { primary: FUNKE, additional: 0 } as AssignedHr },
  { id: "o-lounge-vi", name: "Victoria Island", clientId: "c-demo-lounge", hr: { primary: KELECHI, additional: 1 } as AssignedHr },
  { id: "o-cafe-ph", name: "Port Harcourt", clientId: "c-demo-cafe", hr: { primary: null, additional: 0 } as AssignedHr },
  { id: "o-events-kano", name: "Main hall", clientId: "c-demo-events", hr: { primary: null, additional: 0 } as AssignedHr },
];
const ROLES: { role: string; department: string }[] = [
  { role: "Waiter / Waitress", department: "Front of house" },
  { role: "Commis Chef", department: "Kitchen" },
  { role: "Bar Attendant", department: "Bar" },
  { role: "Front Desk Officer", department: "Front of house" },
  { role: "Floor Supervisor", department: "Management" },
  { role: "Steward", department: "Support" },
];

export const outletOf = (id: string) => MOCK_OUTLETS.find((o) => o.id === id)!;
const clientOf = (id: string) => MOCK_CLIENTS.find((c) => c.id === id)!;
const SEEDED_CLIENT_IDS = new Set(MOCK_CLIENTS.map((c) => c.id));

/**
 * Is this client inside what the prototype identity may see? Operations keeps the
 * original fixture view; an HR officer sees assigned clients (plus any client she
 * just created through the invite wizard); an HR Manager sees every client.
 */
export function clientVisible(c: { id: string; inScope: boolean }): boolean {
  if (getAdminIdentity() === "ops") return c.inScope;
  const scope = getAdminScope();
  if (scope.allClients) return true;
  if (scope.none) return false;
  return scope.clientIds.includes(c.id) || !SEEDED_CLIENT_IDS.has(c.id);
}
const scopeClientIds = () => new Set(MOCK_CLIENTS.filter(clientVisible).map((c) => c.id));

/** name, role index, outlet id, assignment started N days ago, status, applicant id (null = existing staff onboarded by invitation), has an earlier assignment */
type Seed = [string, number, string, number, StaffStatus, string | null, boolean];
const SEEDS: Seed[] = [
  ["Folake Sample", 1, "o-lounge-vi", 38, "active", "a-013", false],
  ["Tola Sample", 4, "o-hotel-main", 52, "active", "a-017", false],
  ["Adaeze Sample", 0, "o-hotel-main", 210, "active", null, true],
  ["Babatunde Sample", 2, "o-lounge-vi", 140, "active", null, false],
  ["Chiamaka Sample", 3, "o-hotel-main", 320, "active", null, false],
  ["Damilola Sample", 1, "o-hotel-garki", 95, "on-leave", null, false],
  ["Efe Sample", 0, "o-hotel-garki", 60, "active", null, false],
  ["Funmi Sample", 5, "o-hotel-main", 400, "active", null, true],
  ["Goodness Sample", 2, "o-lounge-vi", 22, "active", null, false],
  ["Hassan Sample", 0, "o-lounge-vi", 180, "suspended", null, false],
  ["Ireti Sample", 3, "o-hotel-garki", 75, "active", null, false],
  ["Jide Sample", 4, "o-lounge-vi", 260, "active", null, false],
  ["Kehinde Sample", 1, "o-hotel-main", 45, "active", null, false],
  ["Lola Sample", 0, "o-hotel-main", 15, "active", null, false],
  ["Mustapha Sample", 5, "o-hotel-garki", 120, "on-leave", null, false],
  ["Nneka Sample", 2, "o-hotel-main", 300, "active", null, true],
  ["Oluwaseun Sample", 3, "o-lounge-vi", 88, "active", null, false],
  ["Patience Sample", 0, "o-hotel-garki", 30, "active", null, false],
  ["Rasheed Sample", 1, "o-lounge-vi", 205, "active", null, false],
  ["Simi Sample", 4, "o-hotel-garki", 170, "active", null, false],
  ["Taiwo Sample", 5, "o-lounge-vi", 66, "active", null, false],
  ["Uzoma Sample", 0, "o-cafe-ph", 50, "active", null, false],
];
/** Approved, awaiting assignment (no current StaffAssignment). */
const AWAITING: [string, string][] = [
  ["Yetunde Sample", "BLV-STF-PLACEHOLDER-31"],
  ["Zubair Sample", "BLV-STF-PLACEHOLDER-32"],
];

const idOf = (i: number) => `s-${String(i + 1).padStart(3, "0")}`;
const awaitingId = (i: number) => `s-${String(31 + i).padStart(3, "0")}`;
const ts = () => new Date().toISOString();

let assignments = new Map<string, AssignmentRecord[]>(); // staffId -> newest first
let activityExtra = new Map<string, ActivityRecord[]>();

function rec(id: string, outletId: string, r: number, days: number, ended: number | null, reason: string | null): AssignmentRecord {
  const o = outletOf(outletId);
  return {
    id,
    clientId: o.clientId,
    client: clientOf(o.clientId).name,
    outletId,
    outlet: o.name,
    role: ROLES[r].role,
    department: ROLES[r].department,
    start: isoOffset(-days, 9, 0),
    end: ended === null ? null : isoOffset(-ended, 9, 0),
    status: "ended",
    reason,
  };
}

function seedAssignments() {
  assignments = new Map();
  activityExtra = new Map();
  SEEDS.forEach(([, r, outletId, days, , , earlier], i) => {
    const sid = idOf(i);
    const cur: AssignmentRecord = { ...rec(`${sid}-as2`, outletId, r, days, null, null), status: "current", end: null };
    const list = [cur];
    if (earlier) {
      const otherOutlet = outletId === "o-hotel-main" ? "o-hotel-garki" : "o-hotel-main";
      list.push(rec(`${sid}-as1`, otherOutlet, r, days + 150, days, "Moved to another outlet at the client's request (sample reason)."));
    }
    assignments.set(sid, list);
  });
}
seedAssignments();
subscribePrototypeMode(() => {
  seedAssignments();
  listeners.forEach((l) => l("reset"));
});

const current = (sid: string) => assignments.get(sid)?.find((a) => a.status === "current") ?? null;

function rowOf(i: number): StaffRow | null {
  const s = SEEDS[i];
  const sid = idOf(i);
  const cur = current(sid);
  if (!cur) return null;
  return {
    id: sid,
    reference: `BLV-STF-PLACEHOLDER-${i + 1}`,
    name: s[0],
    role: cur.role,
    department: cur.department,
    clientId: cur.clientId,
    client: cur.client,
    outletId: cur.outletId,
    outlet: cur.outlet,
    assignmentStart: cur.start,
    status: s[4],
    assignedHr: outletOf(cur.outletId).hr,
  };
}

/** Rows in this HR user's scope. Exported for the Clients mock (active staff counts). */
export function scopedStaffRows(): StaffRow[] {
  const scope = scopeClientIds();
  return SEEDS.map((_, i) => rowOf(i)).filter((r): r is StaffRow => !!r && scope.has(r.clientId));
}

function facets(): StaffFacets {
  const scope = scopeClientIds();
  return {
    clients: MOCK_CLIENTS.filter((c) => scope.has(c.id)).map((c) => ({ id: c.id, name: c.name })),
    outlets: MOCK_OUTLETS.filter((o) => scope.has(o.clientId)).map((o) => ({ id: o.id, name: o.name, clientId: o.clientId })),
    departments: getDepartments(true).map((x) => x.name), // from Lists & Rules
    roles: getRoles(true).map((x) => x.name),
  };
}

async function gate() {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  await sleep(350);
  if (mode === "error") throw new Error("Mock error");
  return mode;
}

/* ---------- detail ---------- */

const DOC_TYPES = ["Identity document", "Passport photograph", "Guarantor form", "Reference letter", "Employment agreement", "Bank details form"];
function docsOf(i: number): StaffDocument[] {
  const states: DocState[] = ["verified", "verified", i % 4 === 0 ? "needs-review" : "verified", i % 5 === 0 ? "missing" : "verified", i % 6 === 0 ? "resubmitted" : "verified", i % 7 === 0 ? "rejected" : "uploaded"];
  return DOC_TYPES.map((type, k) => ({
    id: `d-${String(i + 1).padStart(3, "0")}-${k + 1}`,
    type,
    state: states[k],
    updatedAt: states[k] === "missing" ? null : isoOffset(-(10 + k * 7 + i), 10, 0),
    reviewer: states[k] === "verified" ? FUNKE.name : null,
  }));
}

function detailOf(i: number): StaffDetail | null {
  const row = rowOf(i);
  if (!row) return null;
  const s = SEEDS[i];
  const first = s[0].split(" ")[0].toLowerCase();
  const activity: ActivityRecord[] = [
    ...(activityExtra.get(row.id) ?? []),
    { id: `${row.id}-ac2`, actor: FUNKE.name, at: row.assignmentStart, action: "Assigned to client and outlet", from: null, to: `${row.client}, ${row.outlet}` },
    { id: `${row.id}-ac1`, actor: "System", at: isoOffset(-(s[3] + 3), 9, 0), action: s[5] ? "Became staff (approved applicant)" : "Added as existing staff by invitation", from: null, to: null },
  ].sort((a, b) => b.at.localeCompare(a.at));
  const n = Number(s[5]?.slice(2) ?? 0);
  return {
    ...row,
    email: `${first}@example.test`,
    phone: "+234 800 000 0000",
    employmentState: row.status === "active" ? "Employed, assigned" : row.status === "on-leave" ? "Employed, on leave" : "Suspended",
    restricted: [
      { label: "NIN", masked: "*******7421" },
      { label: "Bank account", masked: "******3098" },
      { label: "Next of kin", masked: "Name and phone hidden" },
      { label: "Home address", masked: "Address hidden" },
    ],
    assignments: assignments.get(row.id) ?? [],
    documents: docsOf(i),
    attendance: [
      { id: "at1", date: isoOffset(-1, 0, 0), shift: "Morning 07:00-15:00", checkIn: "06:55", checkOut: "15:04", state: "Present" },
      { id: "at2", date: isoOffset(-2, 0, 0), shift: "Morning 07:00-15:00", checkIn: "07:22", checkOut: "15:01", state: "Late" },
      { id: "at3", date: isoOffset(-3, 0, 0), shift: "Evening 15:00-23:00", checkIn: null, checkOut: null, state: "Absent" },
      { id: "at4", date: isoOffset(-4, 0, 0), shift: "Morning 07:00-15:00", checkIn: "06:58", checkOut: "15:00", state: "Present" },
    ],
    schedule: [
      { id: "sc1", date: isoOffset(1, 0, 0), shift: "Morning 07:00-15:00", outlet: row.outlet },
      { id: "sc2", date: isoOffset(2, 0, 0), shift: "Morning 07:00-15:00", outlet: row.outlet },
      { id: "sc3", date: isoOffset(4, 0, 0), shift: "Evening 15:00-23:00", outlet: row.outlet },
    ],
    leave: [
      { id: "lv1", type: "Annual leave", from: isoOffset(20, 0, 0), to: isoOffset(27, 0, 0), state: "Pending" },
      { id: "lv2", type: "Sick leave", from: isoOffset(-40, 0, 0), to: isoOffset(-38, 0, 0), state: "Approved" },
    ],
    training: [
      { id: "tr1", title: "Guest service standards", kind: "SOP", state: "Acknowledged", at: isoOffset(-30, 10, 0) },
      { id: "tr2", title: "Food safety and hygiene", kind: "Training", state: i % 3 === 0 ? "Pending" : "Completed", at: i % 3 === 0 ? null : isoOffset(-20, 10, 0) },
      { id: "tr3", title: "Opening and closing procedure", kind: "SOP", state: i % 2 === 0 ? "Pending" : "Acknowledged", at: i % 2 === 0 ? null : isoOffset(-12, 10, 0) },
    ],
    warnings: i % 4 === 1 ? [{ id: "w1", title: "Sample warning record", issuedAt: isoOffset(-35, 14, 0), issuedBy: FUNKE.name, summary: "Sample entry for layout only. Real records come from the adapter." }] : [],
    agreements: [
      { id: "ag1", name: "Employment agreement", version: "v1 (sample)", state: "Accepted", at: isoOffset(-(s[3] + 2), 11, 0) },
      { id: "ag2", name: "Staff Welfare, HR & Workplace Policy Standard", version: "BH-HR-001 v1.0", state: i % 5 === 0 ? "Pending" : "Accepted", at: i % 5 === 0 ? null : isoOffset(-(s[3] + 2), 11, 5) },
    ],
    recruitment: s[5]
      ? {
          applicantId: s[5],
          applicantReference: `BLV-APP-PLACEHOLDER-${n}`,
          vacancy: row.role,
          appliedAt: isoOffset(-(s[3] + 60), 10, 0),
          milestones: [
            { id: "m1", label: "Application submitted", at: isoOffset(-(s[3] + 60), 10, 0) },
            { id: "m2", label: "Interview and assessment completed", at: isoOffset(-(s[3] + 40), 11, 0) },
            { id: "m3", label: "Documents verified", at: isoOffset(-(s[3] + 20), 11, 0) },
            { id: "m4", label: "Approved and onboarded as staff", at: isoOffset(-(s[3] + 3), 9, 0) },
          ],
        }
      : null,
    activity,
  };
}

/** An approved person with no current assignment: the 360 shows what exists (contact, documents, agreements, activity) and nothing is made up. */
function awaitingDetail(id: string): StaffDetail | null {
  const idx = AWAITING.findIndex((_, k) => awaitingId(k) === id);
  if (idx < 0 || current(id)) return null;
  const [name, reference] = AWAITING[idx];
  return {
    id,
    reference,
    name,
    role: "",
    department: "",
    clientId: "",
    client: "",
    outletId: "",
    outlet: "",
    assignmentStart: isoOffset(-5, 9, 0),
    status: "active",
    assignedHr: { primary: null, additional: 0 },
    email: `${name.split(" ")[0].toLowerCase()}@example.test`,
    phone: "+234 800 000 0000",
    employmentState: "Approved, awaiting assignment",
    restricted: [
      { label: "NIN", masked: "*******7421" },
      { label: "Bank account", masked: "******3098" },
      { label: "Next of kin", masked: "Name and phone hidden" },
      { label: "Home address", masked: "Address hidden" },
    ],
    assignments: assignments.get(id) ?? [],
    documents: docsOf(30 + idx).slice(0, 4),
    attendance: [],
    schedule: [],
    leave: [],
    training: [],
    warnings: [],
    agreements: [{ id: "ag1", name: "Employment agreement", version: "v1 (sample)", state: "Pending", at: null }],
    recruitment: null,
    activity: [{ id: `${id}-ac1`, actor: "System", at: isoOffset(-5, 9, 0), action: "Approved and added as staff", from: null, to: null }],
  };
}

const awaitingRow = (a: [string, string], idx: number): AssignmentRow =>({ staffId: awaitingId(idx), reference: a[1], name: a[0], current: null, history: [] });

export const mockStaffAdapter: StaffAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  async listStaff(q: StaffQuery): Promise<StaffPage> {
    const mode = await gate();
    const all = mode === "empty" ? [] : scopedStaffRows();
    const needle = q.search.trim().toLowerCase();
    const base = all.filter(
      (r) =>
        (!needle || [r.name, r.reference, r.role, r.department, r.client, r.outlet].some((s) => s.toLowerCase().includes(needle))) &&
        (!q.clientId || r.clientId === q.clientId) &&
        (!q.outletId || r.outletId === q.outletId) &&
        (!q.department || r.department === q.department) &&
        (!q.role || r.role === q.role),
    );
    const count = (st: StaffStatus) => base.filter((r) => r.status === st).length;
    const matched = base.filter((r) => !q.status || r.status === q.status).sort((a, b) => (q.sort === "newest" ? cmpIso(a.assignmentStart, b.assignmentStart, "desc") : q.sort === "oldest" ? cmpIso(a.assignmentStart, b.assignmentStart, "asc") : a.name.localeCompare(b.name)));
    const start = (Math.max(1, q.page) - 1) * q.pageSize;
    return {
      rows: matched.slice(start, start + q.pageSize),
      statusCounts: { all: base.length, active: count("active"), "on-leave": count("on-leave"), suspended: count("suspended") },
      total: matched.length,
      workspaceEmpty: all.length === 0,
      facets: facets(),
    };
  },

  async getStaff(id) {
    const mode = await gate();
    if (mode === "empty") return null;
    const i = SEEDS.findIndex((_, k) => idOf(k) === id);
    if (i < 0) return awaitingDetail(id);
    const d = detailOf(i);
    return d && scopeClientIds().has(d.clientId) ? d : null; // out-of-scope = not found
  },

  async listAssignments(q: AssignmentsQuery): Promise<AssignmentsPage> {
    const mode = await gate();
    const scope = scopeClientIds();
    const needle = q.search.trim().toLowerCase();
    const placed: AssignmentRow[] = mode === "empty" ? [] : SEEDS.flatMap((s, i): AssignmentRow[] => {
      const cur = current(idOf(i));
      if (!cur || !scope.has(cur.clientId)) return [];
      return [{ staffId: idOf(i), reference: `BLV-STF-PLACEHOLDER-${i + 1}`, name: s[0], current: cur, history: (assignments.get(idOf(i)) ?? []).filter((a) => a.status === "ended") }];
    });
    const awaiting = mode === "empty" ? [] : AWAITING.map(awaitingRow).filter((r) => !current(r.staffId));
    const rows = [...awaiting, ...placed].filter(
      (r) => (!needle || [r.name, r.reference, r.current?.client ?? "", r.current?.outlet ?? ""].some((s) => s.toLowerCase().includes(needle))) && (!q.clientId || r.current?.clientId === q.clientId),
    );
    return { rows, facets: facets(), workspaceEmpty: placed.length + awaiting.length === 0 };
  },

  async assign(input: AssignInput) {
    await sleep(450);
    const o = MOCK_OUTLETS.find((x) => x.id === input.outletId);
    if (!o || !scopeClientIds().has(o.clientId)) throw new RestrictedError("Outlet is outside your scope");
    if (!input.reason.trim()) throw new Error("Reason required");
    const list = assignments.get(input.staffId) ?? [];
    const next: AssignmentRecord[] = list.map((a) => (a.status === "current" ? { ...a, status: "ended", end: input.start ? new Date(input.start).toISOString() : ts(), reason: input.reason } : a));
    next.unshift({
      id: `${input.staffId}-as-${ts()}`,
      clientId: o.clientId,
      client: clientOf(o.clientId).name,
      outletId: o.id,
      outlet: o.name,
      role: input.role,
      department: input.department,
      start: input.start ? new Date(input.start).toISOString() : ts(),
      end: null,
      status: "current",
      reason: null,
    });
    assignments.set(input.staffId, next);
    activityExtra.set(input.staffId, [{ id: `x-${ts()}`, actor: FUNKE.name, at: ts(), action: list.length ? `Reassigned: ${input.reason}` : `Assigned: ${input.reason}`, from: null, to: `${clientOf(o.clientId).name}, ${o.name}` }, ...(activityExtra.get(input.staffId) ?? [])]);
    listeners.forEach((l) => l("reset"));
  },

  async listDocuments(q: StaffDocsQuery): Promise<StaffDocsPage> {
    const mode = await gate();
    const staff = mode === "empty" ? [] : scopedStaffRows();
    const all: StaffDocRow[] = staff.flatMap((r) => {
      const i = SEEDS.findIndex((_, k) => idOf(k) === r.id);
      return docsOf(i).map((d) => ({ ...d, staffId: r.id, staffName: r.name, staffReference: r.reference, client: r.client, outlet: r.outlet }));
    });
    const needle = q.search.trim().toLowerCase();
    const rows = all.filter((d) => (!needle || [d.staffName, d.staffReference, d.type, d.client, d.outlet].some((s) => s.toLowerCase().includes(needle))) && (!q.state || d.state === q.state));
    const sorted = [...rows].sort((a, b) => (q.sort === "oldest" ? cmpIso(a.updatedAt, b.updatedAt, "asc") : q.sort === "name" ? a.staffName.localeCompare(b.staffName) : cmpIso(a.updatedAt, b.updatedAt, "desc")));
    return { rows: sorted.slice(0, q.limit), total: sorted.length, workspaceEmpty: all.length === 0 };
  },
};

/** Documents-on-file summary for a client's staff (Clients > Compliance). Null when the client has no staff yet. */
export function documentCountsForClient(clientId: string): { verified: number; total: number; needAttention: number } | null {
  const rows = scopedStaffRows().filter((r) => r.clientId === clientId);
  if (rows.length === 0) return null;
  const docs = rows.flatMap((r) => docsOf(SEEDS.findIndex((_, k) => idOf(k) === r.id)));
  return {
    verified: docs.filter((d) => d.state === "verified").length,
    total: docs.length,
    needAttention: docs.filter((d) => d.state === "missing" || d.state === "needs-review" || d.state === "resubmitted" || d.state === "rejected").length,
  };
}
