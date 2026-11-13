/**
 * DEV FIXTURE for Client Requests. Everything is FICTIONAL. The first six
 * requests mirror the Client app fixture (lib/client/adapters/mock-data.ts) so
 * both apps tell the same story. Writes are in-memory, append activity, and
 * reset with the Prototype state control. The reasons are backend-authored
 * text (taxonomy needs Beeliv confirmation).
 * Replace with a Supabase adapter implementing ClientRequestsAdapter; no screen changes.
 *
 * Preview helper: add `?state=restricted` to see the unauthorized state.
 */
import { isoOffset } from "@/lib/applicant/time";
import { RestrictedError, type AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import type { ClientRequestsAdapter } from "./adapter";
import { STATUS_LABEL, type PersonRef, type RequestActivityEntry, type RequestDetail, type RequestRow, type RequestsPage, type RequestsQuery, type RequestStatus, type RequestTab } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});

async function previewGate(ms = 300) {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("state") === "restricted") {
    await sleep(200);
    throw new RestrictedError();
  }
  await sleep(ms);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
  return mode;
}

const listeners = new Set<(e: AdapterEvent) => void>();

const HR: PersonRef[] = [
  { id: "hr-funke", name: "Funke Sample", isMe: true },
  { id: "hr-tunde", name: "Tunde Sample" },
  { id: "hr-amina", name: "Amina Sample" },
];
const ME = HR[0];

const CLIENTS = [
  { id: "c-kalina", name: "Kalina Hospitality" },
  { id: "c-lounge", name: "Demo Lounge Lagos" },
];

const ymd = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** n, client idx, outlet, role, department, headcount, status, reason, days ago, assignee idx, linked vacancy, notes */
type Seed = [number, number, string, string, string, number, RequestStatus, string, number, number | null, [string, string] | null, string];
const SEEDS: Seed[] = [
  [1, 0, "Kalina Abuja", "Waiter", "Floor service", 2, "in-recruitment", "Expansion", 12, 1, ["v-1", "Waiter / Waitress"], "Weekend evening cover for the new terrace."],
  [2, 0, "Kalina Abuja", "Restaurant Supervisor", "Floor service", 1, "candidates-submitted", "Replacement", 20, 0, ["v-2", "Restaurant Supervisor"], ""],
  [3, 0, "Kalina Abuja", "Bartender", "Bar", 2, "in-recruitment", "Replacement", 15, 2, null, "Prefer cocktail experience."],
  [4, 0, "Kalina Lekki", "Sous Chef", "Kitchen", 1, "candidates-submitted", "New opening", 18, 0, null, ""],
  [5, 0, "Kalina Lekki", "Barback", "Bar", 1, "new", "Expansion", 2, null, null, "Could start after the first week of next month."],
  [6, 0, "Kalina Lagos", "Cashier", "Admin", 1, "in-recruitment", "Replacement", 9, 1, null, ""],
  [7, 1, "Demo Lounge Lagos", "Host / Hostess", "Floor service", 2, "new", "New opening", 1, null, null, "Friday and Saturday nights."],
  [8, 1, "Demo Lounge Lagos", "Security Steward", "Support", 2, "under-review", "Expansion", 4, 2, null, ""],
  [9, 0, "Kalina Abuja", "Dishwasher", "Kitchen", 3, "fulfilled", "Replacement", 40, 0, ["v-3", "Kitchen Steward"], "Three placed and started."],
  [10, 1, "Demo Lounge Lagos", "Event Coordinator", "Management", 1, "declined", "New opening", 30, 1, null, ""],
];

interface Item {
  row: RequestRow;
  notes: string;
  closingNote: string | null;
  activity: RequestActivityEntry[];
}

const rId = (i: number) => `rq-${String(i + 1).padStart(3, "0")}`;

function withNext(r: RequestRow): RequestRow {
  const ageDays = Math.floor((Date.now() - new Date(r.submittedAt).getTime()) / 86_400_000);
  let nextAction: string | null = null;
  let needsAttention = false;
  if (r.status === "new") {
    nextAction = r.assignedTo ? "Acknowledge the request" : "Assign and acknowledge";
    needsAttention = !r.assignedTo;
  } else if (r.status === "under-review") nextAction = r.linkedVacancy ? "Start recruitment" : "Link or create a vacancy";
  else if (r.status === "in-recruitment") nextAction = r.linkedVacancy ? "Recruit for the vacancy" : "Link or create a vacancy";
  else if (r.status === "candidates-submitted") nextAction = "Wait for client feedback";
  return { ...r, nextAction, needsAttention: needsAttention || (r.status === "new" && ageDays >= 3) };
}

function build(): Item[] {
  return SEEDS.map(([n, c, outlet, role, dept, count, status, reason, ago, who, vac, notes], i) => {
    const row: RequestRow = withNext({
      id: rId(i),
      reference: `BLV-REQ-${String(n).padStart(4, "0")}`,
      clientId: CLIENTS[c].id,
      client: CLIENTS[c].name,
      outlet,
      role,
      department: dept,
      headcount: count,
      neededBy: ymd(21 + n),
      reason,
      status,
      assignedTo: who === null ? null : HR[who],
      linkedVacancy: vac ? { id: vac[0], title: vac[1] } : null,
      submittedAt: isoOffset(-ago, 9, 20),
      nextAction: null,
      needsAttention: false,
    });
    const activity: RequestActivityEntry[] = [{ id: `${rId(i)}-a0`, actor: "Client", at: isoOffset(-ago, 9, 20), action: "Request received", from: null, to: "New", note: null }];
    if (who !== null) activity.push({ id: `${rId(i)}-a1`, actor: ME.name, at: isoOffset(-ago + 1, 10, 0), action: `Assigned to ${HR[who].name}`, from: null, to: HR[who].name, note: null });
    if (status !== "new" && status !== "under-review") activity.push({ id: `${rId(i)}-a2`, actor: HR[who ?? 0].name, at: isoOffset(-ago + 2, 11, 0), action: "Request acknowledged", from: "New", to: "Acknowledged", note: null });
    if (status === "under-review") activity.push({ id: `${rId(i)}-a2`, actor: HR[who ?? 0].name, at: isoOffset(-ago + 1, 11, 0), action: "Request acknowledged", from: "New", to: "Acknowledged", note: null });
    if (vac) activity.push({ id: `${rId(i)}-a3`, actor: HR[who ?? 0].name, at: isoOffset(-ago + 3, 14, 0), action: "Vacancy linked", from: null, to: vac[1], note: null });
    if (status === "fulfilled") activity.push({ id: `${rId(i)}-a4`, actor: ME.name, at: isoOffset(-5, 15, 0), action: "Marked as fulfilled", from: "Recruitment in progress", to: "Fulfilled", note: notes || null });
    if (status === "declined") activity.push({ id: `${rId(i)}-a4`, actor: ME.name, at: isoOffset(-25, 15, 0), action: "Request declined", from: "Acknowledged", to: "Declined", note: "Event coordination is outside Beeliv's current recruitment services." });
    return { row, notes: status === "fulfilled" ? "" : notes, closingNote: status === "fulfilled" ? notes || null : status === "declined" ? "Event coordination is outside Beeliv's current recruitment services." : null, activity };
  });
}

let items: Item[] = build();
subscribePrototypeMode(() => {
  items = build();
  listeners.forEach((l) => l("reset"));
});

function detailOf(it: Item): RequestDetail {
  const s = it.row.status;
  const open = s !== "fulfilled" && s !== "declined";
  return {
    ...it.row,
    notes: it.notes,
    requestedBy: { name: it.row.clientId === "c-kalina" ? "Mr. Adeyemi (Sample)" : "Tosin Sample", role: it.row.clientId === "c-kalina" ? "Owner" : "General manager" },
    hrOptions: HR,
    closingNote: it.closingNote,
    activity: [...it.activity].sort((a, b) => b.at.localeCompare(a.at)),
    capabilities: { canAssign: open, canAcknowledge: s === "new", canFulfil: open, canDecline: open },
  };
}

function tabOf(r: RequestRow): RequestTab {
  if (r.status === "new") return "new";
  if (r.status === "fulfilled") return "fulfilled";
  if (r.status === "declined") return "closed";
  return "in-progress";
}

function matches(r: RequestRow, q: RequestsQuery): boolean {
  const needle = q.search.trim().toLowerCase();
  if (needle && ![r.role, r.client, r.outlet ?? "", r.reference, r.assignedTo?.name ?? ""].some((s) => s.toLowerCase().includes(needle))) return false;
  if (q.clientId && r.clientId !== q.clientId) return false;
  return true;
}

function mutate(id: string, fn: (it: Item) => Item): RequestDetail {
  const idx = items.findIndex((x) => x.row.id === id);
  if (idx < 0) throw new Error("Unknown request");
  const next = fn(items[idx]);
  next.row = withNext(next.row);
  items = items.map((x, k) => (k === idx ? next : x));
  return detailOf(next);
}

const log = (it: Item, action: string, from: string | null, to: string | null, note: string | null): RequestActivityEntry[] => [
  ...it.activity,
  { id: `${it.row.id}-a${it.activity.length + 1}`, actor: ME.name, at: new Date().toISOString(), action, from, to, note },
];

export const mockClientRequestsAdapter: ClientRequestsAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async listRequests(q) {
    const mode = await previewGate();
    const facets: RequestsPage["facets"] = { clients: CLIENTS };
    const zero = { new: 0, "in-progress": 0, fulfilled: 0, closed: 0 };
    if (mode === "empty") return { rows: [], total: 0, tabCounts: zero, facets, workspaceEmpty: true };
    const base = items.map((x) => x.row).filter((r) => matches(r, q));
    const counts = { ...zero };
    base.forEach((r) => (counts[tabOf(r)] += 1));
    const tabbed = base.filter((r) => tabOf(r) === q.tab).sort((a, b) => a.neededBy.localeCompare(b.neededBy));
    return { rows: tabbed.slice(0, q.limit), total: tabbed.length, tabCounts: counts, facets, workspaceEmpty: false };
  },

  async getRequest(id) {
    const mode = await previewGate();
    if (mode === "empty") return null;
    const it = items.find((x) => x.row.id === id);
    return it ? detailOf(it) : null;
  },

  async assignRequest(id, input) {
    await sleep(350);
    const who = HR.find((p) => p.id === input.assigneeId);
    if (!who) throw new Error("Unknown HR user");
    return mutate(id, (it) => ({ ...it, row: { ...it.row, assignedTo: who }, activity: log(it, `Assigned to ${who.name}`, it.row.assignedTo?.name ?? "Unassigned", who.name, null) }));
  },

  async acknowledgeRequest(id) {
    await sleep(350);
    return mutate(id, (it) => ({ ...it, row: { ...it.row, status: "under-review", assignedTo: it.row.assignedTo ?? ME }, activity: log(it, "Request acknowledged", STATUS_LABEL[it.row.status], STATUS_LABEL["under-review"], null) }));
  },

  async markFulfilled(id, input) {
    await sleep(400);
    return mutate(id, (it) => ({ ...it, row: { ...it.row, status: "fulfilled" }, closingNote: input.note || null, activity: log(it, "Marked as fulfilled", STATUS_LABEL[it.row.status], STATUS_LABEL.fulfilled, input.note || null) }));
  },

  async declineRequest(id, input) {
    await sleep(400);
    return mutate(id, (it) => ({ ...it, row: { ...it.row, status: "declined" }, closingNote: input.reason, activity: log(it, "Request declined", STATUS_LABEL[it.row.status], STATUS_LABEL.declined, input.reason) }));
  },
};
