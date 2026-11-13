import "server-only";
import type { AuthApp } from "./policy";
import { rejectRpcRateLimit } from "./rate";

// Claims must come from the provider's verifying getClaims method, never request JSON/JWT decoding.
type VerifyingClient = { auth: { getClaims(): Promise<{ data: { claims: unknown } | null; error: unknown }> } };
type BindingGateway = { rpc(name: string, input: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function bindFreshSession(client: VerifyingClient, gateway: BindingGateway, app: AuthApp, userId: string, invitationHash?: string): Promise<{ purpose: "interactive" | "invitation" | "setup" }> {
  const { data, error } = await client.auth.getClaims();
  const claims = data?.claims && typeof data.claims === "object" ? data.claims as Record<string, unknown> : null;
  if (error || !claims || claims.sub !== userId || typeof claims.session_id !== "string" || !uuid.test(claims.session_id) || !uuid.test(userId)) throw new Error("auth_session_unverified");
  if (invitationHash !== undefined && !/^[a-f0-9]{64}$/.test(invitationHash)) throw new Error("auth_session_unverified");
  const result = await gateway.rpc("auth_bind_session", {
    p_app: app, p_session_id: claims.session_id, p_auth_user_id: userId,
    p_purpose: invitationHash ? "invitation" : "interactive", p_token_hash: invitationHash ?? null,
  });
  if (result.error || !result.data || typeof result.data !== "object" || (result.data as Record<string, unknown>).ok !== true) throw new Error("auth_session_binding_unavailable");
  const purpose = (result.data as Record<string, unknown>).purpose;
  if (purpose !== "interactive" && purpose !== "invitation" && purpose !== "setup") throw new Error("auth_session_binding_unavailable");
  if (app === "admin" && purpose === "interactive" && claims.aal !== "aal2") throw new Error("auth_session_unverified");
  return { purpose };
}

/** Only an acknowledged same-app revocation may terminate the provider session. */
export async function endBoundSession(client: BindingGateway & { auth: { signOut(input: { scope: "local" }): Promise<{ error: unknown }> } }, app: AuthApp): Promise<void> {
  const result = await client.rpc("auth_revoke_session", { p_app: app });
  if (!result.error) rejectRpcRateLimit(result.data);
  if (result.error || !result.data || typeof result.data !== "object" || (result.data as Record<string, unknown>).ok !== true) throw new Error("auth_sign_out_unconfirmed");
  const signedOut = await client.auth.signOut({ scope: "local" });
  if (signedOut.error) throw new Error("auth_sign_out_unconfirmed");
}

/** Use only immediately after THIS request created a fresh password session. */
export async function discardFreshSession(client: Parameters<typeof endBoundSession>[0], app: AuthApp): Promise<void> {
  try { await endBoundSession(client, app); }
  catch { await client.auth.signOut({ scope: "local" }).catch(() => undefined); }
}
