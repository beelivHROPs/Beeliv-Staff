/**
 * Replaceable contract for Operations approvals: UI -> hooks -> service ->
 * adapter -> (dev fixture NOW, Supabase adapter LATER). The adapter fetches and
 * writes; no business rule lives in a component. The backend must re-check role
 * (Operations only), scope and the current status on every call, record an audit
 * event for every decision, and refuse a stale `expectedRevision` with a
 * ConflictError. HR has no decide call. Nothing is emailed by the demo adapter.
 */
import type { AdapterEvent } from "../adapter";
import type { ApprovalDetail, ApprovalQuery, ApprovalsPage, DecisionInput, OpsSummary } from "./types";

/** Someone else decided first (or the record changed). Maps to HTTP 409. */
export class ConflictError extends Error {
  constructor(message = "Already decided by someone else") {
    super(message);
    this.name = "ConflictError";
  }
}

export interface OpsApprovalsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  getSummary(): Promise<OpsSummary>;
  listApprovals(query: ApprovalQuery): Promise<ApprovalsPage>;
  /** Null when the record does not exist or is outside the user's scope. */
  getApproval(id: string): Promise<ApprovalDetail | null>;
  /** Throws ConflictError when the record is no longer waiting or the revision is stale. */
  decide(id: string, input: DecisionInput): Promise<ApprovalDetail>;
}
