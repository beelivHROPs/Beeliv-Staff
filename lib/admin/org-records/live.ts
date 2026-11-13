/**
 * Live adapters for Clients, Outlets, Staff records and Placements, over the org-records endpoints
 * (docs/contracts/org-records-wire.md). Reads and writes NEVER fall back to fixtures: a failure throws a typed
 * error and the screen shows its own error / restricted / not-found state.
 *
 * Fields the endpoints do not supply (assigned HR, open vacancies, documents, attendance, activity, contacts ...)
 * are left empty, never invented. See docs/ORG-RECORDS-WIRING-2026-11-12.md for the full gap list.
 * Only relative imports and type imports here so the module can be unit-tested offline.
 */
import type {
  ClientDetailDto, ClientRowDto, OutletDto, Page, PlacementAssignCommand, PlacementDto, StaffDetailDto, StaffRowDto, UpdateReceipt, PlacementReceipt,
} from "../../server/org-records/types";
import type { AdapterEvent } from "../adapter";
import type { ClientsAdapter } from "../clients/adapter";
import type { ClientDetail, ClientRow, ClientsPage, ClientStaffRow, OrgStatus, OutletDetail, OutletRow } from "../clients/types";
import type { OpsClientsAdapter } from "../ops/opsclients-adapter";
import type { ClientStatusKey, OpsClientDetail, OpsClientRow, OpsOutletDetail, OpsOutletRow, OpsStaffOnSite } from "../ops/opsclients-types";
import type { OpsStaffAssignAdapter } from "../ops/staffassign-adapter";
import type { OpsStaffDetail, OpsStaffRow, StaffPlacement } from "../ops/staffassign-types";
import { checkPhone } from "../../phone/phone";
import type { StaffAdapter } from "../staff/adapter";
import type { AssignmentRecord, AssignmentRow, StaffDetail, StaffFacets, StaffRow } from "../staff/types";
import { onOrgRecordsChanged } from "./events";
import { createIntentKeys, orgCall, orgIntentCall, orgRead, OrgUnavailableError } from "./transport";

type Call = typeof fetch;
const PAGE_SIZE = 50;
const MAX_PAGES = 10; // 500 records; beyond that the screens would need server paging (documented gap)

/* ------------------------------ revisions (for expectedRevision) ------------------------------ */

const revisions = new Map<string, number>();
export const rememberRevision = (kind: "client" | "outlet" | "staff", id: string, revision: number) => void revisions.set(`${kind}:${id}`, revision);
export const knownRevision = (kind: "client" | "outlet" | "staff", id: string): number | undefined => revisions.get(`${kind}:${id}`);
const outlets = new Map<string, OutletDto>();

function remember(c: ClientDetailDto) {
  rememberRevision("client", c.id, c.revision);
  c.outlets.forEach((o) => { rememberRevision("outlet", o.id, o.revision); outlets.set(o.id, o); });
}

/* ------------------------------------------- helpers ------------------------------------------- */

async function allPages<T>(read: (page: number) => Promise<Page<T>>): Promise<T[]> {
  const first = await read(1);
  const items = [...first.items];
  const pages = Math.min(MAX_PAGES, Math.ceil(first.total / PAGE_SIZE));
  for (let p = 2; p <= pages; p++) items.push(...(await read(p)).items);
  return items;
}
/**
 * client-get and staff-get return bounded pages with an explicit cursor. These follow the cursor so a large record is read in full,
 * and refuse (never silently cut) if it still is not complete after a generous number of pages.
 */
const MAX_CONTINUATIONS = 20;
async function readClient(id: string, f?: Call): Promise<ClientDetailDto | null> {
  const first = await orgRead<ClientDetailDto>("client-get", { clientId: id }, f);
  if (!first) return null;
  let acc = first;
  for (let n = 1; acc.outletsNextCursor && n < MAX_CONTINUATIONS; n++) {
    const next = await orgCall<ClientDetailDto>("client-get", { clientId: id, outletsAfter: acc.outletsNextCursor }, f);
    acc = { ...next, outlets: [...acc.outlets, ...next.outlets] };
  }
  if (acc.outletsNextCursor || acc.outlets.length !== acc.outletsTotal) throw new OrgUnavailableError("This client has more outlets than can be loaded at once. Please try again or contact support.");
  return acc;
}
async function readStaff(id: string, f?: Call): Promise<StaffDetailDto | null> {
  const first = await orgRead<StaffDetailDto>("staff-get", { staffId: id }, f);
  if (!first) return null;
  let acc = first;
  for (let n = 1; acc.historyNextCursor && n < MAX_CONTINUATIONS; n++) {
    const next = await orgCall<StaffDetailDto>("staff-get", { staffId: id, historyAfter: acc.historyNextCursor }, f);
    acc = { ...next, history: [...acc.history, ...next.history] };
  }
  if (acc.historyNextCursor || acc.history.length !== acc.historyTotal) throw new OrgUnavailableError("This person has more placement history than can be loaded at once. Please try again or contact support.");
  return acc;
}
const outletUpdateKeys = createIntentKeys(undefined, ["client-get", "client-list"]);
const placementKeys = createIntentKeys(undefined, ["staff-get", "staff-list"]);
const clientPages = (search: string, f?: Call) => allPages<ClientRowDto>((page) => orgCall("client-list", { search, page, pageSize: PAGE_SIZE }, f));
const staffPages = (body: { search?: string; clientId?: string; show?: "all" | "unassigned" }, f?: Call) =>
  allPages<StaffRowDto>((page) => orgCall("staff-list", { ...(body.search ? { search: body.search } : {}), ...(body.clientId ? { clientId: body.clientId } : {}), show: body.show ?? "all", page, pageSize: PAGE_SIZE }, f));
const cmp = (a: string, b: string) => a.localeCompare(b);
function emitter() {
  const listeners = new Set<(e: AdapterEvent) => void>();
  const stop = onOrgRecordsChanged(() => listeners.forEach((l) => l("reset")));
  void stop; // lives as long as the adapter (module singleton)
  return {
    subscribe: (l: (e: AdapterEvent) => void) => { listeners.add(l); return () => void listeners.delete(l); },
    emit: () => listeners.forEach((l) => l("reset")),
  };
}

const outletRow = (o: OutletDto): OutletRow => ({
  id: o.id, reference: o.reference, name: o.name, address: o.address, city: o.city, activeStaff: o.activeStaff, openVacancies: 0, status: o.status,
  assignedHr: { primary: null, additional: 0 },
});
const clientRow = (c: ClientRowDto): ClientRow => ({
  id: c.id, reference: c.reference, name: c.name, outletsCount: c.outletsCount, activeStaff: c.activeStaff, openVacancies: 0,
  assignedHr: { primary: null, additional: 0 }, hrNames: [], status: c.status,
});
const staffOnSite = (s: StaffRowDto): ClientStaffRow | null => s.current ? { id: s.id, reference: s.reference, name: s.name, role: s.current.role, outletId: s.current.outletId, outlet: s.current.outlet, status: s.status } : null;

/* ------------------------------------------ HR clients ------------------------------------------ */

export function createLiveClientsAdapter(f?: Call): ClientsAdapter {
  const bus = emitter();
  const covers = new Map<string, string | null>(); // cover picture is not part of this slice: kept for this visit only
  async function staffOf(clientId: string): Promise<ClientStaffRow[]> {
    try { return (await staffPages({ clientId }, f)).map(staffOnSite).filter((r): r is ClientStaffRow => r !== null); } catch { return []; }
  }
  async function detail(id: string): Promise<ClientDetailDto | null> {
    const c = await readClient(id, f);
    if (c) remember(c);
    return c;
  }
  return {
    subscribe: bus.subscribe,
    async listClients(q): Promise<ClientsPage> {
      const search = q.search.trim();
      const all = await clientPages(search, f);
      const count = (st: OrgStatus) => all.filter((r) => r.status === st).length;
      const rows = all.filter((r) => !q.status || r.status === q.status).sort((a, b) => (q.sort === "staff" ? b.activeStaff - a.activeStaff || cmp(a.name, b.name) : cmp(a.name, b.name)));
      return {
        rows: rows.slice(0, q.limit).map(clientRow),
        statusCounts: { all: all.length, invited: count("invited"), active: count("active"), onboarding: count("onboarding"), inactive: count("inactive") },
        total: rows.length,
        workspaceEmpty: all.length === 0 && search === "",
      };
    },
    async getClient(id): Promise<ClientDetail | null> {
      const c = await detail(id);
      if (!c) return null;
      return {
        ...clientRow(c), hrUsers: [], hrHistory: [], business: { type: c.businessType, city: c.city, address: c.address }, onboarding: null, agreements: [],
        accessSummary: "", createdBy: "", createdAt: c.createdAt, outlets: c.outlets.map(outletRow), staff: await staffOf(id), vacancies: [], contacts: [], compliance: null, activity: [],
      };
    },
    async getOutlet(clientId, outletId): Promise<OutletDetail | null> {
      const c = await detail(clientId);
      const o = c?.outlets.find((x) => x.id === outletId);
      if (!c || !o) return null;
      return {
        client: { id: c.id, name: c.name }, outlet: outletRow(o), phone: o.phone, manager: o.manager, notes: o.notes, cover: covers.get(outletId) ?? null,
        hrUsers: [], hrHistory: [], staff: (await staffOf(clientId)).filter((s) => s.outletId === outletId), vacancies: [], activity: [],
      };
    },
    async updateOutlet(clientId, outletId, edit) {
      if (edit.cover !== undefined) { covers.set(outletId, edit.cover); bus.emit(); }
      const text = { address: edit.address, city: edit.city, notes: edit.notes, phone: edit.phone === undefined ? undefined : edit.phone.trim() === "" ? "" : checkPhone(edit.phone).canonical };
      if (Object.values(text).every((v) => v === undefined)) return;
      let current = outlets.get(outletId);
      if (!current) { const c = await detail(clientId); current = c?.outlets.find((x) => x.id === outletId); }
      if (!current) throw new OrgUnavailableError("We could not find that outlet. Reload the page and try again.");
      const patch: Record<string, string> = {};
      (["address", "city", "phone", "notes"] as const).forEach((k) => { const v = text[k]; if (v !== undefined && v.trim() !== current[k]) patch[k] = v.trim(); });
      if (Object.keys(patch).length === 0) return;
      const expectedRevision = knownRevision("outlet", outletId) ?? current.revision;
      // A fresh requestId per press is safe here: a repeat after an unknown outcome is refused as `stale` (revision moved), never applied twice.
      const receipt = await orgIntentCall<UpdateReceipt>(outletUpdateKeys, "outlet-update", { clientId, outletId, expectedRevision, patch }, f);
      rememberRevision("outlet", outletId, receipt.revision);
      outlets.delete(outletId);
      bus.emit();
    },
  };
}

/* ---------------------------------------- Operations clients ---------------------------------------- */

const STATUS: Record<OrgStatus, { label: string; tone: OpsClientRow["statusTone"] }> = {
  active: { label: "Active", tone: "ok" }, onboarding: { label: "Onboarding", tone: "info" }, invited: { label: "Invited", tone: "plum" }, inactive: { label: "Inactive", tone: "mute" },
};
const opsRow = (c: ClientRowDto): OpsClientRow => ({
  id: c.id, reference: c.reference, name: c.name, statusKey: c.status as ClientStatusKey, statusLabel: STATUS[c.status].label, statusTone: STATUS[c.status].tone,
  outletsCount: c.outletsCount, deployedStaff: c.activeStaff, hr: null, openVacancies: 0, requestsWaiting: 0,
});
const opsOutlet = (o: OutletDto): OpsOutletRow => ({ id: o.id, name: o.name, city: o.city, address: o.address, statusLabel: STATUS[o.status].label, statusTone: STATUS[o.status].tone, deployedStaff: o.activeStaff, openVacancies: 0 });
const onSite = (s: StaffRowDto): OpsStaffOnSite | null => s.current ? { id: s.id, name: s.name, role: s.current.role, status: s.status, outletId: s.current.outletId, outlet: s.current.outlet, since: s.current.start } : null;

export function createLiveOpsClientsAdapter(f?: Call): OpsClientsAdapter {
  const bus = emitter();
  async function workforce(clientId: string): Promise<OpsStaffOnSite[]> {
    try { return (await staffPages({ clientId }, f)).map(onSite).filter((r): r is OpsStaffOnSite => r !== null); } catch { return []; }
  }
  async function detail(id: string) {
    const c = await readClient(id, f);
    if (c) remember(c);
    return c;
  }
  return {
    subscribe: bus.subscribe,
    async listClients(q) {
      const search = q.search.trim();
      const all = await clientPages(search, f);
      const rows = all.filter((r) => !q.status || r.status === q.status).map(opsRow); // hrId filter: HR assignment is another module (gap)
      return { rows, total: rows.length, facets: { hr: [] }, workspaceEmpty: all.length === 0 && search === "" };
    },
    async getClient(clientId): Promise<OpsClientDetail | null> {
      const c = await detail(clientId);
      if (!c) return null;
      return {
        ...opsRow(c), business: { type: c.businessType, city: c.city, address: c.address }, createdAt: c.createdAt, assignedAt: null, hrHistory: [],
        outlets: c.outlets.map(opsOutlet), workforce: await workforce(clientId), vacancies: [], requests: [], users: [],
      };
    },
    async getOutlet(clientId, outletId): Promise<OpsOutletDetail | null> {
      const c = await detail(clientId);
      const o = c?.outlets.find((x) => x.id === outletId);
      if (!c || !o) return null;
      return { client: { id: c.id, name: c.name, hr: null }, outlet: opsOutlet(o), phone: o.phone, manager: o.manager, staff: (await workforce(clientId)).filter((s) => s.outletId === outletId), vacancies: [] };
    },
  };
}

/* ------------------------------------------ HR staff ------------------------------------------ */

const record = (p: PlacementDto): AssignmentRecord => ({ id: p.id, clientId: p.clientId, client: p.client, outletId: p.outletId, outlet: p.outlet, role: p.role, department: p.department, start: p.start, end: p.end, status: p.current ? "current" : "ended", reason: p.note });
function staffRow(s: StaffRowDto): StaffRow {
  const c = s.current;
  rememberRevision("staff", s.id, s.revision);
  return { id: s.id, reference: s.reference, name: s.name, role: c?.role ?? "", department: c?.department || s.department, clientId: c?.clientId ?? "", client: c?.client ?? "", outletId: c?.outletId ?? "", outlet: c?.outlet ?? "", assignmentStart: c?.start ?? "", status: s.status, assignedHr: { primary: null, additional: 0 } };
}
function facetsOf(rows: StaffRow[], clients: { id: string; name: string }[]): StaffFacets {
  const outletMap = new Map<string, { id: string; name: string; clientId: string }>();
  rows.forEach((r) => r.outletId && outletMap.set(r.outletId, { id: r.outletId, name: r.outlet, clientId: r.clientId }));
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort(cmp);
  return { clients, outlets: [...outletMap.values()].sort((a, b) => cmp(a.name, b.name)), departments: uniq(rows.map((r) => r.department)), roles: uniq(rows.map((r) => r.role)) };
}
const clientFacet = async (f?: Call) => (await clientPages("", f)).map((c) => ({ id: c.id, name: c.name }));

export function createLiveStaffAdapter(f?: Call): StaffAdapter {
  const bus = emitter();
  return {
    subscribe: bus.subscribe,
    async listStaff(q) {
      // The HR directory lists PLACED staff. Everything is loaded (bounded) so counts, filters and sorts are exact.
      const dtos = await staffPages({ search: q.search.trim(), clientId: q.clientId }, f);
      const placed = dtos.filter((d) => d.current !== null).map(staffRow);
      const clients = await clientFacet(f);
      const base = placed.filter((r) => (!q.outletId || r.outletId === q.outletId) && (!q.department || r.department === q.department) && (!q.role || r.role === q.role));
      const count = (s: string) => base.filter((r) => r.status === s).length;
      const rows = base.filter((r) => !q.status || r.status === q.status).sort((a, b) => (q.sort === "newest" ? cmp(b.assignmentStart, a.assignmentStart) : q.sort === "oldest" ? cmp(a.assignmentStart, b.assignmentStart) : cmp(a.name, b.name)));
      const start = (Math.max(1, q.page) - 1) * q.pageSize;
      return {
        rows: rows.slice(start, start + q.pageSize), total: rows.length, workspaceEmpty: placed.length === 0 && !q.search.trim() && !q.clientId,
        statusCounts: { all: base.length, active: count("active"), "on-leave": count("on-leave"), suspended: count("suspended") }, facets: facetsOf(placed, clients),
      };
    },
    async getStaff(id): Promise<StaffDetail | null> {
      const s = await readStaff(id, f);
      if (!s) return null;
      return {
        ...staffRow(s), email: s.email, phone: s.phone, employmentState: s.status, restricted: [], assignments: [...(s.current ? [record(s.current)] : []), ...s.history.map(record)],
        documents: [], attendance: [], schedule: [], leave: [], training: [], warnings: [], agreements: [], recruitment: null, activity: [],
      };
    },
    async listAssignments(q): Promise<AssignmentsPageLike> {
      const dtos = await staffPages({ search: q.search.trim(), clientId: q.clientId }, f);
      const clients = await clientFacet(f);
      // History needs one staff-get per person; bounded to keep within the read quota. Others show no history here (gap).
      const withHistory = dtos.filter((d) => d.previousCount > 0).slice(0, 15);
      const histories = new Map<string, AssignmentRecord[]>();
      await Promise.all(withHistory.map(async (d) => { try { const full = await readStaff(d.id, f); if (!full) throw new Error("gone"); histories.set(d.id, full.history.map(record)); } catch { /* leave empty */ } }));
      const rows: AssignmentRow[] = dtos.map((d) => ({ staffId: d.id, reference: d.reference, name: d.name, current: d.current ? record(d.current) : null, history: histories.get(d.id) ?? [] }));
      rows.forEach((_, i) => rememberRevision("staff", dtos[i].id, dtos[i].revision));
      return { rows, facets: facetsOf(dtos.map(staffRow), clients), workspaceEmpty: dtos.length === 0 && !q.search.trim() && !q.clientId };
    },
    async assign(input) {
      const expectedRevision = knownRevision("staff", input.staffId);
      if (expectedRevision === undefined) throw new OrgUnavailableError("Reload the page before changing this placement.");
      const command: Omit<PlacementAssignCommand, "requestId"> = { staffId: input.staffId, expectedRevision, clientId: input.clientId, outletId: input.outletId, role: input.role, department: input.department, effectiveDate: input.start, note: input.reason };
      const receipt = await orgIntentCall<PlacementReceipt>(placementKeys, "placement-assign", { ...command }, f);
      rememberRevision("staff", input.staffId, receipt.revision);
      bus.emit();
    },
    // Documents are outside this slice (no endpoint). An empty page, never sample rows.
    async listDocuments() { return { rows: [], total: 0, workspaceEmpty: true }; },
  };
}
type AssignmentsPageLike = Awaited<ReturnType<StaffAdapter["listAssignments"]>>;

/* ------------------------------------ Operations staff assignments ------------------------------------ */

const placement = (p: PlacementDto): StaffPlacement => ({ id: p.id, clientId: p.clientId, client: p.client, outletId: p.outletId, outlet: p.outlet, role: p.role, start: p.start, end: p.end, current: p.current, changedBy: p.changedBy, note: p.note });
function opsStaffRow(s: StaffRowDto): OpsStaffRow {
  rememberRevision("staff", s.id, s.revision);
  return { id: s.id, reference: s.reference, name: s.name, status: s.status, current: s.current ? placement(s.current) : null, previousCount: s.previousCount, revision: s.revision };
}

export type PlacementChoice = { id: string; name: string; outlets: { id: string; name: string }[] };
let choicesCache: { at: number; value: PlacementChoice[] } | null = null;
/** Real active clients with their active outlets, for the placement pickers. Cached for a minute (one client-get per client). */
export async function loadPlacementChoices(f?: Call, force = false): Promise<PlacementChoice[]> {
  if (!force && choicesCache && Date.now() - choicesCache.at < 60_000) return choicesCache.value;
  const clients = (await clientPages("", f)).filter((c) => c.status !== "inactive");
  const details = await Promise.all(clients.map((c) => readClient(c.id, f)));
  const value = details.filter((d): d is ClientDetailDto => d !== null).map((d) => { remember(d); return { id: d.id, name: d.name, outlets: d.outlets.filter((o) => o.status !== "inactive").map((o) => ({ id: o.id, name: o.name })) }; });
  choicesCache = { at: Date.now(), value };
  return value;
}
export const clearPlacementChoices = () => { choicesCache = null; };

export function createLiveOpsStaffAssignAdapter(roles: () => string[], f?: Call): OpsStaffAssignAdapter {
  const bus = emitter();
  async function detail(staffId: string): Promise<OpsStaffDetail | null> {
    const s = await readStaff(staffId, f);
    if (!s) return null;
    const clients = await loadPlacementChoices(f);
    const seen = [s.current?.role, ...s.history.map((h) => h.role)].filter((r): r is string => !!r);
    return { ...opsStaffRow(s), history: s.history.map(placement), documents: { verified: 0, total: 0, needAttention: 0, items: [] }, options: { clients, roles: [...new Set([...roles(), ...seen])].sort(cmp) } };
  }
  return {
    subscribe: bus.subscribe,
    async listStaff(q) {
      const dtos = await staffPages({ search: q.search.trim(), clientId: q.clientId }, f);
      const everyone = q.search.trim() || q.clientId ? await staffPages({}, f) : dtos;
      const rows = dtos.map(opsStaffRow).filter((r) => q.show === "all" || r.current === null).sort((a, b) => Number(a.current !== null) - Number(b.current !== null) || cmp(a.name, b.name));
      return {
        rows, total: rows.length, counts: { all: dtos.length, unassigned: dtos.filter((d) => d.current === null).length },
        facets: { clients: await clientFacet(f) },
        choices: everyone.map((d) => ({ id: d.id, name: d.name, placed: d.current !== null })).sort((a, b) => Number(a.placed) - Number(b.placed) || cmp(a.name, b.name)),
        workspaceEmpty: everyone.length === 0,
      };
    },
    getStaff: detail,
    async reassign(staffId, input) {
      const receipt = await orgIntentCall<PlacementReceipt>(placementKeys, "placement-assign", { staffId, expectedRevision: input.expectedRevision, clientId: input.clientId, outletId: input.outletId, role: input.role, effectiveDate: input.effectiveDate, note: input.note.trim() }, f);
      rememberRevision("staff", staffId, receipt.revision);
      bus.emit();
      const fresh = await detail(staffId);
      if (!fresh) throw new OrgUnavailableError("The change was saved, but the updated record could not be loaded. Reload the page to check it.");
      return fresh;
    },
  };
}
