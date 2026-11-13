/**
 * Drill-through links. Every Overview metric, pipeline stage and attention
 * item leads to a filtered list. The list pages arrive with later build steps;
 * these URLs are the contract so the Overview never has to change.
 * Record links use the internal id, never a BLV-* reference.
 */
import type { DocQueueStatus, HrMetricId, InboxCategory } from "./types";

export const ADMIN_HOME = "/admin";
export const NEW_VACANCY_HREF = "/admin/recruitment/vacancies/new";
export const ADMIN_NOTIFICATIONS_HREF = "/admin/notifications";

/** URL slug per recruitment stage, in the same order as APPLICATION_STAGES (lib/applicant/types.ts). */
const STAGE_SLUGS = ["application", "review-shortlisting", "interview-assessment", "documentation", "verification", "selection-approval", "staff-onboarding", "assignment"] as const;

const APPLICANTS = "/admin/recruitment/applicants";
/** Where applicant LISTS live now (the simple People hub). Profiles stay at APPLICANTS/<id>. */
export const PEOPLE_APPLICANTS = "/admin/people?view=applicants";
export const PEOPLE_POOL = "/admin/people?view=pool";
export const OPEN_JOBS_HREF = "/admin/jobs?tab=open";

export const stageHref = (stageIndex: number) => `${PEOPLE_APPLICANTS}&stage=${STAGE_SLUGS[stageIndex] ?? STAGE_SLUGS[0]}`;
export const applicantHref = (applicantId: string) => `${APPLICANTS}/${applicantId}`;
export const docQueueHref = (status?: DocQueueStatus | "pending") => `/admin/recruitment/documentation${status ? `?status=${status}` : ""}`;
export const inboxHref = (category?: InboxCategory) => `/admin/inbox${category ? `?category=${category}` : ""}`;
export const inboxItemHref = (id: string) => `/admin/inbox/${id}`;

/** Where each of the seven spec metrics (14.1) drills to. */
export const METRIC_HREF: Record<HrMetricId, string> = {
  openVacancies: OPEN_JOBS_HREF,
  applications: PEOPLE_APPLICANTS,
  shortlisted: `${PEOPLE_APPLICANTS}&stage=shortlisted`,
  interviewsPending: "/admin/recruitment/interviews?status=pending",
  documentationPending: docQueueHref("pending"),
  awaitingApproval: `${PEOPLE_APPLICANTS}&stage=selection-approval`,
  approvedPlaced: `${PEOPLE_APPLICANTS}&stage=approved-placed`,
};
