/**
 * Replaceable contract for Shortlisting: UI -> hooks -> service -> adapter ->
 * (dev fixture NOW, Supabase adapter LATER). The backend re-checks role and
 * client / outlet scope, enforces the Hold / Reject note, and writes an audit
 * history record per applicant (spec 16, 28.2). HR shortlists; final selection
 * approval belongs to Operations, so no approve action exists here.
 */
import type { AdapterEvent } from "../adapter";
import type { BulkInput, BulkResult, ShortlistingPage, ShortlistingQuery } from "./types";

export interface ShortlistingAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listCandidates(query: ShortlistingQuery): Promise<ShortlistingPage>;
  bulkAction(ids: string[], input: BulkInput): Promise<BulkResult>;
}
