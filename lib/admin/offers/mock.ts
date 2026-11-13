/**
 * DEV FIXTURE for Offers. Everything is FICTIONAL ("Sample" people, "Demo"
 * clients). `BLV-OFR-PLACEHOLDER-n` stands in for a server-generated reference.
 * The transitions below (who may do what in which status, expiry handling, the
 * activation record) are PROVISIONAL mock behaviour so the UI can be exercised;
 * Master Spec 6.5 / 23.4 do not define them and the backend owns them. HR can
 * never approve: the only way a mock offer becomes Approved is the clearly
 * labelled DEV "simulate Operations" call. Nothing is emailed. Replace with a
 * Supabase adapter implementing OffersAdapter.
 */
import { isoOffset } from "@/lib/applicant/time";
import { RestrictedError, type AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { getAdminIdentity } from "../ops/identity";
import type { OffersAdapter } from "./adapter";
import type { ConvertInput, OfferAction, OfferDetail, OfferFacets, OfferHistoryEntry, OfferInput, OfferQuery, OfferRow, OfferStatus, OfferTab, OffersPage, PayLine } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();

const ME = "Funke Sample";
const OPS = "Adaeze Sample (Head of Operations)";

const ymd = (daysFromNow: number) => isoOffset(daysFromNow, 12).slice(0, 10);

/** Mirrors components/admin/interviews previewGate: loading / error / ?state=restricted previews. */
async function gate() {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("state") === "restricted") {
    await sleep(200);
    throw new RestrictedError();
  }
  await sleep(280);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
  return mode;
}

/* ---------- configurable choices (adapter data, never hard-coded in components) ---------- */

const CLIENTS = [
  { id: "c-demo-hotel", name: "Demo Hotel Abuja" },
  { id: "c-demo-lounge", name: "Demo Lounge Lagos" },
  { id: "c-demo-grill", name: "Demo Grill Port Harcourt" },
];
const OUTLETS = [
  { id: "o-demo-hotel-main", clientId: "c-demo-hotel", name: "Main building" },
  { id: "o-demo-lounge-vi", clientId: "c-demo-lounge", name: "Victoria Island" },
  { id: "o-demo-grill-main", clientId: "c-demo-grill", name: "Town centre" },
];
const VACANCIES = [
  { id: "v-waiter", name: "Waiter / Waitress", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main", role: "Waiter / Waitress" },
  { id: "v-chef", name: "Commis Chef", clientId: "c-demo-lounge", outletId: "o-demo-lounge-vi", role: "Commis Chef" },
  { id: "v-bar", name: "Bar Attendant", clientId: "c-demo-lounge", outletId: "o-demo-lounge-vi", role: "Bar Attendant" },
  { id: "v-desk", name: "Front Desk Officer", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main", role: "Front Desk Officer" },
  { id: "v-floor", name: "Floor Supervisor", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main", role: "Floor Supervisor" },
];
const APPLICANTS = [
  ["a-001", "Ada Sample", "v-waiter"],
  ["a-002", "Tunde Sample", "v-chef"],
  ["a-003", "Chidi Sample", "v-bar"],
  ["a-005", "Ngozi Sample", "v-desk"],
  ["a-006", "Emeka Sample", "v-floor"],
  ["a-009", "Amaka Sample", "v-bar"],
  ["a-010", "Segun Sample", "v-desk"],
  ["a-011", "Halima Sample", "v-waiter"],
  ["a-013", "Folake Sample", "v-chef"],
  ["a-017", "Tola Sample", "v-floor"],
  ["a-019", "Dayo Sample", "v-chef"],
  ["a-021", "Uche Sample", "v-desk"],
  ["a-024", "Peace Sample", "v-bar"],
] as const;

const FACETS: OfferFacets = {
  applicants: APPLICANTS.map(([id, name, vacancyId]) => ({ id, name, vacancyId })),
  vacancies: VACANCIES,
  clients: CLIENTS,
  outlets: OUTLETS,
  roles: ["Waiter / Waitress", "Commis Chef", "Bar Attendant", "Front Desk Officer", "Floor Supervisor"],
  employmentTypes: ["Full-time", "Part-time", "Contract"],
};

const nameOf = <T extends { id: string; name: string }>(list: T[], id: string) => list.find((x) => x.id === id)?.name ?? "Unknown";

/* ---------- store ---------- */

let seq = 1;
const uid = () => `h-${seq++}`;
const entry = (at: string, actor: string, action: string, from: string | null = null, to: string | null = null, reason?: string): OfferHistoryEntry => ({ id: uid(), at, actor, action, from, to, reason });

export const STATUS_WORD: Record<OfferStatus, string> = {
  draft: "Draft",
  "pending-approval": "Submitted for approval",
  approved: "Approved",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  withdrawn: "Withdrawn",
};

const pay = (basic: string, extra = true): PayLine[] => [
  { key: "p1", label: "Basic pay", value: basic, visibility: "public" },
  { key: "p2", label: "Staff meals", value: "One meal per shift", visibility: "public" },
  ...(extra ? [{ key: "p3", label: "Performance bonus", value: "Discretionary, set by Beeliv", visibility: "internal" as const }] : []),
];

type Seed = {
  n: number;
  applicant: string;
  status: OfferStatus;
  base: string;
  start: number;
  expires: number | null;
  sentDays?: number;
  reason?: string;
  activation?: boolean;
};

const SEEDS: Seed[] = [
  { n: 1, applicant: "a-001", status: "draft", base: "NGN 160,000 per month", start: 30, expires: 14 },
  { n: 2, applicant: "a-002", status: "pending-approval", base: "NGN 190,000 per month", start: 28, expires: 12 },
  { n: 3, applicant: "a-003", status: "approved", base: "NGN 170,000 per month", start: 25, expires: 10 },
  { n: 4, applicant: "a-011", status: "sent", base: "NGN 150,000 per month", start: 21, expires: 6, sentDays: 2 },
  { n: 5, applicant: "a-010", status: "viewed", base: "NGN 180,000 per month", start: 22, expires: 2, sentDays: 4 },
  { n: 6, applicant: "a-006", status: "accepted", base: "NGN 230,000 per month", start: 14, expires: null, sentDays: 6 },
  { n: 7, applicant: "a-013", status: "accepted", base: "NGN 200,000 per month", start: 10, expires: null, sentDays: 12, activation: true },
  { n: 8, applicant: "a-024", status: "declined", base: "NGN 165,000 per month", start: 20, expires: null, sentDays: 9, reason: "Accepted a role closer to home." },
  { n: 9, applicant: "a-017", status: "expired", base: "NGN 225,000 per month", start: 12, expires: -3, sentDays: 15 },
  { n: 10, applicant: "a-009", status: "withdrawn", base: "NGN 160,000 per month", start: 18, expires: null, sentDays: 11, reason: "Position filled by an internal transfer." },
  { n: 11, applicant: "a-005", status: "draft", base: "NGN 175,000 per month", start: 35, expires: 14 },
  { n: 12, applicant: "a-019", status: "pending-approval", base: "NGN 185,000 per month", start: 27, expires: 11 },
  { n: 13, applicant: "a-021", status: "sent", base: "NGN 172,000 per month", start: 24, expires: 7, sentDays: 1 },
];

function actionsFor(s: OfferStatus, activated: boolean): OfferAction[] {
  // The Head of Operations approves directly and never "submits for approval" (project lead 2026-10-17).
  const ops = getAdminIdentity() === "ops";
  switch (s) {
    case "draft":
      return ops ? ["edit", "approve"] : ["edit", "submit"];
    case "pending-approval":
      return ops ? ["approve", "withdraw"] : ["withdraw"];
    case "approved":
      return ["send", "withdraw"];
    case "sent":
    case "viewed":
      return ["resend", "withdraw"];
    case "expired":
      return ["resend"];
    case "accepted":
      return activated ? [] : ["convert"];
    default:
      return [];
  }
}

function build(seed: Seed): OfferDetail {
  const app = APPLICANTS.find((a) => a[0] === seed.applicant)!;
  const vac = VACANCIES.find((v) => v.id === app[2])!;
  const sentAt = seed.sentDays !== undefined ? isoOffset(-seed.sentDays, 10) : null;
  const history: OfferHistoryEntry[] = [entry(isoOffset(-(seed.sentDays ?? 3) - 5, 9), ME, "Created the draft offer")];
  const push = (days: number, actor: string, action: string, from: OfferStatus, to: OfferStatus, reason?: string) => history.push(entry(isoOffset(days, 11), actor, action, STATUS_WORD[from], STATUS_WORD[to], reason));
  const order: OfferStatus[] = ["draft", "pending-approval", "approved", "sent", "viewed", "accepted"];
  const reached = order.indexOf(seed.status === "declined" || seed.status === "expired" || seed.status === "withdrawn" ? "sent" : seed.status);
  const d0 = -(seed.sentDays ?? 3);
  if (reached >= 1) push(d0 - 3, ME, "Submitted the offer for approval", "draft", "pending-approval");
  if (reached >= 2) push(d0 - 2, OPS, "Approved the offer", "pending-approval", "approved");
  if (reached >= 3) push(d0, ME, "Sent the offer (in-app notification only)", "approved", "sent");
  if (seed.status === "viewed" || seed.status === "accepted") push(d0 + 1, "Applicant", "Opened the offer", "sent", "viewed");
  if (seed.status === "accepted") push(d0 + 2, "Applicant", "Accepted the offer", "viewed", "accepted");
  if (seed.status === "declined") push(d0 + 2, "Applicant", "Declined the offer", "sent", "declined", seed.reason);
  if (seed.status === "expired") push(seed.expires ?? -1, "System", "The offer expired without a response", "sent", "expired");
  if (seed.status === "withdrawn") push(d0 + 3, ME, "Withdrew the offer", "sent", "withdrawn", seed.reason);
  const activation = seed.activation
    ? { id: `act-${seed.n}`, status: "pending-activation" as const, createdAt: isoOffset(-9, 14), createdBy: ME, clientName: nameOf(CLIENTS, vac.clientId), outletName: nameOf(OUTLETS, vac.outletId), role: vac.role, startDate: ymd(seed.start) }
    : null;
  if (activation) history.push(entry(activation.createdAt, ME, "Converted to staff: pending staff-activation record created", "Accepted", "Accepted"));
  return {
    id: `of-${String(seed.n).padStart(3, "0")}`,
    reference: `BLV-OFR-PLACEHOLDER-${seed.n}`,
    applicant: { id: seed.applicant, name: app[1] },
    vacancyId: vac.id,
    vacancy: vac.name,
    clientId: vac.clientId,
    client: nameOf(CLIENTS, vac.clientId),
    outletId: vac.outletId,
    outlet: nameOf(OUTLETS, vac.outletId),
    role: vac.role,
    startDate: ymd(seed.start),
    status: seed.status,
    expiresAt: seed.expires === null ? null : ymd(seed.expires),
    updatedAt: history[history.length - 1].at,
    needsAttention: seed.status === "approved" || (seed.status === "viewed" && seed.expires !== null && seed.expires <= 3),
    employmentType: "Full-time",
    location: nameOf(OUTLETS, vac.outletId) + ", " + nameOf(CLIENTS, vac.clientId),
    reportingTo: "Outlet Manager",
    pay: pay(seed.base),
    letterFileName: "Employment-offer-letter-PLACEHOLDER.pdf",
    approval: reached >= 2 ? { state: "approved", by: OPS, at: history.find((h) => h.action.startsWith("Approved"))?.at ?? null } : reached === 1 ? { state: "waiting", by: null, at: null } : null,
    sentAt,
    viewedAt: seed.status === "viewed" || seed.status === "accepted" ? isoOffset(d0 + 1, 15) : null,
    respondedAt: seed.status === "accepted" || seed.status === "declined" ? isoOffset(d0 + 2, 9) : null,
    declineReason: seed.status === "declined" ? (seed.reason ?? null) : null,
    withdrawReason: seed.status === "withdrawn" ? (seed.reason ?? null) : null,
    allowedActions: actionsFor(seed.status, !!activation),
    activation,
    history,
  };
}

let store: OfferDetail[] = [];
function reseed() {
  seq = 1;
  store = SEEDS.map(build);
}
reseed();
subscribePrototypeMode(() => {
  reseed();
  listeners.forEach((l) => l("reset"));
});

const clone = (d: OfferDetail): OfferDetail => ({ ...d, allowedActions: actionsFor(d.status, !!d.activation), history: [...d.history].sort((a, b) => b.at.localeCompare(a.at)) });
const toRow = (d: OfferDetail): OfferRow => ({
  id: d.id,
  reference: d.reference,
  applicant: d.applicant,
  vacancyId: d.vacancyId,
  vacancy: d.vacancy,
  clientId: d.clientId,
  client: d.client,
  outletId: d.outletId,
  outlet: d.outlet,
  role: d.role,
  startDate: d.startDate,
  status: d.status,
  expiresAt: d.expiresAt,
  updatedAt: d.updatedAt,
  needsAttention: d.needsAttention,
});

const TAB_STATUSES: Record<OfferTab, OfferStatus[] | null> = {
  all: null,
  draft: ["draft"],
  "pending-approval": ["pending-approval"],
  approved: ["approved"],
  sent: ["sent", "viewed"],
  accepted: ["accepted"],
  closed: ["declined", "expired", "withdrawn"],
};

function find(id: string): OfferDetail {
  const d = store.find((x) => x.id === id);
  if (!d) throw new Error("Offer not found");
  return d;
}

function move(d: OfferDetail, to: OfferStatus, actor: string, action: string, reason?: string) {
  const from = d.status;
  d.status = to;
  d.updatedAt = new Date().toISOString();
  d.needsAttention = to === "approved";
  d.allowedActions = actionsFor(to, !!d.activation);
  d.history.push({ id: uid(), at: d.updatedAt, actor, action, from: STATUS_WORD[from], to: STATUS_WORD[to], reason });
}

function applyInput(d: OfferDetail, i: OfferInput) {
  const app = FACETS.applicants.find((a) => a.id === i.applicantId);
  d.applicant = { id: i.applicantId, name: app?.name ?? "Unknown" };
  d.vacancyId = i.vacancyId;
  d.vacancy = nameOf(VACANCIES, i.vacancyId);
  d.clientId = i.clientId;
  d.client = nameOf(CLIENTS, i.clientId);
  d.outletId = i.outletId;
  d.outlet = nameOf(OUTLETS, i.outletId);
  d.role = i.role;
  d.startDate = i.startDate;
  d.employmentType = i.employmentType;
  d.location = i.location;
  d.reportingTo = i.reportingTo;
  d.expiresAt = i.expiresAt || null;
  d.pay = i.pay;
}

export const mockOffersAdapter: OffersAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  async listOffers(q: OfferQuery): Promise<OffersPage> {
    const mode = await gate();
    const base = { clients: CLIENTS, vacancies: VACANCIES.map((v) => ({ id: v.id, name: v.name })) };
    if (mode === "empty") return { rows: [], total: 0, tabCounts: { all: 0, draft: 0, "pending-approval": 0, approved: 0, sent: 0, accepted: 0, closed: 0 }, facets: base, canCreate: true, workspaceEmpty: true };
    const needle = q.search.trim().toLowerCase();
    const matched = store.filter(
      (d) =>
        (!needle || [d.applicant.name, d.vacancy, d.client, d.outlet, d.role].some((s) => s.toLowerCase().includes(needle))) &&
        (!q.clientId || d.clientId === q.clientId) &&
        (!q.vacancyId || d.vacancyId === q.vacancyId),
    );
    const inTab = (t: OfferTab) => matched.filter((d) => !TAB_STATUSES[t] || TAB_STATUSES[t]!.includes(d.status));
    const rows = inTab(q.tab).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return {
      rows: rows.map(toRow),
      total: rows.length,
      tabCounts: { all: inTab("all").length, draft: inTab("draft").length, "pending-approval": inTab("pending-approval").length, approved: inTab("approved").length, sent: inTab("sent").length, accepted: inTab("accepted").length, closed: inTab("closed").length },
      facets: base,
      canCreate: true,
      workspaceEmpty: false,
    };
  },

  async getOffer(id) {
    const mode = await gate();
    if (mode === "empty") return null;
    const d = store.find((x) => x.id === id);
    return d ? clone(d) : null;
  },

  async getFacets() {
    await gate();
    return FACETS;
  },

  async createOffer(input) {
    await sleep(350);
    const d = build({ n: 100 + store.length, applicant: input.applicantId, status: "draft", base: "x", start: 30, expires: 14 });
    d.id = `of-${String(store.length + 1).padStart(3, "0")}`;
    d.reference = `BLV-OFR-PLACEHOLDER-${store.length + 1}`;
    d.history = [entry(new Date().toISOString(), ME, "Created the draft offer")];
    applyInput(d, input);
    d.updatedAt = d.history[0].at;
    d.approval = null;
    store.unshift(d);
    return clone(d);
  },

  async updateDraft(id, input) {
    await sleep(350);
    const d = find(id);
    if (d.status !== "draft") throw new Error("Only a draft can be edited");
    applyInput(d, input);
    d.updatedAt = new Date().toISOString();
    d.history.push({ id: uid(), at: d.updatedAt, actor: ME, action: "Edited the draft offer", from: null, to: null });
    return clone(d);
  },

  async submitForApproval(id) {
    await sleep(350);
    const d = find(id);
    if (d.status !== "draft") throw new Error("Only a draft can be submitted");
    d.approval = { state: "waiting", by: null, at: null };
    move(d, "pending-approval", ME, "Submitted the offer for approval");
    return clone(d);
  },

  async approve(id) {
    await sleep(350);
    if (getAdminIdentity() !== "ops") throw new RestrictedError();
    const d = find(id);
    if (d.status !== "draft" && d.status !== "pending-approval") throw new Error("Only a draft or submitted offer can be approved");
    d.approval = { state: "approved", by: OPS, at: new Date().toISOString() };
    move(d, "approved", OPS, "Approved the offer");
    return clone(d);
  },

  async send(id) {
    await sleep(350);
    const d = find(id);
    if (d.status !== "approved") throw new Error("Only an approved offer can be sent");
    d.sentAt = new Date().toISOString();
    move(d, "sent", ME, "Sent the offer (in-app notification only, nothing emailed)");
    return clone(d);
  },

  async withdraw(id, reason) {
    await sleep(350);
    const d = find(id);
    d.withdrawReason = reason;
    move(d, "withdrawn", ME, "Withdrew the offer", reason);
    return clone(d);
  },

  async resend(id, expiresAt) {
    await sleep(350);
    const d = find(id);
    const wasExpired = d.status === "expired";
    if (expiresAt) d.expiresAt = expiresAt;
    d.sentAt = new Date().toISOString();
    if (wasExpired) move(d, "sent", ME, `Resent the expired offer with a new response date (${expiresAt ?? "unchanged"})`);
    else {
      d.updatedAt = d.sentAt;
      d.history.push({ id: uid(), at: d.updatedAt, actor: ME, action: "Resent the offer reminder (in-app notification only)", from: null, to: null });
    }
    return clone(d);
  },

  async convertToStaff(id, input: ConvertInput) {
    await sleep(450);
    const d = find(id);
    if (d.status !== "accepted" || d.activation) throw new Error("Not available");
    if (!input.confirmSamePerson || !input.confirmNoDuplicate) throw new Error("Both confirmations are required");
    const at = new Date().toISOString();
    d.activation = { id: `act-${d.id}`, status: "pending-activation", createdAt: at, createdBy: ME, clientName: nameOf(CLIENTS, input.clientId), outletName: nameOf(OUTLETS, input.outletId), role: input.role, startDate: input.startDate };
    d.allowedActions = [];
    d.needsAttention = false;
    d.updatedAt = at;
    d.history.push({ id: uid(), at, actor: ME, action: `Converted to staff: staff entitlement added to the same person, pending activation record created (${d.activation.role}, ${d.activation.clientName})`, from: "Accepted", to: "Accepted" });
    return clone(d);
  },

  async devSimulateOperationsApproval(id) {
    await sleep(250);
    const d = find(id);
    if (d.status !== "pending-approval") throw new Error("Not waiting for approval");
    d.approval = { state: "approved", by: OPS, at: new Date().toISOString() };
    move(d, "approved", OPS, "Approved the offer");
    return clone(d);
  },

  async devSimulateApplicantResponse(id, response) {
    await sleep(250);
    const d = find(id);
    const now = new Date().toISOString();
    if (response === "viewed" && d.status === "sent") {
      d.viewedAt = now;
      move(d, "viewed", "Applicant", "Opened the offer");
    } else if (response === "accepted" && (d.status === "sent" || d.status === "viewed")) {
      d.respondedAt = now;
      move(d, "accepted", "Applicant", "Accepted the offer");
    } else if (response === "declined" && (d.status === "sent" || d.status === "viewed")) {
      d.respondedAt = now;
      d.declineReason = "No reason given";
      move(d, "declined", "Applicant", "Declined the offer");
    }
    return clone(d);
  },
};
