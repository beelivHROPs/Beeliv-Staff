/**
 * Replaceable contract for Client Review: UI -> hooks -> service -> adapter ->
 * (dev fixture NOW, Supabase adapter LATER). The adapter fetches and writes; no
 * business rule lives in a component. The backend re-checks every call against
 * role and client / outlet scope (RLS) and every write must create an audit /
 * history record (spec 16, 28.2). Nothing here approves or selects a candidate:
 * final approval belongs to Operations (REC-001).
 */
import type { AdapterEvent } from "../adapter";
import type { ClientReviewDetail, ClientReviewPage, ClientReviewQuery, RecordFeedbackInput, ReturnToShortlistInput, SubmitToClientInput, WithdrawInput } from "./types";

export interface ClientReviewAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listSubmissions(query: ClientReviewQuery): Promise<ClientReviewPage>;
  /** null = not found or outside the user's scope. */
  getSubmission(id: string): Promise<ClientReviewDetail | null>;
  submitToClient(id: string, input: SubmitToClientInput): Promise<ClientReviewDetail>;
  withdrawSubmission(id: string, input: WithdrawInput): Promise<ClientReviewDetail>;
  recordFeedback(id: string, input: RecordFeedbackInput): Promise<ClientReviewDetail>;
  returnToShortlist(id: string, input: ReturnToShortlistInput): Promise<ClientReviewDetail>;
}
