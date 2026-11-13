import "server-only";
import { isIP } from "node:net";

/**
 * Caller network address for the per-caller rate buckets (sign_in_ip, invite_preview_ip, invite_accept_ip).
 *
 * Only the explicitly configured header that the hosting edge SETS ITSELF is read. A raw
 * `x-forwarded-for` is deliberately ignored because a client can send its own value. The value must be a
 * syntactically valid IP address; anything else answers null, and a null caller simply skips the per-caller
 * bucket (the existing per-subject and global buckets still apply). The address is never stored or logged:
 * `limitCaller` in rate.ts turns it into an HMAC before it reaches any bucket.
 */
export type TrustedIpHeader = "x-vercel-forwarded-for" | "x-real-ip";
export function trustedCallerIp(read: { get(name: string): string | null }, trustedHeader?: TrustedIpHeader): string | null {
  if (trustedHeader !== "x-vercel-forwarded-for" && trustedHeader !== "x-real-ip") return null;
  for (const name of [trustedHeader]) {
    const raw = read.get(name);
    if (!raw) continue;
    const first = raw.split(",")[0]?.trim() ?? "";
    if (first.length > 0 && first.length <= 45 && isIP(first) !== 0) return first.toLowerCase();
  }
  return null;
}

/** Request-scoped read. Outside a request (tests, scripts) there is no caller and the answer is null. */
export async function currentCallerIp(): Promise<string | null> {
  try {
    const { headers } = await import("next/headers");
    // Enable only after confirming the hosting proxy overwrites this header and cannot be bypassed.
    // A header name alone is not proof of a trusted proxy. Never fall back to a second client header.
    const configured = process.env.AUTH_CALLER_IP_HEADER;
    const trustedHeader = configured === "x-vercel-forwarded-for" || configured === "x-real-ip" ? configured : undefined;
    return trustedCallerIp(await headers(), trustedHeader);
  } catch {
    return null;
  }
}
