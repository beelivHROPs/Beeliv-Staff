/**
 * Replaceable contract for Client Requests: UI -> hooks -> service -> adapter ->
 * (dev fixture NOW, Supabase adapter LATER). The adapter fetches and writes; no
 * business rule lives in a component. The backend re-checks every call against
 * role and client / outlet scope (RLS) and every write must create an audit /
 * activity record (spec 16, 28.2).
 */
import type { AdapterEvent } from "../adapter";
import type { AssignInput, DeclineInput, FulfilInput, RequestDetail, RequestsPage, RequestsQuery } from "./types";

export interface ClientRequestsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listRequests(query: RequestsQuery): Promise<RequestsPage>;
  /** null = not found or outside the user's scope. */
  getRequest(id: string): Promise<RequestDetail | null>;
  assignRequest(id: string, input: AssignInput): Promise<RequestDetail>;
  acknowledgeRequest(id: string): Promise<RequestDetail>;
  markFulfilled(id: string, input: FulfilInput): Promise<RequestDetail>;
  declineRequest(id: string, input: DeclineInput): Promise<RequestDetail>;
}
