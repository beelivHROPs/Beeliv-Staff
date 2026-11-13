import "server-only";
import { createHash } from "node:crypto";
import { adminClient, sessionClient } from "./session";
import { bindFreshSession, discardFreshSession } from "./binding";
import { limitCaller, limitAuth } from "./rate";
import { validInviteToken } from "./policy";

export class FirstAdminFailure extends Error {
  constructor(public status = 400) { super("first_admin_unavailable"); }
}
/** Dual-possession bootstrap only. Never accepts an email, role, person id or claimed verification from the browser. */
export async function acceptFirstAdmin(input: Record<string, unknown>) {
  if (process.env.AUTH_FIRST_ADMIN_BOOTSTRAP_ENABLED !== "true") throw new FirstAdminFailure(503);
  if (Object.keys(input).some(key => !["token", "code", "password"].includes(key)) ||
      !validInviteToken(input.token) || typeof input.code !== "string" || !/^[A-Za-z0-9_-]{16}$/.test(input.code) ||
      typeof input.password !== "string" || input.password.length < 12 || input.password.length > 256) throw new FirstAdminFailure();
  await limitCaller("admin", "invite_accept_ip");
  await limitAuth("admin", "invite_accept", input.token);
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const proof = { p_token_hash: hash(input.token), p_code_hash: hash(input.code) };
  const gateway = adminClient("admin");
  const { data: verification, error: verificationError } = await gateway.rpc("auth_bootstrap_verify", proof);
  if (verificationError) throw new FirstAdminFailure(503);
  if (verification?.ok !== true || typeof verification.email !== "string" || typeof verification.alreadyClaimed !== "boolean") throw new FirstAdminFailure(403);
  const client = await sessionClient("admin", false);
  // Recovery of an uncertain creation uses the recipient's SAME password; never resets an existing user's password.
  let signed = await client.auth.signInWithPassword({ email: verification.email, password: input.password });
  if (signed.error) {
    if (signed.error.code !== "invalid_credentials" || verification.alreadyClaimed) throw new FirstAdminFailure(403);
    const created = await gateway.auth.admin.createUser({ email: verification.email, password: input.password, email_confirm: true });
    if (created.error) throw new FirstAdminFailure(503);
    signed = await client.auth.signInWithPassword({ email: verification.email, password: input.password });
  }
  if (signed.error || !signed.data.user?.email_confirmed_at || signed.data.user.email?.toLowerCase() !== verification.email.toLowerCase()) throw new FirstAdminFailure(403);
  try {
    const claimed = await gateway.rpc("auth_bootstrap_claim", { ...proof, p_auth_user_id: signed.data.user.id });
    if (claimed.error || claimed.data?.ok !== true) throw new FirstAdminFailure(403);
    const binding = await bindFreshSession(client, gateway, "admin", signed.data.user.id);
    if (binding.purpose !== "setup") throw new FirstAdminFailure(403);
    return { ok: true, destination: "/admin/setup" };
  } catch (error) { await discardFreshSession(client, "admin"); throw error; }
}
