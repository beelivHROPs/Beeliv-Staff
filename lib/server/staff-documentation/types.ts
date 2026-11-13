/**
 * Staff documentation contracts (own documents for the Staff person, scoped HR review, Client status).
 * DTOs here are the ONLY shapes that may reach a browser. Nothing in this file is authority: the owner is always derived from
 * the verified session, scope and capability are decided by the database, and no DTO carries a storage path, bucket, signed URL,
 * scan report or reviewer note. The two capability responses (UploadGrant, OpenGrant) are NOT DTOs; see the wire contract.
 * Design: docs/contracts/staff-documentation-design.md. Wire: docs/contracts/staff-documentation-wire.md.
 * SQL (UNAPPLIED): docs/contracts/staff-documentation-schema.sql.
 */

export type DocErrorCode =
  | "unavailable" | "unauthenticated" | "forbidden" | "invalid_request" | "conflict" | "stale" | "not_found"
  | "rate_limited" | "expired" | "limit_reached" | "outcome_unknown";
export type DocFailure = { ok: false; code: DocErrorCode; fields?: Record<string, string>; requestId?: string };
export type DocResult<T> = ({ ok: true } & T) | DocFailure;

/** Mirror of staff_doc_slot_defs seeds. A static test compares this table to the SQL so they cannot drift. */
export type SlotKey = "passport-photo" | "nin-copy" | "medical-fitness";
export type Sensitivity = "ordinary" | "sensitive";
export type SlotDef = {
  slot: SlotKey; label: string; sensitivity: Sensitivity; enabled: boolean; counts: boolean; canExpire: boolean;
  types: readonly { extension: string; mime: string }[];
};
const IMG = [{ extension: ".jpg", mime: "image/jpeg" }, { extension: ".jpeg", mime: "image/jpeg" }, { extension: ".png", mime: "image/png" }] as const;
const ANY = [{ extension: ".pdf", mime: "application/pdf" }, ...IMG] as const;
export const STAFF_DOC_SLOTS: readonly SlotDef[] = Object.freeze([
  { slot: "passport-photo", label: "Passport photograph", sensitivity: "ordinary", enabled: true, counts: true, canExpire: false, types: IMG },
  { slot: "nin-copy", label: "Copy of NIN", sensitivity: "sensitive", enabled: false, counts: true, canExpire: false, types: ANY },
  { slot: "medical-fitness", label: "Medical fitness document", sensitivity: "sensitive", enabled: false, counts: false, canExpire: true, types: ANY },
]);
export const MAX_DOC_BYTES = 5_000_000;

/** Capability cell per (sensitivity, action). Mirror of staff_doc_required_cell; cells exist in auth-m7-seeds-and-rate-limits.sql. */
export const STAFF_DOC_CELLS = {
  ordinary: { queue: "org.staff.read", open: "org.staff.read", decide: "org.staff.write" },
  sensitive: { queue: "org.staff.read", open: "staff.sensitive.review", decide: "staff.sensitive.review" },
} as const;

/** Derived slot state. `available` means scan-clean and NOT reviewed. It is never HR verified. */
export type SlotState = "requested" | "checking" | "available" | "verified" | "update-required" | "rejected" | "expired";
export type ReviewState = "not-reviewed" | "verified" | "update-required" | "rejected";
export type IncomingStatus = "awaiting-bytes" | "checking" | "refused" | "unavailable";
export type ReasonCode = "unreadable" | "wrong_document" | "expired" | "incomplete" | "mismatch" | "other";
export const REASON_CODES: readonly ReasonCode[] = ["unreadable", "wrong_document", "expired", "incomplete", "mismatch", "other"];
export const OPEN_REASONS = ["verify", "recheck", "query", "audit"] as const;
export type OpenReason = (typeof OPEN_REASONS)[number];
export const DECISIONS = ["verified", "update_required", "rejected"] as const;
export type Decision = (typeof DECISIONS)[number];

/** Person-facing decision text. HR writes `message` knowing the Staff person sees it. No internal reviewer note exists. */
export type CurrentDto = {
  version: number; review: ReviewState; reviewedAt: string | null; reasonCode: ReasonCode | null; message: string | null; expiresOn: string | null; uploadedAt: string;
};
export type IncomingDto = { uploadId: string; status: IncomingStatus };
export type SummaryDto = { counted: number; verified: number; complete: boolean };

/** Own view. No version id, no filename, no path. */
export type OwnSlotDto = { slot: SlotKey; label: string; sensitive: boolean; counts: boolean; state: SlotState; current: CurrentDto | null; incoming: IncomingDto | null };
export type OwnChecklistDto = { items: OwnSlotDto[]; summary: SummaryDto };

/** HR view. `versionId` and `decisionSeq` are internal ids HR needs to act; admin-only, never sent to Staff or Client. */
export type HrCurrentDto = CurrentDto & { versionId: string; decisionSeq: number };
export type HrQueueRowDto = {
  personId: string; name: string; reference: string; slot: SlotKey; label: string; sensitive: boolean; state: SlotState;
  current: HrCurrentDto | null; incoming: IncomingDto | null; canOpen: boolean; canDecide: boolean;
};
export type HrQueueDto = { items: HrQueueRowDto[]; total: number; page: number; pageSize: number };
export type HrSlotDto = Omit<OwnSlotDto, "current"> & { current: HrCurrentDto | null };
export type HrCompletionDto = { people: { personId: string; items: HrSlotDto[]; summary: SummaryDto }[] };

/** Client view: coarse STATUS of ORDINARY slots. Never a file, a reason, a sensitive slot, or a count that includes one. */
export type ClientStatus = "missing" | "in-review" | "verified" | "needs-attention";
export type ClientCompletionDto = { people: { personId: string; items: { slot: SlotKey; label: string; status: ClientStatus }[]; complete: boolean }[] };

export type UploadStatusDto = { uploadId: string; status: "awaiting-bytes" | "checking" | "available" | "rejected" | "expired" | "unavailable" };
export type DecisionReceiptDto = { versionId: string; decision: Decision; decisionSeq: number; replayed: boolean };

/** Capability responses (NOT DTOs): a signed URL appears only here, always in a no-store response, never logged. */
export type UploadGrant = { uploadId: string; status: "awaiting-bytes"; uploadUrl: string; uploadUrlExpiresAt: string; completeBefore: string; replayed: boolean };
export type OpenGrant = { url: string; expiresAt: string; mediaType: string; sizeBytes: number };

/* ------------------------------ commands (validated) ------------------------------ */
export type SlotRequestCommand = { requestId: string; slot: SlotKey; fileName: string; size: number; contentType: string };
export type CompleteCommand = { requestId: string; uploadId: string };
export type StatusCommand = { uploadId: string };
export type QueueQuery = { state: "" | SlotState; slot: "" | SlotKey; clientId: string; search: string; page: number; pageSize: number };
export type OpenCommand = { versionId: string; reason: OpenReason };
export type DecideCommand = {
  requestId: string; versionId: string; decision: Decision; reasonCode: ReasonCode | null; message: string | null; expiresOn: string | null; expectedSeq: number;
};
export type CompletionCommand = { personIds: string[] };

/* --------------------------------- ports / deps --------------------------------- */
export type StaffIdentity = { uid: string; personId: string; sessionId: string; emailVerified: boolean };
export type AdminIdentity = { uid: string; sessionId: string; aal: string; emailVerified: boolean };
export type ClientIdentity = { uid: string; sessionId: string; emailVerified: boolean };
export type RpcReply = { data: unknown; error: unknown };
type Actor = { actorUid: string; sessionId: string };

/** One method per SQL function. Transport only: authorization belongs to the database functions. */
export type StaffDocGateway = {
  checklist(a: Actor): PromiseLike<RpcReply>;
  requestSlot(a: Actor & { slot: SlotKey; requestId: string; fileName: string; size: number; contentType: string; fingerprint: string }): PromiseLike<RpcReply>;
  complete(a: Actor & { requestId: string; uploadId: string }): PromiseLike<RpcReply>;
  uploadStatus(a: Actor & { uploadId: string }): PromiseLike<RpcReply>;
  hrQueue(a: Actor & { query: QueueQuery }): PromiseLike<RpcReply>;
  hrOpen(a: Actor & { versionId: string; reason: OpenReason }): PromiseLike<RpcReply>;
  hrDecide(a: Actor & { requestId: string; fingerprint: string; command: DecideCommand }): PromiseLike<RpcReply>;
  completion(a: Actor & { audience: "admin" | "client"; personIds: string[] }): PromiseLike<RpcReply>;
};

/** What the service needs from Codex's storage layer. The service never builds a path; it only checks what comes back. */
export type StaffDocStoragePort = {
  /** Signed upload to the QUARANTINE bucket with overwrite disabled. Must not accept any other bucket. */
  signUpload(input: { bucket: "staff-document-quarantine"; objectKey: string; upsert: false }): Promise<{ url: string; expiresAt: string }>;
  /** Short-lived signed read of a CLEAN object. Must not accept any other bucket and must refuse quarantine keys. */
  signRead(input: { bucket: "staff-document-clean"; objectKey: string; expiresInSeconds: number }): Promise<{ url: string; expiresAt: string }>;
};

export type StaffDocOperation = "slot-request" | "decide";

export type StaffDocDependencies = {
  /** False unless EVERY readiness flag is exactly "true". When false no other dependency is touched. */
  enabled: boolean;
  /** Writes (request, complete, decide, and open because open writes an audit row) need their own flag. */
  writesEnabled: boolean;
  /** Upload and open need the storage layer and scanner readiness as well. */
  storageEnabled: boolean;
  verifyStaff(): Promise<StaffIdentity | null>;
  verifyAdmin(): Promise<AdminIdentity | null>;
  verifyClient(): Promise<ClientIdentity | null>;
  consumeLimit(uid: string): Promise<void>;
  /** Keyed hash of the normalised command; throws if the secret is unavailable. */
  fingerprint(operation: StaffDocOperation, command: unknown): string;
  now(): Date;
  /** Exact https origin of the Storage host (same as the auth origin). */
  storageOrigin: string;
  gateway: StaffDocGateway;
  storage: StaffDocStoragePort;
};
