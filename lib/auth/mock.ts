/**
 * MOCK AUTH + INVITATION SERVER. NOT REAL. No network, no database, no storage.
 *
 * Every function here stands in for a backend call the contract describes
 * (docs/contracts/auth-and-invitations.md). To go live, replace the bodies with
 * real server calls returning the same types from ./types.ts; screens do not
 * change. Delete the DEMO TRIGGERS blocks when real data is connected.
 *
 * MOCK INVITATION TOKENS (preview any state by URL):
 *   /invite/valid-new       valid, new account (client)
 *   /invite/valid-staff     valid, new account (staff, with prefilled name/phone)
 *   /invite/valid-admin     valid, new account (admin)
 *   /invite/valid-existing  valid, person already has an account
 *   /invite/expired  /invite/revoked  /invite/used  /invite/bad (invalid)
 *   Add ?demo=fail to /invite/valid-new to see "couldn't finish, retry"
 *   (fails once, succeeds on retry).
 *
 * DEMO TRIGGERS for sign-in (email local part, any password unless noted):
 *   unverified@...  -> email not verified      limited@...   -> too many attempts
 *   suspended@...   -> account not active      denied@...    -> no portal access
 *   error@...       -> service unavailable     password "wrong" -> wrong credentials
 * Passwords are never stored or logged.
 */
import type {
  AcceptInvitationInput,
  AcceptInvitationResult,
  InvitationKind,
  InvitationView,
  Portal,
  SignInResult,
  SimpleResult,
} from "./types";
import { PORTAL_FRAMES } from "./portals";

const wait = (ms = 700) => new Promise<void>((r) => setTimeout(r, ms));

/** Server-generated opaque reference (mock). */
function supportRef(): string {
  const n = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .toUpperCase()
    .padStart(6, "0");
  return `BLV-${n}`;
}

/* ------------------------------ invitations ------------------------------ */

const INVITATIONS: Record<string, InvitationView> = {
  "valid-new": {
    state: "valid-new-account",
    kind: "client",
    organisationName: "Harbour Grill & Lounge",
    inviterName: "Beeliv HR",
    emailMasked: "a***@harbourgrill.example",
  },
  "valid-staff": {
    state: "valid-new-account",
    kind: "staff",
    organisationName: "Harbour Grill & Lounge",
    inviterName: "Beeliv HR",
    emailMasked: "c***@example.com",
    prefill: { fullName: "Chidi Okafor", phone: "+234 801 234 5678" },
  },
  "valid-admin": {
    state: "valid-new-account",
    kind: "admin",
    inviterName: "Head of Operations",
    emailMasked: "t***@beeliv.example",
  },
  "valid-existing": {
    state: "valid-existing-account",
    kind: "staff",
    organisationName: "Harbour Grill & Lounge",
    inviterName: "Beeliv HR",
    emailMasked: "f***@example.com",
  },
  expired: { state: "expired", kind: "client", emailMasked: "a***@example.com" },
  revoked: { state: "revoked", kind: "client", emailMasked: "a***@example.com" },
  used: { state: "used", kind: "staff", emailMasked: "a***@example.com" },
};

/** Public + minimal. An unknown token returns the same shape as `expired`. */
export async function getInvitationByToken(token: string): Promise<InvitationView> {
  await wait(120);
  return (
    INVITATIONS[token] ?? { state: "invalid", kind: "client", emailMasked: "" }
  );
}

let failedOnce = false;

export async function acceptInvitation(
  input: AcceptInvitationInput,
  demo?: string | null,
): Promise<AcceptInvitationResult> {
  await wait(900);
  const view = INVITATIONS[input.token];
  if (!view || (view.state !== "valid-new-account" && view.state !== "valid-existing-account")) {
    return {
      ok: false,
      reason: "expired",
      error: { code: "not_found", message: "This invitation can't be used." },
    };
  }
  // DEMO TRIGGER: fail the first attempt, succeed on retry.
  if (demo === "fail" && !failedOnce) {
    failedOnce = true;
    return {
      ok: false,
      reason: "failed",
      error: {
        code: "unavailable",
        message: "We couldn't finish that. Nothing was changed. Try again.",
        supportRef: supportRef(),
      },
    };
  }
  if (view.state === "valid-existing-account" && input.password === "wrong") {
    return {
      ok: false,
      reason: "invalid_credentials",
      error: {
        code: "invalid_credentials",
        message: "That email or password is not right. Try again, or reset your password.",
      },
    };
  }
  const kind: InvitationKind = view.kind;
  const destination = kind === "client" ? "/client/setup" : kind === "admin" ? "/admin" : "/staff";
  return { ok: true, kind, destination };
}

/* -------------------------------- sign in -------------------------------- */

export async function signIn(
  input: { email: string; password: string; remember: boolean; portal: Portal; next?: string | null },
): Promise<SignInResult> {
  await wait(800);
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      ok: false,
      reason: "offline",
      error: { code: "unavailable", message: "You're offline. Check your connection and try again." },
    };
  }
  const local = input.email.trim().toLowerCase().split("@")[0];
  // DEMO TRIGGERS (remove when real).
  if (local === "limited") {
    return {
      ok: false,
      reason: "rate_limited",
      error: { code: "rate_limited", message: "Too many tries.", retryAfterSeconds: 45 },
    };
  }
  if (local === "unverified") {
    return {
      ok: false,
      reason: "email_unverified",
      error: { code: "email_unverified", message: "Please confirm your email first." },
    };
  }
  if (local === "suspended") {
    return {
      ok: false,
      reason: "suspended",
      error: { code: "forbidden", message: "This account is not active. Please contact Beeliv." },
    };
  }
  if (local === "denied") {
    return {
      ok: false,
      reason: "no_access",
      error: { code: "forbidden", message: "You don't have access to this area." },
      availablePortal: input.portal === "client" ? "staff" : "client",
    };
  }
  if (local === "error") {
    return {
      ok: false,
      reason: "unavailable",
      error: {
        code: "unavailable",
        message: "We couldn't sign you in just now. Nothing was changed. Try again in a moment.",
        supportRef: supportRef(),
      },
    };
  }
  if (input.password === "wrong") {
    return {
      ok: false,
      reason: "invalid_credentials",
      error: {
        code: "invalid_credentials",
        message: "That email or password is not right. Try again, or reset your password.",
      },
    };
  }
  return { ok: true, destination: input.next ?? PORTAL_FRAMES[input.portal].destination };
}

export async function resendVerificationEmail(email: string): Promise<SimpleResult> {
  void email;
  await wait(700);
  return { ok: true };
}
