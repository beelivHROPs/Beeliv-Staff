import "server-only";
import { normaliseAccountPhone } from "@/lib/auth/identity";
import type { InvitationPreview, InvitationAcceptResult, InvitationKind } from "@/lib/auth/invitation-wire";
import { createHash } from "node:crypto";
import { adminClient, sessionClient } from "./session";
import { bindFreshSession, endBoundSession, discardFreshSession } from "./binding";
import { limitAuth as limit, limitCaller, rejectRpcRateLimit } from "./rate";
import { setupForClient } from "./setup";
import { authConfig } from "./config";
import { appForPortal, destinationFor, hasAccess, maskEmail, readAccess, validInviteToken, type AuthApp, type AccessContext } from "./policy";

export class AuthFailure extends Error {
  constructor(public code: string, public status = 400, public retryAfterSeconds?: number) { super(code); }
}
function credentials(input: Record<string, unknown>) {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !password || password.length > 256) throw new AuthFailure("invalid_credentials", 400);
  return { email, password };
}
export function requestedApp(input: Record<string, unknown>): AuthApp {
  const app = appForPortal(input.portal); if (!app) throw new AuthFailure("invalid_request"); return app;
}
async function audit(app: AuthApp, event: string, actor: string | null = null) {
  const { error } = await adminClient(app).rpc("auth_note_event", { p_event: event, p_actor_auth_user_id: actor, p_app: app });
  if (error) throw new Error("auth_audit_unavailable");
}
async function currentAccess(client: Awaited<ReturnType<typeof sessionClient>>, app: AuthApp): Promise<AccessContext | null> {
  const { data, error } = await client.rpc("auth_access_context", { p_app: app });
  if (error) throw new Error("auth_unavailable");
  rejectRpcRateLimit(data);
  return readAccess(data, app);
}
function providerError(code?: string) {
  if (code === "email_not_confirmed") return new AuthFailure("email_unverified", 403);
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") return new AuthFailure("rate_limited", 429, 300);
  if (code === "invalid_credentials") return new AuthFailure("invalid_credentials", 401);
  return new AuthFailure("unavailable", 503);
}
export async function signIn(input: Record<string, unknown>) {
  const app = requestedApp(input); const c = credentials(input);
  await limitCaller(app, "sign_in_ip");
  await limit(app, "sign_in", c.email);
  const client = await sessionClient(app, input.remember === true);
  const { data, error } = await client.auth.signInWithPassword(c);
  if (error) { await audit(app, "sign_in_failed"); throw providerError(error.code); }
  try {
    if (!data.user?.email_confirmed_at) throw new AuthFailure("email_unverified", 403);
    const binding = await bindFreshSession(client, adminClient(app), app, data.user.id);
    if (binding.purpose === "setup") {
      await setupForClient(client, app);
      await audit(app, "sign_in", data.user.id);
      return { ok: true, destination: app === "admin" ? "/admin/setup" : app === "client" ? "/client/setup" : "/staff" };
    }
    const access = await currentAccess(client, app);
    if (access?.status === "agreement_required") {
      await setupForClient(client, app);
      await audit(app, "sign_in", data.user.id);
      return { ok: true, destination: app === "admin" ? "/admin/setup" : app === "client" ? "/client/setup" : "/staff" };
    }
    if (access && access.status !== "active") throw new AuthFailure("suspended", 403);
    if (!hasAccess(access)) throw new AuthFailure("no_access", 403);
    await audit(app, "sign_in", data.user.id);
    return { ok: true, destination: destinationFor(access!, input.next) };
  } catch (error) { await discardFreshSession(client, app); throw error; }
}
export async function signOut(app: AuthApp) {
  const client = await sessionClient(app);
  const { data } = await client.auth.getUser();
  await endBoundSession(client, app);
  await audit(app, "sign_out", data.user?.id ?? null);
  return { ok: true };
}
export async function getSession(app: AuthApp) {
  const client = await sessionClient(app);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at) throw new AuthFailure("unauthenticated", 401);
  const access = await currentAccess(client, app);
  if (!hasAccess(access)) throw new AuthFailure(access?.status === "agreement_required" ? "agreement_required" : access && access.status !== "active" ? "suspended" : "no_access", 403);
  return { ok: true, access };
}
async function invitationRecord(app: AuthApp, token: unknown, forAcceptance = false) {
  if (!validInviteToken(token)) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await adminClient(app).rpc(forAcceptance ? "auth_inspect_acceptance" : "auth_inspect_invitation", { p_token_hash: hash, p_app: app });
  if (error) throw new Error("auth_unavailable");
  if (!data || typeof data.email !== "string" || typeof data.existingAccount !== "boolean") return null;
  const kind: InvitationKind = app === "client" ? "client" : app === "admin" ? "internal" : "staff";
  if (data.kind !== kind) return null;
  return { email: data.email, kind, existingAccount: data.existingAccount, hash };
}
export async function previewInvitation(app: AuthApp, token: unknown): Promise<InvitationPreview> {
  // A malformed token is refused before ANY bucket is touched, so garbage tokens cannot create rows.
  if (!validInviteToken(token)) return { state: "unavailable" as const };
  await limitCaller(app, "invite_preview_ip");
  await limit(app, "invite_preview", token);
  const record = await invitationRecord(app, token);
  if (!record) return { state: "unavailable" as const };
  return { state: record.existingAccount ? "valid-existing-account" as const : "valid-new-account" as const, kind: record.kind, emailMasked: maskEmail(record.email) };
}
export async function acceptInvitation(input: Record<string, unknown>): Promise<Extract<InvitationAcceptResult, { ok: true }>> {
  const app = requestedApp(input); const token = input.token;
  if (!validInviteToken(token)) throw new AuthFailure("invitation_unavailable", 404);
  await limitCaller(app, "invite_accept_ip");
  await limit(app, "invite_accept", token);
  const record = await invitationRecord(app, token, true);
  if (!record) throw new AuthFailure("invitation_unavailable", 404);
  const password = typeof input.password === "string" ? input.password : "";
  if (!password || password.length > 256) throw new AuthFailure("invalid_credentials");
  const client = await sessionClient(app);
  if (record.existingAccount) {
    const c = credentials(input);
    if (c.email !== record.email.toLowerCase()) throw new AuthFailure("invalid_credentials", 401);
  } else {
    if (password.length < 8 || !/\d/.test(password)) throw new AuthFailure("weak_password");
    const profile = input.profile && typeof input.profile === "object" ? input.profile as Record<string, unknown> : {};
    const name = typeof profile.fullName === "string" ? profile.fullName.trim() : "";
    const phone = normaliseAccountPhone(profile.phone);
    if (name.length < 2 || name.length > 200 || !phone) throw new AuthFailure("validation_failed");
    // Email possession is proven by the high-entropy, emailed business token. Never set/reset an existing user's password.
    const { error } = await adminClient(app).auth.admin.createUser({ email: record.email, password, email_confirm: true, user_metadata: { full_name: name, phone } });
    if (error) throw providerError(error.code);
  }
  const { data, error } = await client.auth.signInWithPassword({ email: record.email, password });
  if (error || !data.user?.email_confirmed_at) throw new AuthFailure("invalid_credentials", 401);
  try {
    await bindFreshSession(client, adminClient(app), app, data.user.id, record.hash);
    const { error: acceptError, data: accepted } = await client.rpc("auth_accept_invitation", { p_token_hash: record.hash });
    if (acceptError) throw new Error("auth_acceptance_unconfirmed");
    rejectRpcRateLimit(accepted);
    if (!accepted || accepted.ok !== true) throw new AuthFailure("invitation_unavailable", 404);
    const accessState = ["pending-setup","pending-approval","active"].includes(accepted.accessState) ? accepted.accessState : null;
    if (!accessState) throw new Error("auth_acceptance_unconfirmed");
    if (accessState !== "active") {
      await setupForClient(client, app);
      return { ok: true, status: "completed", kind: record.kind, accessState, destination: app === "admin" ? "/admin/setup" : app === "client" ? "/client/setup" : "/staff" };
    }
    const access = await currentAccess(client, app);
    if (access?.status === "agreement_required" || record.kind === "staff" && access?.status === "active" && !access.entitlements.includes("staff")) {
      const setup = await setupForClient(client, app);
      if (setup.state !== "pending-setup") throw new AuthFailure("no_access", 403);
      return { ok: true, status: "completed", kind: record.kind, accessState: "active", destination: app === "admin" ? "/admin/setup" : app === "client" ? "/client/setup" : "/staff" };
    }
    if (!hasAccess(access)) throw new AuthFailure("no_access", 403);
    return { ok: true, status: "completed", kind: record.kind, accessState: "active", destination: record.kind === "client" ? "/client" : destinationFor(access!, record.kind === "staff" ? "/staff" : undefined) };
  } catch (error) {
    await discardFreshSession(client, app);
    await audit(app, "invite_accept_failed", data.user.id).catch(() => undefined);
    throw error;
  }
}
/** Observe a committed acceptance after a lost response; used-link preview remains unavailable. */
export async function reconcileInvitation(input: Record<string, unknown>): Promise<Extract<InvitationAcceptResult, { ok: true }>> {
  const app = requestedApp(input);
  if (!validInviteToken(input.token)) throw new AuthFailure("invitation_unavailable", 404);
  await limit(app, "invite_accept", input.token);
  const client = await sessionClient(app);
  const { data: identity, error: identityError } = await client.auth.getUser();
  if (identityError || !identity.user?.email_confirmed_at) throw new AuthFailure("unauthenticated", 401);
  const hash = createHash("sha256").update(input.token).digest("hex");
  const { data, error } = await client.rpc("auth_reconcile_invitation", { p_token_hash: hash, p_app: app });
  if (error) throw new Error("auth_acceptance_unconfirmed");
  rejectRpcRateLimit(data);
  const kind: InvitationKind = app === "client" ? "client" : app === "admin" ? "internal" : "staff";
  if (!data || data.ok !== true || data.kind !== kind) throw new AuthFailure("invitation_unavailable", 404);
  if (!["pending-setup","pending-approval","active"].includes(data.accessState)) throw new Error("auth_acceptance_unconfirmed");
  if (data.accessState !== "active") {
    await setupForClient(client, app);
    return { ok: true, status: "completed", kind, accessState: data.accessState, destination: app === "admin" ? "/admin/setup" : app === "client" ? "/client/setup" : "/staff" };
  }
  const access = await currentAccess(client, app);
  if (access?.status === "agreement_required" || kind === "staff" && access?.status === "active" && !access.entitlements.includes("staff")) {
    const setup = await setupForClient(client, app);
    if (setup.state !== "pending-setup") throw new AuthFailure("no_access", 403);
    return { ok: true, status: "completed", kind, accessState: "active", destination: app === "admin" ? "/admin/setup" : app === "client" ? "/client/setup" : "/staff" };
  }
  if (!hasAccess(access)) throw new AuthFailure("no_access", 403);
  return { ok: true, status: "completed", kind, accessState: "active", destination: kind === "client" ? "/client" : destinationFor(access!, kind === "staff" ? "/staff" : undefined) };
}

export function enforceOrigin(request: Request, app: AuthApp) {
  const { origin } = authConfig(app);
  if (request.headers.get("origin") !== origin || new URL(request.url).origin !== origin || request.headers.get("sec-fetch-site") === "cross-site") throw new AuthFailure("forbidden", 403);
}
