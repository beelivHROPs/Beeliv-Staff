/**
 * Operations "Clients & HR" data shapes (docs/contracts/ops-assignments.md, DRAFT).
 * Presentation-facing only: the backend owns who may assign, the revision check
 * and the audit trail. All people are FICTIONAL. Records are keyed by internal
 * `id`; `BLV-*` references come only from the adapter. No sensitive fields
 * (NIN, banking) exist in these shapes.
 */
import type { ISODateTime } from "../types";

export type AssignTone = "ok" | "warn" | "bad" | "info" | "plum" | "mute";

export interface HrOfficer {
  id: string;
  name: string;
  photoUrl?: string | null;
}

/** "unassigned" = clients with no HR yet. */
export type AssignmentShow = "all" | "unassigned";

export interface AssignmentRow {
  id: string;
  /** Server-generated (BLV-CLI-...). Display only. */
  reference: string;
  name: string;
  statusLabel: string;
  statusTone: AssignTone;
  /** Primary HR, or null = nobody assigned (flagged red). */
  hr: HrOfficer | null;
  assignedAt: ISODateTime | null;
  openVacancies: number;
  pendingItems: number;
  /** Bumps on every change. Sent with an assign call so a stale screen is refused (conflict). */
  revision: number;
}

/** What one HR officer carries today. Counts only. */
export interface HrLoad {
  hr: HrOfficer;
  clients: number;
  openVacancies: number;
  pendingItems: number;
}

export interface AssignmentsQuery {
  search: string;
  show: AssignmentShow;
  /** "" = any HR officer. */
  hrId: string;
}

/** A client the top-level "Assign HR" button can pick (id, name, who has it now). */
export interface ClientChoice {
  id: string;
  name: string;
  hr: HrOfficer | null;
  revision: number;
}

export interface AssignmentsPage {
  rows: AssignmentRow[];
  total: number;
  counts: Record<AssignmentShow, number>;
  load: HrLoad[];
  facets: { hr: HrOfficer[] };
  /** Every client, regardless of the filters, for the "Assign HR" picker. */
  choices: ClientChoice[];
  /** True when there are no clients at all (not merely none matching). */
  workspaceEmpty: boolean;
}

export interface AssignmentHistoryEntry {
  id: string;
  at: ISODateTime;
  actor: string;
  kind: "assigned" | "reassigned";
  /** Name only, never an id. */
  fromHr: string | null;
  toHr: string;
  note: string | null;
}

export interface AssignmentDetail extends AssignmentRow {
  history: AssignmentHistoryEntry[];
  /** Every HR officer Operations may choose, with the load they carry now. */
  hrOptions: HrLoad[];
}

export interface AssignInput {
  hrId: string;
  /** Optional, up to 300 characters. */
  note: string;
  expectedRevision: number;
}

export const NOTE_MAX = 300;
