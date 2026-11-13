/**
 * Staff enrollment backend contracts (personal details, employment, sensitive sections) for the Talent (Staff) session.
 * DTOs here are the ONLY shapes that may reach a browser. Nothing in this file is authority: the person, state,
 * revision and times come from the database, and the person is always derived from the verified session.
 * Design: docs/contracts/staff-personal-details-design.md. Wire: docs/contracts/staff-personal-details-wire.md.
 * SQL (UNAPPLIED): docs/contracts/staff-personal-details-schema.sql.
 */

export type StaffErrorCode =
  | "unavailable"
  | "unauthenticated"
  | "forbidden"
  | "invalid_request"
  | "conflict" // same requestId reused with a different payload
  | "not_saved" // generic save failure. Also what a duplicate NIN/bank maps to: it must never be distinguishable
  | "rate_limited"
  | "outcome_unknown";

export type StaffFailure = { ok: false; code: StaffErrorCode; fields?: Record<string, string>; requestId?: string };
export type StaffResult<T> = ({ ok: true } & T) | StaffFailure;

/** Sections that hold sensitive values. Keys match the database. */
export const SENSITIVE_SECTIONS = ["next_of_kin", "nin", "bank", "accessibility"] as const;
export type SensitiveSection = (typeof SENSITIVE_SECTIONS)[number];

/* ------------------------------ DTOs (what the browser may see) ------------------------------ */

export type PersonalDetailsDto = {
  sex: "Female" | "Male" | "";
  relationshipStatus: string;
  birthday: string; // YYYY-MM-DD or ""
  nationality: string;
  stateOfOrigin: string;
  lga: string;
  homeAddress: string;
  education: string;
};
export type EmployerDto = {
  organisation: string; location: string; contact: string; position: string; description: string; manager: string;
  startMonth: string; endMonth: string; // YYYY-MM or ""
};
export type EmploymentDto = { current: EmployerDto | null; previous: EmployerDto | null };

export type SensitiveState = "empty" | "saved" | "change-pending";
/** Masked status only. No ciphertext, digest, full value or health answer is ever part of it. */
export type SensitiveStatusDto = {
  nextOfKin: { state: SensitiveState; maskedName: string | null; maskedPhone: string | null; updatedAt: string | null };
  nin: { state: SensitiveState; masked: string | null; updatedAt: string | null };
  bank: { state: SensitiveState; maskedAccount: string | null; updatedAt: string | null };
  accessibility: { state: SensitiveState; updatedAt: string | null };
};

/** Per-section completion flags. They drive the onboarding checklist ids ob-personal, ob-kin, ob-nin and ob-bank. */
export type ChecklistDto = {
  personal: boolean; nextOfKin: boolean; nin: boolean; bank: boolean;
  education: boolean; currentEmployment: boolean; previousEmployment: boolean; accessibility: boolean;
};

/* ------------------------------ commands (validated) ------------------------------ */

export type NextOfKinInput = { name: string; phone: string; address: string; relationship: string };
export type NinInput = { nin: string };
export type BankInput = { accountName: string; accountNumber: string; bankName: string };
export type AccessibilityInput = { physicallyChallenged: boolean; detail: string };

export type PersonalSaveCommand = { requestId: string; input: PersonalDetailsDto };
export type EmployerSaveCommand = { requestId: string; which: "current" | "previous"; input: EmployerDto };
export type KinSaveCommand = { requestId: string; input: NextOfKinInput };
export type NinSaveCommand = { requestId: string; input: NinInput };
export type BankSaveCommand = { requestId: string; input: BankInput };
export type AccessibilitySaveCommand = { requestId: string; input: AccessibilityInput };

/* --------------------------------- crypto port --------------------------------- */

/** What the database receives for a sensitive value: ciphertext (hex), key id, and nothing readable. */
export type Sealed = { keyId: string; nonceHex: string; ciphertextHex: string };
export type BlindDigest = { hex: string; keyId: string };
/**
 * Server-side protection of sensitive values. The key material lives only in the server runtime (never in the database or a
 * file in this repo). `personId` is bound into the ciphertext so a row copied to another person or section cannot be opened.
 */
export type Sealer = {
  seal(section: SensitiveSection, personId: string, payload: Record<string, unknown>): Sealed;
  /** Keyed blind index for duplicate detection (NIN and bank only). */
  digest(section: "nin" | "bank", normalised: string): BlindDigest;
};

/* --------------------------------- ports / deps --------------------------------- */

/** Verified Staff identity, from the session. The database repeats every check. */
export type StaffIdentity = { uid: string; personId: string; sessionId: string; emailVerified: boolean };
export type RpcReply = { data: unknown; error: unknown };

type Actor = { actorUid: string; sessionId: string };
type Write = Actor & { requestId: string; fingerprint: string };

export type SensitiveSaveArgs = Write & {
  personId: string; section: SensitiveSection; sealed: Sealed; mask: Record<string, string>; digest: BlindDigest | null;
};

/** One method per SQL function. Transport only: authorization belongs to the database functions. */
export type StaffEnrollmentGateway = {
  personalGet(a: Actor): PromiseLike<RpcReply>;
  employmentGet(a: Actor): PromiseLike<RpcReply>;
  sensitiveStatus(a: Actor): PromiseLike<RpcReply>;
  checklistGet(a: Actor): PromiseLike<RpcReply>;
  personalSave(a: Write & { input: PersonalDetailsDto }): PromiseLike<RpcReply>;
  employerSave(a: Write & { which: "current" | "previous"; input: EmployerDto }): PromiseLike<RpcReply>;
  sensitiveSave(a: SensitiveSaveArgs): PromiseLike<RpcReply>;
};

export type StaffOperation = "personal-save" | "employer-save" | "kin-save" | "nin-save" | "bank-save" | "accessibility-save";

/** What the profile-get read hands the browser: nothing else, never an id. */
export type ProfileDto = { fullName: string; phone: string; email: string; setupState: "pending-setup" | "pending-approval" | "active" | "suspended"; entitlements: { applicant: boolean; staff: boolean } };
/** Source of the profile read (verified session + the existing auth_setup_context / auth_access_context). `uid` is only used for the rate limit and is never returned. */
export type ProfileSource = { uid: string } & ProfileDto;

export type StaffEnrollmentDependencies = {
  /**
   * Own verified session only, no Staff entitlement required (a person still in setup can read their own profile).
   * Returns null when there is no verified session; throws { code: "forbidden" } when the person has no access.
   */
  readProfile?: () => Promise<ProfileSource | null>;
  /** False unless EVERY readiness flag is exactly "true". When false no other dependency is touched. */
  enabled: boolean;
  /** Writes need their own flag so reads can be exercised first. */
  writesEnabled: boolean;
  verifyStaff(): Promise<StaffIdentity | null>;
  consumeLimit(uid: string): Promise<void>;
  /** Keyed hash of the normalised command (it may contain a sensitive value, so it must be an HMAC); throws if the secret is unavailable. */
  fingerprint(operation: StaffOperation, command: unknown): string;
  sealer: Sealer;
  gateway: StaffEnrollmentGateway;
};
