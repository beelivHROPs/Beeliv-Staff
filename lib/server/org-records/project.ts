/**
 * Explicit DTO projection. Each parser rebuilds the DTO field by field, so a database or gateway reply
 * that carries extra data (auth ids, tokens, NIN, bank values) cannot leak through. A malformed reply
 * returns null and the caller reports a safe code.
 */
import { UUID, plain } from "./validation";
import {
  CLIENT_OUTLETS_DEFAULT, STAFF_HISTORY_DEFAULT,
  ORG_STATUSES, STAFF_STATUSES,
  type ClientDetailDto, type ClientRowDto, type OrgStatus, type OutletDto, type Page, type PlacementDto, type StaffDetailDto, type StaffRowDto, type StaffStatus,
} from "./types";

export const id = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const int = (v: unknown, min: number, max: number): v is number => Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max;
const when = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
const day = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) && Number.isFinite(Date.parse(v));
const orgStatus = (v: unknown): v is OrgStatus => typeof v === "string" && (ORG_STATUSES as readonly string[]).includes(v);
const staffStatus = (v: unknown): v is StaffStatus => typeof v === "string" && (STAFF_STATUSES as readonly string[]).includes(v);

export function projectOutlet(v: unknown): OutletDto | null {
  if (!plain(v) || !id(v.id) || !id(v.clientId) || !str(v.reference, 40) || !str(v.name, 200) || !str(v.address, 300) || !str(v.city, 120) || !str(v.phone, 40)
    || !str(v.manager, 120) || !str(v.notes, 500) || !orgStatus(v.status) || !int(v.activeStaff, 0, 1_000_000) || !int(v.revision, 1, 1_000_000)) return null;
  return { id: v.id, clientId: v.clientId, reference: v.reference, name: v.name, address: v.address, city: v.city, phone: v.phone, manager: v.manager, notes: v.notes, status: v.status, activeStaff: v.activeStaff, revision: v.revision };
}

export function projectClientRow(v: unknown): ClientRowDto | null {
  if (!plain(v) || !id(v.id) || !str(v.reference, 40) || !str(v.name, 200) || !str(v.businessType, 120) || !str(v.city, 120) || !orgStatus(v.status)
    || !int(v.outletsCount, 0, 1_000_000) || !int(v.activeStaff, 0, 1_000_000) || !int(v.revision, 1, 1_000_000)) return null;
  return { id: v.id, reference: v.reference, name: v.name, businessType: v.businessType, city: v.city, status: v.status, outletsCount: v.outletsCount, activeStaff: v.activeStaff, revision: v.revision };
}

/** Shared check for a bounded collection reply: explicit total, truncation flag and cursor that agree with the items. */
function pageMeta(items: { id: string }[], total: unknown, truncated: unknown, cursor: unknown, limit: number, after: string | null): { total: number; truncated: boolean; cursor: string | null } | null {
  if (!int(total, 0, 10_000_000) || typeof truncated !== "boolean" || !(cursor === null || id(cursor)) || items.length > limit || total < items.length) return null;
  if (truncated !== (cursor !== null)) return null;
  // A truncated page is full and its cursor is the last item it returned, so the next page continues exactly there.
  if (truncated && (items.length !== limit || cursor !== items[items.length - 1].id)) return null;
  // The first page of an untruncated collection holds everything: nothing is silently missing.
  if (!truncated && after === null && total !== items.length) return null;
  return { total, truncated, cursor };
}

export function projectClientDetail(v: unknown, limit: number = CLIENT_OUTLETS_DEFAULT, after: string | null = null): ClientDetailDto | null {
  const row = projectClientRow(v);
  if (!row || !plain(v) || !str(v.address, 300) || !when(v.createdAt) || !when(v.updatedAt) || !Array.isArray(v.outlets) || v.outlets.length > limit) return null;
  const outlets: OutletDto[] = [];
  for (const o of v.outlets) { const p = projectOutlet(o); if (!p || p.clientId !== row.id) return null; outlets.push(p); }
  const meta = pageMeta(outlets, v.outletsTotal, v.outletsTruncated, v.outletsNextCursor, limit, after);
  if (!meta) return null;
  return { ...row, address: v.address, createdAt: v.createdAt, updatedAt: v.updatedAt, outlets, outletsTotal: meta.total, outletsTruncated: meta.truncated, outletsNextCursor: meta.cursor };
}

export function projectPlacement(v: unknown): PlacementDto | null {
  if (!plain(v) || !id(v.id) || !id(v.clientId) || !str(v.client, 200) || !id(v.outletId) || !str(v.outlet, 200) || !str(v.role, 80) || !str(v.department, 80)
    || !day(v.start) || !(v.end === null || day(v.end)) || typeof v.current !== "boolean" || !str(v.changedBy, 200) || !(v.note === null || str(v.note, 300))) return null;
  // Exactly the current placement is open-ended.
  if (v.current !== (v.end === null)) return null;
  return { id: v.id, clientId: v.clientId, client: v.client, outletId: v.outletId, outlet: v.outlet, role: v.role, department: v.department, start: v.start, end: v.end, current: v.current, changedBy: v.changedBy, note: v.note };
}

export function projectStaffRow(v: unknown): StaffRowDto | null {
  if (!plain(v) || !id(v.id) || !str(v.reference, 60) || !str(v.name, 200) || !staffStatus(v.status) || !str(v.department, 80)
    || !int(v.previousCount, 0, 100_000) || !int(v.revision, 1, 1_000_000)) return null;
  let current: PlacementDto | null = null;
  if (v.current !== null) { current = projectPlacement(v.current); if (!current || !current.current) return null; }
  return { id: v.id, reference: v.reference, name: v.name, status: v.status, department: v.department, current, previousCount: v.previousCount, revision: v.revision };
}

export function projectStaffDetail(v: unknown, limit: number = STAFF_HISTORY_DEFAULT, after: string | null = null): StaffDetailDto | null {
  const row = projectStaffRow(v);
  if (!row || !plain(v) || !str(v.email, 254) || !str(v.phone, 40) || (v.onboardingOrigin !== "legacy" && v.onboardingOrigin !== "recruited")
    || typeof v.hasAccount !== "boolean" || !Array.isArray(v.history) || v.history.length > limit) return null;
  const history: PlacementDto[] = [];
  for (const h of v.history) { const p = projectPlacement(h); if (!p || p.current) return null; history.push(p); }
  const meta = pageMeta(history, v.historyTotal, v.historyTruncated, v.historyNextCursor, limit, after);
  // The caller-visible total can never be below the scoped previousCount shown on the row.
  if (!meta || (after === null && meta.total !== row.previousCount)) return null;
  return { ...row, email: v.email, phone: v.phone, onboardingOrigin: v.onboardingOrigin, hasAccount: v.hasAccount, history, historyTotal: meta.total, historyTruncated: meta.truncated, historyNextCursor: meta.cursor };
}

export function projectPage<T>(d: Record<string, unknown>, one: (v: unknown) => T | null, pageSize: number, page: number): Page<T> | null {
  if (!Array.isArray(d.items) || d.items.length > pageSize || !int(d.total, 0, 10_000_000) || d.page !== page || d.pageSize !== pageSize) return null;
  const items: T[] = [];
  for (const raw of d.items) { const p = one(raw); if (!p) return null; items.push(p); }
  return { items, total: d.total, page, pageSize };
}
