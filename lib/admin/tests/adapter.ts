/**
 * Replaceable contract for Tests & Forms: UI -> hooks -> service -> adapter -> (in-memory store NOW, Supabase LATER).
 * No business rules in a component. Every call must be re-checked by the backend against role and scope (RLS), and every
 * write must create an audit / history record. A score only assists a person; nothing here rejects anyone.
 */
import type { AdapterEvent } from "../adapter";
import type { FormDefinition, FormKind, FormStatus, FormSubmission, FormAudience, SubmissionStatus } from "@/lib/forms/types";
import type { FormInput, ScoreInfo, SubmissionHistoryEntry } from "./store";

export type FormTab = "all" | "tests" | "appraisals";
export type FormSort = "updated" | "title";

export interface FormQuery {
  search: string;
  tab: FormTab;
  status: FormStatus | "";
  sort: FormSort;
  pageSize: number;
}

export interface FormRow {
  id: string;
  title: string;
  kind: FormKind;
  audience: FormAudience;
  clientName?: string;
  status: FormStatus;
  version: number;
  questionCount: number;
  submissionCount: number;
  updatedAt: string;
  updatedBy: string;
}

export interface FormsPage {
  rows: FormRow[];
  total: number;
  tabCounts: Record<FormTab, number>;
  workspaceEmpty: boolean;
}

export type ResultSort = "newest" | "oldest";

export interface ResultQuery {
  search: string;
  sort: ResultSort;
  pageSize: number;
}

export interface SubmissionRow {
  id: string;
  takerId: string;
  takerName: string;
  takerType: "applicant" | "staff";
  submittedAt: string | null;
  status: SubmissionStatus;
  score: ScoreInfo | null;
  recommendation: FormSubmission["recommendation"];
}

export interface ResultsPage {
  form: FormDefinition;
  rows: SubmissionRow[];
  total: number;
  submittedTotal: number;
}

export interface QuestionSummary {
  questionId: string;
  prompt: string;
  type: FormDefinition["questions"][number]["type"];
  answered: number;
  /** Choice questions: how many picked each option (and "Other" when allowed). */
  counts: { label: string; count: number }[];
  /** Rating questions. */
  average: number | null;
  /** Written answers, with NO names (whether appraisals are anonymous needs Beeliv confirmation). */
  written: string[];
}

export interface FormSummary {
  form: FormDefinition;
  submittedTotal: number;
  questions: QuestionSummary[];
}

export interface SubmissionDetail {
  form: FormDefinition;
  submission: FormSubmission;
  score: ScoreInfo | null;
  history: SubmissionHistoryEntry[];
}

export interface FormFacets {
  clients: string[];
  departments: string[];
}

export interface TestsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listForms(query: FormQuery): Promise<FormsPage>;
  /** Null when the form does not exist or is outside the user's scope. */
  getForm(id: string): Promise<{ form: FormDefinition; submissionCount: number } | null>;
  getFacets(): Promise<FormFacets>;
  saveForm(input: FormInput): Promise<FormDefinition>;
  setStatus(id: string, status: FormStatus): Promise<FormDefinition>;
  duplicate(id: string): Promise<FormDefinition>;
  listResults(formId: string, query: ResultQuery): Promise<ResultsPage | null>;
  getSummary(formId: string): Promise<FormSummary | null>;
  getSubmission(id: string): Promise<SubmissionDetail | null>;
  saveMarks(id: string, marks: Record<string, number>, recommendation: FormSubmission["recommendation"]): Promise<SubmissionDetail>;
}
