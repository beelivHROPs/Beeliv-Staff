/**
 * Auth + invitation types (DRAFT contract: docs/contracts/auth-and-invitations.md
 * and shared-states.md). These mirror what the backend will serve; the screens
 * depend only on these types and on the functions in ./mock.ts, so swapping the
 * mock for real server calls does not change any screen.
 */

/** Which app the sign-in form is framing. `talent` = the default /login. */
export type Portal = "talent" | "client" | "staff" | "admin";

/** Shared error envelope (shared-states.md section 1). The UI shows only message + supportRef. */
export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
  retryAfterSeconds?: number;
  supportRef?: string;
}

export type InvitationKind = "client" | "staff" | "admin";

export type InvitationViewState =
  | "valid-new-account"
  | "valid-existing-account"
  | "expired"
  | "revoked"
  | "used"
  | "invalid";

/**
 * Minimal public view of an invitation by token. `emailMasked` only, never the
 * full address. `prefill` is a PROPOSED addition (not in the draft contract):
 * lets the legacy staff record pre-fill name/phone for the person to confirm.
 */
export interface InvitationView {
  state: InvitationViewState;
  kind: InvitationKind;
  organisationName?: string;
  inviterName?: string;
  emailMasked: string;
  prefill?: { fullName?: string; phone?: string };
}

/** Why a sign-in did not complete. The UI picks a screen from this, never from raw text. */
export type SignInFailure =
  | "invalid_credentials"
  | "email_unverified"
  | "rate_limited"
  | "suspended"
  | "no_access"
  | "unavailable"
  | "offline";

export type SignInResult =
  | { ok: true; destination: string }
  | {
      ok: false;
      reason: SignInFailure;
      error: ApiError;
      /** `no_access`: the portal this person CAN use. */
      availablePortal?: Portal;
    };

export type AcceptInvitationInput = {
  token: string;
  /** New account: set a password. Existing account: sign in with it. */
  password: string;
  /** Existing account only: the email they sign in with. */
  email?: string;
  profile?: { fullName: string; phone: string };
};

export type AcceptInvitationResult =
  | { ok: true; kind: InvitationKind; destination: string }
  | { ok: false; error: ApiError; reason: "failed" | "invalid_credentials" | "rate_limited" | "expired" };

export type SimpleResult = { ok: true } | { ok: false; error: ApiError };
