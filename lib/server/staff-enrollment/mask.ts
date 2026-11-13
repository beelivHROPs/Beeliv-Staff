/**
 * Server-made masks. These are the ONLY representation of a sensitive value that is stored beside the ciphertext and the
 * only one that ever reaches a browser. Which digits stay visible is PROPOSED (design open question 3): NIN last 3,
 * account number last 4, next-of-kin phone last 3, name initials. The SQL check (staff_enroll_mask_ok) repeats these shapes.
 */
const BULLET = "•";

const tail = (digits: string, bullets: number, keep: number) => `${BULLET.repeat(bullets)} ${digits.slice(-keep)}`;

/** 11 digits -> "•••••••• 678". */
export function maskNin(nin: string): string {
  return tail(nin, 8, 3);
}
/** 10 digits -> "•••••• 1234". */
export function maskAccount(accountNumber: string): string {
  return tail(accountNumber, 6, 4);
}
/** Canonical "+2348012345678" -> "•••••••••• 678" (one bullet per hidden digit, 4 to 12). */
export function maskPhone(canonical: string): string {
  const digits = canonical.replace(/\D/g, "");
  return tail(digits, Math.min(12, Math.max(4, digits.length - 3)), 3);
}
/** "Ada Obi" -> "A••• O•••" (first letter of each word, at most six words). */
export function maskName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 6)
    .map((word) => `${Array.from(word)[0]}${BULLET.repeat(3)}`).join(" ");
}

/** Same shapes as the SQL check. Used by the projector so a malformed or over-revealing mask fails closed. */
export const MASK_SHAPES = {
  nin: /^•{8} [0-9]{3}$/,
  account: /^•{6} [0-9]{4}$/,
  phone: /^•{4,12} [0-9]{3}$/,
  name: /^[^\s•]•{3}( [^\s•]•{3}){0,5}$/u,
} as const;
