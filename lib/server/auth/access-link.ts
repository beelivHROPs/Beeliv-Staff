import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { authConfig } from "./config";
import type { AuthApp } from "./policy";

/**
 * Copy-link delivery helpers. The raw token is created here, returned to the caller once,
 * and only its SHA-256 hash ever leaves this process towards the database.
 * Never log, serialise into audit/error text, or persist the raw token.
 */
export function newAccessToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url"); // 256 bits, 43 chars (matches validInviteToken)
  return { token, hash: hashAccessToken(token) };
}
export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export function appForKind(kind: string): AuthApp | null {
  return kind === "staff" ? "talent" : kind === "client" ? "client" : kind === "internal" ? "admin" : null;
}
/** Same path convention as the emailed invite link (lib/server/auth/mail/render.ts). */
export function accessLinkUrl(app: AuthApp, token: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("access_link_invalid");
  return authConfig(app).origin + (app === "talent" ? "/invite/" : "/" + app + "/invite/") + token;
}
