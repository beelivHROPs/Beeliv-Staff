import type { AdminIdentity, ClientDetailDto, ClientRowDto, Page } from "../org-records/types";
import type { InvitationListCursor, InvitationListResult } from "../../auth/invitation-management-wire";

export type Metric = { status: "available"; count: number } | { status: "unavailable" | "restricted"; count: null };
export type SummaryCode = "unavailable" | "unauthenticated" | "forbidden" | "rate_limited";
export type Summary = {
  generatedAt: string; staffPlaced: Metric; staffUnplaced: Metric; activeClients: Metric;
  activeOutlets: Metric; documentsAwaitingHr: Metric; pendingInvitations: Metric;
};
type Read<T> = { ok: true; value: T } | { ok: false; code: string };
export type SummaryDependencies = {
  enabled: boolean;
  authorize(): Promise<AdminIdentity | null>;
  consumeLimit(uid: string): Promise<void>;
  staff(show: "all" | "unassigned"): Promise<Read<{ total: number }>>;
  clients(page: number, status: "" | "active"): Promise<Read<Page<ClientRowDto>>>;
  client(id: string, after: string | null): Promise<Read<ClientDetailDto>>;
  documents(): Promise<Read<{ total: number }>>;
  invitations(after: InvitationListCursor | null): Promise<InvitationListResult>;
  now(): Date;
};
const missing = (restricted = false): Metric => ({ status: restricted ? "restricted" : "unavailable", count: null });
const available = (count: number): Metric => ({ status: "available", count });
const countOk = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 0;
const restricted = (code: unknown) => code === "forbidden" || code === "no_access";
function total(result: Read<{ total: number }>): Metric {
  return result.ok ? countOk(result.value.total) ? available(result.value.total) : missing() : missing(restricted(result.code));
}
async function safe<T>(work: () => Promise<T>): Promise<T | null> {
  try { return await work(); } catch { return null; }
}
// Fixed work budgets. A larger dataset is unavailable, never a silently truncated number.
export const OUTLET_CALL_BUDGET = 20, INVITATION_PAGE_BUDGET = 5;
async function outlets(deps: SummaryDependencies): Promise<Metric> {
  let calls = 0, page = 1, expected: number | null = null, seen = 0, count = 0;
  const clientIds = new Set<string>(), outletIds = new Set<string>();
  while (calls < OUTLET_CALL_BUDGET) {
    calls++;
    const list = await deps.clients(page, "");
    if (!list.ok) return missing(restricted(list.code));
    if (!countOk(list.value.total) || (expected !== null && expected !== list.value.total) || list.value.page !== page) return missing();
    expected = list.value.total;
    if (list.value.items.length === 0 && seen < expected) return missing();
    for (const row of list.value.items) {
      if (clientIds.has(row.id)) return missing();
      clientIds.add(row.id); seen++;
      let after: string | null = null, outletTotal: number | null = null, outletSeen = 0;
      for (;;) {
        if (calls >= OUTLET_CALL_BUDGET) return missing();
        calls++;
        const detail = await deps.client(row.id, after);
        if (!detail.ok) return missing(restricted(detail.code));
        const d = detail.value;
        if (d.id !== row.id || !countOk(d.outletsTotal) || (outletTotal !== null && outletTotal !== d.outletsTotal)) return missing();
        outletTotal = d.outletsTotal;
        for (const outlet of d.outlets) {
          if (outlet.clientId !== row.id || outletIds.has(outlet.id)) return missing();
          outletIds.add(outlet.id); outletSeen++;
          if (outlet.status === "active") count++;
        }
        if (!d.outletsTruncated) {
          if (d.outletsNextCursor !== null || outletSeen !== outletTotal) return missing();
          break;
        }
        if (!d.outlets.length || !d.outletsNextCursor || d.outletsNextCursor === after) return missing();
        after = d.outletsNextCursor;
      }
    }
    if (seen === expected) return available(count);
    if (seen > expected) return missing();
    page++;
  }
  return missing();
}
async function invitations(deps: SummaryDependencies): Promise<Metric> {
  let after: InvitationListCursor | null = null, count = 0;
  const ids = new Set<string>(), cursors = new Set<string>();
  for (let page = 0; page < INVITATION_PAGE_BUDGET; page++) {
    let result: InvitationListResult;
    try { result = await deps.invitations(after); } catch (e) {
      return missing(!!e && typeof e === "object" && "code" in e && restricted(e.code));
    }
    if (!result.ok) return missing(restricted(result.error.code));
    for (const item of result.items) {
      if (item.status !== "pending" || ids.has(item.id)) return missing();
      ids.add(item.id); count++;
    }
    if (result.next === null) return available(count);
    const key = JSON.stringify(result.next);
    if (!result.items.length || cursors.has(key)) return missing();
    cursors.add(key); after = result.next;
  }
  return missing();
}
export async function getAdminSummary(deps: SummaryDependencies): Promise<{ ok: true; value: Summary } | { ok: false; code: SummaryCode }> {
  if (!deps.enabled) return { ok: false, code: "unavailable" };
  let who: AdminIdentity | null;
  try { who = await deps.authorize(); } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? e.code : "";
    return { ok: false, code: restricted(code) ? "forbidden" : code === "rate_limited" ? "rate_limited" : "unavailable" };
  }
  if (!who || !who.emailVerified) return { ok: false, code: "unauthenticated" };
  if (who.aal !== "aal2") return { ok: false, code: "forbidden" };
  try { await deps.consumeLimit(who.uid); } catch (e) {
    return { ok: false, code: e && typeof e === "object" && "code" in e && e.code === "rate_limited" ? "rate_limited" : "unavailable" };
  }
  // Each source re-authorizes in its installed RPC. Nothing queries service-wide tables.
  const all = await safe(() => deps.staff("all"));
  const unassigned = await safe(() => deps.staff("unassigned"));
  let staffUnplaced = unassigned ? total(unassigned) : missing();
  let staffPlaced: Metric = missing();
  const allMetric = all ? total(all) : missing();
  if (allMetric.status === "available" && staffUnplaced.status === "available") {
    if (staffUnplaced.count <= allMetric.count) staffPlaced = available(allMetric.count - staffUnplaced.count);
    else staffUnplaced = missing();
  } else if (allMetric.status === "restricted" || staffUnplaced.status === "restricted") staffPlaced = missing(true);
  const clients = await safe(() => deps.clients(1, "active"));
  const documents = await safe(() => deps.documents());
  const activeOutlets = await safe(() => outlets(deps));
  const pendingInvitations = await safe(() => invitations(deps));
  return { ok: true, value: {
    generatedAt: deps.now().toISOString(), staffPlaced, staffUnplaced,
    activeClients: clients ? total(clients) : missing(), activeOutlets: activeOutlets ?? missing(),
    documentsAwaitingHr: documents ? total(documents) : missing(), pendingInvitations: pendingInvitations ?? missing(),
  } };
}


