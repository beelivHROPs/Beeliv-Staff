/**
 * Replaceable contract for Operations "Clients & HR": UI -> hooks -> service ->
 * adapter -> (dev fixture NOW, Supabase adapter LATER). The backend must re-check
 * role (Operations only), record an audit event for every assignment, and refuse
 * a stale `expectedRevision` with a ConflictError (HTTP 409). HR has no assign
 * call. Nothing is emailed by the demo adapter.
 */
import type { AdapterEvent } from "../adapter";
import type { AssignInput, AssignmentDetail, AssignmentsPage, AssignmentsQuery } from "./assignments-types";

export interface OpsAssignmentsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listAssignments(query: AssignmentsQuery): Promise<AssignmentsPage>;
  /** Null when the client does not exist. */
  getAssignment(clientId: string): Promise<AssignmentDetail | null>;
  /** Throws ConflictError when the revision is stale (someone else changed it first). */
  assignHr(clientId: string, input: AssignInput): Promise<AssignmentDetail>;
}
