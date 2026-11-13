/**
 * Replaceable contract for Agreements and policies: UI -> hooks -> service ->
 * adapter -> (dev fixture NOW, Supabase adapter LATER). The backend must: allow
 * drafts, preview, publish and version history for the Head of Operations only
 * (HR gets published text only), refuse a stale `expectedRevision` with a
 * ConflictError (409), make published versions immutable, compute the version
 * label and body hash, and record an audit event on publish. Public pages read
 * `getPublicDocument` (published privacy/terms only; no auth).
 */
import type { AdapterEvent } from "../adapter";
import type { AgreementDetail, AgreementDocId, AgreementDocSummary, PublicDocument, PublishedAgreement, PublishInput } from "./types";

export interface AgreementsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  /** Head of Operations: all five with draft flags. */
  listDocuments(): Promise<AgreementDocSummary[]>;
  /** Head of Operations only (403 otherwise): draft + every version. */
  getDocument(id: AgreementDocId): Promise<AgreementDetail>;
  /** Head of Operations only. Throws ConflictError on a stale revision. */
  saveDraft(id: AgreementDocId, body: string, expectedRevision: number): Promise<AgreementDetail>;
  /** Head of Operations only. Throws AgreementValidationError (empty draft, empty note) or ConflictError. Never changes an earlier version. */
  publish(id: AgreementDocId, input: PublishInput): Promise<AgreementDetail>;
  /** Any HR role: the current published version only. */
  listPublished(): Promise<PublishedAgreement[]>;
  /** Anyone (public site): published privacy/terms, else null. */
  getPublicDocument(id: "privacy" | "terms"): Promise<PublicDocument | null>;
}
