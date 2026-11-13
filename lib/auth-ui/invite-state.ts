/**
 * The invitation screen's recovery state machine, as pure functions (frontend only).
 *
 * Why it exists: when an acceptance attempt ends with an UNKNOWN outcome (timeout, 5xx,
 * unconfirmed reply) the account MAY have been created. That doubt must survive every
 * later local validation error, 429 and wrong-password result, and only end when a
 * completion check CONFIRMS it or the person explicitly dismisses it. The component
 * (components/public/auth/InviteAcceptance.tsx) renders this state; it does not own the rules.
 *
 * Tested by lib/auth-ui/invite-state.test.cjs (run: node --test lib/auth-ui/invite-state.test.cjs).
 * No React, no network, no browser APIs here. Nothing in this file is a security boundary.
 */

export type InviteIdentity = { token: string; portal: string; mode: string };

/** One string per invitation: a different token, app or mode is a different invitation. */
export function inviteKey(i: InviteIdentity): string {
  return JSON.stringify([i.mode, i.portal, i.token]);
}

export type InviteFlow = {
  /** The invitation this state belongs to. */
  key: string;
  /** An earlier acceptance attempt may have committed. Cleared only by confirmed completion or dismissal. */
  unknown: { supportRef?: string } | null;
  /** The earlier attempt's link has since stopped reading as available (it may have been used by that attempt). */
  linkClosed: boolean;
  /** Completion is CONFIRMED (a typed success). */
  confirmed: boolean;
  /** The link is unavailable and there is no earlier doubt: show the generic card. */
  gone: boolean;
};

export const initialFlow = (key: string): InviteFlow => ({
  key,
  unknown: null,
  linkClosed: false,
  confirmed: false,
  gone: false,
});

export type InviteEvent =
  /** The invitation identity changed: nothing from the old one may carry over. */
  | { type: "identity"; key: string }
  /** Timeout / 5xx / offline / unconfirmed reply on an accept attempt. */
  | { type: "attempt-unknown"; supportRef?: string }
  /** Local validation error, 429, wrong password, rejected inputs or any other definite refusal. */
  | { type: "attempt-refused" }
  /** The server says the link is not (or no longer) available. */
  | { type: "attempt-link-closed" }
  /** A typed success from an accept attempt or from Check completion. */
  | { type: "confirmed" }
  /** A completion check that did not confirm (still unknown, signed out, rate limited, offline). */
  | { type: "check-not-confirmed" }
  /** The person chose to dismiss the doubt. */
  | { type: "dismiss" };

export function reduceInvite(state: InviteFlow, event: InviteEvent): InviteFlow {
  switch (event.type) {
    case "identity":
      return event.key === state.key ? state : initialFlow(event.key);
    case "attempt-unknown":
      return { ...state, unknown: { supportRef: event.supportRef ?? state.unknown?.supportRef } };
    case "attempt-refused":
    case "check-not-confirmed":
      // A refusal of THIS attempt says nothing about an earlier one: the doubt stays.
      return state;
    case "attempt-link-closed":
      // With an earlier doubt, a closed link may simply mean that attempt used it: keep Check completion.
      return state.unknown ? { ...state, linkClosed: true } : { ...state, gone: true };
    case "confirmed":
      return { ...state, unknown: null, linkClosed: false, gone: false, confirmed: true };
    case "dismiss":
      return { ...state, unknown: null, linkClosed: false };
  }
}

/** Map an accept-attempt failure reason (the wire reasons) to the event it causes. */
export function eventForAttemptReason(reason: string, supportRef?: string): InviteEvent {
  switch (reason) {
    case "invitation_unavailable":
      return { type: "attempt-link-closed" };
    case "outcome_unknown":
    case "unavailable":
    case "offline":
      return { type: "attempt-unknown", supportRef };
    default:
      // invalid_credentials, rate_limited, weak_password, validation_failed, forbidden, invalid_request, ...
      return { type: "attempt-refused" };
  }
}

/** Check completion is offered whenever an earlier outcome is in doubt and nothing is confirmed. */
export const showCheckCompletion = (s: InviteFlow): boolean => s.unknown !== null && !s.confirmed;

/** A retry button only when the earlier outcome was definitely NOT committed (i.e. there is no doubt). */
export const showRetry = (s: InviteFlow): boolean => s.unknown === null && !s.confirmed;

/**
 * May the form submit again? A new-account retry could meet an account that was already created,
 * so it waits for Check completion or Dismiss. An existing-account sign-in-and-accept is safe to repeat
 * (and a wrong password after an uncertain attempt must stay fixable).
 */
export const canSubmitAgain = (s: InviteFlow, existingAccount: boolean): boolean =>
  s.unknown === null || existingAccount;

/**
 * A same-site return path to an invitation, for after sign-in. Only the exact token-bearing invite
 * route of the app being signed in to is accepted: no host, no scheme, no query, no extra segments,
 * so it can never be an open redirect. Returns the path, or null.
 */
export function inviteReturnPath(raw: unknown, portal: string): string | null {
  if (typeof raw !== "string") return null;
  const bases = portal === "admin" ? ["/admin/invite/"] : portal === "client" ? ["/client/invite/"] : ["/invite/", "/staff/invite/"];
  for (const base of bases) {
    if (!raw.startsWith(base)) continue;
    const token = raw.slice(base.length);
    if (/^[A-Za-z0-9_-]{1,128}$/.test(token)) return raw;
  }
  return null;
}

/** The invite route path for a token, or null when the token is not a plain URL-safe token. */
export function inviteRoutePath(routePortal: string, token: string): string | null {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(token)) return null;
  const base = routePortal === "admin" ? "/admin/invite/" : routePortal === "client" ? "/client/invite/" : "/invite/";
  return base + token;
}
