/**
 * Short support reference shown on error screens ("Reference: ABC123").
 * Built ONLY from Next's error.digest (an opaque hash, no error data): first 8
 * characters, uppercase, letters and digits only. Returns "" when there is no
 * usable digest, so callers show nothing. Safe for undefined / non-string input.
 */
export function errorReference(digest: unknown): string {
  if (typeof digest !== "string") return "";
  return digest.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
}
