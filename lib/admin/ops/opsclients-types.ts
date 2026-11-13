/**
 * Operations "Clients & Outlets" data shapes (docs/contracts/ops-clients-outlets.md,
 * DRAFT). Presentation-facing only: the backend owns scope, statuses and the
 * audit trail. Operations sees EVERY client (rbac.md section 5). All people are
 * FICTIONAL. `BLV-*` references come only from the adapter. No sensitive fields
 * (NIN, banking) exist in these shapes.
 */
import type { AssignmentHistoryEntry, AssignTone, HrOfficer } from "./assignments-types";
import type { StaffStatus } from "../staff/types";
import type { ISODateTime } from "../types";

export type { HrOfficer };

/** PROVISIONAL: the spec lists no client status values (needs Beeliv confirmation). */
export type ClientStatusKey = "active" | "onboarding" | "invited" | "inactive";

export interface OpsClientRow {
  id: string;
  reference: string;
  name: string;
  statusKey: ClientStatusKey;
  statusLabel: string;
  statusTone: AssignTone;
  outletsCount: number;
  /** Active or on-leave staff currently placed at this client. */
  deployedStaff: number;
  /** null = nobody assigned (flagged red). */
  hr: HrOfficer | null;
  openVacancies: number;
  /** Client requests nobody has started yet. */
  requestsWaiting: number;
}

export interface OpsClientsQuery {
  search: string;
  /** "" = any, "none" = clients with no HR, otherwise an HR officer id. */
  hrId: string;
  status: "" | ClientStatusKey;
}

export interface OpsClientsPage {
  rows: OpsClientRow[];
  total: number;
  facets: { hr: HrOfficer[] };
  /** True when there are no clients at all (not merely none matching). */
  workspaceEmpty: boolean;
}

export interface OpsOutletRow {
  id: string;
  name: string;
  city: string;
  address: string;
  statusLabel: string;
  statusTone: AssignTone;
  deployedStaff: number;
  openVacancies: number;
}

export interface OpsStaffOnSite {
  id: string;
  name: string;
  role: string;
  status: StaffStatus;
  outletId: string;
  outlet: string;
  since: ISODateTime;
}

export interface OpsVacancy {
  id: string;
  title: string;
  outletId: string;
  outlet: string;
  openings: number;
}

export interface OpsRequest {
  id: string;
  /** "Waiter / Waitress x 3" */
  title: string;
  outlet: string | null;
  /** Plain words, e.g. "Waiting" or "In progress". */
  statusLabel: string;
  waiting: boolean;
  submittedAt: ISODateTime;
}

/** Invitation status of one client user. HR sends invitations; Operations only sees the state. */
export type InviteState = "accepted" | "sent" | "expired" | "not-sent";

export interface OpsClientUser {
  id: string;
  name: string;
  title: string;
  email: string;
  invite: InviteState;
  invitedAt: ISODateTime | null;
  invitedBy: string | null;
}

export interface OpsClientDetail extends OpsClientRow {
  business: { type: string; city: string; address: string };
  createdAt: ISODateTime;
  assignedAt: ISODateTime | null;
  /** Newest first. Written by the Operations "Assign HR" action. */
  hrHistory: AssignmentHistoryEntry[];
  outlets: OpsOutletRow[];
  workforce: OpsStaffOnSite[];
  vacancies: OpsVacancy[];
  requests: OpsRequest[];
  users: OpsClientUser[];
}

export interface OpsOutletDetail {
  client: { id: string; name: string; hr: HrOfficer | null };
  outlet: OpsOutletRow;
  phone: string;
  /** Person in charge at the outlet. Empty when not recorded. */
  manager: string;
  staff: OpsStaffOnSite[];
  vacancies: OpsVacancy[];
}
