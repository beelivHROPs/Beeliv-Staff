/**
 * Readiness flags for Staff documentation. No imports on purpose (cheap, offline-testable). Every flag must be exactly "true".
 * All are ABSENT today, so nothing is live. Setting one is a deployment decision made only after the matching SQL (and the Codex
 * private-documents Staff extension) has been applied and verified in an approved environment, never by this repository.
 */
export const DOC_READY_FLAGS = [
  "STAFF_DOCUMENTATION_BACKEND_ENABLED", "STAFF_DOCUMENTATION_SCHEMA_READY", "STAFF_DOCUMENTATION_AUTH_SCHEMA_READY",
  "STAFF_DOCUMENTATION_ORG_SCHEMA_READY", "STAFF_DOCUMENTATION_PRIVATE_DOCUMENTS_EXTENSION_READY",
] as const;
/** Upload and open also need the Staff buckets and the scanner (Codex-owned). */
export const DOC_STORAGE_FLAGS = ["STAFF_DOCUMENTATION_STORAGE_READY", "STAFF_DOCUMENTATION_SCANNER_READY"] as const;
export const DOC_WRITES_FLAG = "STAFF_DOCUMENTATION_WRITES_ENABLED";

type Env = Readonly<Record<string, string | undefined>>;
export const staffDocEnabled = (env: Env = process.env): boolean => DOC_READY_FLAGS.every((k) => env[k] === "true");
export const staffDocStorageEnabled = (env: Env = process.env): boolean => staffDocEnabled(env) && DOC_STORAGE_FLAGS.every((k) => env[k] === "true");
export const staffDocWritesEnabled = (env: Env = process.env): boolean => staffDocEnabled(env) && env[DOC_WRITES_FLAG] === "true";
