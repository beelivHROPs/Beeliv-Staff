/**
 * Vacancy data shapes (Master Spec v1.5 section 15; docs/BEELIV-RECRUITMENT-SPEC.md section 3).
 * Presentation-facing only: rules such as which action is allowed, when a
 * vacancy becomes "Closing soon" (number of days needs Beeliv confirmation) and
 * who approves "Pending Approval" (needs Beeliv confirmation) belong to the
 * backend; the adapter returns the result (`status`, `allowedActions`).
 * References (`reference`) are generated server-side and only displayed. Records
 * are keyed and linked by the internal `id`. All names are FICTIONAL.
 */
import type { ISODateTime } from "../types";
import type { Journey } from "@/lib/journeys/types";

/** The spec's one status list. "closing-soon" is derived by the backend from Published + deadline. */
export type VacancyStatus = "draft" | "pending-approval" | "published" | "paused" | "closing-soon" | "closed" | "filled" | "cancelled";

/** Tab groups on the list. */
export type VacancyTab = "all" | "open" | "draft" | "pending" | "paused" | "ended";

export type VacancyAction = "submit-for-approval" | "publish" | "resume" | "pause" | "close" | "mark-filled" | "cancel";

/** Save intents from the form. "save" keeps the current status (a new vacancy stays Draft). */
export type SaveIntent = "save" | "submit-for-approval" | "publish";

/** Mock-layer capability flags. The real boundary is the backend / RLS. */
export interface VacancyCapabilities {
  canCreate: boolean;
  canEdit: boolean;
  /** false for HR Officer: they submit for approval instead. */
  canPublish: boolean;
  canSubmitForApproval: boolean;
  canPause: boolean;
  canClose: boolean;
  canMarkFilled: boolean;
  canCancel: boolean;
}

export type Visibility = "public" | "internal";
export type SalaryFrequency = "Monthly" | "Weekly" | "Daily";

export interface VacancyCounts {
  applications: number;
  shortlisted: number;
  interviewed: number;
  placed: number;
}

export interface VacancyRow {
  id: string;
  /** Server-generated; display only. */
  reference: string;
  title: string;
  department: string;
  client: { id: string; name: string };
  outlet: { id: string; name: string } | null;
  location: string;
  employmentType: string;
  recruiter: { id: string; name: string } | null;
  openings: number;
  /** Unavailable until application reporting is connected. */
  counts: VacancyCounts | null;
  /** Absent on legacy mock records, which always include counts. */
  countsReady?: boolean;
  /** Present on live records for optimistic concurrency. */
  revision?: number;
  storedStatus?: Exclude<VacancyStatus, "closing-soon">;
  status: VacancyStatus;
  /** null = never published yet. */
  postedAt: ISODateTime | null;
  /** YYYY-MM-DD. REQUIRED on every vacancy. */
  closesOn: string;
  /** When it was closed / filled / cancelled, if it was. */
  endedAt: ISODateTime | null;
}

export interface VacancyActivity {
  id: string;
  at: ISODateTime;
  actor: string;
  action: string;
  from: string | null;
  to: string | null;
  reason?: string;
}

export interface Experience {
  minYears: number;
  maxYears?: number;
  summary: string;
}

export interface Benefit {
  id: string;
  kind: string;
  detail: string;
  visibility: Visibility;
}

export interface ScreeningQuestion {
  id: string;
  text: string;
  required: boolean;
  /** Answer types beyond these need Beeliv confirmation. */
  answerType: "yes-no" | "text";
}

export interface Salary {
  min: number | null;
  max: number | null;
  frequency: SalaryFrequency;
  negotiable: boolean;
  visibility: Visibility;
}

/**
 * The photo on the public job card (PROPOSAL, needs Beeliv confirmation).
 * source "default": the department's default photo (`ref` is empty);
 * "library": a starter-library image (`ref` = library id);
 * "upload": HR's own photo (`ref` = a reference the backend resolves; the mock
 * holds a temporary browser object URL). `alt` is required and public.
 */
export interface VacancyImage {
  source: "default" | "library" | "upload";
  ref: string;
  alt: string;
}

/** The editable content of a vacancy (what the form reads and writes). */
export interface VacancyContent {
  expectedResumption: string;
  about: string;
  responsibilities: string[];
  essential: string[];
  preferred: string[];
  experience: Experience;
  skills: string[];
  salary: Salary;
  benefits: Benefit[];
  conditions: { workingDays: string; shiftSystem: string; hours: string; weekends: string; publicHolidays: string };
  requiredDocuments: { atApplication: string[]; afterSelection: string[] };
  screeningQuestions: ScreeningQuestion[];
  /** Optional test or form (published, kind test) applicants take as part of the application. */
  testFormId?: string;
  /** Optional. Absent = the department's default photo. */
  image?: VacancyImage;
  /**
   * The ordered steps an applicant goes through for THIS job. The vacancy keeps its own copy
   * (copied from a template or written here); editing a template never changes it. The documents,
   * screening questions and test above belong to their journey steps: a step that is not in the
   * journey has no content here.
   */
  journey: Journey;
  /** What the applicant sees as "Recruitment process". DERIVED from the journey by the backend; sent by the form for the mock. */
  recruitmentProcess: string[];
  interview: { method: string; location: string };
}

export interface VacancyInput extends VacancyContent {
  title: string;
  department: string;
  clientId: string;
  outletId: string;
  location: string;
  employmentType: string;
  openings: number;
  recruiterId: string;
  closesOn: string;
}

export interface VacancyDetail extends VacancyRow, VacancyContent {
  allowedActions: VacancyAction[];
  /** False once ended (closed, filled, cancelled) or when the user may not edit. */
  canEdit: boolean;
  activity: VacancyActivity[];
}

export interface VacancyQuery {
  search: string;
  tab: VacancyTab;
  status: VacancyStatus | "";
  department: string;
  clientId: string;
  /** "none" = unassigned. */
  recruiterId: string;
  /** Sort id, see VACANCY_SORTS. Posted sorts use the full ISO timestamp. */
  sort: string;
  page: number;
  pageSize: number;
}

export const VACANCY_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "closing", label: "Closing soonest" },
  { value: "title", label: "Title A-Z" },
];

export interface VacanciesPage {
  rows: VacancyRow[];
  total: number;
  tabCounts: Record<VacancyTab, number>;
  facets: { departments: string[]; clients: { id: string; name: string }[]; recruiters: { id: string; name: string }[] };
  capabilities: VacancyCapabilities;
  workspaceEmpty: boolean;
}

/** Configurable data for the form: never hard-coded in components. */
export interface VacancyConfig {
  departments: string[];
  employmentTypes: string[];
  benefitKinds: string[];
  clients: { id: string; name: string; outlets: { id: string; name: string }[] }[];
  recruiters: { id: string; name: string }[];
  /** Default recruitment process shown to applicants. It differs from the locked 8-stage workflow: open conflict with the project lead. */
  defaultRecruitmentProcess: string[];
  defaultRequiredDocuments: VacancyContent["requiredDocuments"];
  capabilities: VacancyCapabilities;
}

export interface ActionInput {
  action: VacancyAction;
  /** Required for pause, close, mark-filled and cancel. */
  reason?: string;
}

export type FieldErrors = Partial<Record<string, string>>;

/** Thrown by an adapter when the backend rejects the input. */
export class VacancyValidationError extends Error {
  fields: FieldErrors;
  constructor(fields: FieldErrors) {
    super("Vacancy failed validation");
    this.name = "VacancyValidationError";
    this.fields = fields;
  }
}
