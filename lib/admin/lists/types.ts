/**
 * Lists & Rules: the lists Beeliv configures for itself (departments, roles,
 * leave types, interview stages, scoring criteria, warning types and levels,
 * required documents). Other Admin screens READ these through the store's hooks
 * and getters; they never hard-code the values. Array order IS the display order.
 * MOCK ONLY: a database adapter replaces lib/admin/lists/mock.ts later.
 */

export type ListKey = "departments" | "roles" | "leaveTypes" | "interviewStages" | "scoringCriteria" | "warningTypes" | "warningLevels" | "requiredDocuments";

export interface Department {
  id: string;
  name: string;
  active: boolean;
}

export interface Role {
  id: string;
  name: string;
  departmentId: string;
  active: boolean;
}

export interface LeaveType {
  id: string;
  name: string;
  paid: boolean;
  defaultDays: number;
  needsApproval: boolean;
  active: boolean;
}

export interface InterviewStageItem {
  id: string;
  name: string;
  /** "Only where required": the stage is skipped unless the vacancy or client asks for it. */
  onlyWhereRequired: boolean;
  /** Free text such as "Recruiter". Null = nobody by default. */
  defaultInterviewerRole: string | null;
  active: boolean;
}

export interface ScoringCriterionItem {
  id: string;
  name: string;
  /** Helper text shown to the interviewer. Optional. */
  hint: string | null;
  /** Scores run from 1 to this number. Fixed at 5. */
  scaleMax: 5;
  /** Optional weight. Null = every criterion counts equally. */
  weight: number | null;
  active: boolean;
}

export interface WarningTypeItem {
  id: string;
  name: string;
  active: boolean;
}

/** A severity level. Array order is lowest to highest. */
export interface WarningLevelItem {
  id: string;
  name: string;
  active: boolean;
}

export type DocStage = "application" | "after-selection" | "onboarding";
export const DOC_STAGE_LABEL: Record<DocStage, string> = { application: "At application", "after-selection": "After selection", onboarding: "Onboarding" };
export const DOC_STAGES: DocStage[] = ["application", "after-selection", "onboarding"];

export type DocFormat = "PDF" | "JPG" | "PNG";
export const DOC_FORMATS: DocFormat[] = ["PDF", "JPG", "PNG"];

export interface RequiredDocumentItem {
  id: string;
  /** Null = all roles. */
  roleId: string | null;
  /** Key from the existing document types (lib/applicant/reference-data DOCUMENT_TYPES). */
  docTypeKey: string;
  stage: DocStage;
  required: boolean;
  formats: DocFormat[];
  maxMb: number;
  active: boolean;
}

export interface ItemByKey {
  departments: Department;
  roles: Role;
  leaveTypes: LeaveType;
  interviewStages: InterviewStageItem;
  scoringCriteria: ScoringCriterionItem;
  warningTypes: WarningTypeItem;
  warningLevels: WarningLevelItem;
  requiredDocuments: RequiredDocumentItem;
}

/** What the sheet edits: an item without its id and active flag. */
export type DraftOf<K extends ListKey> = Omit<ItemByKey[K], "id" | "active">;

export interface HistoryNote {
  by: string;
  at: string;
}

export type ListsData = { [K in ListKey]: ItemByKey[K][] } & { history: Record<ListKey, HistoryNote | null> };

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };
