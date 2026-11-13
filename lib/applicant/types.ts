/**
 * Applicant dashboard: shared type definitions.
 *
 * Per project-lead/backend-engineer direction (2026-09-28): these types
 * define the CALL SHAPE a future Supabase-backed implementation would need.
 * This file owns presentation-layer data contracts only — it does not
 * invent database schema, RLS policy, or server-side progression rules.
 * Four state domains are modelled as separate fields/types rather than one
 * flattened "status" string, per that same direction:
 *   1. Profile completeness  -> ProfileCompleteness (derived, see service.ts)
 *   2. Application lifecycle -> Application.lifecycle
 *   3. Recruitment stage     -> Application.stage (0-7, meaningful once submitted)
 *   4. Document verification -> Document.status (per document, not per application)
 */

import type { Job } from "@/lib/public-site/jobs";

/** Female or Male only — project-lead decision, 2026-09-29. */
export type Gender = "Female" | "Male";

/** Stands in for the Supabase Auth session user + their reusable profile. */
export type ApplicantProfile = {
  id: string;
  fullName: string;
  preferredName: string;
  email: string;
  phone: string;
  whatsapp: string;
  dateOfBirth: string;
  /**
   * The applicant's real gender (requirements doc 2026-09-29, Module 1 §2).
   * ONE field: Beeliv's onboarding form's "Sex" is the same value, prefilled
   * in Documentation (docs/BEELIV-RECRUITMENT-SPEC.md §4). "" = not given yet.
   * Completely separate from the avatar/persona PROTOTYPE toggle in
   * lib/applicant/avatar.ts.
   */
  gender: Gender | "";
  nationality: string;
  /** Residential (home) address. Does NOT drive state/lga below. */
  address: string;
  /** State of ORIGIN (not state of residence) — Module 1 §2 / SOURCE-OF-TRUTH §7. One of NIGERIAN_STATES. */
  state: string;
  /** LGA of ORIGIN (free text), paired with `state` above. */
  lga: string;
  applicantId: string;
  title: string;
  location: string;
  emergencyContact: { name: string; relationship: string; phone: string };
  professionalSummary: string;
  certifications: string[];
  employmentHistory: EmploymentEntry[];
  skills: Record<string, string[]>;
  preferredLocations: string[];
  availability: string;
  willingShifts: boolean;
  willingWeekendsHolidays: boolean;
  expectedSalary: string;
  /**
   * Same identity gains a StaffEntitlement once an application reaches the
   * approved recruitment milestone (docs/BEELIV-APPLICANT-JOURNEY.md §8) -
   * NOT a new account/record. Typed placeholder only: no Staff dashboard
   * routes are built from this, per instruction ("a typed placeholder is
   * fine, no real Staff routes needed").
   */
  staffEntitlement: StaffEntitlement;
};

/**
 * Staff access (locked transition, docs/requirements/beeliv-applicant-to-
 * staff-transition-2026-09-29.md): ONE user — applicant access stays, staff
 * access is ADDED when placement is confirmed. No second signup, no duplicate
 * user. The Staff Hub (talent.beeliv.co) has its own login path.
 */
export type StaffEntitlement = {
  granted: boolean;
  grantedAt: string | null;
  outletName: string | null;
  /** Placed position, e.g. "Floor Manager". */
  role?: string | null;
  /** ISO date the new staff member starts. */
  resumptionDate?: string | null;
};

/** Employment offer shown to the applicant at Selection/Approval (stage 6). */
export type Offer = {
  sentAt: string;
  /** ISO date by which Beeliv asks for a response, if set. */
  respondBy: string | null;
  role: string;
  outlet: string;
  location: string;
  employmentType: string;
  resumptionDate: string;
  reportingTo?: string;
  letterFileName: string;
  status: "pending" | "accepted" | "declined";
  respondedAt: string | null;
  declineReason?: string;
};

export type EmploymentEntry = {
  role: string;
  company: string;
  period: string;
  /** Module 1 §2 "Reason for leaving". Optional: empty for a current role or older saved entries. */
  reasonForLeaving?: string;
};

export type ProfileCompleteness = {
  percent: number;
  missing: string[];
  /** Every checklist item with whether it is done, in checklist order. */
  items: { label: string; done: boolean }[];
  /** Wireframe-style one-liner, e.g. "2 things left: a professional summary and your certifications." */
  summary: string;
};

/**
 * Confirmed 8-stage recruitment workflow (docs/BEELIV-APPLICANT-JOURNEY.md
 * "The Journey, End to End" / docs/BEELIV-SOURCE-OF-TRUTH.md §3). Do not
 * invent alternate stage names.
 */
export const APPLICATION_STAGES = [
  "Application",
  "Application Review/Shortlisting",
  "Interview/Assessment",
  "Documentation",
  "Verification",
  "Selection/Approval",
  "Staff Onboarding",
  "Assignment to Client/Outlet",
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

/** Broad application lifecycle — separate from the recruitment `stage` index above. */
export type ApplicationLifecycle =
  | "draft"
  | "submitted"
  | "in_talent_pool"
  | "not_selected"
  | "withdrawn"
  | "completed";

export type NextAction = {
  label: string;
  detail: string;
  ctaLabel: string;
  href: string;
  /** Presentational hint only — "warn" for something the applicant must do, "ok" for a positive next step like an interview. */
  tone?: "warn" | "ok" | "info" | "violet";
};

export type ActivityEntry = { title: string; detail?: string; when: string };

/**
 * Thin, Application-stage candidate-profile data captured during Apply
 * (docs/BEELIV-APPLICANT-JOURNEY.md §1/§4) — contact re-confirmation,
 * experience, skills, screening questions. Deliberately excludes date of
 * birth, home address, NIN, banking and next-of-kin, which belong to the
 * later, not-yet-wireframed Documentation stage.
 */
export type ApplyFormData = {
  fullName: string;
  preferredName: string;
  phone: string;
  whatsapp: string;
  email: string;
  yearsExperience: string;
  expectedSalary: string;
  availability: string;
  earliestStart: string;
  preferredLocation: string;
  willingShifts: "Yes" | "No";
  willingWeekends: "Yes" | "No";
  willingHolidays: "Yes" | "No";
  sectors: string[];
  skills: Record<string, string[]>;
  roleCertificateFileName: string | null;
  /**
   * Role-specific screening answers keyed by question id (lib/applicant/
   * screening.ts). Optional so drafts saved before per-role questions
   * existed still load - read them with readScreeningAnswers().
   */
  screeningAnswers?: Record<string, string | string[]>;
  /** @deprecated Old hard-coded chef questions; superseded by screeningAnswers (migrated on read). */
  screeningQ1?: "Yes" | "No" | "";
  /** @deprecated See screeningQ1. */
  screeningQ2?: string;
  /** @deprecated See screeningQ1. */
  screeningQ3?: string;
};

export type Application = {
  id: string;
  applicantId: string;
  /** Links to lib/public-site/jobs.ts's Job.id when the role is still listed there. */
  vacancyId: string | null;
  role: string;
  company: string;
  location: string;
  employmentType: string;
  lifecycle: ApplicationLifecycle;
  /** Index into APPLICATION_STAGES. Only meaningful once lifecycle !== "draft". */
  stage: number;
  /** ISO timestamp per stage index, or null if not yet reached. Format for display with lib/applicant/time.ts. */
  stageDates: (string | null)[];
  /** ISO timestamp, or null while still a draft. */
  submittedAt: string | null;
  /** ISO timestamp of the last change — format with RelativeTime, don't store a separate display label. */
  updatedAt: string;
  draftPercent?: number;
  form: ApplyFormData;
  next: NextAction | null;
  activity: ActivityEntry[];
  /** Present once Beeliv sends an employment offer. */
  offer?: Offer;
};

/**
 * Interview stages the applicant can see. "Client interview" = Module 1 §5
 * Stage 3 (Client/Business Interview). HR scores/notes are never shown.
 */
export type InterviewKind = "Interview" | "Screening" | "Client interview" | "Practical assessment";
export type InterviewStatus = "scheduled" | "completed" | "cancelled";

export type Interview = {
  id: string;
  applicationId: string;
  title: string;
  kind: InterviewKind;
  status: InterviewStatus;
  applicationLabel: string;
  /** ISO timestamp. Present when status === "scheduled" — derive weekday/day/month/time with lib/applicant/time.ts. */
  scheduledAt?: string;
  /** ISO timestamp. Present when status === "completed". */
  completedAt?: string;
  mode?: string;
  /** Meeting link for a video interview (https only), set by HR when scheduling. Optional: absent until HR adds it. */
  meetingLink?: string;
  withWhom?: string;
  prep?: string[];
  /** Scheduled length, for the "10:00 – 10:45 AM (WAT)" range the wireframe shows. Optional; start time alone is shown without it. */
  durationMinutes?: number;
};

/** Two distinct document categories per docs/BEELIV-APPLICANT-JOURNEY.md §1/§4. */
export type DocumentCategory = "application" | "pre-employment";
/**
 * Internal status. Applicant-facing wording follows Module 1 §3 via
 * documentStatusLabel() in reference-data.ts (Pending / Uploaded / Approved
 * for application documents; Pending / Submitted / Verified for
 * pre-employment ones) — display labels only.
 */
export type DocumentStatus = "verified" | "pending-review" | "action-required";

/** Module 1 §3 document checklist rows. See DOCUMENT_TYPES in reference-data.ts. */
export type DocumentTypeKey =
  | "cv"
  | "passport-photo"
  | "valid-id"
  | "educational-certificate"
  | "professional-certificate"
  | "employment-evidence"
  | "guarantor-form"
  | "reference-contacts"
  | "reference-letter"
  | "medical-fitness"
  | "other";

export type ApplicantDocument = {
  id: string;
  ownerId: string;
  category: DocumentCategory;
  /** Which checklist row this is. Optional so older records still work — resolve with documentTypeOf(). */
  docType?: DocumentTypeKey;
  name: string;
  fileName: string | null;
  size: string | null;
  /** ISO timestamp, or null if not yet uploaded. */
  uploadedOn: string | null;
  status: DocumentStatus;
  usedInApplicationIds: string[];
  /** Pre-employment documents are tied to one specific application. */
  forApplicationId?: string;
  /** ISO timestamp deadline — format with lib/applicant/time.ts's formatDueLabel. */
  due?: string;
  description?: string;
  hasTemplate?: boolean;
  isReferenceForm?: boolean;
  /**
   * Present only while HR has asked for a new file (status "action-required").
   * `reason` is HR's own plain-language words, shown verbatim; never internal
   * notes, scores or reviewer names. Cleared when the person uploads again.
   */
  resubmission?: DocumentResubmission;
  /** True after the person uploaded a new file following a resubmission request, until HR reviews it. */
  resubmitted?: boolean;
};

export type DocumentResubmission = {
  reason: string;
  /** ISO timestamp of the request. */
  requestedAt: string;
};

export type NotificationTone = "ok" | "warn" | "info" | "violet";
/** Coarse glyph set (also used by AppShell's bell menu). Finer per-kind glyphs come from `kind`. */
export type NotificationIcon = "sign" | "shieldok" | "cal" | "file" | "calcheck" | "spark";

/**
 * Applicant notification kinds — exactly docs/BEELIV-RECRUITMENT-SPEC.md §7
 * (requirements Module 1 §8 plus "Documents verified" and "Talent-pool
 * notice"). Label/tone per kind live in NOTIFICATION_KINDS
 * (reference-data.ts). General notices (welcome, "under review",
 * "assessment completed") carry no kind and use their coarse `icon`.
 */
export type NotificationKind =
  | "application-received"
  | "shortlisted"
  | "interview-invitation"
  | "interview-reminder"
  | "document-request"
  | "documentation-reminder"
  | "documents-verified"
  | "client-approval"
  | "offer"
  | "placement"
  | "resumption-date"
  | "not-selected"
  | "talent-pool";

export type AppNotification = {
  id: string;
  /** Optional so older saved notifications still render (falls back to icon/tone). */
  kind?: NotificationKind;
  /**
   * Shared event code (lib/notifications/catalog.ts) for kinds the applicant list above
   * does not have, such as "interview.changed" and "interview.cancelled". Wins over `kind`.
   */
  code?: import("@/lib/notifications/catalog").EventCode;
  tone: NotificationTone;
  icon: NotificationIcon;
  title: string;
  detail: string;
  /** ISO timestamp — format with RelativeTime, don't store a separate display string. */
  createdAt: string;
  unread: boolean;
  link?: { label: string; href: string };
};

/** The wireframe's own "active applicant" / "new applicant" prototype-state toggle (`st.mode`). */
export type PrototypeMode = "active" | "new" | "placed";

/** Re-exported so consumers don't need a second import from lib/public-site/jobs. */
export type { Job };
