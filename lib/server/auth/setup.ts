import "server-only";
import type { AuthApp } from "./policy";
import { parseSetup, type SetupSummary } from "@/lib/auth/setup-wire";
import { normaliseAccountPhone } from "@/lib/auth/identity";
import { limitAuth, rejectRpcRateLimit } from "./rate";
import { sessionClient } from "./session";

export class SetupFailure extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
function exact(input: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new SetupFailure("invalid_request");
}
function revision(input: Record<string, unknown>): number {
  if (!Number.isSafeInteger(input.expectedRevision) || Number(input.expectedRevision) < 1) throw new SetupFailure("invalid_request");
  return Number(input.expectedRevision);
}
async function caller(app: AuthApp, write = false) {
  const client = await sessionClient(app);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.email_confirmed_at) throw new SetupFailure("unauthenticated", 401);
  await limitAuth(app, write ? "setup_write" : "setup_read", data.user.id);
  return client;
}
export async function setupForClient(client: Awaited<ReturnType<typeof sessionClient>>, app: AuthApp): Promise<SetupSummary> {
  const { data, error } = await client.rpc("auth_setup_context", { p_app: app });
  if (error) throw new SetupFailure("unavailable", 503);
  rejectRpcRateLimit(data);
  if (!data) throw new SetupFailure("no_access", 403);
  const parsed = parseSetup({ ok: true, setup: data }, app);
  if (!parsed.ok) throw new SetupFailure("unavailable", 503);
  if (parsed.setup.state === "suspended") throw new SetupFailure("suspended", 403);
  return parsed.setup;
}
export async function getSetup(app: AuthApp) { return { ok: true as const, setup: await setupForClient(await caller(app), app) }; }
export async function updateSetup(app: AuthApp, action: "setup-profile" | "setup-agreement" | "setup-finish", input: Record<string, unknown>) {
  const client = await caller(app, true);
  let method: string; let args: Record<string, unknown>;
  if (action === "setup-profile") {
    exact(input, ["portal","expectedRevision","fullName","phone"]);
    const name = typeof input.fullName === "string" ? input.fullName.trim() : "";
    const phone = normaliseAccountPhone(input.phone);
    if (name.length < 2 || name.length > 200 || !phone) throw new SetupFailure("validation_failed");
    method = "auth_setup_profile"; args = { p_app: app, p_revision: revision(input), p_name: name, p_phone: phone };
  } else if (action === "setup-agreement") {
    exact(input, ["portal","expectedRevision","agreementId","bodyHash","accepted"]);
    if (typeof input.agreementId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.agreementId) || typeof input.bodyHash !== "string" || !/^[a-f0-9]{64}$/.test(input.bodyHash) || typeof input.accepted !== "boolean") throw new SetupFailure("invalid_request");
    method = "auth_setup_agreement"; args = { p_app: app, p_revision: revision(input), p_agreement_id: input.agreementId, p_body_hash: input.bodyHash, p_accepted: input.accepted };
  } else {
    exact(input, ["portal","expectedRevision"]);
    method = "auth_setup_finish"; args = { p_app: app, p_revision: revision(input) };
  }
  let result = app === "admin" && action === "setup-finish"
    ? await client.rpc("auth_bootstrap_finish", { p_revision: revision(input) })
    : await client.rpc(method, args);
  // Only an explicit not_bootstrap response may fall back. Never replay an uncertain mutation.
  if (app === "admin" && action === "setup-finish" && !result.error && result.data?.ok === false && result.data.reason === "not_bootstrap") {
    result = await client.rpc(method, args);
  }
  const { data, error } = result;
  if (error) throw new SetupFailure("unavailable", 503); // outcome may have committed; reload before replay
  rejectRpcRateLimit(data);
  if (!data || data.ok !== true) {
    const reason = ["conflict","validation_failed","setup_unavailable","setup_pending","mfa_required","agreement_required","no_access"].includes(data?.reason) ? data.reason : "no_access";
    throw new SetupFailure(reason, reason === "conflict" ? 409 : reason === "setup_unavailable" ? 503 : reason === "validation_failed" ? 400 : 403);
  }
  return { ok: true as const, setup: await setupForClient(client, app) };
}
