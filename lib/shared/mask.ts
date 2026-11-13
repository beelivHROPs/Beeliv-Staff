/**
 * Masks a sensitive number for display: the first few digits, then asterisks
 * ("12345678901" -> "1234*******"). The full number is never stored for this;
 * only the masked text is kept (lib/applicant/masked-ids.ts).
 *
 * MASK_KEEP is the one setting for how many leading digits stay visible. Set
 * it to 0 to show asterisks only. Which digits (if any) may be shown is part
 * of Beeliv's still-open sensitive-data decision (docs/architecture/rbac.md).
 */
export const MASK_KEEP = 4;

export function maskId(value: string, keep: number = MASK_KEEP): string {
  const digits = value.replace(/\s+/g, "");
  if (!digits) return "";
  const shown = Math.min(keep, Math.max(0, digits.length - 1));
  return `${digits.slice(0, shown)}${"*".repeat(digits.length - shown)}`;
}
