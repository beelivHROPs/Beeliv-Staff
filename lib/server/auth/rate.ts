import "server-only";
import { createHmac } from "node:crypto";
import { adminClient } from "./session";
import { currentCallerIp } from "./caller";
import type { AuthApp } from "./policy";
export class RateFailure extends Error {
  constructor(public retryAfterSeconds: number) { super("rate_limited"); }
}
/** Interpret the database's independent quota, including direct Data API calls. */
export function rejectRpcRateLimit(value: unknown): void {
  if (!value || typeof value !== "object") return;
  const result = value as Record<string, unknown>;
  if (result.ok !== false || result.reason !== "rate_limited") return;
  const retry = typeof result.retryAfterSeconds === "number" && Number.isFinite(result.retryAfterSeconds)
    ? Math.max(1, Math.min(300, Math.ceil(result.retryAfterSeconds))) : 300;
  throw new RateFailure(retry);
}
/** Per-caller buckets and the copy-link bucket need M7 (auth-m7-seeds-and-rate-limits.sql). Off until the lead sets it. */
export function rateBucketsV2Enabled(): boolean { return process.env.AUTH_RATE_BUCKETS_V2 === "true"; }
/**
 * Consume the per-caller bucket (HMAC of the trusted caller IP). Inert unless AUTH_RATE_BUCKETS_V2=true, and a
 * request with no trusted IP header skips it. Call it BEFORE the per-subject bucket, and only after the input
 * has been shape-checked, so malformed requests never create bucket rows.
 */
export async function limitCaller(app: AuthApp, action: "sign_in_ip" | "invite_preview_ip" | "invite_accept_ip") {
  if (!rateBucketsV2Enabled()) return;
  const ip = await currentCallerIp();
  if (!ip) return;
  const secret = process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new Error("auth_unconfigured");
  await limitAuth(app, action, `ip:${createHmac("sha256", secret).update(ip).digest("hex")}`);
}
export async function limitAuth(app: AuthApp, action: string, subject: string) {
  const secret = process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new Error("auth_unconfigured");
  const bucket = createHmac("sha256", secret).update(`${app}:${subject}`).digest("hex");
  const { data, error } = await adminClient(app).rpc("auth_consume_limit", { p_action: action, p_bucket_hash: bucket });
  if (error || !data || typeof data.ok !== "boolean") throw new Error("auth_unavailable");
  if (!data.ok) throw new RateFailure(typeof data.retryAfterSeconds === "number" ? data.retryAfterSeconds : 300);
}
