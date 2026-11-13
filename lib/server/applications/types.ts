/**
 * Applications backend contracts. DTOs here are the ONLY shapes that may reach a browser.
 * Nothing in this file is authority: owner, status, stage and times come from the database.
 */

export type ApplicationErrorCode =
  | "unavailable"
  | "unauthenticated"
  | "forbidden"
  | "invalid_request"
  | "conflict"
  | "stale"
  | "closed"
  | "rate_limited"
  | "outcome_unknown"
  | "documents_missing"
  | "documents_unsupported"
  | "test_unavailable"
  | "screening_incomplete";

export type ApplicationFailure = { ok: false; code: ApplicationErrorCode; fields?: Record<string, string>; requestId?: string };
export type ApplicationResult<T> = ({ ok: true } & T) | ApplicationFailure;

/** Typed, bounded form. Mirrors ApplyFormData minus the local-only certificate filename. No NIN, bank or medical data. */
export type ApplyForm = {
  fullName?: string;
  preferredName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  yearsExperience?: string;
  expectedSalary?: string;
  availability?: string;
  earliestStart?: string;
  preferredLocation?: string;
  willingShifts?: "Yes" | "No";
  willingWeekends?: "Yes" | "No";
  willingHolidays?: "Yes" | "No";
  sectors?: string[];
  skills?: Record<string, string[]>;
  /** Keyed by the vacancy's configured question id. Value types are checked against the vacancy at submit. */
  screeningAnswers?: Record<string, string>;
};

export type DraftDto = { applicationId: string; vacancyId: string; revision: number; status: "open"; form: ApplyForm; updatedAt: string };
export type OpenDraftDto = { state: "open"; draft: DraftDto; replayed: boolean } | { state: "submitted"; applicationId: string; replayed: boolean };
export type SaveReceiptDto = { applicationId: string; revision: number; replayed: boolean };
export type SubmitReceiptDto = { applicationId: string; submittedAt: string; revision: number; replayed: boolean };

export type ApplicationLifecycle = "submitted" | "in_talent_pool" | "not_selected" | "withdrawn" | "completed";

export type ApplicantApplicationDto = {
  applicationId: string;
  vacancyId: string;
  role: string;
  company: string;
  location: string;
  employmentType: string;
  lifecycle: ApplicationLifecycle;
  stage: number;
  submittedAt: string;
  updatedAt: string;
};
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export type AdminApplicationRowDto = {
  applicationId: string;
  vacancyId: string;
  vacancyReference: string;
  role: string;
  clientId: string;
  clientName: string;
  outletId: string | null;
  applicantName: string;
  lifecycle: ApplicationLifecycle;
  stage: number;
  submittedAt: string;
};
export type AdminApplicationDetailDto = AdminApplicationRowDto & {
  form: ApplyForm;
  /** Status only. Never a bucket, object key, URL or filename. */
  attachments: { slot: "cv" | "passport-photo" | "valid-id"; versionNumber: number; scanState: string; reviewState: string }[];
  events: { action: "draft_opened" | "submitted"; at: string }[];
};

/** Verified Talent identity (provider user + claims + access context). Produced by runtime, never by the browser. */
export type ApplicantIdentity = {
  uid: string;
  personId: string;
  sessionId: string;
  emailVerified: boolean;
  app: string;
  status: string;
  entitlements: readonly string[];
};
/** Verified Admin identity. The database repeats every check; this is only a cheap early gate. */
export type AdminIdentity = { uid: string; sessionId: string; aal: string; emailVerified: boolean };

export type RpcReply = { data: unknown; error: unknown };
export type ApplicationsGateway = {
  open(args: { actorUid: string; sessionId: string; requestId: string; vacancyId: string; fingerprint: string }): PromiseLike<RpcReply>;
  get(args: { actorUid: string; sessionId: string; applicationId: string }): PromiseLike<RpcReply>;
  save(args: { actorUid: string; sessionId: string; requestId: string; applicationId: string; expectedRevision: number; form: ApplyForm; fingerprint: string }): PromiseLike<RpcReply>;
  submit(args: { actorUid: string; sessionId: string; requestId: string; applicationId: string; expectedRevision: number; fingerprint: string }): PromiseLike<RpcReply>;
  listMine(args: { actorUid: string; sessionId: string; page: number; pageSize: number }): PromiseLike<RpcReply>;
  readMine(args: { actorUid: string; sessionId: string; applicationId: string }): PromiseLike<RpcReply>;
  adminList(args: { actorUid: string; sessionId: string; query: { page: number; pageSize: number; vacancyId?: string } }): PromiseLike<RpcReply>;
  adminRead(args: { actorUid: string; sessionId: string; applicationId: string }): PromiseLike<RpcReply>;
};

export type ApplicationsDependencies = {
  /** False unless EVERY readiness flag is exactly "true". When false no other dependency is touched. */
  enabled: boolean;
  adminReadsEnabled: boolean;
  verifyApplicant(): Promise<ApplicantIdentity | null>;
  verifyAdmin(): Promise<AdminIdentity | null>;
  consumeLimit(uid: string): Promise<void>;
  /** Keyed hash of the normalized command; throws if the secret is unavailable. */
  fingerprint(operation: "open" | "save" | "submit", command: unknown): string;
  gateway: ApplicationsGateway;
};
