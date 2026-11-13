/**
 * Replaceable contract for Team & Access: UI -> hooks -> service -> adapter ->
 * (dev fixture NOW, Supabase adapter LATER). No business rule lives in a
 * component. Every call must be re-checked by the backend against role and
 * scope (RLS), and every write MUST create an audit / history record (spec 30,
 * 32.2: privileged role/scope changes and invitation / account state changes
 * are security-relevant events). Nothing is sent: invitations are recorded as
 * pending; email delivery is connected later.
 */
import type { AdapterEvent } from "../adapter";
import type { AccessLink, DuplicateMatch, AccessPage, AccessPatch, AccessQuery, AccessMatrix, HistoryEntry, Invitation, InvitationQuery, InvitationsPage, InviteInput, StateAction, TeamCapabilities, TeamFacets } from "./types";

export interface TeamAccessAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  getCapabilities(): Promise<TeamCapabilities>;
  getFacets(): Promise<TeamFacets>;
  getMatrix(): Promise<AccessMatrix>;
  listInternal(q: AccessQuery): Promise<AccessPage>;
  listClientUsers(q: AccessQuery): Promise<AccessPage>;
  listAccounts(q: AccessQuery): Promise<AccessPage>;
  listInvitations(q: InvitationQuery): Promise<InvitationsPage>;
  /** Rejects when the email already has an active account or a pending invitation. */
  invite(input: InviteInput): Promise<Invitation>;
  /** Creating an invitation never sends it. This is the explicit send (in the demo: recorded only, nothing is emailed). */
  sendInvitation(id: string): Promise<Invitation>;
  /** Resend / retry. Rejects with "cooldown" before delivery.retryAt. */
  resendInvitation(id: string): Promise<Invitation>;
  /** Copy-link delivery: creates (or regenerates, invalidating the previous link) a single-use link and returns it ONCE. Rejects "cooldown" / "Not available". */
  createAccessLink(id: string, expectedRevision?: number): Promise<AccessLink>;
  /** Fix the address of a failed delivery. */
  updateInvitationEmail(id: string, email: string): Promise<Invitation>;
  /** Issue a replacement for an expired or revoked invitation (a new pending invitation, not yet sent). */
  replaceInvitation(id: string): Promise<Invitation>;
  findDuplicates(input: { name: string; email: string; phone?: string }): Promise<DuplicateMatch[]>;
  revokeInvitation(id: string, reason: string): Promise<Invitation>;
  /** Suspend / deactivate / reactivate with a recorded reason. */
  setState(id: string, action: StateAction, reason: string): Promise<void>;
  /** Client outlet scope + access level, or staff / applicant entitlements. */
  updateAccess(id: string, patch: AccessPatch): Promise<void>;
  getHistory(id: string): Promise<HistoryEntry[]>;
}
