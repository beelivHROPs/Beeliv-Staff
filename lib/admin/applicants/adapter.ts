/**
 * The replaceable contract between the Applicants screens and their data
 * source: UI -> hooks -> service -> adapter -> (dev fixture NOW, Supabase
 * adapter LATER). An adapter fetches and writes; no business rules live in a
 * component. Every call must be re-checked by the backend against the user's
 * role and client / outlet scope (RLS). Every recruitment action must write an
 * audit / history record (spec 28.2).
 */
import type { AdapterEvent } from "../adapter";
import type { ActionInput, ApplicantDetail, ApplicantsPage, ApplicantsQuery } from "./types";

export interface ApplicantsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listApplicants(query: ApplicantsQuery): Promise<ApplicantsPage>;
  /** Resolves null when the id is unknown or out of this user's scope. */
  getApplicant(id: string): Promise<ApplicantDetail | null>;
  /** Returns the record after the action (stage / status / activity updated). */
  performAction(id: string, input: ActionInput): Promise<ApplicantDetail>;
  addNote(id: string, body: string): Promise<ApplicantDetail>;
}
