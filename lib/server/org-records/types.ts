/**
 * Org records backend contracts (Clients, Outlets, Staff records, Placements).
 * DTOs here are the ONLY shapes that may reach a browser. Nothing in this file is authority:
 * ids, references, status, revision and times come from the database.
 * Design: docs/contracts/org-records-design.md. Wire: docs/contracts/org-records-wire.md.
 * Sensitive data (NIN, bank, next of kin, home address, medical) is NOT part of this slice.
 */

export type OrgErrorCode =
  | "unavailable"
  | "unauthenticated"
  | "forbidden"
  | "not_found" // unknown id OR out of the caller's scope (identical on purpose)
  | "invalid_request"
  | "conflict" // same requestId reused with a different payload
  | "stale" // expectedRevision no longer matches
  | "duplicate" // a unique value is taken; carries field names only, never the other record
  | "inactive" // the target was deactivated and cannot be changed this way
  | "rate_limited"
  | "outcome_unknown";

export type OrgFailure = { ok: false; code: OrgErrorCode; fields?: Record<string, string>; requestId?: string };
export type OrgResult<T> = ({ ok: true } & T) | OrgFailure;

/** PROVISIONAL vocabularies copied from the existing frontend contracts. Needs Beeliv confirmation. */
export const ORG_STATUSES = ["invited", "active", "onboarding", "inactive"] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];
export const STAFF_STATUSES = ["active", "on-leave", "suspended"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];
export const STAFF_SHOWS = ["all", "unassigned"] as const;
export type StaffShow = (typeof STAFF_SHOWS)[number];

/* ------------------------------ commands (validated) ------------------------------ */

export type ClientCreateCommand = { requestId: string; name: string; businessType: string; city: string; address: string };
export type ClientPatch = { name?: string; businessType?: string; city?: string; address?: string };
export type ClientUpdateCommand = { requestId: string; clientId: string; expectedRevision: number; patch: ClientPatch };
export type ClientDeactivateCommand = { requestId: string; clientId: string; expectedRevision: number; reason: string };

export type OutletCreateCommand = { requestId: string; clientId: string; name: string; address: string; city: string; phone: string; manager: string; notes: string };
export type OutletPatch = { name?: string; address?: string; city?: string; phone?: string; manager?: string; notes?: string };
export type OutletUpdateCommand = { requestId: string; clientId: string; outletId: string; expectedRevision: number; patch: OutletPatch };
export type OutletDeactivateCommand = { requestId: string; clientId: string; outletId: string; expectedRevision: number; reason: string };

export type PlacementInput = { clientId: string; outletId: string; role: string; department: string; startDate: string; note: string };
/** `phone` is canonical E.164 or empty. Email is the identity key and is never editable here. */
export type StaffCreateCommand = { requestId: string; fullName: string; email: string; phone: string; department: string; initialPlacement: PlacementInput | null };
export type StaffPatch = { fullName?: string; phone?: string; status?: StaffStatus; department?: string };
export type StaffUpdateCommand = { requestId: string; staffId: string; expectedRevision: number; patch: StaffPatch };
/** Corrects the identity email of a Staff record that has no account yet. `email` is canonical lowercase. */
export type StaffCorrectEmailCommand = { requestId: string; staffId: string; expectedRevision: number; email: string };
export type PlacementAssignCommand = {
  requestId: string; staffId: string; expectedRevision: number; clientId: string; outletId: string;
  role: string; department: string; effectiveDate: string; note: string;
};

export type ClientListQuery = { search: string; status: "" | OrgStatus; page: number; pageSize: number };
export const CLIENT_OUTLETS_DEFAULT = 100, CLIENT_OUTLETS_MAX = 200, STAFF_HISTORY_DEFAULT = 50, STAFF_HISTORY_MAX = 200;
export type ClientGetQuery = { clientId: string; outletsLimit: number; outletsAfter: string | null };
export type StaffGetQuery = { staffId: string; historyLimit: number; historyAfter: string | null };
export type StaffListQuery = { search: string; show: StaffShow; clientId: string; status: "" | StaffStatus; page: number; pageSize: number };

/* ------------------------------------ DTOs ------------------------------------ */

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export type OutletDto = {
  id: string; clientId: string; reference: string; name: string; address: string; city: string; phone: string; manager: string; notes: string;
  status: OrgStatus; activeStaff: number; revision: number;
};
export type ClientRowDto = {
  id: string; reference: string; name: string; businessType: string; city: string; status: OrgStatus;
  outletsCount: number; activeStaff: number; revision: number;
};
/**
 * `outlets` is one bounded page of what the caller may see. `outletsTotal` is the caller-visible total; when `outletsTruncated`
 * is true, `outletsNextCursor` is the id to pass as `outletsAfter` for the next page. Nothing is ever dropped silently.
 */
export type ClientDetailDto = ClientRowDto & {
  address: string; createdAt: string; updatedAt: string;
  outlets: OutletDto[]; outletsTotal: number; outletsTruncated: boolean; outletsNextCursor: string | null;
};

export type PlacementDto = {
  id: string; clientId: string; client: string; outletId: string; outlet: string; role: string; department: string;
  start: string; end: string | null; current: boolean; changedBy: string; note: string | null;
};
export type StaffRowDto = {
  id: string; reference: string; name: string; status: StaffStatus; department: string;
  current: PlacementDto | null; previousCount: number; revision: number;
};
export type StaffDetailDto = StaffRowDto & {
  email: string; phone: string; onboardingOrigin: "legacy" | "recruited"; hasAccount: boolean;
  /** One bounded page of ENDED placements inside the caller's scope (never earlier stretches at clients the caller cannot see). */
  history: PlacementDto[]; historyTotal: number; historyTruncated: boolean; historyNextCursor: string | null;
};

export type ClientCreateReceipt = { clientId: string; reference: string; revision: number; replayed: boolean };
export type OutletCreateReceipt = { clientId: string; outletId: string; reference: string; revision: number; replayed: boolean };
export type StaffCreateReceipt = { staffId: string; reference: string; revision: number; replayed: boolean };
export type UpdateReceipt = { id: string; revision: number; replayed: boolean };
export type PlacementReceipt = { staffId: string; placementId: string; revision: number; replayed: boolean };

/* --------------------------------- ports / deps --------------------------------- */

/** Verified Admin identity. The database repeats every check; this is only a cheap early gate. */
export type AdminIdentity = { uid: string; sessionId: string; aal: string; emailVerified: boolean };
export type RpcReply = { data: unknown; error: unknown };

type Actor = { actorUid: string; sessionId: string };
type Write = Actor & { requestId: string; fingerprint: string };

/** One method per SQL function. Transport only: authorization belongs to the database functions. */
export type OrgRecordsGateway = {
  clientList(a: Actor & { query: ClientListQuery }): PromiseLike<RpcReply>;
  clientGet(a: Actor & ClientGetQuery): PromiseLike<RpcReply>;
  clientCreate(a: Write & ClientCreateCommand): PromiseLike<RpcReply>;
  clientUpdate(a: Write & ClientUpdateCommand): PromiseLike<RpcReply>;
  clientDeactivate(a: Write & ClientDeactivateCommand): PromiseLike<RpcReply>;
  outletCreate(a: Write & OutletCreateCommand): PromiseLike<RpcReply>;
  outletUpdate(a: Write & OutletUpdateCommand): PromiseLike<RpcReply>;
  outletDeactivate(a: Write & OutletDeactivateCommand): PromiseLike<RpcReply>;
  staffList(a: Actor & { query: StaffListQuery }): PromiseLike<RpcReply>;
  staffGet(a: Actor & StaffGetQuery): PromiseLike<RpcReply>;
  staffCreate(a: Write & StaffCreateCommand): PromiseLike<RpcReply>;
  staffUpdate(a: Write & StaffUpdateCommand): PromiseLike<RpcReply>;
  staffCorrectEmail(a: Write & StaffCorrectEmailCommand): PromiseLike<RpcReply>;
  placementAssign(a: Write & PlacementAssignCommand): PromiseLike<RpcReply>;
};

export type OrgOperation =
  | "client-create" | "client-update" | "client-deactivate" | "outlet-create" | "outlet-update" | "outlet-deactivate"
  | "staff-create" | "staff-update" | "staff-correct-email" | "placement-assign";

export type OrgRecordsDependencies = {
  /** False unless EVERY readiness flag is exactly "true". When false no other dependency is touched. */
  enabled: boolean;
  /** Writes need their own flag so reads can be exercised first. */
  writesEnabled: boolean;
  verifyAdmin(): Promise<AdminIdentity | null>;
  /** `write` picks the bucket: reads must not spend the (much smaller) write allowance. */
  consumeLimit(uid: string, write: boolean): Promise<void>;
  /** Keyed hash of the normalized command; throws if the secret is unavailable. */
  fingerprint(operation: OrgOperation, command: unknown): string;
  gateway: OrgRecordsGateway;
};
