/**
 * What a person TAKING a test or form may see (Applicant / Staff). Questions, options, time limit and wording only.
 * No answer keys, points, marking mode, pass marks, marks or other people's answers exist in these shapes by design.
 * Must not import anything from lib/admin/**.
 */
import type { AnswerValue, QuestionType } from "./types";

export interface ParticipantQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  helper?: string;
  required: boolean;
  options?: { id: string; label: string }[];
  optionsSource?: "departments";
  allowOther?: boolean;
  ratingMax?: number;
}

export interface ParticipantForm {
  id: string;
  version: number;
  kind: "test" | "appraisal";
  title: string;
  description: string;
  /** Client name for client-specific forms (e.g. an outlet's staff appraisal). */
  clientName?: string;
  audience: "applicants" | "staff";
  timeLimitMinutes: number | null;
  attemptsAllowed: number;
  questions: ParticipantQuestion[];
}

/** One person's finished attempt, as handed over on submit. */
export interface Attempt {
  formId: string;
  formVersion: number;
  takerId: string;
  takerName: string;
  takerType: "applicant" | "staff";
  applicationId?: string;
  vacancyId?: string;
  startedAt: string;
  answers: Record<string, AnswerValue>;
  otherText: Record<string, string>;
}

export interface SentAttempt extends Attempt {
  id: string;
  submittedAt: string;
}
