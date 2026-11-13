/**
 * Operations "Staff Assignments" data shapes (docs/contracts/ops-staff-assignments.md,
 * DRAFT). Presentation-facing only: the backend owns who may reassign, the
 * effective-date rule, the revision check and the audit trail. All people are
 * FICTIONAL. Records are keyed by internal `id`; `BLV-*` references come only
 * from the adapter. NIN and banking values never exist in these shapes.
 */
import type { DocState, StaffStatus } from "../staff/types";
import type { ISODateTime } from "../types";

export type { DocState, StaffStatus };

/** One stretch of working at one client / outlet in one role. The earlier ones are the History. */
export interface StaffPlacement {
  id: string;
  clientId: string;
  client: string;
  outletId: string;
  outlet: string;
  role: string;
  start: ISODateTime;
  end: ISODateTime | null;
  current: boolean;
  /** Name only. */
  changedBy: string;
  note: string | null;
}

export type StaffShow = "all" | "unassigned";

export interface OpsStaffRow {
  id: string;
  reference: string;
  name: string;
  status: StaffStatus;
  /** null = approved, awaiting a placement ("Unassigned"). */
  current: StaffPlacement | null;
  previousCount: number;
  /** Sent with a reassign call so a stale screen is refused (conflict). */
  revision: number;
}

export interface OpsStaffQuery {
  search: string;
  show: StaffShow;
  /** "" = any client. */
  clientId: string;
}

/** What the "Reassign" picker lists (every staff member, whatever the filters). */
export interface StaffChoice {
  id: string;
  name: string;
  placed: boolean;
}

export interface OpsStaffPage {
  rows: OpsStaffRow[];
  total: number;
  counts: Record<StaffShow, number>;
  facets: { clients: { id: string; name: string }[] };
  choices: StaffChoice[];
  /** True when there is no staff at all (not merely none matching). */
  workspaceEmpty: boolean;
}

export interface PlacementOptions {
  clients: { id: string; name: string; outlets: { id: string; name: string }[] }[];
  roles: string[];
}

export interface StaffDocItem {
  type: string;
  state: DocState;
  updatedAt: ISODateTime | null;
}

export interface OpsStaffDetail extends OpsStaffRow {
  /** Earlier placements, newest first. Never deleted, never overwritten. */
  history: StaffPlacement[];
  /** Status only. Operations never gets a document file or a NIN / bank value here. */
  documents: { verified: number; total: number; needAttention: number; items: StaffDocItem[] };
  options: PlacementOptions;
}

export interface ReassignInput {
  clientId: string;
  outletId: string;
  role: string;
  /** ISO date (yyyy-mm-dd). */
  effectiveDate: string;
  /** Optional, up to 300 characters. */
  note: string;
  expectedRevision: number;
}

export const NOTE_MAX = 300;
