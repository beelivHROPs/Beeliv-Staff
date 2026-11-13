/**
 * DEV FIXTURE for Operations "Clients & Outlets". FICTIONAL. It holds almost no
 * data of its own: the client list, assigned HR, open vacancies, waiting
 * requests and HR history come from the Operations assignments SERVICE (so
 * "Assign HR" shows here at once); deployed staff come from the shared
 * workforce store (so a reassignment shows here at once); requests come from the
 * client-requests service (matched by client NAME, like the glance fixture).
 * Only business facts, outlet contacts, the vacancy sample and client-user
 * invitation states are written here, all PROVISIONAL sample data. The HR
 * adapters (which return only the clients assigned to one HR user) are not
 * edited. Replace with a Supabase adapter implementing OpsClientsAdapter.
 *
 * Previews: ?state=restricted (403) and the shell's "Prototype state" control
 * (loading / empty / error), both handled by the assignments adapter.
 */
import { isoOffset } from "@/lib/applicant/time";
import { listRequests } from "../client-requests/service";
import { getAssignment, listAssignments, subscribeAssignments } from "./assignments-service";
import type { AssignmentRow } from "./assignments-types";
import type { OpsClientsAdapter } from "./opsclients-adapter";
import type { ClientStatusKey, InviteState, OpsClientDetail, OpsClientRow, OpsClientUser, OpsOutletDetail, OpsOutletRow, OpsStaffOnSite, OpsVacancy } from "./opsclients-types";
import { allStaff, currentOf, deployedWhere, outletInfo, outletsOfClient, subscribeWorkforce } from "./workforce-store";
import type { AdapterEvent } from "../adapter";

const STATUS_KEY: Record<string, ClientStatusKey> = { Active: "active", Onboarding: "onboarding", Invited: "invited", Inactive: "inactive" };
const keyOf = (r: Pick<AssignmentRow, "statusLabel">): ClientStatusKey => STATUS_KEY[r.statusLabel] ?? "active";

const BUSINESS: Record<string, { type: string; city: string; address: string; createdDays: number }> = {
  "c-demo-hotel": { type: "Hotel", city: "Abuja", address: "14 Example Street, Central Business District", createdDays: 220 },
  "c-demo-lounge": { type: "Lounge or bar", city: "Lagos", address: "22 Sample Close, Victoria Island", createdDays: 180 },
  "c-demo-cafe": { type: "Cafe", city: "Port Harcourt", address: "8 Example Avenue, GRA", createdDays: 40 },
  "c-demo-events": { type: "Event centre", city: "Kano", address: "5 Sample Way, Nasarawa GRA", createdDays: 25 },
};
const OUTLET: Record<string, { address: string; city: string; manager: string; phone: string }> = {
  "o-hotel-main": { address: "14 Example Street, Central Business District", city: "Abuja", manager: "Emeka Sample", phone: "+234 800 000 0101" },
  "o-hotel-garki": { address: "3 Sample Road, Garki", city: "Abuja", manager: "Amina Sample", phone: "+234 800 000 0102" },
  "o-lounge-vi": { address: "22 Sample Close, Victoria Island", city: "Lagos", manager: "Tunde Sample", phone: "+234 800 000 0103" },
  "o-cafe-ph": { address: "8 Example Avenue, GRA", city: "Port Harcourt", manager: "", phone: "+234 800 000 0104" },
  "o-events-kano": { address: "5 Sample Way, Nasarawa GRA", city: "Kano", manager: "", phone: "+234 800 000 0105" },
};
const OUTLET_STATUS: Record<string, { label: string; tone: OpsOutletRow["statusTone"] }> = {
  "o-cafe-ph": { label: "Onboarding", tone: "warn" },
  "o-events-kano": { label: "Onboarding", tone: "warn" },
};
const VACANCIES: (OpsVacancy & { clientId: string })[] = [
  { id: "v-waiter", title: "Waiter / Waitress", clientId: "c-demo-hotel", outletId: "o-hotel-main", outlet: "", openings: 3 },
  { id: "v-desk", title: "Front Desk Officer", clientId: "c-demo-hotel", outletId: "o-hotel-garki", outlet: "", openings: 1 },
  { id: "v-chef", title: "Commis Chef", clientId: "c-demo-lounge", outletId: "o-lounge-vi", outlet: "", openings: 2 },
];
/** Invitation states per client (sample). HR sends invitations; this screen only reads them. */
const USERS: Record<string, { name: string; title: string; invite: InviteState; days: number | null; by: string | null }[]> = {
  "c-demo-hotel": [
    { name: "Amina Sample", title: "General Manager", invite: "accepted", days: 215, by: "Funke Sample" },
    { name: "Emeka Sample", title: "Outlet Manager", invite: "accepted", days: 214, by: "Funke Sample" },
  ],
  "c-demo-lounge": [
    { name: "Tunde Sample", title: "General Manager", invite: "accepted", days: 175, by: "Kelechi Sample" },
    { name: "Bisi Sample", title: "Outlet Manager", invite: "sent", days: 4, by: "Kelechi Sample" },
  ],
  "c-demo-cafe": [{ name: "Chidi Sample", title: "Owner", invite: "expired", days: 21, by: "Beeliv HR (sample)" }],
  "c-demo-events": [{ name: "Halima Sample", title: "Owner", invite: "not-sent", days: null, by: null }],
};

const listeners = new Set<(e: AdapterEvent) => void>();
const fan = () => listeners.forEach((l) => l("reset"));
let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  subscribeAssignments(fan);
  subscribeWorkforce(fan);
}

const ONSITE = (r: ReturnType<typeof allStaff>[number]): OpsStaffOnSite => {
  const p = currentOf(r)!;
  return { id: r.id, name: r.name, role: p.role, status: r.status, outletId: p.outletId, outlet: p.outlet, since: p.start };
};
const staffAt = (match: (outletId: string, clientId: string) => boolean): OpsStaffOnSite[] =>
  allStaff()
    .filter((r) => {
      const p = currentOf(r);
      return !!p && r.status !== "suspended" && match(p.outletId, p.clientId);
    })
    .map(ONSITE)
    .sort((a, b) => a.name.localeCompare(b.name));
const vacanciesOf = (clientId: string): OpsVacancy[] =>
  VACANCIES.filter((v) => v.clientId === clientId).map((v) => ({ id: v.id, title: v.title, outletId: v.outletId, outlet: outletInfo(v.outletId)?.name ?? "", openings: v.openings }));

function outletRow(clientId: string, o: { id: string; name: string }): OpsOutletRow {
  const ex = OUTLET[o.id];
  const st = OUTLET_STATUS[o.id] ?? { label: "Active", tone: "ok" as const };
  return {
    id: o.id,
    name: o.name,
    city: ex?.city ?? "Not recorded",
    address: ex?.address ?? "Not recorded",
    statusLabel: st.label,
    statusTone: st.tone,
    deployedStaff: deployedWhere((p) => p.outletId === o.id).length,
    openVacancies: vacanciesOf(clientId).filter((v) => v.outletId === o.id).reduce((n, v) => n + v.openings, 0),
  };
}

function rowOf(a: AssignmentRow): OpsClientRow {
  return {
    id: a.id,
    reference: a.reference,
    name: a.name,
    statusKey: keyOf(a),
    statusLabel: a.statusLabel,
    statusTone: a.statusTone,
    outletsCount: outletsOfClient(a.id).length,
    deployedStaff: deployedWhere((p) => p.clientId === a.id).length,
    hr: a.hr,
    openVacancies: a.openVacancies,
    requestsWaiting: a.pendingItems,
  };
}

export const mockOpsClientsAdapter: OpsClientsAdapter = {
  subscribe(l) {
    wire();
    listeners.add(l);
    return () => listeners.delete(l);
  },

  async listClients(q) {
    const page = await listAssignments({ search: "", show: "all", hrId: "" }); // gated: loading / empty / error / restricted
    const all = page.rows.map(rowOf);
    const needle = q.search.trim().toLowerCase();
    const rows = all
      .filter((r) => (!needle || r.name.toLowerCase().includes(needle) || (r.hr?.name.toLowerCase().includes(needle) ?? false)) && (!q.status || r.statusKey === q.status) && (!q.hrId || (q.hrId === "none" ? r.hr === null : r.hr?.id === q.hrId)))
      .sort((a, b) => Number(a.hr !== null) - Number(b.hr !== null) || a.name.localeCompare(b.name));
    return { rows, total: rows.length, facets: { hr: page.facets.hr }, workspaceEmpty: page.workspaceEmpty };
  },

  async getClient(id): Promise<OpsClientDetail | null> {
    const a = await getAssignment(id);
    if (!a) return null;
    const biz = BUSINESS[id] ?? { type: "Not recorded", city: "Not recorded", address: "Not recorded", createdDays: 90 };
    const [waitingPage, progressPage] = await Promise.all([listRequests({ search: "", tab: "new", clientId: "", limit: 200 }), listRequests({ search: "", tab: "in-progress", clientId: "", limit: 200 })]);
    const requests = [...waitingPage.rows, ...progressPage.rows]
      .filter((r) => r.client === a.name)
      .map((r) => {
        const waiting = r.status === "new" || r.status === "under-review";
        return { id: r.id, title: `${r.role} x ${r.headcount}`, outlet: r.outlet, statusLabel: waiting ? "Waiting" : "In progress", waiting, submittedAt: r.submittedAt };
      })
      .sort((x, y) => Number(y.waiting) - Number(x.waiting) || y.submittedAt.localeCompare(x.submittedAt));
    const users: OpsClientUser[] = (USERS[id] ?? []).map((u, i) => ({
      id: `${id}-u${i + 1}`,
      name: u.name,
      title: u.title,
      email: `${u.name.split(" ")[0].toLowerCase()}@example.test`,
      invite: u.invite,
      invitedAt: u.days === null ? null : isoOffset(-u.days, 10, 0),
      invitedBy: u.by,
    }));
    const row = rowOf(a);
    return {
      ...row,
      business: { type: biz.type, city: biz.city, address: biz.address },
      createdAt: isoOffset(-biz.createdDays, 10, 0),
      assignedAt: a.assignedAt,
      hrHistory: a.history,
      outlets: outletsOfClient(id).map((o) => outletRow(id, o)),
      workforce: staffAt((_o, c) => c === id),
      vacancies: vacanciesOf(id),
      requests,
      users,
    };
  },

  async getOutlet(clientId, outletId): Promise<OpsOutletDetail | null> {
    const a = await getAssignment(clientId);
    const o = outletsOfClient(clientId).find((x) => x.id === outletId);
    if (!a || !o) return null;
    const ex = OUTLET[outletId];
    return {
      client: { id: a.id, name: a.name, hr: a.hr },
      outlet: outletRow(clientId, o),
      phone: ex?.phone ?? "",
      manager: ex?.manager ?? "",
      staff: staffAt((oid) => oid === outletId),
      vacancies: vacanciesOf(clientId).filter((v) => v.outletId === outletId),
    };
  },
};
