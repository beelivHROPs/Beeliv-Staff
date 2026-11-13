/**
 * Replaceable contract between the Inbox UI and its data source:
 * UI -> hooks -> service -> adapter -> (mock NOW, Supabase LATER). An adapter
 * only fetches / writes; no business rules live in a component. Every call
 * must be re-checked by the backend against the user's role and queue (RLS).
 */
import type { CasePickerItem, InboxCaseResult, InboxList, InboxStatus, NeedsHomeItem } from "./types";

export interface InboxAdapter {
  /** Fires whenever data changed (a write, or a dev reset). */
  subscribe(listener: () => void): () => void;
  getList(): Promise<InboxList>;
  /** Throws NotFoundError when the case does not exist or is not in this user's queue. */
  getCase(id: string): Promise<InboxCaseResult>;
  reply(id: string, body: string): Promise<void>;
  addNote(id: string, body: string): Promise<void>;
  assign(id: string, assigneeId: string | null): Promise<void>;
  setStatus(id: string, status: InboxStatus): Promise<void>;
  escalate(id: string): Promise<void>;
  markRead(id: string): Promise<void>;
  /** Re-queue a FAILED email only when the server allows it (delivery.canRetry). Rejects otherwise. */
  retryDelivery(caseId: string, messageId: string): Promise<void>;
  /** Ask the server to reconcile an UNKNOWN outcome with the provider. Never sends. Returns the resulting state. */
  checkDelivery(caseId: string, messageId: string): Promise<"delivered" | "sent" | "failed" | "unknown">;
  /** Triage owner only (Operations or delegated). Throws RestrictedError for anyone else. */
  listNeedsHome(): Promise<NeedsHomeItem[]>;
  searchCasesForPicker(q: string): Promise<CasePickerItem[]>;
  /** Appends the email to the case as an inbound message ("replied by email") and removes it from the queue. */
  assignNeedsHome(itemId: string, caseId: string): Promise<void>;
  /** Marks the email as spam (kept for audit, not deleted). */
  dismissNeedsHome(itemId: string): Promise<void>;
}

export class NotFoundError extends Error {
  constructor(message = "Case not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
