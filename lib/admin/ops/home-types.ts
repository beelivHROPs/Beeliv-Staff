/**
 * Operations Home, company-wide numbers (docs/contracts/ops-approvals.md section 8, DRAFT).
 * Counts only: no money on this screen. All people are FICTIONAL.
 * Approval counts and the "waiting longest" list come from the approvals adapter
 * (so they change the moment a request is decided); this shape carries the rest.
 */
import type { ISODateTime } from "../types";

export interface HrWorkloadRow {
  id: string;
  name: string;
  /** Vacancies this HR user currently owns that are still open. */
  openVacancies: number;
  /** Items waiting on this HR user (documents to check, replies, resubmissions). */
  pendingItems: number;
  /** Clients assigned to this HR user. */
  clients: number;
}

/** One row of the Operations "Clients & outlets" overview table. Counts only. */
export interface OpsClientRow {
  id: string;
  name: string;
  outlets: number;
  deployedStaff: number;
  /** Primary HR officer's name; null = nobody assigned (flagged red). */
  hr: string | null;
  openVacancies: number;
  requestsWaiting: number;
}

/** Workforce health: short counts, each opens a filtered list. STAND-IN sources, see ops-overview.md section 2. */
export interface OpsWorkforceHealth {
  attendanceExceptions: number;
  unassignedStaff: number;
  coverageGaps: number;
}

/** Recruitment snapshot: counts only, no money. */
export interface OpsRecruitment {
  openVacancies: number;
  candidatesInProgress: number;
  placementsThisMonth: number;
}

export interface OpsCompany {
  /** Overview strip (ops-overview.md section 2). */
  activeClients: number;
  activeOutlets: number;
  deployedStaff: number;
  openWorkforceRequests: number;
  /** Sum of the three workforce-health counts (stand-in rule). */
  operationalExceptions: number;
  workforce: OpsWorkforceHealth;
  recruitment: OpsRecruitment;
  clients: OpsClientRow[];
  openJobs: number;
  placementsThisMonth: number;
  interviewsThisWeek: number;
  /** Clients that have no HR owner yet: Operations has to assign one. */
  clientsWithoutHr: number;
  hrWorkload: HrWorkloadRow[];
  asOf: ISODateTime;
}

export interface OpsHomeAdapter {
  getCompany(): Promise<OpsCompany>;
}
