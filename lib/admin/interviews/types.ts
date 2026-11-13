/**
 * Interviews data shapes (spec 6.4, 14 "Interviews: schedule, interview forms,
 * scoring, recommendations", 16 audit, 28.2). Presentation contracts only.
 *
 * The spec says interview stages are CONFIGURABLE EVENTS, not hard-coded
 * columns, and scoring criteria are configurable. So stages and criteria arrive
 * from the adapter (`stages`, `criteria`); no screen names a stage. A total may
 * be calculated for guidance, but it never decides anything: the human
 * recommendation is a separate field (spec 6.4).
 *
 * Which stages apply to which vacancy ("where required"), conflict rules,
 * reminder rules and who may score are NOT in the spec: the backend decides
 * and the adapter returns flags. References come from the adapter only.
 * All people in the mock are FICTIONAL. Records are keyed by internal `id`.
 */
import type { ISODateTime } from "../types";
import type { ScorerRole } from "@/lib/journeys/types";

export interface PersonRef {
  id: string;
  name: string;
}

/** One configurable interview stage. Defaults (needs Beeliv confirmation): HR Screening, Beeliv Interview, Client Interview where required, Practical Assessment where required, Final Review. */
export interface InterviewStage {
  id: string;
  name: string;
  /** Plain-language note such as "Where the client requires it". Null when always used. */
  appliesNote: string | null;
}

export type InterviewMethod = "in-person" | "video" | "phone";

/** "to-schedule" = the candidate has reached this stage but no time is set yet. */
export type InterviewStatus = "to-schedule" | "scheduled" | "completed" | "cancelled";

/** Human recommendation (spec 6.4). Not derived from the score. */
export type InterviewRecommendation = "proceed" | "hold" | "reject" | "another-stage";

export interface ScoringCriterion {
  id: string;
  label: string;
  /** What a good answer looks like. Optional helper text. */
  hint: string | null;
  /** Highest rating (5 or 10). Comes from the vacancy's interview step. */
  scale: number;
  /** Whole number 1-5; only changes how the guide total is weighed. */
  weight: number;
}

export interface InterviewRow {
  /** Internal interview id (route key). */
  id: string;
  /** Internal application id: the link target to the applicant record. */
  applicantId: string;
  candidateName: string;
  vacancyId: string;
  vacancy: string;
  client: string;
  stageId: string;
  stageName: string;
  at: ISODateTime | null;
  durationMins: number;
  interviewer: PersonRef | null;
  method: InterviewMethod | null;
  location: string | null;
  /** Optional meeting link for a video interview: https only, plain text, max 300 characters. Shown to Beeliv roles in scope and to the candidate. */
  link: string | null;
  /** The stage's usual method and length, from the vacancy's journey. Null when the vacancy has no such stage. */
  defaults: { method: InterviewMethod; minutes: number } | null;
  status: InterviewStatus;
  /** Calculated from the scorecard, for guidance only. Null until scored. */
  totalScore: number | null;
  maxScore: number | null;
  recommendation: InterviewRecommendation | null;
  /** Short next-action label; null when nothing is waiting. */
  nextAction: string | null;
  /** True when HR must act now (red attention mark). */
  needsAttention: boolean;
}

export interface InterviewHistoryEntry {
  id: string;
  actor: string;
  at: ISODateTime;
  action: string;
  from: string | null;
  to: string | null;
  note: string | null;
}

export interface Scorecard {
  /** criterionId -> 1..scale of that criterion */
  ratings: Record<string, number>;
  notes: string;
  recommendation: InterviewRecommendation | null;
  submittedAt: ISODateTime | null;
  submittedBy: string | null;
}

/** What THIS user may do to THIS interview. UI shows or hides; the backend re-checks. */
export interface InterviewCapabilities {
  canSchedule: boolean;
  canReschedule: boolean;
  canCancel: boolean;
  canScore: boolean;
}

export interface InterviewDetail extends InterviewRow {
  /** Server-generated Applicant reference (display only). */
  applicantReference: string;
  /** People who can be chosen as interviewer when (re)scheduling. */
  interviewerOptions: PersonRef[];
  criteria: ScoringCriterion[];
  /** Who may score this stage (the journey step's setting). */
  whoMayScore: ScorerRole[];
  scorecard: Scorecard;
  /** The candidate's interview stages, in configured order. */
  pathway: { stageId: string; stageName: string; state: InterviewStatus | "not-required"; at: ISODateTime | null }[];
  history: InterviewHistoryEntry[];
  capabilities: InterviewCapabilities;
}

export type InterviewTab = "all" | "to-schedule" | "upcoming" | "needs-outcome" | "completed";

export interface InterviewsQuery {
  search: string;
  tab: InterviewTab;
  stageId: string;
  vacancyId: string;
  interviewerId: string;
  /** Week view: only interviews inside the range (inclusive start, exclusive end). */
  range: { from: ISODateTime; to: ISODateTime } | null;
  /** Sort id, see INTERVIEW_SORTS. Compared on the full scheduled timestamp (unscheduled last). */
  sort: string;
  page: number;
  pageSize: number;
}

export const INTERVIEW_SORTS = [
  { value: "soonest", label: "Soonest first" },
  { value: "latest", label: "Latest first" },
  { value: "candidate", label: "Candidate A-Z" },
];

export interface InterviewsPage {
  rows: InterviewRow[];
  total: number;
  /** After search and dropdown filters, before the tab. */
  tabCounts: Record<InterviewTab, number>;
  facets: {
    stages: InterviewStage[];
    vacancies: { id: string; name: string }[];
    interviewers: PersonRef[];
  };
  /** Interviews with no time yet: the choices for the top-level "Schedule interview" sheet. */
  schedulable: { id: string; label: string; defaults: InterviewRow["defaults"] }[];
  /** True when there are no interviews at all (distinct from "no matches"). */
  workspaceEmpty: boolean;
}

export interface ScheduleInput {
  at: ISODateTime;
  durationMins: number;
  interviewerId: string;
  method: InterviewMethod;
  /** Required for in-person. */
  location: string;
  /** Optional for video (https only). Empty means no link yet. */
  link: string;
  /** Required when rescheduling. */
  reason?: string;
}

export interface ConflictQuery {
  /** Interview being scheduled (excluded from the check). */
  interviewId: string;
  at: ISODateTime;
  durationMins: number;
  interviewerId: string;
}

export interface Conflict {
  interviewId: string;
  who: "interviewer" | "candidate";
  label: string;
  at: ISODateTime;
}

export interface SaveScorecardInput {
  ratings: Record<string, number>;
  notes: string;
  recommendation: InterviewRecommendation;
}

export const RECOMMENDATION_LABEL: Record<InterviewRecommendation, string> = {
  proceed: "Proceed",
  hold: "Hold",
  reject: "Reject",
  "another-stage": "Needs another stage",
};

export const METHOD_LABEL: Record<InterviewMethod, string> = { "in-person": "In person", video: "Video call", phone: "Phone call" };
