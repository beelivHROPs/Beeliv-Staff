/** Shared, safe auth errors. No provider payloads or private account fields. */
import type { ApiError } from "./types";
export const AUTH_ERROR_MESSAGES = {
  delivery_blocked: "This delivery must be checked or corrected before sending again.",
  review_required: "Review the current invitation before sending it.",
  conflict: "This information changed. Reload to check before trying again.",
  mfa_required: "Complete two-factor authentication to continue.",
  mfa_invalid: "That verification code was not accepted. Check it and try again.",
  setup_unavailable: "Account setup is not available yet. Please contact Beeliv.",
  setup_pending: "Your account is not active yet. Contact Beeliv for help with setup.",
  agreement_required: "Please review and accept the updated agreement to continue.",
  invalid_credentials: "That email or password is not right. Try again, or reset your password.",
  email_unverified: "Please confirm your email first.",
  rate_limited: "Too many tries. Please wait before trying again.",
  suspended: "This account is not active. Please contact Beeliv.",
  no_access: "You don't have access to this area.",
  unauthenticated: "Sign in to continue.",
  invitation_unavailable: "This invitation isn't available. Ask Beeliv to send you a new one.",
  weak_password: "Use at least 8 characters, including a number.",
  validation_failed: "Please check your personal details.",
  forbidden: "This request is not allowed.",
  invalid_request: "Refresh the form and try again.",
  unavailable: "We could not confirm completion. Please try again or sign in to check.",
  outcome_unknown: "We could not confirm completion. Sign in to check before trying again.",
  offline: "You're offline. Reconnect and check before trying again.",
} as const;
export type AuthFailureReason = keyof typeof AUTH_ERROR_MESSAGES;
export type AuthWireFailure = { ok: false; reason: AuthFailureReason; error: ApiError };
export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
export function authFailure(value?: unknown, fallback: AuthFailureReason = "unavailable"): AuthWireFailure {
  const body = asRecord(value); const source = asRecord(body?.error);
  const candidate = body?.reason ?? source?.code;
  const reason: AuthFailureReason = typeof candidate === "string" && Object.hasOwn(AUTH_ERROR_MESSAGES, candidate) ? candidate as AuthFailureReason : fallback;
  const error: ApiError = { code: reason, message: AUTH_ERROR_MESSAGES[reason] };
  if (typeof source?.supportRef === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(source.supportRef)) error.supportRef = source.supportRef;
  if (typeof source?.retryAfterSeconds === "number" && Number.isInteger(source.retryAfterSeconds) && source.retryAfterSeconds >= 1 && source.retryAfterSeconds <= 86400) error.retryAfterSeconds = source.retryAfterSeconds;
  return { ok: false, reason, error };
}
