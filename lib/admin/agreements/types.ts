/**
 * Agreements and policies (docs/contracts/ops-agreements.md, DRAFT). Presentation
 * shapes only. Plain text bodies only. NO legal wording lives in this repo: every
 * document starts with no published version, and the only text is what a person
 * types into a draft. The server owns versions, hashes, immutability and audit.
 */
import type { ISODateTime } from "../types";

export type AgreementDocId = "staff-welfare" | "data-protection" | "client-terms" | "privacy" | "terms";
export type AgreementGroup = "accept" | "public";

export interface AgreementDocSummary {
  id: AgreementDocId;
  title: string;
  /** Beeliv's own document code when it has one (e.g. BH-HR-001). */
  code: string | null;
  group: AgreementGroup;
  /** Who must accept it; null for public pages. */
  audience: string | null;
  /** Current published version label ("v1.0"). Null = nothing published yet. */
  currentVersion: string | null;
  publishedAt: ISODateTime | null;
  /** People who accepted the current version. Null for public pages (no acceptance). */
  acceptanceCount: number | null;
  /** Whether an unpublished draft exists (visible to the Head of Operations only). */
  hasDraft: boolean;
}

export interface AgreementVersion {
  /** "v1.0". Assigned by the server; never reused or edited. */
  version: string;
  publishedAt: ISODateTime;
  publishedBy: string;
  /** Short note written by the publisher. */
  changeNote: string;
  /** Whether staff/clients must accept this version again. Needs Beeliv confirmation (policy). */
  reaccept: boolean;
  /** SHA-256 of the exact body (server-computed). Display shortened. */
  bodyHash: string;
  /** Plain text. Immutable. */
  body: string;
}

export interface AgreementDraft {
  body: string;
  /** Per draft; sent back as expectedRevision on every save and on publish. */
  revision: number;
  updatedAt: ISODateTime | null;
  updatedBy: string | null;
}

/** Full record the editor loads. `draft` and older versions are only returned to the Head of Operations. */
export interface AgreementDetail {
  summary: AgreementDocSummary;
  draft: AgreementDraft;
  /** Newest first. Empty = nothing published. */
  versions: AgreementVersion[];
}

/** "minor" = a small correction (v1.0 -> v1.1); "major" = a real change (v1.1 -> v2.0). The first publish is always v1.0. */
export type ChangeSize = "minor" | "major";

export interface PublishInput {
  expectedRevision: number;
  size: ChangeSize;
  /** Whether people must accept this version again. */
  reaccept: boolean;
  changeNote: string;
}

/** What a public page (Privacy, Terms) shows. Null = nothing published, keep the placeholder. */
export interface PublicDocument {
  title: string;
  version: string;
  /** Effective date = the publish date of this version. */
  effectiveAt: ISODateTime;
  body: string;
}

/** A published version as an HR reader sees it (no draft, no draft history). */
export interface PublishedAgreement {
  summary: AgreementDocSummary;
  current: AgreementVersion | null;
}

export type AgreementFieldErrors = Record<string, string>;
export class AgreementValidationError extends Error {
  fields: AgreementFieldErrors;
  constructor(fields: AgreementFieldErrors) {
    super("Some fields need fixing");
    this.name = "AgreementValidationError";
    this.fields = fields;
  }
}
