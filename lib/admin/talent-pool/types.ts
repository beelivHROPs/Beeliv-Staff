/**
 * Talent Pool data shapes (spec 6.5 "Talent Pool" status, REC-003: unsuccessful
 * applicants are retained and Talent Pool is a supported destination; spec 14
 * "Shortlisting: ... talent pool"). Presentation-facing only. Matching rules
 * ("suitable for new roles"), follow-up rules and last-contact windows are NOT
 * defined by the spec: the backend decides and the adapter returns the flags.
 * Applicant history is retained and never deleted by anything on this screen.
 * All people in the mock are FICTIONAL. Records are keyed by internal `id`.
 */
import type { ISODateTime } from "../types";

/** One status per retained candidate. The set of values needs Beeliv confirmation. */
export type PoolStatus = "suitable" | "needs-follow-up" | "retained";

/** Why the person is in the pool (spec: not selected / withdrawn / shortlisted but unplaced). */
export type RetainedAs = "not-selected" | "withdrawn" | "shortlisted-unplaced";

export type PoolTab = "all" | "suitable" | "follow-up";

/** Buckets for the last-contact filter. Bucket sizes need Beeliv confirmation. */
export type LastContactFilter = "" | "7d" | "30d" | "90d" | "over-90d" | "never";

export interface TalentPoolRow {
  id: string;
  /** Internal applicant id: the link target to the applicant record. */
  applicantId: string;
  name: string;
  location: string;
  department: string;
  /** Roles the person applied for (titles). */
  appliedFor: string[];
  sourceVacancy: { id: string; title: string };
  retainedAs: RetainedAs;
  skills: string[];
  lastContactAt: ISODateTime | null;
  status: PoolStatus;
  /** Why the person was moved here (optional note given at the time), when known. */
  reasonNote?: string | null;
  /** When the person entered the pool, when known (full timestamp). */
  addedAt?: ISODateTime | null;
}

export interface TalentPoolQuery {
  search: string;
  tab: PoolTab;
  skill: string;
  department: string;
  location: string;
  lastContact: LastContactFilter;
  /** Sort id, see POOL_SORTS. Compared on the full last-contact timestamp (never contacted sorts last). */
  sort: string;
  page: number;
  pageSize: number;
}

export const POOL_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A-Z" },
];

export interface OpenVacancyOption {
  id: string;
  title: string;
  department: string;
  outlet: string;
}

export interface TalentPoolPage {
  rows: TalentPoolRow[];
  /** Matches after filters, before paging. */
  total: number;
  tabCounts: Record<PoolTab, number>;
  facets: { skills: string[]; departments: string[]; locations: string[] };
  /** Vacancies a candidate can be added to. */
  openVacancies: OpenVacancyOption[];
  /** True when the pool itself is empty (not merely filtered to nothing). */
  workspaceEmpty: boolean;
}

export interface AddToVacancyInput {
  vacancyId: string;
  /** Required: written to the applicant's activity history. */
  reason: string;
}

export interface RemoveFromPoolInput {
  /** Required. The applicant record and history are kept. */
  reason: string;
}
