/**
 * Readiness flags for the Staff enrollment backend and the Staff activation read. No imports on purpose: this file is
 * evaluated by the live/mock mode decision and must stay cheap and testable offline. Every flag must be exactly "true".
 * All are ABSENT today, so nothing is live. Setting one is a deployment decision made only after the matching SQL has been
 * applied and verified in an approved environment (never by this repository).
 */
export const ENROLLMENT_READY_FLAGS = [
  "STAFF_ENROLLMENT_BACKEND_ENABLED", "STAFF_ENROLLMENT_SCHEMA_READY", "STAFF_ENROLLMENT_AUTH_SCHEMA_READY",
  "STAFF_ENROLLMENT_ORG_SCHEMA_READY", "STAFF_ENROLLMENT_KEYS_READY",
] as const;

/**
 * Activation read + Continue need the M8 amendment SQL (auth-staff-activation-amendment.sql, UNAPPLIED) and the org-records
 * tables it reads. They are separate from the enrollment flags on purpose: a pending Staff person has no `staff` entitlement yet.
 */
export const ACTIVATION_READY_FLAGS = [
  "STAFF_ACTIVATION_BACKEND_ENABLED", "STAFF_ACTIVATION_SCHEMA_READY", "STAFF_ENROLLMENT_AUTH_SCHEMA_READY", "STAFF_ENROLLMENT_ORG_SCHEMA_READY",
] as const;

type Env = Readonly<Record<string, string | undefined>>;
export const staffEnrollmentEnabled = (env: Env = process.env): boolean => ENROLLMENT_READY_FLAGS.every((key) => env[key] === "true");
export const staffActivationEnabled = (env: Env = process.env): boolean => ACTIVATION_READY_FLAGS.every((key) => env[key] === "true");
