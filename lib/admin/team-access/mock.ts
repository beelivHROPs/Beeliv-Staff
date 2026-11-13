/**
 * DEV FIXTURE for Team & Access. Everything is FICTIONAL. `BLV-...-PLACEHOLDER-n`
 * stands in for server-generated references. Transitions (which state follows
 * which action, default expiry, duplicate-email check) are PROVISIONAL mock
 * behaviour; the backend owns them. Nothing is sent: invitations are recorded as
 * pending. Who may invite or deactivate is not defined for HR by the spec, so the
 * "previewing as" switch lets the UI be exercised both ways. Replace with a
 * Supabase adapter implementing TeamAccessAdapter.
 */
import { isoOffset } from "@/lib/applicant/time";
import { canonicalAccountPhone } from "@/lib/public-site/auth-rules";
import { RestrictedError, type AdapterEvent } from "../adapter";
import { canDo } from "../role-access";
import { getAdminIdentity } from "../ops/identity";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { registerInvitedClient } from "../clients/mock";
import type { TeamAccessAdapter } from "./adapter";
import { JOB_TITLE_MAX } from "./types";
import type { DuplicateMatch, AccessMatrix, AccessPage, AccessQuery, AccessRow, AccountStatus, HistoryEntry, Invitation, InvitationQuery, InvitationStatus, InviteInput, TeamFacets } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
const ME = "Funke Sample";
const linkFor = (kind: string, key: string | number) => `https://${kind === "client" ? "client" : kind === "staff" ? "talent" : "admin"}.beeliv.co/invite/PLACEHOLDER-${key}`;
const COOLDOWN_MS = 60_000;
/** Seed delivery: pending ones are mostly sent; one failed, one not yet sent, one still in cooldown. */
const delivery = (status: string, i: number): Invitation["delivery"] =>
  status === "pending" && i === 3 ? { status: "failed", lastAttemptAt: isoOffset(-1, 11), failureReason: "The mailbox does not exist (bounced).", retryAt: null }
  : status === "pending" && i === 11 ? { status: "not-sent", lastAttemptAt: null }
  : status === "pending" && i === 2 ? { status: "sent", lastAttemptAt: new Date().toISOString(), retryAt: new Date(Date.now() + 10 * 60_000).toISOString() }
  : { status: "sent", lastAttemptAt: isoOffset(-2, 10), retryAt: null };
const changed = () => listeners.forEach((l) => l("reset"));

async function gate() {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("state") === "restricted") {
    await sleep(200);
    throw new RestrictedError();
  }
  await sleep(250);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
  return mode;
}

/* ---------- DEV: who the fixture pretends the signed-in user is ---------- */

export type PreviewAccess = "manage" | "view";
let access: PreviewAccess = "manage";
const accessListeners = new Set<() => void>();
export const getPreviewAccess = () => access;
export const subscribePreviewAccess = (cb: () => void) => {
  accessListeners.add(cb);
  return () => accessListeners.delete(cb);
};
export function setPreviewAccess(next: PreviewAccess) {
  if (next === access) return;
  access = next;
  accessListeners.forEach((l) => l());
  listeners.forEach((l) => l("reset"));
}

/* ---------- configurable choices ---------- */

const FACETS: TeamFacets = {
  clientTypes: [
    { id: "restaurant", name: "Restaurant" },
    { id: "hotel", name: "Hotel" },
    { id: "lounge", name: "Lounge or bar" },
    { id: "cafe", name: "Cafe" },
    { id: "event", name: "Event centre" },
    { id: "catering", name: "Catering business" },
  ],
  staffRoles: ["Waiter / Waitress", "Commis Chef", "Bar Attendant", "Front Desk Officer", "Floor Supervisor"],
  roles: [
    { id: "head-ops", name: "Head of Operations" },
    { id: "hr-manager", name: "HR Manager" },
    { id: "hr-officer", name: "HR Officer" },
    { id: "recruiter", name: "Recruiter" },
    { id: "trainer", name: "Trainer" },
    { id: "tech-admin", name: "Technical Super Admin" },
  ],
  clients: [
    { id: "c-demo-hotel", name: "Demo Hotel Abuja" },
    { id: "c-demo-lounge", name: "Demo Lounge Lagos" },
    { id: "c-demo-grill", name: "Demo Grill Port Harcourt" },
  ],
  outlets: [
    { id: "o-demo-hotel-main", clientId: "c-demo-hotel", name: "Main building" },
    { id: "o-demo-hotel-spa", clientId: "c-demo-hotel", name: "Spa and pool" },
    { id: "o-demo-lounge-vi", clientId: "c-demo-lounge", name: "Victoria Island" },
    { id: "o-demo-grill-main", clientId: "c-demo-grill", name: "Town centre" },
  ],
  accessLevels: [
    { id: "al-view", name: "View only" },
    { id: "al-manage", name: "Manage requests" },
    { id: "al-owner", name: "Organisation owner" },
  ],
  // Project lead decision: every invitation lasts 7 days (no picker choice); the server fixes this value.
  expiryOptions: [{ days: 7, label: "7 days" }],
};
const roleName = (id?: string) => FACETS.roles.find((r) => r.id === id)?.name ?? "Unknown role";
const clientName = (id?: string) => FACETS.clients.find((c) => c.id === id)?.name ?? "Unknown client";
const levelName = (id?: string) => FACETS.accessLevels.find((l) => l.id === id)?.name ?? "Unknown level";
const outletNames = (ids: string[]) => ids.map((i) => FACETS.outlets.find((o) => o.id === i)?.name).filter(Boolean).join(", ");

const MATRIX: AccessMatrix = {
  roles: [
    { id: "head-ops", name: "Head of Operations", summary: "Highest operational authority; final recruitment approval (spec 10)." },
    { id: "hr-manager", name: "HR Manager", summary: "Recruitment management, applicants, interviews, assessments, documentation, staff records, assigned outlets (spec 10)." },
    { id: "hr-officer", name: "HR Officer", summary: "Scoped operational functionality by role and assigned clients / outlets (spec 10)." },
    { id: "recruiter", name: "Recruiter", summary: "Scoped like HR Officer; the spec lists them in one row (spec 10)." },
    { id: "trainer", name: "Trainer", summary: "Scoped like HR Officer; the spec lists them in one row (spec 10)." },
    { id: "tech-admin", name: "Technical Super Admin", summary: "Exceptional technical administration only; not an everyday operational role (spec 10)." },
  ],
  rows: [
    { key: "approve", label: "Final recruitment and offer approval", source: "Spec 10, REC-001", cells: { "head-ops": "yes", "hr-manager": "no", "hr-officer": "no", recruiter: "no", trainer: "no", "tech-admin": "no" } },
    { key: "recruit", label: "Recruitment: vacancies, applicants, interviews, assessments, documentation", source: "Spec 10, 14", cells: { "head-ops": "yes", "hr-manager": "yes", "hr-officer": "scoped", recruiter: "scoped", trainer: "tbc", "tech-admin": "no" } },
    { key: "staff", label: "Staff records", source: "Spec 10", cells: { "head-ops": "yes", "hr-manager": "scoped", "hr-officer": "scoped", recruiter: "tbc", trainer: "tbc", "tech-admin": "tbc" } },
    { key: "assign", label: "Staff assignment and reassignment", source: "Spec 10; rbac.md section 5", cells: { "head-ops": "yes", "hr-manager": "scoped", "hr-officer": "tbc", recruiter: "tbc", trainer: "tbc", "tech-admin": "no" } },
    { key: "clients", label: "Client and outlet oversight", source: "Spec 10", cells: { "head-ops": "yes", "hr-manager": "scoped", "hr-officer": "scoped", recruiter: "tbc", trainer: "tbc", "tech-admin": "no" } },
    { key: "access", label: "Internal access management (Team & Access)", source: "Spec 10, 13.4 (\"as permitted\")", cells: { "head-ops": "yes", "hr-manager": "tbc", "hr-officer": "tbc", recruiter: "tbc", trainer: "tbc", "tech-admin": "tbc" } },
    { key: "reports", label: "Reports and audit visibility", source: "Spec 10, 13.4", cells: { "head-ops": "yes", "hr-manager": "scoped", "hr-officer": "scoped", recruiter: "tbc", trainer: "tbc", "tech-admin": "tbc" } },
    { key: "tech", label: "Technical administration", source: "Spec 10", cells: { "head-ops": "no", "hr-manager": "no", "hr-officer": "no", recruiter: "no", trainer: "no", "tech-admin": "yes" } },
  ],
};

/* ---------- store ---------- */

let n = 0;
const nid = (p: string) => `${p}-${++n}`;
interface Person extends AccessRow {
  clientsScope?: string[];
}
/** DEV FIXTURE: a canonical phone already linked to another account. Type +234 800 000 0001 to see the blocking conflict. */
const DEMO_TAKEN_PHONE = "+2348000000001";
/** Canonical phones used by staff records invited in this session (mock only; the real rule is a database unique index). */
const claimedPhones = new Set<string>();
let people: Person[] = [];
let invites: Invitation[] = [];
let history = new Map<string, HistoryEntry[]>();

const note = (id: string, action: string, reason?: string, actor = ME) => {
  const list = history.get(id) ?? [];
  list.unshift({ id: nid("h"), at: new Date().toISOString(), actor, action, reason });
  history.set(id, list);
};

function seed() {
  n = 0;
  claimedPhones.clear();
  history = new Map();
  const internal = (i: number, name: string, role: string, status: AccountStatus, scope: string, last: number | null, jobTitle?: string): Person => ({
    id: `u-${i}`, kind: "internal", ...(jobTitle ? { jobTitle } : {}), reference: `BLV-USR-PLACEHOLDER-${i}`, name, email: `${name.split(" ")[0].toLowerCase()}@beeliv.example`, status, roleId: role, roleLabel: roleName(role), scopeLabel: scope, lastActiveAt: last === null ? null : isoOffset(-last, 10),
  });
  const client = (i: number, name: string, cid: string, outlets: string[], level: string, status: AccountStatus, last: number | null): Person => ({
    id: `cu-${i}`, kind: "client", reference: `BLV-CLU-PLACEHOLDER-${i}`, name, email: `${name.split(" ")[0].toLowerCase()}@${cid.replace("c-", "")}.example`, status, clientId: cid, outletIds: outlets, accessLevelId: level, roleLabel: levelName(level), scopeLabel: `${clientName(cid)}: ${outletNames(outlets)}`, lastActiveAt: last === null ? null : isoOffset(-last, 9),
  });
  const account = (i: number, name: string, ent: { applicant: boolean; staff: boolean }, status: AccountStatus, assign: string, last: number | null): Person => ({
    id: `ac-${i}`, kind: "account", reference: `BLV-PER-PLACEHOLDER-${i}`, name, email: `${name.split(" ")[0].toLowerCase()}@mail.example`, status, entitlements: ent, roleLabel: ent.applicant && ent.staff ? "Applicant and Staff" : ent.staff ? "Staff" : "Applicant", scopeLabel: assign, lastActiveAt: last === null ? null : isoOffset(-last, 8),
  });
  people = [
    internal(1, "Adaeze Sample", "head-ops", "active", "All clients and outlets", 0, "Head of Operations"),
    internal(2, "Funke Sample", "hr-manager", "active", "Demo Hotel Abuja, Demo Lounge Lagos", 0),
    internal(3, "Kelechi Sample", "hr-officer", "active", "Demo Lounge Lagos", 1, "HR Officer, Lagos"),
    internal(4, "Amina Sample", "recruiter", "active", "Demo Hotel Abuja", 3, "Senior Recruiter"),
    internal(5, "Tunde Sample", "trainer", "suspended", "Demo Grill Port Harcourt", 22),
    internal(6, "Bola Sample", "hr-officer", "invited", "Demo Hotel Abuja", null),
    internal(7, "Ikenna Sample", "recruiter", "deactivated", "Demo Lounge Lagos", 64),
    internal(8, "Sola Sample", "tech-admin", "active", "All clients and outlets", 9),
    internal(9, "Nneka Sample", "hr-officer", "active", "Demo Grill Port Harcourt", 2),
    internal(10, "Femi Sample", "hr-manager", "active", "Demo Hotel Abuja", 5),
    internal(11, "Yinka Sample", "recruiter", "active", "Demo Lounge Lagos", 7),
    internal(12, "Hadiza Sample", "trainer", "active", "Demo Hotel Abuja", 4),
    client(1, "Gloria Sample", "c-demo-hotel", ["o-demo-hotel-main", "o-demo-hotel-spa"], "al-owner", "active", 0),
    client(2, "Musa Sample", "c-demo-hotel", ["o-demo-hotel-main"], "al-manage", "active", 2),
    client(3, "Ify Sample", "c-demo-lounge", ["o-demo-lounge-vi"], "al-owner", "active", 1),
    client(4, "Kunle Sample", "c-demo-lounge", ["o-demo-lounge-vi"], "al-view", "invited", null),
    client(5, "Rita Sample", "c-demo-grill", ["o-demo-grill-main"], "al-manage", "suspended", 30),
    client(6, "Dele Sample", "c-demo-grill", ["o-demo-grill-main"], "al-view", "active", 6),
    account(1, "Ada Sample", { applicant: true, staff: false }, "active", "Not assigned", 0),
    account(2, "Hauwa Sample", { applicant: true, staff: true }, "active", "Demo Hotel Abuja, Floor / Service", 0),
    account(3, "Dayo Sample", { applicant: true, staff: true }, "active", "Demo Lounge Lagos, Bar", 1),
    account(4, "Chidi Sample", { applicant: true, staff: false }, "active", "Not assigned", 3),
    account(5, "Bisi Sample", { applicant: true, staff: false }, "suspended", "Not assigned", 40),
    account(6, "Emeka Sample", { applicant: true, staff: false }, "deactivated", "Not assigned", 90),
    account(7, "Folake Sample", { applicant: false, staff: true }, "invited", "Demo Lounge Lagos, Kitchen", null),
    account(8, "Ngozi Sample", { applicant: true, staff: false }, "active", "Not assigned", 2),
    account(9, "Wale Sample", { applicant: true, staff: false }, "active", "Not assigned", 1),
    account(10, "Lara Sample", { applicant: true, staff: false }, "active", "Not assigned", 5),
    account(11, "Musa Okoye Sample", { applicant: true, staff: true }, "active", "Demo Grill Port Harcourt, Floor / Service", 2),
    account(12, "Peace Sample", { applicant: true, staff: false }, "active", "Not assigned", 8),
  ];
  const inv = (i: number, kind: Invitation["kind"], name: string, email: string, role: string, scope: string, status: InvitationStatus, ago: number, left: number, resends = 0): Invitation => ({
    id: `inv-${i}`, reference: `BLV-INV-PLACEHOLDER-${i}`, kind, name, email, roleLabel: role, scopeLabel: scope, status, invitedBy: ME, invitedAt: isoOffset(-ago, 10), expiresAt: isoOffset(left, 10), resendCount: resends, link: linkFor(kind, i),
    delivery: delivery(status, i),
  });
  invites = [
    inv(1, "internal", "Bola Sample", "bola@beeliv.example", "HR Officer", "Demo Hotel Abuja", "pending", 2, 5),
    inv(2, "client", "Kunle Sample", "kunle@demo-lounge.example", "View only", "Demo Lounge Lagos: Victoria Island", "pending", 1, 6),
    inv(3, "staff", "Folake Sample", "folake@mail.example", "Staff access", "Demo Lounge Lagos, Kitchen", "pending", 3, 4, 1),
    inv(4, "internal", "Nneka Sample", "nneka@beeliv.example", "HR Officer", "Demo Grill Port Harcourt", "accepted", 14, -7),
    inv(5, "client", "Gloria Sample", "gloria@demo-hotel.example", "Organisation owner", "Demo Hotel Abuja: Main building, Spa and pool", "accepted", 40, -33),
    inv(6, "staff", "Hauwa Sample", "hauwa@mail.example", "Staff access", "Demo Hotel Abuja, Floor / Service", "accepted", 25, -18),
    inv(7, "internal", "Chuka Sample", "chuka@beeliv.example", "Recruiter", "Demo Lounge Lagos", "expired", 20, -6),
    inv(8, "client", "Seun Sample", "seun@demo-grill.example", "Manage requests", "Demo Grill Port Harcourt: Town centre", "expired", 18, -4),
    inv(9, "staff", "Tobi Sample", "tobi@mail.example", "Staff access", "Demo Hotel Abuja, Bar", "revoked", 12, -2),
    inv(10, "internal", "Lanre Sample", "lanre@beeliv.example", "Trainer", "Demo Hotel Abuja", "revoked", 9, -1),
    inv(11, "client", "Ayo Sample", "ayo@demo-hotel.example", "View only", "Demo Hotel Abuja: Main building", "pending", 0, 7),
  ];
}
seed();
subscribePrototypeMode(() => {
  seed();
  listeners.forEach((l) => l("reset"));
});

/**
 * Project-lead decisions 2026-10-18: Operations and the HR Manager may send invitations; an assigned HR
 * officer may not. The HR Manager may invite HR officers (internal), Operations may invite any internal role.
 * The server decides; this only drives what the prototype shows.
 */
function capsFor(a: PreviewAccess) {
  const m = a === "manage";
  const may = canDo("invitations.manage");
  return { canInviteInternal: m && may, canInviteClient: may, canInviteStaff: may, canChangeState: m && may, canChangeAccess: m && may };
}
const invitableRoleIds = (): string[] => (getAdminIdentity() === "hr-manager" ? ["hr-officer"] : FACETS.roles.map((r) => r.id));

function page(kind: AccessRow["kind"], q: AccessQuery, empty: boolean): AccessPage {
  const all = people.filter((p) => p.kind === kind);
  if (empty || all.length === 0) return { rows: [], total: 0, statusCounts: { all: 0, invited: 0, active: 0, suspended: 0, deactivated: 0 }, workspaceEmpty: true };
  const needle = q.search.trim().toLowerCase();
  const facetOk = (p: Person) => {
    if (!q.facet) return true;
    if (kind === "internal") return p.roleId === q.facet;
    if (kind === "client") return p.clientId === q.facet;
    const e = p.entitlements!;
    return q.facet === "both" ? e.applicant && e.staff : q.facet === "staff" ? e.staff : e.applicant;
  };
  const base = all.filter((p) => facetOk(p) && (!needle || [p.name, p.email, p.roleLabel, p.scopeLabel].some((s) => s.toLowerCase().includes(needle))));
  const cnt = (s: AccountStatus) => base.filter((p) => p.status === s).length;
  const rows = base.filter((p) => !q.status || p.status === q.status);
  return { rows, total: rows.length, statusCounts: { all: base.length, invited: cnt("invited"), active: cnt("active"), suspended: cnt("suspended"), deactivated: cnt("deactivated") }, workspaceEmpty: false };
}

function refreshLabels(p: Person) {
  if (p.kind === "client") {
    p.roleLabel = levelName(p.accessLevelId);
    p.scopeLabel = `${clientName(p.clientId)}: ${outletNames(p.outletIds ?? [])}`;
  } else if (p.kind === "account" && p.entitlements) {
    p.roleLabel = p.entitlements.applicant && p.entitlements.staff ? "Applicant and Staff" : p.entitlements.staff ? "Staff" : "Applicant";
  }
}

export const mockTeamAccessAdapter: TeamAccessAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  async getCapabilities() {
    await gate();
    return capsFor(access);
  },
  async getFacets() {
    await gate();
    return { ...FACETS, invitableRoleIds: invitableRoleIds() };
  },
  async getMatrix() {
    await gate();
    return MATRIX;
  },
  async listInternal(q) {
    const mode = await gate();
    return page("internal", q, mode === "empty");
  },
  async listClientUsers(q) {
    const mode = await gate();
    return page("client", q, mode === "empty");
  },
  async listAccounts(q) {
    const mode = await gate();
    return page("account", q, mode === "empty");
  },
  async listInvitations(q: InvitationQuery) {
    const mode = await gate();
    if (mode === "empty" || invites.length === 0) return { rows: [], total: 0, statusCounts: { all: 0, pending: 0, accepted: 0, expired: 0, revoked: 0 }, workspaceEmpty: true };
    const needle = q.search.trim().toLowerCase();
    const base = invites.filter((i) => (!q.kind || i.kind === q.kind) && (!needle || [i.name, i.email, i.roleLabel, i.scopeLabel].some((s) => s.toLowerCase().includes(needle))));
    const cnt = (s: InvitationStatus) => base.filter((i) => i.status === s).length;
    const rows = base.filter((i) => !q.status || i.status === q.status).sort((a, b) => b.invitedAt.localeCompare(a.invitedAt));
    return { rows, total: rows.length, statusCounts: { all: base.length, pending: cnt("pending"), accepted: cnt("accepted"), expired: cnt("expired"), revoked: cnt("revoked") }, workspaceEmpty: false };
  },

  async invite(input: InviteInput) {
    await sleep(400);
    const email = input.email.trim().toLowerCase();
    if (people.some((p) => p.email === email && p.status !== "deactivated") || invites.some((i) => i.email === email && i.status === "pending")) throw new Error("duplicate");
    const canonPhone = canonicalAccountPhone(input.phone ?? "");
    if (canonPhone && (canonPhone === DEMO_TAKEN_PHONE || claimedPhones.has(canonPhone))) throw new Error("phone-duplicate");
    if (canonPhone) claimedPhones.add(canonPhone);
    let roleLabel: string;
    let scopeLabel: string;
    let { clientId, outletIds } = input;
    if (input.kind === "client" && input.newClient) {
      // Beeliv creates the organisation and its outlets inside the invitation (existing clients are not imported).
      const nc = input.newClient;
      clientId = nid("c-new");
      FACETS.clients.push({ id: clientId, name: nc.name.trim() });
      const ids = nc.outlets.map((o) => {
        const oid = nid("o-new");
        FACETS.outlets.push({ id: oid, clientId: clientId!, name: o.name.trim() });
        return oid;
      });
      outletIds = nc.accessOutletIdx.map((i) => ids[i]).filter(Boolean);
      // Show the new client (all details entered) in Clients & Outlets.
      registerInvitedClient({
        clientId,
        name: nc.name.trim(),
        typeName: FACETS.clientTypes.find((t) => t.id === nc.typeId)?.name ?? "Not recorded",
        city: nc.city.trim(),
        address: nc.address.trim(),
        outlets: nc.outlets.map((o, i) => ({ id: ids[i], name: o.name.trim(), address: o.address.trim(), city: o.city.trim() })),
        contact: { name: input.name.trim(), email: input.email.trim().toLowerCase(), levelName: levelName(input.accessLevelId) },
        accessOutletNames: outletIds.map((i) => FACETS.outlets.find((o) => o.id === i)?.name ?? "").filter(Boolean),
        createdBy: { id: "7d2c1f0e-0000-4000-8000-00000000a001", name: ME },
      });
    }
    const jobTitle = input.kind === "internal" ? input.jobTitle?.trim().slice(0, JOB_TITLE_MAX) || undefined : undefined;
    if (input.kind === "internal") {
      roleLabel = roleName(input.roleId);
      scopeLabel = input.allClients ? "All clients and outlets" : input.scopeClientIds.map(clientName).join(", ");
    } else if (input.kind === "client") {
      roleLabel = levelName(input.accessLevelId);
      scopeLabel = `${clientName(clientId)}: ${outletNames(outletIds)}`;
    } else {
      roleLabel = input.staffRole ? `${input.staffRole}, staff access` : "Staff access";
      scopeLabel = `${clientName(clientId)}${outletIds.length ? `, ${outletNames(outletIds)}` : ""}${input.startDate ? `, starts ${input.startDate}` : ""}`;
    }
    const inv: Invitation = {
      id: nid("inv"), reference: `BLV-INV-PLACEHOLDER-${invites.length + 1}`, kind: input.kind, email, name: input.name.trim(), ...(jobTitle ? { jobTitle } : {}), roleLabel, scopeLabel, status: "pending", invitedBy: ME,
      invitedAt: new Date().toISOString(), expiresAt: isoOffset(input.expiresInDays, 10), resendCount: 0, link: "",
      delivery: { status: "not-sent", lastAttemptAt: null },
    };
    inv.link = linkFor(input.kind, inv.id);
    invites.unshift(inv);
    note(inv.id, `Invited ${inv.name} (${inv.kind}) as ${roleLabel}. Recorded as pending; nothing was emailed.`);
    changed();
    return inv;
  },
  async resendInvitation(id) {
    await sleep(300);
    const i = invites.find((x) => x.id === id);
    if (!i || i.status !== "pending" || i.delivery.status === "not-sent") throw new Error("Not available");
    if (i.delivery.retryAt && Date.parse(i.delivery.retryAt) > Date.now()) throw new Error("cooldown");
    const now = new Date();
    i.resendCount += 1;
    i.delivery = { status: "sent", lastAttemptAt: now.toISOString(), retryAt: new Date(now.getTime() + COOLDOWN_MS).toISOString() };
    note(id, i.delivery.failureReason ? "Retried sending (recorded only; nothing was emailed)" : "Resent the invitation (recorded only; nothing was emailed)");
    changed();
    return { ...i };
  },
  async sendInvitation(id) {
    await sleep(350);
    const i = invites.find((x) => x.id === id);
    if (!i || i.status !== "pending" || i.delivery.status !== "not-sent") throw new Error("Not available");
    const now = new Date();
    i.delivery = { status: "sent", lastAttemptAt: now.toISOString(), retryAt: new Date(now.getTime() + COOLDOWN_MS).toISOString() };
    note(id, "Sent the invitation (recorded only; nothing was emailed, email delivery is connected later)");
    changed();
    return { ...i };
  },
  async createAccessLink(id) {
    await sleep(350);
    // DEV FIXTURE: a clearly fake link, and never in production builds. The real one is server-generated and shown once.
    if (process.env.NODE_ENV === "production") throw new Error("Not available");
    const i = invites.find((x) => x.id === id);
    if (!i || i.status !== "pending") throw new Error("Not available");
    if (i.delivery.retryAt && Date.parse(i.delivery.retryAt) > Date.now()) throw new Error("cooldown");
    const now = new Date();
    i.resendCount += i.delivery.status === "copied" ? 1 : 0;
    i.expiresAt = new Date(now.getTime() + (i.kind === "internal" ? 48 : 7 * 24) * 3_600_000).toISOString();
    i.delivery = { status: "copied", lastAttemptAt: now.toISOString(), retryAt: new Date(now.getTime() + COOLDOWN_MS).toISOString() };
    note(id, "Created an access link (any earlier link stopped working). Shown once; nothing was emailed");
    changed();
    return { url: `https://${i.kind === "client" ? "client" : i.kind === "staff" ? "talent" : "admin"}.beeliv.co/invite/PREVIEW-NOT-A-REAL-LINK-${now.getTime()}`, expiresAt: i.expiresAt };
  },
  async updateInvitationEmail(id, email) {
    await sleep(300);
    const i = invites.find((x) => x.id === id);
    if (!i || i.status !== "pending") throw new Error("Not available");
    const next = email.trim().toLowerCase();
    if (invites.some((x) => x.id !== id && x.status === "pending" && x.email === next)) throw new Error("duplicate");
    i.email = next;
    i.delivery = { status: "not-sent", lastAttemptAt: i.delivery.lastAttemptAt };
    note(id, `Changed the email address to ${next}. Not sent yet.`);
    changed();
    return { ...i };
  },
  async replaceInvitation(id) {
    await sleep(350);
    const old = invites.find((x) => x.id === id);
    if (!old || (old.status !== "expired" && old.status !== "revoked")) throw new Error("Not available");
    const inv: Invitation = { ...old, id: nid("inv"), reference: `BLV-INV-PLACEHOLDER-${invites.length + 1}`, status: "pending", invitedAt: new Date().toISOString(), expiresAt: isoOffset(7, 10), resendCount: 0, delivery: { status: "not-sent", lastAttemptAt: null } };
    inv.link = linkFor(inv.kind, inv.id);
    invites.unshift(inv);
    note(inv.id, `Issued as a replacement for ${old.reference}. Not sent yet.`);
    changed();
    return inv;
  },
  async findDuplicates({ name, email, phone }) {
    await sleep(250);
    const e = email.trim().toLowerCase();
    const n = name.trim().toLowerCase();
    const out: DuplicateMatch[] = [];
    // Same canonical phone = blocking conflict. DEV FIXTURE: +234 800 000 0001 stands in for a number
    // already linked to another account (the real check is the database unique index). The entry
    // carries no name/email so the other account is never revealed.
    const canon = canonicalAccountPhone(phone ?? "");
    if (canon && (canon === DEMO_TAKEN_PHONE || claimedPhones.has(canon))) {
      out.push({ id: "phone-conflict", name: "", email: "", match: "phone", where: "" });
    }
    people.forEach((p) => {
      if (p.email === e) out.push({ id: p.id, name: p.name, email: p.email, match: "exact", where: `Existing ${p.kind === "internal" ? "internal user" : p.kind === "client" ? "client user" : "account"} (${p.status})` });
      else if (n && p.name.toLowerCase() === n) out.push({ id: p.id, name: p.name, email: p.email, match: "similar", where: `Same name, existing ${p.kind === "internal" ? "internal user" : p.kind === "client" ? "client user" : "account"}` });
    });
    invites.forEach((i) => {
      if (i.status === "pending" && i.email === e) out.push({ id: i.id, name: i.name, email: i.email, match: "exact", where: "A pending invitation already exists" });
    });
    return out;
  },
  async revokeInvitation(id, reason) {
    await sleep(300);
    const i = invites.find((x) => x.id === id);
    if (!i || i.status !== "pending") throw new Error("Not available");
    i.status = "revoked";
    note(id, "Revoked the invitation", reason);
    changed();
    return { ...i };
  },
  async setState(id, action, reason) {
    await sleep(350);
    const p = people.find((x) => x.id === id);
    if (!p) throw new Error("Not found");
    p.status = action === "reactivate" ? "active" : action === "suspend" ? "suspended" : "deactivated";
    note(id, action === "reactivate" ? "Reactivated the account" : action === "suspend" ? "Suspended the account" : "Deactivated the account", reason);
    changed();
  },
  async updateAccess(id, patch) {
    await sleep(350);
    const p = people.find((x) => x.id === id);
    if (!p) throw new Error("Not found");
    if (patch.outletIds) p.outletIds = patch.outletIds;
    if (patch.accessLevelId) p.accessLevelId = patch.accessLevelId;
    if (patch.entitlements) p.entitlements = patch.entitlements;
    refreshLabels(p);
    note(id, p.kind === "account" ? `Changed entitlements to: ${p.roleLabel}` : `Changed access: ${p.roleLabel}, ${p.scopeLabel}`, patch.reason);
    changed();
  },
  async getHistory(id) {
    await sleep(150);
    const seedEntry: HistoryEntry = { id: nid("h"), at: isoOffset(-30, 9), actor: "System", action: "Account created from an accepted invitation" };
    return [...(history.get(id) ?? []), seedEntry];
  },
};
