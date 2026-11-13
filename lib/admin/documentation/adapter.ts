/**
 * Replaceable contract for Documentation: UI -> hooks -> service -> adapter ->
 * (dev fixture NOW, Supabase adapter LATER). The adapter fetches and writes;
 * no business rules live in a component. Every call must be re-checked by the
 * backend against role and scope (RLS / Storage policies), and every write
 * must create an audit / history record (spec 30, 32.2). File bytes live in
 * private storage: nothing here returns a file URL.
 */
import type { AdapterEvent } from "../adapter";
import type { DocumentQuery, DocumentQueuePage, DocumentRecord, ResubmissionInput } from "./types";

export interface DocumentationAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listDocuments(query: DocumentQuery): Promise<DocumentQueuePage>;
  /** Null when the document does not exist or is outside the user's scope. */
  getDocument(id: string): Promise<DocumentRecord | null>;
  verify(id: string): Promise<DocumentRecord>;
  requestResubmission(id: string, input: ResubmissionInput): Promise<DocumentRecord>;
  /** Adds a new version that replaces the current one; earlier versions are kept. */
  replace(id: string): Promise<DocumentRecord>;
}
