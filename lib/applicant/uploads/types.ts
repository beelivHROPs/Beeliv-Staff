/**
 * Applicant upload adapter: wire shapes and UI states (UPLOADS-003).
 *
 * The request/complete shapes mirror the local service interfaces owned by Codex
 * (lib/server/private-documents/request-service.ts and completion-service.ts). They are
 * copied here as plain types on purpose: the browser never imports lib/server/.
 * No HTTP route is final, so nothing here names one (see transport.ts: the transport is injected).
 *
 * Truth rules the state union encodes:
 *  - "checking" means the server accepted the bytes and queued a scan. It is NOT clean, NOT verified.
 *  - The browser never decides "accepted". Only a server status read can (optional, see UploadStatusResult).
 *  - A signed upload URL is a credential. It lives only in a local variable while bytes are sent.
 *    It is never put in state, storage, a URL, a log or analytics.
 *  - An unknown outcome keeps the ORIGINAL requestId/uploadId. Retries reuse them.
 */

/** The three required application slots (UPLOADS-001). Same names the server calls "purpose". */
export type UploadSlot = "cv" | "passport-photo" | "valid-id";

export const UPLOAD_SLOTS: readonly UploadSlot[] = ["cv", "passport-photo", "valid-id"];

/* ------------------------------------------------------------------ */
/* Wire shapes (Codex request/complete services)                       */
/* ------------------------------------------------------------------ */

export interface UploadRequestInput {
  requestId: string;
  purpose: UploadSlot;
  fileName: string;
  size: number;
  contentType: string;
}

export interface UploadRequestOk {
  ok: true;
  uploadId: string;
  status: "awaiting-bytes";
  /** A credential. Use once to send the bytes, never store or print it. */
  uploadUrl: string;
  uploadUrlExpiresAt: string;
  completeBefore: string;
  replayed: boolean;
}

export interface UploadCompleteInput {
  requestId: string;
  uploadId: string;
}

export interface UploadCompleteOk {
  ok: true;
  uploadId: string;
  status: "checking";
  replayed: boolean;
}

/** Codes the two services can return today. Anything else is treated as "unavailable". */
export type UploadFailureCode =
  | "unavailable"
  | "unauthenticated"
  | "no_access"
  | "invalid_request"
  | "rate_limited"
  | "conflict"
  | "limit_reached"
  | "expired"
  | "outcome_unknown";

export interface UploadFailure {
  ok: false;
  code: UploadFailureCode | (string & {});
  fields?: Readonly<Record<string, string>>;
  requestId?: string;
  /** Optional hint for rate_limited, in seconds. Not in the Codex contract yet; ignored when absent. */
  retryAfterSeconds?: number;
}

export type UploadRequestResult = UploadRequestOk | UploadFailure;
export type UploadCompleteResult = UploadCompleteOk | UploadFailure;

/**
 * PROPOSED, not in any Codex contract: a read of one upload's server state, needed to move a file
 * from "checking" to a real outcome. Optional on the transport. Without it a checked file simply
 * stays "checking" in the UI.
 */
export type UploadStatusResult =
  | { ok: true; uploadId: string; status: "checking" | "rejected" | "accepted" }
  | UploadFailure;

/** How a byte transfer can end without success. "aborted" is the person pressing Cancel. */
export type PutResult =
  | { ok: true }
  | { ok: false; cause: "offline" | "network" | "expired" | "denied" | "aborted" };

/* ------------------------------------------------------------------ */
/* UI state                                                            */
/* ------------------------------------------------------------------ */

/** Everything about one attempt that is safe to remember. Never a URL, key, hash or path. */
export interface UploadAttempt {
  slot: UploadSlot;
  requestId: string;
  uploadId?: string;
  fileName: string;
  size: number;
  contentType: string;
}

/** Why a file was turned away. Local ones are found before anything is sent. */
export type RejectReason =
  | "empty"
  | "size"
  | "type"
  | "name"
  | "signature" // the content does not match the file type (browser-side hint; the server decides)
  | "different-file" // resuming an earlier attempt with another file
  | "server-invalid"
  | "denied"
  | "limit"
  | "conflict"
  | "scan-failed";

/** Where in the flow something stopped. Decides what a retry may safely repeat. */
export type UploadStage = "request" | "bytes" | "complete";

export type UnavailableReason = "unavailable" | "rate-limited" | "signed-out";

/** A file the server already holds for this slot, kept so a refused replacement can fall back to it. */
export type SentState = { kind: "checking"; attempt: UploadAttempt } | { kind: "in-review"; attempt: UploadAttempt };

export type UploadState =
  | { kind: "idle" }
  | { kind: "validating"; fileName: string; size: number; previous?: SentState }
  | { kind: "requesting"; attempt: UploadAttempt }
  | { kind: "uploading"; attempt: UploadAttempt; progress: number }
  /** Bytes are sent; asking the server to start checking. */
  | { kind: "finishing"; attempt: UploadAttempt }
  /** Server accepted the bytes and queued a scan. NOT clean, NOT verified, NOT reviewed. */
  | { kind: "checking"; attempt: UploadAttempt }
  /** Only ever set from a server status read. The browser never invents this. */
  | { kind: "in-review"; attempt: UploadAttempt }
  | { kind: "interrupted"; attempt: UploadAttempt; cause: "offline" | "network"; needsFile: boolean }
  | { kind: "rejected"; reason: RejectReason; fileName: string; attempt?: UploadAttempt; local: boolean; previous?: SentState }
  | { kind: "expired"; attempt: UploadAttempt }
  | { kind: "unavailable"; reason: UnavailableReason; stage: UploadStage; attempt?: UploadAttempt; needsFile: boolean; retryAfterSeconds?: number }
  /** The answer was lost. The ORIGINAL ids are kept; retry reuses them. */
  | { kind: "unknown-outcome"; attempt: UploadAttempt; stage: Extract<UploadStage, "request" | "complete">; needsFile: boolean };

export type UploadStateKind = UploadState["kind"];

/** States that mean "work is in progress", so a second pick must not start. */
export const BUSY_KINDS: readonly UploadStateKind[] = ["validating", "requesting", "uploading", "finishing"];

/** States where the server already holds a file for this slot (replacing needs a confirm). */
export const SENT_KINDS: readonly UploadStateKind[] = ["checking", "in-review"];

/* ------------------------------------------------------------------ */
/* Events (state.ts)                                                   */
/* ------------------------------------------------------------------ */

export type UploadEvent =
  | { type: "validate-start"; fileName: string; size: number }
  | { type: "validate-failed"; reason: RejectReason; fileName: string }
  | { type: "request-start"; attempt: UploadAttempt }
  | { type: "request-ok"; uploadId: string }
  | { type: "progress"; fraction: number }
  | { type: "bytes-sent" }
  /** Retry of "complete" only (bytes already sent): same ids, no new request. */
  | { type: "complete-retry" }
  | { type: "complete-ok" }
  | { type: "failure"; stage: UploadStage; failure: UploadFailure }
  /** A throw / unreadable reply: the request may or may not have arrived. */
  | { type: "lost-reply"; stage: Extract<UploadStage, "request" | "complete"> }
  | { type: "put-failed"; cause: "offline" | "network" | "expired" | "denied" }
  | { type: "status"; status: "checking" | "rejected" | "accepted" }
  | { type: "hydrate"; attempt: UploadAttempt; stage: "request" | "bytes" | "complete" | "checking" | "in-review" }
  | { type: "reset" };
