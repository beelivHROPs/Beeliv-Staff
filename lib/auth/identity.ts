/** Canonical contact number for the reviewed uniqueness rule; not proof of ownership. */
export function normaliseAccountPhone(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const input = value.trim();
  // An explicit country code avoids guessing which country a local number belongs to.
  if (!/^\+[0-9\s().-]+$/.test(input)) return null;
  const phone = input.replace(/[\s().-]/g, "");
  return /^\+[1-9][0-9]{6,14}$/.test(phone) ? phone : null;
}
