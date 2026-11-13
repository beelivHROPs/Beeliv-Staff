/**
 * Assessment RESULTS (read-only). The Assessment & Testing module is delivered
 * in a later stage; this slice only RESERVES the data model so results can be
 * shown now and the module can fill it later (spec 6.4 Practical Assessment,
 * 14, 17 "Assessments" is a separate domain from interviews). Scores support
 * human judgment and never hire or reject anyone (spec 6.4).
 *
 * Reserved model (per assessment result): id, applicant/application, assessment
 * type (configurable), evaluator, scheduled/completed times, per-criterion
 * scores, total and max score, status, human recommendation, evaluator notes,
 * history. Test content, templates, attempts and evidence are the later module.
 * All people are FICTIONAL. Records are keyed by internal `id`.
 */
import type { ISODateTime } from "../types";
import type { InterviewHistoryEntry, PersonRef } from "../interviews/types";

export type AssessmentStatus = "scheduled" | "awaiting-result" | "completed" | "cancelled";
export type AssessmentTab = "all" | "scheduled" | "awaiting-result" | "completed";
export type AssessmentRecommendation = "meets-standard" | "below-standard" | "needs-retake";

export interface AssessmentRow {
  id: string;
  applicantId: string;
  candidateName: string;
  vacancyId: string;
  vacancy: string;
  typeId: string;
  typeName: string;
  evaluator: PersonRef | null;
  at: ISODateTime | null;
  score: number | null;
  maxScore: number | null;
  status: AssessmentStatus;
  recommendation: AssessmentRecommendation | null;
}

export interface AssessmentDetail extends AssessmentRow {
  applicantReference: string;
  breakdown: { criterion: string; score: number; max: number }[];
  evaluatorNotes: string | null;
  history: InterviewHistoryEntry[];
}

export interface AssessmentsQuery {
  search: string;
  tab: AssessmentTab;
  typeId: string;
  vacancyId: string;
  /** Sort id, see ASSESSMENT_SORTS. Compared on the full assessment timestamp. */
  sort: string;
  page: number;
  pageSize: number;
}

export const ASSESSMENT_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "candidate", label: "Candidate A-Z" },
  { value: "score", label: "Highest score" },
];

export interface AssessmentsPage {
  rows: AssessmentRow[];
  total: number;
  tabCounts: Record<AssessmentTab, number>;
  facets: { types: { id: string; name: string }[]; vacancies: { id: string; name: string }[] };
  workspaceEmpty: boolean;
}

export const ASSESSMENT_RECOMMENDATION_LABEL: Record<AssessmentRecommendation, string> = {
  "meets-standard": "Meets the standard",
  "below-standard": "Below the standard",
  "needs-retake": "Needs a retake",
};
