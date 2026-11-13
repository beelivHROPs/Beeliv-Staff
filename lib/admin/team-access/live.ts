/**
 * Live Team & Access adapter. Connected so far: the invitation LIST (POST /api/auth/invite-list, read-only) and
 * copy-link delivery: "Create access link" calls
 * POST /api/auth/invite-copy-link through the browser transport in lib/auth/service.ts
 * (docs/contracts/auth-copy-link-delivery.md). Everything else rejects with TeamAccessNotConnectedError so a
 * screen shows its own error state: live NEVER falls back to the fixtures in ./mock.ts.
 *
 * Rules kept here:
 *  - a write is never retried automatically. One requestId per intent, reused only when the SAME invitation and
 *    revision are pressed again after an unknown outcome (the server then answers from its idempotency record or
 *    runs it once);
 *  - the raw link exists only in the value returned to the caller. It is never stored, logged or kept here;
 *  - an unknown outcome (lost response, 5xx, unreadable reply, or a reply that should have carried the link but
 *    did not) throws Error("outcome_unknown"). The person reloads, then creates a NEW link;
 *  - the browser sends only { invitationId, expectedRevision, requestId }. Role, scope, expiry and token are
 *    server-owned.
 * Only relative imports so the module can be unit-tested offline.
 */
import { createInvitationAccessLink, listInvitations as listInvitationsWire } from "../../auth/service";
import type { InvitationListItem } from "../../auth/invitation-management-wire";
import type { AdapterEvent } from "../adapter";
import { createIntentKeys, OutcomeUnknownError } from "../org-records/transport";
import type { TeamAccessAdapter } from "./adapter";
import type { DeliveryStatus, Invitation, InvitationQuery, InvitationsPage, InvitationStatus } from "./types";

/** The live call for this screen is not built yet. Never mapped to sample data. */
export class TeamAccessNotConnectedError extends Error {
  constructor() {
    super("Team and access records are not connected to the live system yet.");
    this.name = "TeamAccessNotConnectedError";
  }
}

type CreateLink = typeof createInvitationAccessLink;
type ListWire = typeof listInvitationsWire;

/** The list is read page by page (100 rows each) and stops after this many pages. */
export const LIST_PAGE_SIZE = 100;
export const LIST_PAGE_CAP = 10;

/**
 * Wire to UI enums. The UI has no "draft", so a draft shows as pending with delivery "not-sent" (it was never sent).
 * Delivery values the UI cannot tell apart are folded: delivered/sent -> sent, delayed -> queued (not yet delivered),
 * failed/bounced/complained/suppressed/unknown -> failed (a fixed, generic reason; nothing is guessed).
 */
export const mapInvitationStatus = (s: InvitationListItem["status"]): InvitationStatus => (s === "draft" ? "pending" : s);
export function mapDeliveryStatus(s: InvitationListItem["deliveryStatus"]): DeliveryStatus {
  switch (s) {
    case "not_sent": return "not-sent";
    case "queued": case "delayed": return "queued";
    case "sent": case "delivered": return "sent";
    case "copied": return "copied";
    default: return "failed";
  }
}
const FAILURE_TEXT: Partial<Record<InvitationListItem["deliveryStatus"], string>> = {
  failed: "The email could not be sent.", bounced: "The email address did not accept the message.", complained: "The recipient marked the message as unwanted.",
  suppressed: "Sending to this address is blocked.", unknown: "Delivery could not be confirmed.",
};
const ROLE_LABEL: Record<string, string> = { head_of_operations: "Head of Operations", hr_manager: "HR Manager", hr_officer: "HR Officer", talent: "Staff access", client: "Client access" };

/** Only what the server returned. Email, last attempt and link are not in the list answer, so they stay empty. */
export function mapInvitation(i: InvitationListItem): Invitation {
  const delivery = mapDeliveryStatus(i.deliveryStatus);
  return {
    id: i.id, revision: i.revision, reference: i.reference ?? "", kind: i.kind, email: "", name: i.displayName,
    roleLabel: ROLE_LABEL[i.role] ?? "", scopeLabel: i.scopeSummary, status: mapInvitationStatus(i.status),
    delivery: { status: delivery, lastAttemptAt: null, ...(delivery === "failed" && FAILURE_TEXT[i.deliveryStatus] ? { failureReason: FAILURE_TEXT[i.deliveryStatus] } : {}) },
    invitedBy: i.inviter, invitedAt: i.invitedAt, expiresAt: i.expiresAt, resendCount: i.resendCount, link: "",
  };
}
const EMPTY_COUNTS = (): Record<InvitationStatus | "all", number> => ({ all: 0, pending: 0, accepted: 0, expired: 0, revoked: 0 });
/** Refusals that happened BEFORE any write. Anything else (unavailable, outcome_unknown, offline, an unreadable 2xx) may have committed. */
const DEFINITE = new Set(["rate_limited", "no_access", "conflict", "review_required", "delivery_blocked", "validation_failed", "invalid_request", "unauthenticated", "mfa_required", "forbidden"]);
const notConnected = (): Promise<never> => Promise.reject(new TeamAccessNotConnectedError());

export function createLiveTeamAccessAdapter(createLink: CreateLink = createInvitationAccessLink, listWire: ListWire = listInvitationsWire): TeamAccessAdapter {
  const listeners = new Set<(event: AdapterEvent) => void>();
  const keys = createIntentKeys();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    getCapabilities: notConnected,
    getFacets: notConnected,
    getMatrix: notConnected,
    listInternal: notConnected,
    listClientUsers: notConnected,
    listAccounts: notConnected,
    invite: notConnected,
    sendInvitation: notConnected,
    resendInvitation: notConnected,
    updateInvitationEmail: notConnected,
    replaceInvitation: notConnected,
    findDuplicates: notConnected,
    revokeInvitation: notConnected,
    setState: notConnected,
    updateAccess: notConnected,
    getHistory: notConnected,

    async listInvitations(q: InvitationQuery): Promise<InvitationsPage> {
      const seen = new Map<string, Invitation>();
      let after: { createdAt: string; id: string } | null = null;
      for (let page = 0; page < LIST_PAGE_CAP; page++) {
        let result: Awaited<ReturnType<ListWire>>;
        try { result = await listWire({ limit: LIST_PAGE_SIZE, ...(after ? { after } : {}) }); } catch { throw new Error("unavailable"); }
        if (!result.ok) throw new Error(result.reason === "rate_limited" ? "rate_limited" : "unavailable");
        for (const item of result.items) if (!seen.has(item.id)) seen.set(item.id, mapInvitation(item));
        // A cursor that does not move would loop; treat it as unreadable.
        if (result.next && after && result.next.id === after.id && result.next.createdAt === after.createdAt) throw new Error("unavailable");
        after = result.next;
        if (!after) break;
      }
      const all = [...seen.values()];
      if (all.length === 0) return { rows: [], total: 0, statusCounts: EMPTY_COUNTS(), workspaceEmpty: true };
      const needle = q.search.trim().toLowerCase();
      const base = all.filter((i) => (!q.kind || i.kind === q.kind) && (!needle || [i.name, i.reference, i.roleLabel, i.scopeLabel].some((t) => t.toLowerCase().includes(needle))));
      const statusCounts = EMPTY_COUNTS();
      for (const i of base) { statusCounts.all++; statusCounts[i.status]++; }
      const rows = base.filter((i) => !q.status || i.status === q.status);
      return { rows, total: rows.length, statusCounts, workspaceEmpty: false };
    },

    async createAccessLink(id, expectedRevision) {
      // Without the revision the person last saw there is nothing safe to send: refuse locally (no request).
      if (typeof expectedRevision !== "number" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new Error("Not available");
      const requestId = keys.begin({ id, expectedRevision });
      let result: Awaited<ReturnType<CreateLink>>;
      try {
        result = await createLink({ requestId, invitationId: id, expectedRevision });
      } catch {
        keys.settle(new OutcomeUnknownError(requestId));
        throw new Error("outcome_unknown");
      }
      if (!result.ok) {
        if (!DEFINITE.has(result.reason)) {
          keys.settle(new OutcomeUnknownError(requestId));
          throw new Error("outcome_unknown");
        }
        keys.settle(null); // a definite refusal: the next press is a new intent
        // rate_limited = route limit or the 60 second regenerate cooldown; the screen says "wait a moment".
        throw new Error(result.reason === "rate_limited" ? "cooldown" : "Not available");
      }
      keys.settle(null);
      // The server committed but this response carries no link (a replay): it can never be shown again.
      if (!result.accessLink) {
        listeners.forEach((l) => l("reset"));
        throw new Error("outcome_unknown");
      }
      listeners.forEach((l) => l("reset")); // lists reload quietly with the new revision and delivery status
      return { url: result.accessLink.url, expiresAt: result.accessLink.expiresAt };
    },
  };
}
