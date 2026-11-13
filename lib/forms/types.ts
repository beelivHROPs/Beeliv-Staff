/**
 * Tests & Forms: one model for scored tests (e.g. the hospitality Training Test) and unscored surveys
 * (e.g. the Brunch Lane Appraisal Form). Shared by Admin (build, publish, results) and the taker screens
 * (Applicant / Staff). Mock today; the real adapter will persist the same shapes.
 *
 * Rules: a score only ASSISTS a human decision and never rejects anyone. Answer keys are "suggested" until Beeliv
 * confirms them (the official keys for the Training Test are not yet supplied).
 */

export type FormKind = "test" | "appraisal";
export type FormStatus = "draft" | "published" | "archived";
export type FormAudience = "applicants" | "staff" | "client-staff";
export type QuestionType = "single" | "multiple" | "dropdown" | "short" | "long" | "rating" | "email";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface FormQuestion {
  id: string;
  type: QuestionType;
  /** Cleaned-up wording shown to the person taking it. */
  prompt: string;
  /** The exact wording Beeliv supplied (kept for reference and audit). */
  originalPrompt?: string;
  helper?: string;
  /** Every question in both supplied forms is required. */
  required: boolean;
  options?: QuestionOption[];
  /** Dropdown whose choices come from configurable adapter data instead of a fixed list. */
  optionsSource?: "departments";
  /** "Other (please specify)" free-text choice. */
  allowOther?: boolean;
  /** 1..ratingMax for type "rating". */
  ratingMax?: number;
  /** Tests only. Choice questions are auto-marked when a key exists; written answers are marked by a person. */
  marking: "auto" | "manual" | "none";
  points?: number;
  answerKey?: { optionIds: string[]; status: "suggested" | "confirmed" };
}

export interface FormDefinition {
  id: string;
  kind: FormKind;
  title: string;
  description: string;
  audience: FormAudience;
  /** Appraisals are tied to one client's outlet (e.g. Brunch Lane). */
  clientName?: string;
  status: FormStatus;
  version: number;
  timeLimitMinutes: number | null;
  /** Percent; null = not set (needs Beeliv confirmation). Never used to decide automatically. */
  passMarkPercent: number | null;
  questions: FormQuestion[];
  updatedAt: string;
  updatedBy: string;
}

export type SubmissionStatus = "in-progress" | "submitted" | "marked";
export type AnswerValue = string | string[] | number;

export interface FormSubmission {
  id: string;
  formId: string;
  formVersion: number;
  /** The person (internal id, never composed in components). */
  takerId: string;
  takerName: string;
  takerType: "applicant" | "staff";
  /** Set when the test was taken as part of a job application, so results link to that application. */
  applicationId?: string;
  vacancyId?: string;
  startedAt: string;
  submittedAt: string | null;
  status: SubmissionStatus;
  answers: Record<string, AnswerValue>;
  /** Free text typed into an "Other" option, by question id. */
  otherText?: Record<string, string>;
  /** Auto marks for choice questions that have a key, and manual marks for written ones, by question id. */
  marks?: Record<string, number>;
  /** HR's recommendation after reading it; a person decides, never the score. */
  recommendation?: "proceed" | "hold" | "needs-another-stage" | null;
  markedBy?: string | null;
}

export interface ScoreSummary {
  earned: number;
  possible: number;
  percent: number | null;
  /** Questions still waiting for a person to mark (written answers, or choice questions with no confirmed key). */
  awaitingMarking: number;
}
