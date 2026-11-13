/**
 * Shortlisting data shapes (spec 6.4, 14 "Shortlisting: screening, filters,
 * shortlist, talent pool", 16, 28.2). Presentation contracts only.
 *
 * `fitScore` / `fitLabel` are a GUIDE computed by the backend: they assist HR
 * and never shortlist, hold or reject anyone (spec 6.4). Hold and Reject need a
 * screening note. Transition rules between statuses, experience buckets and how
 * the guide is calculated are not in the spec: needs Beeliv confirmation.
 * All people are FICTIONAL. Records are keyed by internal `id`.
 */
import type { ISODateTime } from "../types";

export type ScreeningStatus = "to-screen" | "shortlisted" | "hold" | "rejected" | "talent-pool";

export type ScreeningTab = "all" | ScreeningStatus;

export type FitLabel = "strong" | "possible" | "weak";

export interface ScreeningRow {
  /** Internal application id (also the link target to the applicant record). */
  id: string;
  /** Server-generated Applicant reference. Display only. */
  reference: string;
  name: string;
  vacancyId: string;
  vacancy: string;
  location: string;
  experienceYears: number;
  skills: string[];
  documentsPercent: number;
  profilePercent: number;
  appliedAt: ISODateTime;
  status: ScreeningStatus;
  /** Backend guide, 0-100. Null when it could not be calculated. */
  fitScore: number | null;
  fitLabel: FitLabel | null;
  /** Latest screening note (Hold / Reject), if any. */
  note: string | null;
}

/** "" = any. Bucket edges need Beeliv confirmation. */
export type ExperienceFilter = "" | "0-1" | "2-3" | "4-5" | "6+";
export type DocumentsFilter = "" | "complete" | "partial" | "none";

export interface ShortlistingQuery {
  search: string;
  tab: ScreeningTab;
  vacancyId: string;
  experience: ExperienceFilter;
  location: string;
  skill: string;
  documents: DocumentsFilter;
  /** Sort id, see SHORTLIST_SORTS. Compared on the full applied timestamp. */
  sort: string;
  page: number;
  pageSize: number;
}

export const SHORTLIST_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "match", label: "Best match first" },
  { value: "name", label: "Name A-Z" },
];

export interface ShortlistingPage {
  rows: ScreeningRow[];
  total: number;
  /** After search and dropdown filters, before the tab. */
  tabCounts: Record<ScreeningTab, number>;
  facets: { vacancies: { id: string; name: string }[]; locations: string[]; skills: string[] };
  workspaceEmpty: boolean;
}

export type BulkAction = "shortlist" | "hold" | "reject" | "talent-pool";

export interface BulkInput {
  action: BulkAction;
  /** Required for hold and reject (UI enforces; the backend re-validates). */
  note?: string;
}

export interface BulkResult {
  changed: number;
  /** Already in the target status, so left alone. */
  skipped: number;
}
