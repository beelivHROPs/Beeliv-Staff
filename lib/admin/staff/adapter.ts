/**
 * The replaceable contract between the Staff screens and their data source:
 * UI -> hooks -> service -> adapter -> (dev fixture NOW, Supabase adapter
 * LATER). Every call must be re-checked by the backend against the user's role
 * and client / outlet scope (RLS). Assignment writes must append to the
 * assignment history and the audit log (spec 28.3).
 */
import type { AdapterEvent } from "../adapter";
import type { AssignInput, AssignmentsPage, AssignmentsQuery, StaffDetail, StaffDocsPage, StaffDocsQuery, StaffPage, StaffQuery } from "./types";

export interface StaffAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listStaff(query: StaffQuery): Promise<StaffPage>;
  /** Resolves null when the id is unknown or out of this user's client/outlet scope. */
  getStaff(id: string): Promise<StaffDetail | null>;
  listAssignments(query: AssignmentsQuery): Promise<AssignmentsPage>;
  /** One StaffAssignment record: ends the current one and starts the new one. Never copies. */
  assign(input: AssignInput): Promise<void>;
  listDocuments(query: StaffDocsQuery): Promise<StaffDocsPage>;
}
