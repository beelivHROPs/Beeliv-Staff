/**
 * Read-only contract for assessment results: UI -> hooks -> service -> adapter.
 * No write methods exist on purpose: creating, running and marking assessments
 * belongs to the later Assessment & Testing module. The backend re-checks role
 * and client / outlet scope on every read.
 */
import type { AdapterEvent } from "../adapter";
import type { AssessmentDetail, AssessmentsPage, AssessmentsQuery } from "./types";

export interface AssessmentsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listAssessments(query: AssessmentsQuery): Promise<AssessmentsPage>;
  getAssessment(id: string): Promise<AssessmentDetail | null>;
}
