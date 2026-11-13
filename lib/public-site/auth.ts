import { recoveryRequest } from "@/lib/auth/recovery-transport";
import type { Portal } from "@/lib/auth/types";
/**
 * Auth data layer for the public auth screens: THE ONLY place the UI talks to
 * an auth backend.
 *
 * STATUS: BACKEND NOT CONNECTED. Supabase Auth is not wired (the client library
 * is not installed and no tables/auth are configured; see CLAUDE.md). Every
 * function below resolves a clearly-labelled "backend not connected yet" result
 * after a short simulated delay so the screens' loading, success and
 * next-screen flows can be tested end to end.
 *
 * TO CONNECT SUPABASE LATER (one place, screens do not change):
 *   1. Flip AUTH_BACKEND_CONNECTED to true.
 *   2. Replace each function body marked `SWAP POINT` with the real call
 *      (signInWithPassword / signUp / resetPasswordForEmail / resend /
 *      email-link confirmation / updateUser), mapping the response onto the
 *      same AuthResult shape.
 *   3. parseFlowTestState() already returns null once AUTH_BACKEND_CONNECTED
 *      is true, so the `?state=` flow-test preview on /reset-password and
 *      /verify-email/success switches itself off (delete it when convenient).
 *
 * SECURITY: passwords are never stored, logged or echoed by this file. Nothing
 * here writes to localStorage/sessionStorage or the console.
 *
 * ROLE RULE (project lead): only applicants may self-register. signup() always
 * means role = applicant; the UI sends no role. SERVER-SIDE ENFORCEMENT IS
 * REQUIRED LATER: when Supabase is connected it must set role = applicant on
 * signup itself and reject/ignore any client-supplied role or account type.
 * Hiding or omitting the field in this UI is NOT the security control. Login
 * is open to every role, and its failure messages must stay generic (never
 * reveal which roles or accounts exist).
 */

export type LoginInput = {
  email: string;
  password: string;
  remember: boolean;
};

/**
 * Public signup input. There is deliberately NO role / account-type field:
 * self-registration always creates an APPLICANT account and nothing the
 * visitor sends can change that. Clients (businesses), Assigned Staff,
 * Assigned HR and Head of Operations accounts are never created here; Beeliv
 * provisions or links them.
 */
export type SignupInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  acceptedTerms: boolean;
  /** Set on the job-application variant (/signup?job=<id>). */
  jobId: string | null;
};

export type PasswordResetInput = { email: string };

export type AuthOk = {
  ok: true;
  /** Always false until the real backend is connected. */
  backendConnected: boolean;
  signOutConfirmed?: boolean;
  /** Human-readable note for the flow-test banner. */
  notice: string;
};

export type AuthFailure = {
  ok: false;
  code:
    | "invalid-credentials"
    | "email-taken"
    | "rate-limited"
    /** Email / recovery link is past its expiry (see the 600 s note on the link functions). */
    | "link-expired"
    /** Link malformed, already used, or no recovery/confirmation session. */
    | "link-invalid"
    /** The server's password rules rejected the new password. */
    | "weak-password"
    | "network"
    | "unknown";
  message: string;
  /** `rate-limited`: seconds the server says to wait (the UI countdown is cosmetic). */
  retryAfterSeconds?: number;
};

export type AuthResult = AuthOk | AuthFailure;

/** Single switch for "is a real auth backend behind these functions". */
export const AUTH_BACKEND_CONNECTED: boolean = false;

export const BACKEND_NOT_CONNECTED = "Backend not connected yet";

/**
 * Flow-test stubs may only pretend to succeed while developing locally. In a production build (NODE_ENV is inlined
 * into the browser bundle) they must never fake an account, an email or a password change: they fail honestly
 * instead and nothing navigates. The real calls replace these stubs when the backend actions exist.
 */
export const FLOW_TEST_ONLY: boolean = process.env.NODE_ENV !== "production";

const SIMULATED_LATENCY_MS = 800;

function notOpen(message: string): AuthFailure {
  return { ok: false, code: "unknown", message };
}
const SIGNUP_NOT_OPEN = "Creating an account online is not open yet. Please check back soon, or contact Beeliv and we will help you.";
const EMAIL_NOT_OPEN = "Email links are not open yet. Please check back soon, or contact Beeliv and we will help you.";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function notConnected(what: string): AuthOk {
  return {
    ok: true,
    backendConnected: false,
    notice: `${BACKEND_NOT_CONNECTED}. ${what} This is a flow test only.`,
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  void input;
  // SWAP POINT: supabase.auth.signInWithPassword({ email, password }); honour
  // `remember` through the session persistence setting.
  await wait(SIMULATED_LATENCY_MS);
  return notConnected("No sign-in was attempted.");
}

export async function signup(input: SignupInput): Promise<AuthResult> {
  if (!FLOW_TEST_ONLY) return notOpen(SIGNUP_NOT_OPEN);
  void input;
  // SWAP POINT: supabase.auth.signUp({ email, password, options: { data: {
  // full_name, phone, job_id } } }). Do NOT pass a role from the client; the
  // backend assigns role = applicant (see ROLE RULE above).
  await wait(SIMULATED_LATENCY_MS);
  return notConnected("No account was created.");
}

export async function requestPasswordReset(input: PasswordResetInput, portal: Portal = "talent"): Promise<AuthResult> {
  const result=await recoveryRequest(portal,"request",{email:input.email});
  return result.ok ? {ok:true,backendConnected:true,notice:"If an account matches that address, you will receive a password reset link."} : result;
}
export async function resendResetLink(input: PasswordResetInput, portal: Portal = "talent"): Promise<AuthResult> {
  return requestPasswordReset(input,portal);
}

/* ------------------------------------------------------------------ */
/* Email-link flows: verify email, reset password.                     */
/*                                                                      */
/* No wireframe board exists for these screens; they reuse the Auth    */
/* frame. Everything below is the single swap point for them.          */
/*                                                                      */
/* EXPIRY: the UI's 10-minute text/countdown                           */
/* (RESET_LINK_EXPIRY_SECONDS, auth-content.ts) is a DISPLAY of the    */
/* real setting. In Supabase the email link/OTP lifetime is one        */
/* project-wide value (Auth > Providers > Email > "Email OTP          */
/* Expiration"); it MUST be set to 600 seconds to match. It applies to */
/* the confirmation email as well as the recovery email, so the        */
/* verify-email screen deliberately shows no countdown of its own      */
/* until the project lead decides whether confirmation links should    */
/* share the 10-minute lifetime.                                       */
/* ------------------------------------------------------------------ */

/** What an emailed link can carry. Deliberately NO access/refresh tokens: never held by the UI. */
export type EmailLinkParams = {
  /** PKCE one-time code (`?code=`). */
  code: string | null;
  /** Token-hash style link (`?token_hash=&type=`). */
  tokenHash: string | null;
  type: string | null;
  /** Supabase error redirect, e.g. `otp_expired` (in the query or the #fragment). */
  errorCode: string | null;
};

const LINK_PARAM_KEYS = [
  "code",
  "token",
  "token_hash",
  "type",
  "access_token",
  "refresh_token",
  "expires_in",
  "expires_at",
  "token_type",
  "provider_token",
  "provider_refresh_token",
  "error",
  "error_code",
  "error_description",
] as const;

/**
 * Read any auth-link parameters from the address bar (query or #fragment) and
 * IMMEDIATELY remove them from the URL and the history entry with
 * history.replaceState, so a one-time code/token never sits in the address bar,
 * the back stack, a screenshot or a shared link. Returns null when the URL
 * carries none. Browser only (null on the server). Never logs or persists.
 *
 * Non-secret params (`?email=`, `?state=`) are left alone.
 *
 * WITH SUPABASE: the client library's own URL detection consumes (and strips)
 * an implicit-flow #fragment when the client is created, before this runs; the
 * PKCE `?code=` is read here and handed to checkResetLink / confirmEmail.
 */
export function takeEmailLink(): EmailLinkParams | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const frag = new URLSearchParams(url.hash.replace(/^#/, ""));
  const carries = (k: string) => url.searchParams.has(k) || frag.has(k);
  if (!LINK_PARAM_KEYS.some(carries)) return null;

  const pick = (k: string) => url.searchParams.get(k) ?? frag.get(k);
  const link: EmailLinkParams = {
    code: pick("code"),
    tokenHash: pick("token_hash"),
    type: pick("type"),
    errorCode: pick("error_code"),
  };

  for (const k of LINK_PARAM_KEYS) url.searchParams.delete(k);
  // The fragment is only ever used for auth params here; drop it entirely.
  url.hash = "";
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  return link;
}

export type LinkState = "expired" | "invalid";

/**
 * FLOW-TEST PREVIEW ONLY. While no backend is connected there is no real link
 * to be expired or invalid, so `?state=expired|invalid` lets those states be
 * reviewed. Returns null (feature off) as soon as AUTH_BACKEND_CONNECTED is
 * true. Used by /reset-password and /verify-email/success.
 */
export function parseFlowTestState(raw: unknown): LinkState | null {
  if (AUTH_BACKEND_CONNECTED) return null;
  // Server-side only (called from server pages): also off whenever the real auth backend is live or in a production build.
  if (process.env.NODE_ENV === "production" || process.env.AUTH_BACKEND_ENABLED === "true") return null;
  return raw === "expired" || raw === "invalid" ? raw : null;
}

/** Where a recovery link stands when /reset-password opens. */
export type ResetLinkStatus = "valid" | "mfa-required" | LinkState;

export type VerifyEmailResendInput = { email: string };
export type UpdatePasswordInput = { password: string; mfaCode?: string };

/** Verify-email screen "resend the link". */
export async function verifyEmailResend(
  input: VerifyEmailResendInput,
): Promise<AuthResult> {
  if (!FLOW_TEST_ONLY) return notOpen(EMAIL_NOT_OPEN);
  void input;
  // SWAP POINT: supabase.auth.resend({ type: "signup", email, options: {
  // emailRedirectTo: <origin>/verify-email/success } }). Supabase sends a new
  // confirmation email; keep the response generic (never say whether the
  // address has an account).
  await wait(SIMULATED_LATENCY_MS);
  return notConnected("No email was sent.");
}

/**
 * /verify-email/success: confirm the address from the emailed link.
 * Today it resolves "not connected" (the screen is reachable for the flow test).
 */
export async function confirmEmail(link: EmailLinkParams | null): Promise<AuthResult> {
  void link;
  // SWAP POINT: the confirmation email's link carries a one-time credential.
  //  - PKCE: supabase.auth.exchangeCodeForSession(link.code)
  //  - token hash: supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: "signup" | "email" })
  // Map: errorCode "otp_expired" or an expired-token error -> code "link-expired";
  // any other failure / no credential -> "link-invalid" (generic; never reveal
  // whether an account exists). Do NOT leave the applicant signed in from here:
  // they continue to /login (no auto-login), so signOut() after the exchange.
  await wait(SIMULATED_LATENCY_MS);
  return notConnected("No email was verified.");
}

/**
 * /reset-password on load: is the emailed recovery link usable? Only called
 * when AUTH_BACKEND_CONNECTED (the flow-test preview covers the states before).
 */
export async function checkResetLink(link: EmailLinkParams | null, portal: Portal = "talent"): Promise<ResetLinkStatus> {
  if (link?.errorCode) return link.errorCode === "otp_expired" ? "expired" : "invalid";
  if (link && (!link.tokenHash || link.type !== "recovery" || link.code)) return "invalid";
  const result=await recoveryRequest(portal,"check",link ? {tokenHash:link.tokenHash,type:link.type} : {});
  return result.ok ? result.mfaRequired ? "mfa-required" : "valid" : result.code === "link-expired" ? "expired" : "invalid";
}

/** Recovery-only session; password and optional existing TOTP proof go straight to the server. */
export async function updatePassword(input: UpdatePasswordInput, portal: Portal = "talent"): Promise<AuthResult> {
  const result=await recoveryRequest(portal,"complete",input);
  return result.ok ? {ok:true,backendConnected:true,signOutConfirmed:result.signOutConfirmed,notice:"Your password has been changed. Sign in to continue."} : result;
}
