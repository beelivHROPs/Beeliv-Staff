/**
 * DEV FIXTURE for the HR Clients & Outlets slice. FICTIONAL. Shares its clients,
 * outlets, HR users and staff with the Staff mock so counts agree everywhere.
 * `SCOPE_TO_ASSIGNED` is the mock flag for "HR sees assigned clients only".
 * Statuses, agreements, contacts and vacancies are PROVISIONAL sample data.
 * A client created through the Invite client wizard arrives here through
 * `registerInvitedClient` with everything that was typed in, status "invited".
 * Replace this file with a Supabase adapter implementing ClientsAdapter.
 */
import { isoOffset } from "@/lib/applicant/time";
import type { AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { MOCK_CLIENTS, MOCK_OUTLETS, clientVisible, documentCountsForClient, scopedStaffRows } from "../staff/mock";
import type { ClientsAdapter } from "./adapter";
import type { HrAssignmentEntry, ActivityEntry, ClientContact, ClientDetail, ClientRow, ClientsPage, ClientsQuery, ClientVacancyRow, OrgStatus, OutletDetail, OutletEdit, OutletRow, PersonRef } from "./types";

export const SCOPE_TO_ASSIGNED = true;
const ME = "Funke Sample";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
const notify = () => listeners.forEach((l) => l("reset"));
subscribePrototypeMode(notify);

/* ---------- demo data ---------- */

const CLIENT_STATUS: Record<string, OrgStatus> = { "c-demo-hotel": "active", "c-demo-lounge": "active", "c-demo-cafe": "onboarding", "c-demo-events": "onboarding" };
const OUTLET_STATUS: Record<string, OrgStatus> = { "o-hotel-main": "active", "o-hotel-garki": "active", "o-lounge-vi": "active", "o-cafe-ph": "onboarding", "o-events-kano": "onboarding" };
const DEMO_OUTLET: Record<string, { address: string; city: string; manager: string }> = {
  "o-hotel-main": { address: "14 Example Street, Central Business District", city: "Abuja", manager: "Emeka Sample" },
  "o-hotel-garki": { address: "3 Sample Road, Garki", city: "Abuja", manager: "Amina Sample" },
  "o-lounge-vi": { address: "22 Sample Close, Victoria Island", city: "Lagos", manager: "Tunde Sample" },
  "o-cafe-ph": { address: "8 Example Avenue, GRA", city: "Port Harcourt", manager: "" },
  "o-events-kano": { address: "5 Sample Way, Nasarawa GRA", city: "Kano", manager: "" },
};
const DEMO_TYPE: Record<string, string> = { "c-demo-hotel": "Hotel", "c-demo-lounge": "Lounge or bar", "c-demo-cafe": "Cafe", "c-demo-events": "Event centre" };
const VACANCIES: (ClientVacancyRow & { clientId: string })[] = [
  { id: "v-waiter", title: "Waiter / Waitress", clientId: "c-demo-hotel", outletId: "o-hotel-main", outlet: "", openings: 3, status: "Published" },
  { id: "v-desk", title: "Front Desk Officer", clientId: "c-demo-hotel", outletId: "o-hotel-garki", outlet: "", openings: 1, status: "Published" },
  { id: "v-chef", title: "Commis Chef", clientId: "c-demo-lounge", outletId: "o-lounge-vi", outlet: "", openings: 2, status: "Published" },
  { id: "v-bar", title: "Bar Attendant", clientId: "c-demo-lounge", outletId: "o-lounge-vi", outlet: "", openings: 1, status: "Draft" },
  { id: "v-floor", title: "Floor Supervisor", clientId: "c-demo-hotel", outletId: "o-hotel-main", outlet: "", openings: 1, status: "Closed" },
];

const ADDITIONAL_HR: Record<string, PersonRef[]> = {
  "o-hotel-main": [{ id: "7d2c1f0e-0000-4000-8000-00000000a002", name: "Kelechi Sample" }],
  "o-lounge-vi": [{ id: "7d2c1f0e-0000-4000-8000-00000000a001", name: "Funke Sample" }],
};

/* ---------- stores (extra fields the shared MOCK_* lists do not carry) ---------- */

interface ClientExtra {
  type: string;
  city: string;
  address: string;
  contacts: ClientContact[];
  accessSummary: string;
  createdBy: string;
  createdAt: string;
  invited: boolean;
}
interface OutletExtra {
  address: string;
  city: string;
  phone: string;
  manager: string;
  notes: string;
  cover: string | null;
}
const clientExtra = new Map<string, ClientExtra>();
const outletExtra = new Map<string, OutletExtra>();
const history = new Map<string, ActivityEntry[]>(); // keyed by client id or outlet id
let seq = 0;

function log(key: string, action: string, actor = ME, at = new Date().toISOString()) {
  history.set(key, [{ id: `h-${++seq}`, actor, at, action }, ...(history.get(key) ?? [])]);
}

function clientEx(id: string): ClientExtra {
  const got = clientExtra.get(id);
  if (got) return got;
  const first = MOCK_OUTLETS.find((o) => o.clientId === id);
  const d = first ? DEMO_OUTLET[first.id] : undefined;
  const ex: ClientExtra = {
    type: DEMO_TYPE[id] ?? "Not recorded",
    city: d?.city ?? "Not recorded",
    address: d?.address ?? "Not recorded",
    contacts: [
      { id: `${id}-k1`, name: "Amina Sample", title: "General Manager", email: "amina@example.test", phone: "+234 800 000 0001" },
      { id: `${id}-k2`, name: "Emeka Sample", title: "Outlet Manager", email: "emeka@example.test", phone: null },
    ],
    accessSummary: "Two client users: the General Manager sees every outlet, the Outlet Manager sees one.",
    createdBy: "Beeliv Operations (sample)",
    createdAt: isoOffset(-220, 10, 0),
    invited: false,
  };
  clientExtra.set(id, ex);
  if (!history.has(id)) {
    log(id, "Client record created", "Beeliv Operations (sample)", ex.createdAt);
    log(id, "Assigned HR set", "Beeliv Operations (sample)", isoOffset(-219, 11, 0));
  }
  return ex;
}

function outletEx(id: string): OutletExtra {
  const got = outletExtra.get(id);
  if (got) return got;
  const d = DEMO_OUTLET[id];
  const ex: OutletExtra = { address: d?.address ?? "Not recorded", city: d?.city ?? "Not recorded", phone: "+234 800 000 0100", manager: d?.manager ?? "", notes: "", cover: null };
  outletExtra.set(id, ex);
  if (!history.has(id)) log(id, "Outlet added", "Beeliv Operations (sample)", isoOffset(-210, 10, 0));
  return ex;
}

/** Called by the Invite client wizard (team-access mock) when it creates an organisation and its outlets. */
export interface InvitedClientInput {
  clientId: string;
  name: string;
  typeName: string;
  city: string;
  address: string;
  outlets: { id: string; name: string; address: string; city: string }[];
  contact: { name: string; email: string; levelName: string };
  /** Outlet names the invited contact can see. */
  accessOutletNames: string[];
  createdBy: PersonRef;
}

export function registerInvitedClient(i: InvitedClientInput): void {
  if (MOCK_CLIENTS.some((c) => c.id === i.clientId)) return;
  MOCK_CLIENTS.push({ id: i.clientId, name: i.name, inScope: true });
  CLIENT_STATUS[i.clientId] = "invited";
  const now = new Date().toISOString();
  clientExtra.set(i.clientId, {
    type: i.typeName,
    city: i.city,
    address: i.address,
    contacts: [{ id: `${i.clientId}-k1`, name: i.contact.name, title: i.contact.levelName, email: i.contact.email, phone: null }],
    accessSummary: `${i.contact.name} (${i.contact.levelName}) can see: ${i.accessOutletNames.join(", ") || "no outlets yet"}.`,
    createdBy: i.createdBy.name,
    createdAt: now,
    invited: true,
  });
  log(i.clientId, "Client created with the invitation", i.createdBy.name, now);
  log(i.clientId, `Invited ${i.contact.name} (${i.contact.email}) as ${i.contact.levelName}`, i.createdBy.name, now);
  i.outlets.forEach((o) => {
    MOCK_OUTLETS.push({ id: o.id, name: o.name, clientId: i.clientId, hr: { primary: i.createdBy, additional: 0 } });
    OUTLET_STATUS[o.id] = "invited";
    outletExtra.set(o.id, { address: o.address, city: o.city, phone: "", manager: "", notes: "", cover: null });
    log(o.id, "Outlet added with the client invitation", i.createdBy.name, now);
  });
  notify();
}

/* ---------- builders ---------- */

const visibleClients = () => MOCK_CLIENTS.filter((c) => clientVisible(c) || !SCOPE_TO_ASSIGNED);
const outletsOf = (clientId: string) => MOCK_OUTLETS.filter((o) => o.clientId === clientId);
const vacanciesOf = (clientId: string): ClientVacancyRow[] =>
  VACANCIES.filter((v) => v.clientId === clientId).map((v) => ({ id: v.id, title: v.title, outletId: v.outletId, outlet: MOCK_OUTLETS.find((o) => o.id === v.outletId)?.name ?? "", openings: v.openings, status: v.status }));
const openCount = (list: ClientVacancyRow[]) => list.filter((v) => v.status === "Published").reduce((a, v) => a + v.openings, 0);

function rowOf(c: (typeof MOCK_CLIENTS)[number]): ClientRow {
  const outlets = outletsOf(c.id);
  const staff = scopedStaffRows().filter((s) => s.clientId === c.id && s.status !== "suspended");
  const primary = outlets[0]?.hr.primary ?? null;
  return {
    id: c.id,
    reference: `BLV-CLI-PLACEHOLDER-${MOCK_CLIENTS.indexOf(c) + 1}`,
    name: c.name,
    outletsCount: outlets.length,
    activeStaff: staff.length,
    openVacancies: openCount(vacanciesOf(c.id)),
    assignedHr: { primary, additional: Math.max(0, hrUsersOf(c.id).length - (primary ? 1 : 0)) },
    hrNames: hrUsersOf(c.id).map((h) => h.name),
    status: CLIENT_STATUS[c.id] ?? "active",
  };
}

function outletRow(o: (typeof MOCK_OUTLETS)[number]): OutletRow {
  const ex = outletEx(o.id);
  const staff = scopedStaffRows().filter((s) => s.outletId === o.id && s.status !== "suspended");
  return {
    id: o.id,
    reference: `BLV-OUT-PLACEHOLDER-${MOCK_OUTLETS.indexOf(o) + 1}`,
    name: o.name,
    address: ex.address,
    city: ex.city,
    activeStaff: staff.length,
    openVacancies: openCount(vacanciesOf(o.clientId).filter((v) => v.outletId === o.id)),
    status: OUTLET_STATUS[o.id] ?? "active",
    assignedHr: { primary: o.hr.primary, additional: (ADDITIONAL_HR[o.id] ?? []).length },
  };
}

function hrUsersOf(clientId: string) {
  const map = new Map<string, { id: string; name: string; primary: boolean }>();
  outletsOf(clientId).forEach((o, i) => {
    if (o.hr.primary && !map.has(o.hr.primary.id)) map.set(o.hr.primary.id, { ...o.hr.primary, primary: i === 0 });
  });
  // Additional authorised HR (spec 9.1: an outlet may have several).
  outletsOf(clientId).forEach((o) => (ADDITIONAL_HR[o.id] ?? []).forEach((h) => map.has(h.id) || map.set(h.id, { ...h, primary: false })));
  return [...map.values()];
}

/** Read-only history of who assigned each HR user, and when. Assigning is done by Operations. */
function hrHistoryOf(clientId: string, only?: string[]): HrAssignmentEntry[] {
  const ex = clientEx(clientId);
  const demo = !ex.invited;
  return hrUsersOf(clientId)
    .filter((h) => !only || only.includes(h.id))
    .map((h) => ({ id: h.id, name: h.name, role: h.primary ? ("Primary" as const) : ("Additional" as const), assignedBy: demo ? "Beeliv Operations (sample)" : ex.createdBy, at: demo ? isoOffset(-219, 11, 0) : ex.createdAt }));
}

const staffRows = (clientId: string, outletId?: string) =>
  scopedStaffRows()
    .filter((s) => s.clientId === clientId && (!outletId || s.outletId === outletId))
    .map((s) => ({ id: s.id, reference: s.reference, name: s.name, role: s.role, outletId: s.outletId, outlet: s.outlet, status: s.status }));

async function gate() {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  await sleep(350);
  if (mode === "error") throw new Error("Mock error");
  return mode;
}

export const mockClientsAdapter: ClientsAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  async listClients(q: ClientsQuery): Promise<ClientsPage> {
    const mode = await gate();
    const all = mode === "empty" ? [] : visibleClients().map(rowOf);
    const needle = q.search.trim().toLowerCase();
    const base = all.filter((r) => !needle || [r.name, r.reference, r.assignedHr.primary?.name ?? ""].some((s) => s.toLowerCase().includes(needle)));
    const count = (st: OrgStatus) => base.filter((r) => r.status === st).length;
    const rows = base.filter((r) => !q.status || r.status === q.status).sort((a, b) => (q.sort === "staff" ? b.activeStaff - a.activeStaff : q.sort === "vacancies" ? b.openVacancies - a.openVacancies : a.name.localeCompare(b.name)));
    return {
      rows: rows.slice(0, q.limit),
      statusCounts: { all: base.length, invited: count("invited"), active: count("active"), onboarding: count("onboarding"), inactive: count("inactive") },
      total: rows.length,
      workspaceEmpty: all.length === 0,
    };
  },

  async getClient(id): Promise<ClientDetail | null> {
    const mode = await gate();
    if (mode === "empty") return null;
    const c = visibleClients().find((x) => x.id === id);
    if (!c) return null; // out of scope = not found
    const ex = clientEx(id);
    const status = CLIENT_STATUS[id] ?? "active";
    const outlets = outletsOf(id).map(outletRow);
    const staff = staffRows(id);
    return {
      ...rowOf(c),
      hrUsers: hrUsersOf(id),
      hrHistory: hrHistoryOf(id),
      business: { type: ex.type, city: ex.city, address: ex.address },
      onboarding:
        status === "active"
          ? null
          : [
              { id: "s1", label: "Business details recorded", done: true },
              { id: "s2", label: "Outlets added", done: outlets.length > 0 },
              { id: "s3", label: "Contact invited", done: true },
              { id: "s4", label: "Invitation accepted by the contact", done: status === "onboarding" },
              { id: "s5", label: "Agreements acknowledged", done: false },
              { id: "s6", label: "First staff assigned", done: staff.length > 0 },
            ],
      agreements: ex.invited
        ? []
        : [
            { id: "a1", name: "Service agreement", version: "v1 (sample)", acknowledgedAt: status === "active" ? ex.createdAt : null },
            { id: "a2", name: "Terms of use", version: "v1 (sample)", acknowledgedAt: status === "active" ? ex.createdAt : null },
          ],
      accessSummary: ex.accessSummary,
      createdBy: ex.createdBy,
      createdAt: ex.createdAt,
      outlets,
      staff,
      vacancies: vacanciesOf(id),
      contacts: ex.contacts,
      compliance: documentCountsForClient(id),
      activity: [...(history.get(id) ?? [])].sort((a, b) => b.at.localeCompare(a.at)),
    };
  },

  async getOutlet(clientId, outletId): Promise<OutletDetail | null> {
    const mode = await gate();
    if (mode === "empty") return null;
    const c = visibleClients().find((x) => x.id === clientId);
    const o = MOCK_OUTLETS.find((x) => x.id === outletId && x.clientId === clientId);
    if (!c || !o) return null;
    const ex = outletEx(outletId);
    return {
      client: { id: c.id, name: c.name },
      outlet: outletRow(o),
      phone: ex.phone,
      manager: ex.manager,
      notes: ex.notes,
      cover: ex.cover,
      hrUsers: [...(o.hr.primary ? [{ ...o.hr.primary, primary: true }] : []), ...(ADDITIONAL_HR[outletId] ?? []).map((h) => ({ ...h, primary: false }))],
      hrHistory: [...(o.hr.primary ? [o.hr.primary] : []), ...(ADDITIONAL_HR[outletId] ?? [])].flatMap((h, i) => hrHistoryOf(clientId).filter((x) => x.id === h.id).map((x) => ({ ...x, role: i === 0 && o.hr.primary ? ("Primary" as const) : ("Additional" as const) }))),
      staff: staffRows(clientId, outletId),
      vacancies: vacanciesOf(clientId).filter((v) => v.outletId === outletId),
      activity: [...(history.get(outletId) ?? [])].sort((a, b) => b.at.localeCompare(a.at)),
    };
  },

  async updateOutlet(clientId, outletId, edit: OutletEdit) {
    await sleep(350);
    const o = MOCK_OUTLETS.find((x) => x.id === outletId && x.clientId === clientId);
    if (!o) throw new Error("Unknown outlet");
    const ex = outletEx(outletId);
    const changed: string[] = [];
    (["address", "city", "phone", "notes"] as const).forEach((k) => {
      const v = edit[k];
      if (v !== undefined && v.trim() !== ex[k]) {
        ex[k] = v.trim();
        changed.push(k);
      }
    });
    if (edit.cover !== undefined && edit.cover !== ex.cover) {
      ex.cover = edit.cover;
      changed.push("cover picture");
    }
    if (changed.length) log(outletId, `Updated ${changed.join(", ")}`);
    notify();
  },
};
