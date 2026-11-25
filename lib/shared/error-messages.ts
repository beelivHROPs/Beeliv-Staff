/**
 * One place for the plain-English explanation of every reason code the Beeliv backend can return.
 *
 * Flow: a database function returns {ok:false, reason:"<code>"}; a server route passes the code on ({reason} or
 * {error:{code}}); a browser live adapter turns it into an Error whose message comes from here; a screen shows that
 * message (see `errorMessage`).
 *
 * Rules this file keeps:
 *  - Pure: no React, no fetch, no imports. Safe in the browser, the server and node tests.
 *  - Every sentence is written by us. Never an internal code, an id, a stack trace or text the server sent.
 *  - Never says whether another person or account exists (no "that email is already registered").
 *  - "unavailable" is ambiguous on the wire (switched off OR a passing outage), so by default it reads as a
 *    passing problem. Use the code "switched_off" only where the caller KNOWS the feature is not on yet.
 */

/** fetch() itself threw: no reply at all. */
export const NETWORK_MESSAGE = "Beeliv couldn't be reached. Check your internet connection and try again.";
/** For a code we have no sentence for. Still warm, still code-free. */
export const FALLBACK_MESSAGE = "Something didn't work on our side. Please try again in a moment.";

const MESSAGES: Record<string, string> = {
  // Access and session
  unauthenticated: "Your session has ended. Sign in again.",
  session_ended: "Your session has ended. Sign in again.",
  no_access: "You don't have access to this. If you think you should, ask the Head of Operations.",
  forbidden: "You don't have access to this. If you think you should, ask the Head of Operations.",
  wrong_app: "This account signs in somewhere else. Use the sign-in page for your Beeliv app.",
  mfa_required: "Confirm it's you with your authenticator code first, then try again.",
  identity_unverified: "Confirm your email address first, then try again.",
  email_unverified: "Confirm your email address first, then try again.",
  invalid_credentials: "That email and password don't match. Check them and try again.",
  suspended: "This account is paused. Contact Beeliv if you think this is a mistake.",
  invitation_unavailable: "This invitation can't be used any more. Ask Beeliv to send a new one.",
  failed: "That didn't work. Please try again in a moment.",
  inactive: "This record has been deactivated, so it can't be changed this way.",
  not_placed: "This person isn't placed with that client or outlet, so this can't be done for them.",
  not_applicant: "This sign-up link isn't valid any more. Start the sign-up again.",
  requires_profile: "Your sign-up has expired. Start the sign-up again.",
  existing_account: "This email address can't be used for a new invitation. Check the address, or ask the Head of Operations.",
  person_unavailable: "This person's account isn't active, so this can't be done for them right now.",

  // Availability
  unavailable: "Beeliv couldn't be reached. Check your connection and try again.",
  switched_off: "This part of Beeliv isn't switched on yet.",
  setup_unavailable: "Account setup for this role isn't switched on yet. Ask the Head of Operations.",
  setup_pending: "Your account is still being set up by Beeliv. You'll be able to continue once that's done.",
  offline: NETWORK_MESSAGE,
  network: NETWORK_MESSAGE,
  rate_limited: "Too many attempts in a short time. Wait a minute and try again.",
  cooldown: "Please wait a minute before trying that again.",
  delivery_blocked: "An email for this invitation is being sent right now. Wait a minute and try again.",
  provider_uncertain: "We couldn't confirm the email was sent. Wait a minute, then check before sending again.",
  provider_rejected: "The email couldn't be sent to that address. Check it and try again.",

  // Saving and concurrency
  stale: "Someone else changed this a moment ago. Reload and try again.",
  conflict: "This clashed with another change. Reload and try again.",
  outcome_unknown: "We couldn't confirm this was saved. Reload to check before trying again.",
  not_saved: "Your changes weren't saved. Check the details and try again.",
  duplicate: "Something with these details already exists. Check for it before adding it again.",
  already_exists: "This has already been set up.",
  not_found: "This isn't available any more. It may have been removed or moved. Reload to see the latest.",
  invalid_transition: "This can't be done at this step.",
  review_required: "This invitation changed since it was reviewed. Review it again before sending.",

  // Form input
  invalid_request: "Some details aren't valid. Check the form and try again.",
  validation_failed: "Some details are missing. Add your full name and phone number, then try again.",
  payload_invalid: "Some details aren't valid. Check the form and try again.",
  note_required: "Please add a short reason.",
  reason_required: "Please add a short reason.",
  invalid_clock: "The time on this device looks wrong. Set your device clock to the correct time and try again.",
  invalid_deadline: "Choose a deadline in the future.",
  profile_incomplete: "Finish your profile details first, then try again.",

  // Agreements and policy
  agreement_required: "Please read and accept the agreement first.",
  agreement_missing: "Please read and accept the agreement first.",
  policy_unapproved: "This isn't available until Beeliv approves the policy behind it.",
  milestone_pending: "An earlier step still needs to be finished first.",

  // Recruitment and applications
  closed: "This job is no longer accepting applications.",
  not_open: "This is no longer open.",
  documents_missing: "Your CV, passport photo and valid ID must be uploaded and checked first.",
  documents_unsupported: "This job needs documents we can't collect online yet. Contact Beeliv to apply.",
  test_unavailable: "This job needs a test we can't offer online yet. Contact Beeliv to apply.",
  screening_incomplete: "Please answer all the required screening questions.",
  already_scheduled: "An interview is already scheduled. Reschedule that one instead.",
  publication_not_ready: "This job can't be published yet. Remove the extra required documents and custom image, then try again.",
  not_bootstrap: "This setup link is only for the first Head of Operations account.",

  // Shifts, attendance and leave
  too_early: "Check-in opens 2 hours before your shift starts.",
  shift_over: "This shift has ended, so it can no longer be recorded here. Tell your HR officer.",
  not_checked_in: "Check in first.",
  already_worked: "Someone has already checked in for this shift, so it can't be changed or removed.",
  overlap: "There's already leave on some of these dates.",
  phone_in_use: "This phone number can't be used. Check it, or use a different number.",
  mfa_invalid: "That verification code wasn't accepted. Check it and try again.",
  invalid_code: "That code is wrong or has expired. Check your email, or send a new code.",
  weak_password: "Use at least 8 characters, including a number.",

  // Documents and uploads
  limit_reached: "This file has been replaced too many times. Contact Beeliv for help.",
  expired: "This has expired. Start again.",
};

/**
 * Context-specific wording. Checked before the general map. Keys are `${context}:${code}`.
 * Contexts in use: leave, attendance, shift, application, interview, invite, setup, upload, documents, records, vacancy, enrollment.
 */
const IN_CONTEXT: Record<string, string> = {
  "leave:invalid_request": "Check the dates. Leave can't start in the past (sick leave can go back up to 7 days) and lasts at most 60 days.",
  "leave:invalid_transition": "This request has already been decided, so it can no longer be cancelled or changed.",
  "leave:overlap": "You already have leave on some of these dates.",
  "leave:not_found": "This leave request isn't available any more. Reload to see the latest.",
  "attendance:invalid_request": "Check the times. Check-out must be after check-in.",
  "attendance:not_found": "This attendance record isn't available any more. Reload to see the latest.",
  "shift:invalid_request": "Check the shift. The end time must be after the start time, and the date can't be in the past.",
  "shift:not_found": "This shift isn't available any more. Reload to see the latest.",
  "application:stale": "This application changed a moment ago. Reload and try again.",
  "application:invalid_transition": "This application has already moved on. Reload to see where it is now.",
  "application:not_found": "This application isn't available any more. Reload to see the latest.",
  "application:conflict": "This clashed with an earlier change to this application. Reload and try again.",
  "interview:invalid_request": "Check the interview details. The date must be in the future and every required field filled in.",
  "interview:invalid_transition": "This interview has already moved on. Reload to see where it is now.",
  "interview:not_found": "This interview isn't available any more. Reload to see the latest.",
  "invite:expired": "This invitation has expired. Send a new one.",
  "invite:conflict": "This invitation changed or is no longer pending. Reload and try again.",
  "invite:not_found": "This invitation isn't available any more. Reload to see the latest.",
  "invite:outcome_unknown": "We couldn't confirm this went through. Check Invitations before trying again.",
  "invite:duplicate": "This email address can't be used for a new invitation. If one is already pending, resend or revoke it instead.",
  "invite:existing_account": "This email address can't be used for a new invitation. If one is already pending, resend or revoke it instead.",
  "invite:invalid_request": "Check the invitation details: a valid email address and a role are needed.",
  "setup:expired": "This setup link has expired. Ask Beeliv to send a new one.",
  "setup:not_open": "This setup link has already been used.",
  "upload:expired": "The upload took too long and expired. Choose the file again.",
  "upload:invalid_request": "This file can't be used. Choose a PDF, JPG or PNG up to 5 MB.",
  "documents:unavailable": "Documents are temporarily unavailable. Refresh in a moment and try again.",
  "documents:expired": "The upload took too long and expired. Choose the file again.",
  "documents:invalid_request": "This file can't be used. Choose a PDF, JPG or PNG up to 5 MB.",
  "documents:not_found": "This document isn't available any more. Reload to see the latest.",
  "records:duplicate": "A record with these details already exists. Check for it before adding it again.",
  "records:not_found": "This record isn't available any more. Reload to see the latest.",
  "records:inactive": "This client or outlet has been deactivated, so it can't be changed this way.",
  "vacancy:closed": "This job is closed, so it can't be changed this way.",
  "vacancy:not_found": "This job isn't available any more. Reload to see the latest.",
  "enrollment:not_saved": "Your changes weren't saved. Check the details and try again.",
  "enrollment:conflict": "That clashed with an earlier change. Reload the page and try again.",
};

/** A known, code-free explanation for `code`, optionally tuned for `context`. Always returns a sentence. */
export function explainError(code: string, context?: string): string {
  const key = typeof code === "string" ? code.trim().toLowerCase() : "";
  if (context) {
    const tuned = IN_CONTEXT[`${context}:${key}`];
    if (tuned) return tuned;
  }
  return Object.hasOwn(MESSAGES, key) ? MESSAGES[key] : FALLBACK_MESSAGE;
}

/** True when we have a sentence for this code (useful for tests and for callers choosing a fallback). */
export function isKnownErrorCode(code: string): boolean {
  return Object.hasOwn(MESSAGES, code);
}

/** Every code with a sentence (for tests). */
export function knownErrorCodes(): string[] {
  return Object.keys(MESSAGES);
}
/** Every context-tuned key `${context}:${code}` (for tests). */
export function contextErrorKeys(): string[] {
  return Object.keys(IN_CONTEXT);
}

/** Reads the code from any reply shape we send: {reason}, {code} or {error:{code}}. Empty when none. */
export function replyCode(reply: unknown): string {
  if (!reply || typeof reply !== "object") return "";
  const r = reply as Record<string, unknown>;
  const nested = r.error && typeof r.error === "object" ? (r.error as Record<string, unknown>).code : undefined;
  for (const v of [r.reason, r.code, nested]) if (typeof v === "string" && /^[a-z_]{2,40}$/.test(v)) return v;
  return "";
}

/** An Error whose message is one of ours and safe to show as-is. `code` is for logic only, never for display. */
export class ExplainedError extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? explainError(code));
    this.name = "ExplainedError";
    this.code = code;
  }
}

/** Builds the Error a live adapter throws for a failed reply. `overrides` (code -> sentence) win over the shared map. */
export function errorFromReply(reply: unknown, context?: string, overrides?: Record<string, string>): ExplainedError {
  const code = replyCode(reply) || "unavailable";
  return new ExplainedError(code, overrides?.[code] ?? explainError(code, context));
}

/** The Error to throw when fetch() itself threw (offline, DNS, CORS, abort by timeout). */
export function networkError(): ExplainedError {
  return new ExplainedError("network", NETWORK_MESSAGE);
}

/* Messages that look technical are never shown: browser/JS errors, snake_case codes, stack-ish text, raw HTTP. */
const TECHNICAL = /(^[a-z0-9_]+$)|failed to fetch|networkerror|load failed|fetch|json|undefined|null|nan\b|unexpected token|is not a function|cannot read|stack|exception|\bat\s+\S+\s*\(|https?:\/\/|\b(status|http)\s*[45]\d\d\b|\b[0-9a-f]{8}-[0-9a-f]{4}-/i;

/** Load failures worth naming on a "We couldn't load ..." panel. Anything else keeps the panel's approved text. */
const LOAD_REASONS: Record<string, string> = {
  unauthenticated: "Your session has ended. Sign in again.",
  session_ended: "Your session has ended. Sign in again.",
  no_access: "You don't have access to this. If you think you should, ask the Head of Operations.",
  forbidden: "You don't have access to this. If you think you should, ask the Head of Operations.",
  mfa_required: "Confirm it's you with your authenticator code, then try again.",
  rate_limited: "Too many attempts in a short time. Wait a minute and try again.",
  switched_off: "This part of Beeliv isn't switched on yet.",
  network: NETWORK_MESSAGE,
  offline: NETWORK_MESSAGE,
};
/** Errors that mean "this part is not connected yet" (thrown by adapters for screens the backend doesn't serve). */
const NOT_CONNECTED = /NotConnectedError$/;

/**
 * A specific reason for a failed LOAD, or null when the cause is not known well enough to say more than the
 * panel already does. Never a server sentence: only codes and our own error types are read.
 */
export function loadFailureReason(error: unknown): string | null {
  if (error instanceof Error && NOT_CONNECTED.test(error.name)) return LOAD_REASONS.switched_off;
  if (error instanceof Error && error.name === "TypeError" && /fetch|network|load failed/i.test(error.message)) return NETWORK_MESSAGE;
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) return NETWORK_MESSAGE;
  const tagged = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
  const code = typeof tagged === "string" ? tagged : error instanceof Error ? error.message.trim() : "";
  if (Object.hasOwn(LOAD_REASONS, code)) return LOAD_REASONS[code];
  if (error instanceof Error && error.message === NETWORK_MESSAGE) return NETWORK_MESSAGE;
  return null;
}

/**
 * Like `errorMessage`, but also understands adapters that throw `new Error("<code>")` (the code as the message):
 * a known code is explained (tuned for `context`) instead of falling back.
 */
export function explainCaught(error: unknown, fallback: string = FALLBACK_MESSAGE, context?: string): string {
  if (error instanceof ExplainedError) return error.message;
  const code = error instanceof Error ? error.message.trim() : "";
  if (/^[a-z_]{2,40}$/.test(code) && Object.hasOwn(MESSAGES, code)) return explainError(code, context);
  const tagged = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
  const human = errorMessage(error, "");
  if (human) return human;
  if (typeof tagged === "string" && Object.hasOwn(MESSAGES, tagged)) return explainError(tagged, context);
  return fallback;
}

/**
 * The sentence a screen should show for a caught error.
 * Shows the Error's own message when it is one we wrote (ExplainedError, or a plain Error with a human sentence);
 * otherwise `fallback`. A TypeError from fetch becomes the network sentence.
 */
export function errorMessage(error: unknown, fallback: string = FALLBACK_MESSAGE): string {
  if (error instanceof ExplainedError) return error.message;
  if (!(error instanceof Error)) return fallback;
  if (error.name === "TypeError" && /fetch|network|load failed/i.test(error.message)) return NETWORK_MESSAGE;
  if (error.name === "AbortError" || error.name === "TimeoutError") return NETWORK_MESSAGE;
  if (error.name !== "Error" && !/Error$/.test(error.name)) return fallback;
  if (["TypeError", "SyntaxError", "RangeError", "ReferenceError"].includes(error.name)) return fallback;
  // Library errors (Supabase auth / database / storage, DOM) carry text we did not write.
  if (/^(Auth|Postgrest|Storage|Functions|Realtime|Http|Fetch|DOM)/.test(error.name)) return fallback;
  const m = (error.message ?? "").trim();
  if (m.length < 8 || m.length > 240 || TECHNICAL.test(m) || !/[a-z]/.test(m) || !/\s/.test(m)) return fallback;
  return m;
}
