/**
 * In-memory MODEL of docs/contracts/org-records-schema.sql, used by offline tests only.
 * It mirrors the SQL contract (capability cells, scope, ledger replay, revisions, one current placement,
 * soft deactivate, duplicate handling that never names the other record). It is NOT the SQL: nothing here
 * proves locking, RLS, FK or trigger behaviour. Never import this from runtime code.
 */
import type {
  ClientListQuery, OrgRecordsGateway, OrgStatus, RpcReply, StaffListQuery, StaffStatus,
} from "./types";

export type ModelActor = {
  uid: string; sessionId: string; personId: string;
  role: "head_of_operations" | "hr_manager" | "hr_officer";
  allClients: boolean;
  scopes: { clientId: string; outletId: string | null }[];
  /** Capability cells present in auth_role_permissions.permissions. Unseeded cells are simply absent. */
  cells: string[];
};
type Client = { id: string; reference: string; nameKey: string; name: string; businessType: string; city: string; address: string; status: OrgStatus; revision: number; createdAt: string; updatedAt: string };
type Outlet = { id: string; clientId: string; reference: string; nameKey: string; name: string; address: string; city: string; phone: string; manager: string; notes: string; status: OrgStatus; revision: number };
type Person = { id: string; email: string; fullName: string; phone: string; reference: string; origin: "legacy" | "recruited"; hasAccount: boolean; department: string; status: StaffStatus; revision: number; openInvites?: number };
type Placement = { id: string; staffId: string; clientId: string; outletId: string; role: string; department: string; start: string; end: string | null; changedBy: string; note: string | null };
type Event = { entity: string; entityId: string; action: string; actor: string; detail: Record<string, unknown> };

export type ModelOptions = { actors: ModelActor[]; today?: string; failAfterWrite?: boolean };

const ok = (data: Record<string, unknown>): RpcReply => ({ data: { ok: true, ...data }, error: null });
const deny = (reason: string, fields?: string[]): RpcReply => ({ data: { ok: false, reason, ...(fields ? { fields } : {}) }, error: null });
const key = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export function createMemoryOrgGateway(options: ModelOptions) {
  const state = {
    clients: new Map<string, Client>(), outlets: new Map<string, Outlet>(), people: new Map<string, Person>(), placements: [] as Placement[],
    events: [] as Event[], ledger: new Map<string, { fp: string; result: Record<string, unknown> }>(), counters: { n: 0, cli: 0, out: 0, stf: 0 },
    calls: [] as string[], failAfterWrite: !!options.failAfterWrite, today: options.today ?? "2026-11-12",
  };
  const uuid = () => `bbbbbbbb-bbbb-4bbb-8bbb-${String(++state.counters.n).padStart(12, "0")}`;
  const now = () => "2026-11-12T10:00:00.000Z";
  const actorFor = (a: { actorUid: string; sessionId: string }) => options.actors.find((x) => x.uid === a.actorUid && x.sessionId === a.sessionId) ?? null;
  const can = (who: ModelActor, cell: string) => who.cells.includes(cell);
  const inScope = (who: ModelActor, clientId: string, outletId: string | null = null) =>
    who.allClients || who.scopes.some((s) => s.clientId === clientId && (s.outletId === null || s.outletId === outletId));
  /** Any scope on the client (whole client or one outlet): enough to see it. */
  const clientVisible = (who: ModelActor, clientId: string) => who.allClients || who.scopes.some((s) => s.clientId === clientId);
  /** Client-wide scope (not limited to one outlet): needed to create outlets. */
  const wholeClient = (who: ModelActor, clientId: string) => who.allClients || who.scopes.some((s) => s.clientId === clientId && s.outletId === null);
  const current = (staffId: string) => state.placements.find((p) => p.staffId === staffId && p.end === null) ?? null;
  const visibleStaff = (who: ModelActor, staffId: string) => {
    if (who.allClients) return true;
    const cur = current(staffId);
    return !!cur && inScope(who, cur.clientId, cur.outletId);
  };
  const activeStaffAt = (clientId: string, outletId?: string) => state.placements.filter((p) => p.end === null && p.clientId === clientId && (!outletId || p.outletId === outletId)
    && state.people.get(p.staffId)?.status !== "suspended").length;

  const placementDto = (p: Placement) => ({
    id: p.id, clientId: p.clientId, client: state.clients.get(p.clientId)!.name, outletId: p.outletId, outlet: state.outlets.get(p.outletId)!.name, role: p.role, department: p.department,
    start: p.start, end: p.end, current: p.end === null, changedBy: p.changedBy, note: p.note,
  });
  /** An outlet is only built for a caller already in scope of it, so counting all of its placements stays in scope. */
  const outletDto = (o: Outlet) => ({ id: o.id, clientId: o.clientId, reference: o.reference, name: o.name, address: o.address, city: o.city, phone: o.phone, manager: o.manager, notes: o.notes, status: o.status, activeStaff: activeStaffAt(o.clientId, o.id), revision: o.revision });
  /** Counts are what the ACTOR may see (mirrors org_client_row_json(p_client,p_ctx)): outlets and placements filtered by scope. */
  const clientRow = (c: Client, who: ModelActor) => ({
    id: c.id, reference: c.reference, name: c.name, businessType: c.businessType, city: c.city, status: c.status,
    outletsCount: [...state.outlets.values()].filter((o) => o.clientId === c.id && inScope(who, c.id, o.id)).length,
    activeStaff: state.placements.filter((p) => p.end === null && p.clientId === c.id && inScope(who, p.clientId, p.outletId) && state.people.get(p.staffId)?.status !== "suspended").length,
    revision: c.revision,
  });
  /** Mirrors org_staff_row_json(p_person,p_ctx): current placement and previousCount only inside the actor's scope. */
  const scopedEnded = (who: ModelActor, staffId: string) => state.placements.filter((x) => x.staffId === staffId && x.end !== null && inScope(who, x.clientId, x.outletId));
  const staffRow = (p: Person, who: ModelActor) => {
    const cur = current(p.id);
    const shown = cur && inScope(who, cur.clientId, cur.outletId) ? cur : null;
    return { id: p.id, reference: p.reference, name: p.fullName, status: p.status, department: p.department, current: shown ? placementDto(shown) : null, previousCount: scopedEnded(who, p.id).length, revision: p.revision };
  };
  const nameOf = (who: ModelActor) => `Admin ${who.personId.slice(-4)}`;

  /** Runs `work` with ledger replay/conflict handling and all-or-nothing rollback, like one SQL function body. */
  function write(a: { actorUid: string; sessionId: string; requestId: string; fingerprint: string }, op: string, cell: string, work: (who: ModelActor) => RpcReply): RpcReply {
    state.calls.push(op);
    const who = actorFor(a);
    if (!who || !can(who, cell)) return deny("no_access");
    const k = `${who.personId}:${op}:${a.requestId}`, prior = state.ledger.get(k);
    if (prior) return prior.fp === a.fingerprint ? ok({ ...prior.result, replayed: true }) : deny("conflict");
    const snap = { clients: new Map([...state.clients].map(([i, v]) => [i, { ...v }])), outlets: new Map([...state.outlets].map(([i, v]) => [i, { ...v }])), people: new Map([...state.people].map(([i, v]) => [i, { ...v }])), placements: state.placements.map((p) => ({ ...p })), events: [...state.events], ledger: new Map(state.ledger), counters: { ...state.counters } };
    try {
      const reply = work(who);
      if (!(reply.data as { ok: boolean }).ok) throw Object.assign(new Error("denied"), { reply });
      const { ok: _ok, ...result } = reply.data as Record<string, unknown>; void _ok;
      state.ledger.set(k, { fp: a.fingerprint, result });
      if (state.failAfterWrite) throw new Error("boom");
      return ok({ ...result, replayed: false });
    } catch (error) {
      state.clients = snap.clients; state.outlets = snap.outlets; state.people = snap.people; state.placements = snap.placements; state.events = snap.events; state.ledger = snap.ledger; state.counters = snap.counters;
      const reply = (error as { reply?: RpcReply }).reply;
      return reply ?? { data: null, error: { message: "secret detail" } };
    }
  }
  const event = (entity: string, entityId: string, action: string, who: ModelActor, detail: Record<string, unknown> = {}) => state.events.push({ entity, entityId, action, actor: who.personId, detail });

  /** Shared placement writer: close current, open new, bump revision. Returns a denial or the new placement. */
  function place(who: ModelActor, p: Person, i: { clientId: string; outletId: string; role: string; department: string; date: string; note: string }): RpcReply | Placement {
    const client = state.clients.get(i.clientId), outlet = state.outlets.get(i.outletId);
    if (!client || !clientVisible(who, i.clientId)) return deny("not_found");
    if (!outlet || outlet.clientId !== i.clientId) return deny("invalid_request", ["outletId"]);
    if (client.status === "inactive" || outlet.status === "inactive") return deny("inactive");
    if (i.date > state.today) return deny("invalid_request", ["effectiveDate"]);
    const cur = current(p.id);
    if (cur) {
      if (i.date < cur.start) return deny("invalid_request", ["effectiveDate"]);
      if (cur.outletId === i.outletId && cur.role === i.role && cur.department === i.department) return deny("invalid_request", ["outletId"]);
      cur.end = i.date;
    }
    const next: Placement = { id: uuid(), staffId: p.id, clientId: i.clientId, outletId: i.outletId, role: i.role, department: i.department, start: i.date, end: null, changedBy: nameOf(who), note: i.note || null };
    state.placements.push(next);
    p.revision += 1;
    event("staff", p.id, cur ? "staff.placement_reassigned" : "staff.placement_assigned", who, { fromClient: cur?.clientId ?? null, toClient: i.clientId, toOutlet: i.outletId, role: i.role, date: i.date });
    return next;
  }

  const gateway: OrgRecordsGateway = {
    clientList: async (a) => {
      state.calls.push("clientList"); const who = actorFor(a); if (!who || !can(who, "org.client.read")) return deny("no_access");
      const q: ClientListQuery = a.query, needle = key(q.search);
      const all = [...state.clients.values()].filter((c) => clientVisible(who, c.id) && (!q.status || c.status === q.status) && (!needle || c.nameKey.includes(needle))).sort((x, y) => x.nameKey.localeCompare(y.nameKey));
      return ok({ items: all.slice((q.page - 1) * q.pageSize, q.page * q.pageSize).map((c) => clientRow(c, who)), total: all.length, page: q.page, pageSize: q.pageSize });
    },
    clientGet: async (a) => {
      state.calls.push("clientGet"); const who = actorFor(a); if (!who || !can(who, "org.client.read")) return deny("no_access");
      if (!(a.outletsLimit >= 1 && a.outletsLimit <= 200)) return deny("invalid_request");
      const c = state.clients.get(a.clientId); if (!c || !clientVisible(who, c.id)) return deny("not_found");
      const visible = [...state.outlets.values()].filter((o) => o.clientId === c.id && inScope(who, c.id, o.id)).sort((x, y) => x.nameKey.localeCompare(y.nameKey) || x.id.localeCompare(y.id));
      let start = 0;
      if (a.outletsAfter) { const at = visible.findIndex((o) => o.id === a.outletsAfter); if (at < 0) return deny("invalid_request", ["outletsAfter"]); start = at + 1; }
      const rest = visible.slice(start), more = rest.length > a.outletsLimit, page = rest.slice(0, a.outletsLimit);
      return ok({ item: { ...clientRow(c, who), address: c.address, createdAt: c.createdAt, updatedAt: c.updatedAt, outlets: page.map(outletDto),
        outletsTotal: visible.length, outletsTruncated: more, outletsNextCursor: more ? page[page.length - 1].id : null } });
    },
    clientCreate: async (a) => write(a, "client-create", "org.client.write", (who) => {
      if (!who.allClients) return deny("no_access"); // HR Officer cannot create clients (open question)
      const nk = key(a.name); if ([...state.clients.values()].some((c) => c.nameKey === nk)) return deny("duplicate", ["name"]);
      const c: Client = { id: uuid(), reference: `BLV-CLI-${String(++state.counters.cli).padStart(6, "0")}`, nameKey: nk, name: a.name, businessType: a.businessType, city: a.city, address: a.address, status: "onboarding", revision: 1, createdAt: now(), updatedAt: now() };
      state.clients.set(c.id, c); event("client", c.id, "client.created", who);
      return ok({ clientId: c.id, reference: c.reference, revision: 1 });
    }),
    clientUpdate: async (a) => write(a, "client-update", "org.client.write", (who) => {
      const c = state.clients.get(a.clientId); if (!c || !inScope(who, c.id)) return deny("not_found");
      if (c.status === "inactive") return deny("inactive");
      if (c.revision !== a.expectedRevision) return deny("stale");
      if (a.patch.name !== undefined) { const nk = key(a.patch.name); if ([...state.clients.values()].some((x) => x.id !== c.id && x.nameKey === nk)) return deny("duplicate", ["name"]); c.name = a.patch.name; c.nameKey = nk; }
      if (a.patch.businessType !== undefined) c.businessType = a.patch.businessType;
      if (a.patch.city !== undefined) c.city = a.patch.city;
      if (a.patch.address !== undefined) c.address = a.patch.address;
      c.revision += 1; c.updatedAt = now(); event("client", c.id, "client.updated", who, { fields: Object.keys(a.patch) });
      return ok({ clientId: c.id, revision: c.revision });
    }),
    clientDeactivate: async (a) => write(a, "client-deactivate", "org.client.write", (who) => {
      const c = state.clients.get(a.clientId); if (!c || !inScope(who, c.id)) return deny("not_found");
      if (c.status === "inactive") return deny("inactive");
      if (c.revision !== a.expectedRevision) return deny("stale");
      if (state.placements.some((p) => p.end === null && p.clientId === c.id)) return deny("invalid_request", ["activeStaff"]);
      c.status = "inactive"; c.revision += 1; c.updatedAt = now();
      for (const o of state.outlets.values()) if (o.clientId === c.id && o.status !== "inactive") { o.status = "inactive"; o.revision += 1; }
      event("client", c.id, "client.deactivated", who, { reason: a.reason });
      return ok({ clientId: c.id, revision: c.revision });
    }),
    outletCreate: async (a) => write(a, "outlet-create", "org.outlet.write", (who) => {
      const c = state.clients.get(a.clientId); if (!c || !wholeClient(who, c.id)) return deny("not_found");
      if (c.status === "inactive") return deny("inactive");
      const nk = key(a.name); if ([...state.outlets.values()].some((o) => o.clientId === c.id && o.nameKey === nk)) return deny("duplicate", ["name"]);
      const o: Outlet = { id: uuid(), clientId: c.id, reference: `BLV-OUT-${String(++state.counters.out).padStart(6, "0")}`, nameKey: nk, name: a.name, address: a.address, city: a.city, phone: a.phone, manager: a.manager, notes: a.notes, status: "active", revision: 1 };
      state.outlets.set(o.id, o); event("outlet", o.id, "outlet.created", who, { clientId: c.id });
      return ok({ clientId: c.id, outletId: o.id, reference: o.reference, revision: 1 });
    }),
    outletUpdate: async (a) => write(a, "outlet-update", "org.outlet.write", (who) => {
      const o = state.outlets.get(a.outletId); if (!o || o.clientId !== a.clientId || !inScope(who, o.clientId, o.id)) return deny("not_found");
      if (o.status === "inactive") return deny("inactive");
      if (o.revision !== a.expectedRevision) return deny("stale");
      if (a.patch.name !== undefined) { const nk = key(a.patch.name); if ([...state.outlets.values()].some((x) => x.id !== o.id && x.clientId === o.clientId && x.nameKey === nk)) return deny("duplicate", ["name"]); o.name = a.patch.name; o.nameKey = nk; }
      for (const f of ["address", "city", "phone", "manager", "notes"] as const) if (a.patch[f] !== undefined) o[f] = a.patch[f]!;
      o.revision += 1; event("outlet", o.id, "outlet.updated", who, { fields: Object.keys(a.patch) });
      return ok({ outletId: o.id, revision: o.revision });
    }),
    outletDeactivate: async (a) => write(a, "outlet-deactivate", "org.outlet.write", (who) => {
      const o = state.outlets.get(a.outletId); if (!o || o.clientId !== a.clientId || !wholeClient(who, o.clientId)) return deny("not_found");
      if (o.status === "inactive") return deny("inactive");
      if (o.revision !== a.expectedRevision) return deny("stale");
      if (state.placements.some((p) => p.end === null && p.outletId === o.id)) return deny("invalid_request", ["activeStaff"]);
      o.status = "inactive"; o.revision += 1; event("outlet", o.id, "outlet.deactivated", who, { reason: a.reason });
      return ok({ outletId: o.id, revision: o.revision });
    }),
    staffList: async (a) => {
      state.calls.push("staffList"); const who = actorFor(a); if (!who || !can(who, "org.staff.read")) return deny("no_access");
      const q: StaffListQuery = a.query, needle = key(q.search);
      const rows = [...state.people.values()].filter((p) => visibleStaff(who, p.id)).filter((p) => {
        const cur = current(p.id);
        if (q.show === "unassigned" && cur) return false;
        if (q.clientId && cur?.clientId !== q.clientId) return false;
        if (q.status && p.status !== q.status) return false;
        if (!needle) return true;
        return [p.fullName, p.reference, cur ? state.clients.get(cur.clientId)!.name : "", cur ? state.outlets.get(cur.outletId)!.name : "", cur?.role ?? ""].some((t) => key(t).includes(needle));
      }).sort((x, y) => Number(!!current(x.id)) - Number(!!current(y.id)) || key(x.fullName).localeCompare(key(y.fullName)));
      return ok({ items: rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize).map((p) => staffRow(p, who)), total: rows.length, page: q.page, pageSize: q.pageSize });
    },
    staffGet: async (a) => {
      state.calls.push("staffGet"); const who = actorFor(a); if (!who || !can(who, "org.staff.read")) return deny("no_access");
      if (!(a.historyLimit >= 1 && a.historyLimit <= 200)) return deny("invalid_request");
      const p = state.people.get(a.staffId); if (!p || !visibleStaff(who, p.id)) return deny("not_found");
      // Ended placements inside the actor's scope only, newest first (start, then later-created first).
      const order = (x: Placement) => state.placements.indexOf(x);
      const visible = scopedEnded(who, p.id).sort((x, y) => (x.start === y.start ? order(y) - order(x) : y.start < x.start ? -1 : 1));
      let start = 0;
      if (a.historyAfter) { const at = visible.findIndex((x) => x.id === a.historyAfter); if (at < 0) return deny("invalid_request", ["historyAfter"]); start = at + 1; }
      const rest = visible.slice(start), more = rest.length > a.historyLimit, page = rest.slice(0, a.historyLimit);
      return ok({ item: { ...staffRow(p, who), email: p.email, phone: p.phone, onboardingOrigin: p.origin, hasAccount: p.hasAccount,
        history: page.map(placementDto), historyTotal: visible.length, historyTruncated: more, historyNextCursor: more ? page[page.length - 1].id : null } });
    },
    staffCreate: async (a) => write(a, "staff-create", "org.staff.write", (who) => {
      // An HR Officer has no standing over an unplaced person: a scoped initial placement is mandatory (open question).
      if (!who.allClients && (!a.initialPlacement || !can(who, "org.placement.write"))) return deny("no_access");
      if (a.initialPlacement && !can(who, "org.placement.write")) return deny("no_access");
      const dup: string[] = [];
      if ([...state.people.values()].some((p) => p.email === a.email)) dup.push("email");
      if (a.phone && [...state.people.values()].some((p) => p.phone === a.phone)) dup.push("phone");
      if (dup.length) return deny("duplicate", dup);
      const p: Person = { id: uuid(), email: a.email, fullName: a.fullName, phone: a.phone, reference: `BLV-STF-${String(++state.counters.stf).padStart(6, "0")}`, origin: "legacy", hasAccount: false, department: a.department, status: "active", revision: 1 };
      state.people.set(p.id, p); event("staff", p.id, "staff.created", who);
      if (a.initialPlacement) {
        const i = a.initialPlacement, r = place(who, p, { clientId: i.clientId, outletId: i.outletId, role: i.role, department: i.department, date: i.startDate, note: i.note });
        if ("data" in r) return r;
      }
      return ok({ staffId: p.id, reference: p.reference, revision: p.revision });
    }),
    staffUpdate: async (a) => write(a, "staff-update", "org.staff.write", (who) => {
      const p = state.people.get(a.staffId); if (!p || !visibleStaff(who, p.id)) return deny("not_found");
      if (p.revision !== a.expectedRevision) return deny("stale");
      // Once the person has an account, name and phone belong to them (self-entered, auth rule).
      if (p.hasAccount && (a.patch.fullName !== undefined || a.patch.phone !== undefined)) return deny("invalid_request", [a.patch.fullName !== undefined ? "fullName" : "phone"]);
      if (a.patch.phone && [...state.people.values()].some((x) => x.id !== p.id && x.phone === a.patch.phone)) return deny("duplicate", ["phone"]);
      if (a.patch.fullName !== undefined) p.fullName = a.patch.fullName;
      if (a.patch.phone !== undefined) p.phone = a.patch.phone;
      if (a.patch.status !== undefined) p.status = a.patch.status;
      if (a.patch.department !== undefined) p.department = a.patch.department;
      p.revision += 1; event("staff", p.id, "staff.updated", who, { fields: Object.keys(a.patch) });
      return ok({ staffId: p.id, revision: p.revision });
    }),
    staffCorrectEmail: async (a) => write(a, "staff-correct-email", "org.staff.write", (who) => {
      const p = state.people.get(a.staffId); if (!p || !visibleStaff(who, p.id)) return deny("not_found");
      if (p.revision !== a.expectedRevision) return deny("stale");
      // Only while the person has no account; afterwards the email is the sign-in identity.
      if (p.hasAccount || p.email === a.email) return deny("invalid_request", ["email"]);
      if ([...state.people.values()].some((x) => x.id !== p.id && x.email === a.email)) return deny("duplicate", ["email"]);
      const revoked = p.openInvites ?? 0; p.openInvites = 0; p.email = a.email; p.revision += 1;
      // Event detail never carries either address.
      event("staff", p.id, "staff.email_corrected", who, { field: "email", invitationsRevoked: revoked });
      return ok({ staffId: p.id, revision: p.revision, invitationsRevoked: revoked });
    }),
    placementAssign: async (a) => write(a, "placement-assign", "org.placement.write", (who) => {
      const p = state.people.get(a.staffId); if (!p || !visibleStaff(who, p.id)) return deny("not_found");
      if (p.revision !== a.expectedRevision) return deny("stale");
      const r = place(who, p, { clientId: a.clientId, outletId: a.outletId, role: a.role, department: a.department, date: a.effectiveDate, note: a.note });
      if ("data" in r) return r;
      return ok({ staffId: p.id, placementId: r.id, revision: p.revision });
    }),
  };

  /** Test helpers: seed records the way an earlier approved write would have. */
  const seed = {
    client(name: string, status: OrgStatus = "active") {
      const c: Client = { id: uuid(), reference: `BLV-CLI-${String(++state.counters.cli).padStart(6, "0")}`, nameKey: key(name), name, businessType: "Hotel", city: "Abuja", address: "", status, revision: 1, createdAt: now(), updatedAt: now() };
      state.clients.set(c.id, c); return c;
    },
    outlet(clientId: string, name: string) {
      const o: Outlet = { id: uuid(), clientId, reference: `BLV-OUT-${String(++state.counters.out).padStart(6, "0")}`, nameKey: key(name), name, address: "", city: "Abuja", phone: "", manager: "", notes: "", status: "active", revision: 1 };
      state.outlets.set(o.id, o); return o;
    },
    person(over: Partial<Person> & { fullName: string; email: string }) {
      const p: Person = { id: uuid(), phone: "", reference: `BLV-STF-${String(++state.counters.stf).padStart(6, "0")}`, origin: "legacy", hasAccount: false, department: "", status: "active", revision: 1, ...over };
      state.people.set(p.id, p); return p;
    },
  };
  return { gateway, state, seed };
}
