/**
 * Team & Access data shapes (Master Spec v1.5 sections 10, 9, 13.4, 28.1; AUTH-001 / AUTH-004:
 * only applicants self-register, every other account is invitation-only). Presentation-facing
 * only. All people are FICTIONAL. Records are keyed by internal `id`; `BLV-*` references come
 * only from the adapter. Roles, access levels, expiry options and capabilities are adapter data,
 * never hard-coded in components. Who may invite / deactivate whom is NOT defined by the spec for
 * HR (it says "authorized management" and "as permitted"), so the adapter reports it per session
 * and the UI marks it as needing Beeliv confirmation.
 */
import type { ISODateTime } from "../types";

export type AccountStatus = "invited" | "active" | "suspended" | "deactivated";
export type AccessKind = "internal" | "client" | "account";
export type TeamTab = "internal" | "clients" | "accounts" | "invitations" | "roles";

/** Job title is a free-text DISPLAY label only (e.g. "Senior Recruiter"). It never grants a permission. */
export const JOB_TITLE_MAX = 60;

export interface Entitlements {
  applicant: boolean;
  staff: boolean;
}

/** One normalised row for the three people-lists (internal users, client users, staff / applicant accounts). */
export interface AccessRow {
  id: string;
  kind: AccessKind;
  /** Server-generated (BLV-...). Display only. */
  reference: string;
  name: string;
  photoUrl?: string | null;
  email: string;
  /** Internal users only: optional display label, not a permission. */
  jobTitle?: string;
  status: AccountStatus;
  /** Internal: the role. Client: the access level. Account: the entitlements as words. */
  roleLabel: string;
  /** Internal: the client / outlet scope. Client: the outlets. Account: current assignment or "Not assigned". */
  scopeLabel: string;
  lastActiveAt: ISODateTime | null;
  /* Editable detail used by the sheets. */
  roleId?: string;
  clientId?: string;
  outletIds?: string[];
  accessLevelId?: string;
  entitlements?: Entitlements;
}

export interface AccessQuery {
  search: string;
  status: AccountStatus | "";
  /** Internal: role id. Client: client id. Account: "applicant" | "staff" | "both". */
  facet: string;
}

export interface AccessPage {
  rows: AccessRow[];
  total: number;
  /** Counts per status for the current search + facet (status tabs). */
  statusCounts: Record<AccountStatus | "all", number>;
  workspaceEmpty: boolean;
}

/* ---------- invitations ---------- */

export type InvitationKind = "internal" | "client" | "staff";
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

/**
 * Delivery is a SEPARATE status from the invitation status (docs/contracts/auth-and-invitations.md section 4).
 * `not-sent` is an addition for this prototype: creating a record never sends anything; sending is an explicit action.
 */
export type DeliveryStatus = "not-sent" | "queued" | "sent" | "failed" | "copied";

/** Copy-link delivery: returned ONCE by createAccessLink, never by list/get. Hold in memory only; never store, log or send to analytics. */
export interface AccessLink {
  url: string;
  expiresAt: ISODateTime;
}

export interface InvitationDelivery {
  status: DeliveryStatus;
  lastAttemptAt: ISODateTime | null;
  failureReason?: string;
  /** Server-provided time before which Resend / Retry stays disabled (cooldown). */
  retryAt?: ISODateTime | null;
}

export interface Invitation {
  id: string;
  /** Server invitation revision. Sent back as expectedRevision on every write (a live adapter MUST fill it; the mock may omit it). */
  revision?: number;
  reference: string;
  kind: InvitationKind;
  email: string;
  name: string;
  /** Internal invitations only: optional display label, not a permission. */
  jobTitle?: string;
  /** Role (internal), access level (client) or "Staff access" (staff). */
  roleLabel: string;
  scopeLabel: string;
  status: InvitationStatus;
  delivery: InvitationDelivery;
  invitedBy: string;
  invitedAt: ISODateTime;
  expiresAt: ISODateTime;
  resendCount: number;
  /** Demo placeholder only. A live adapter MUST return "" here: the real link is shown once via createAccessLink and never listed. */
  link: string;
}

export interface InvitationQuery {
  search: string;
  status: InvitationStatus | "";
  kind: InvitationKind | "";
}

export interface InvitationsPage {
  rows: Invitation[];
  total: number;
  statusCounts: Record<InvitationStatus | "all", number>;
  workspaceEmpty: boolean;
}

export interface InviteInput {
  kind: InvitationKind;
  name: string;
  email: string;
  roleId?: string;
  /** Internal only: optional free-text display label (max JOB_TITLE_MAX). Never a permission. */
  jobTitle?: string;
  accessLevelId?: string;
  clientId?: string;
  outletIds: string[];
  /** Internal only: true = Beeliv-wide, otherwise the chosen clients in `scopeClientIds`. */
  allClients: boolean;
  scopeClientIds: string[];
  /** Link to an existing staff record when inviting from Staff. */
  personId?: string;
  expiresInDays: number;
  /** Staff legacy record contact number. */
  phone?: string;
  /** Staff invites. */
  staffRole?: string;
  startDate?: string;
  /** Client invites that create the organisation and its outlets inside the invitation. */
  newClient?: NewClientInput;
}

export interface NewClientInput {
  name: string;
  typeId: string;
  city: string;
  address: string;
  outlets: { name: string; address: string; city: string }[];
  /** Which of the outlets above the invited contact can see (indexes). */
  accessOutletIdx: number[];
}

/** Context a screen can pass in so the invite sheet opens pre-filled (Clients, Staff). */
export interface InvitePrefill {
  name?: string;
  email?: string;
  roleId?: string;
  clientId?: string;
  outletIds?: string[];
  personId?: string;
}

/* ---------- facets, roles and capabilities ---------- */

export interface TeamFacets {
  roles: { id: string; name: string }[];
  /** Internal roles the signed-in person may invite (HR Manager: HR officers only; Operations: all). Absent = all. The server decides. */
  invitableRoleIds?: string[];
  clients: { id: string; name: string }[];
  outlets: { id: string; clientId: string; name: string }[];
  /** Client user access levels. Their meaning needs Beeliv confirmation. */
  accessLevels: { id: string; name: string }[];
  expiryOptions: { days: number; label: string }[];
  /** Business types (restaurant, hotel, ...). Configurable adapter data. */
  clientTypes: { id: string; name: string }[];
  /** Roles a staff member can be invited into. */
  staffRoles: string[];
}

export type CapabilityLevel = "yes" | "scoped" | "no" | "tbc";

export interface RoleDef {
  id: string;
  name: string;
  summary: string;
}

export interface CapabilityRow {
  key: string;
  label: string;
  cells: Record<string, CapabilityLevel>;
  /** Where the row comes from (spec section / rbac.md). */
  source: string;
}

export interface AccessMatrix {
  roles: RoleDef[];
  rows: CapabilityRow[];
}

/** What THIS session may do on Team & Access. The backend re-checks every call. */
export interface TeamCapabilities {
  canInviteInternal: boolean;
  canInviteClient: boolean;
  canInviteStaff: boolean;
  canChangeState: boolean;
  canChangeAccess: boolean;
}

export type StateAction = "suspend" | "deactivate" | "reactivate";

export interface HistoryEntry {
  id: string;
  at: ISODateTime;
  actor: string;
  action: string;
  reason?: string;
}

export interface AccessPatch {
  /** Client users. */
  outletIds?: string[];
  accessLevelId?: string;
  /** Staff / applicant accounts. */
  entitlements?: Entitlements;
  reason: string;
}

/** A possible existing person found by the duplicate check before a legacy staff record is created. */
export interface DuplicateMatch {
  id: string;
  name: string;
  email: string;
  /**
   * exact = same email (blocks creation); phone = same canonical phone (BLOCKS, no
   * "different person" bypass: one phone, one account; the match never names the
   * other account); similar = same name (warns, can be confirmed as a different person).
   */
  match: "exact" | "phone" | "similar";
  where: string;
}
