import "server-only";
import { sessionClient, adminClient } from "../auth/session";
import { readAccess, hasAccess } from "../auth/policy";
import { limitAuth } from "../auth/rate";

export type ClientWorkspace = { name: string; scopes: { clientName: string; outletName: string | null }[]; truncated: boolean };
export async function readClientWorkspace(): Promise<ClientWorkspace> {
  if (process.env.CLIENT_WORKSPACE_SCHEMA_READY !== "true") throw new Error("client_workspace_unavailable");
  const client = await sessionClient("client", undefined, true);
  const [{ data: identity, error: identityError }, { data: proof, error: proofError }] = await Promise.all([client.auth.getUser(), client.auth.getClaims()]);
  const user = identity.user, claims = proof?.claims;
  if (identityError || proofError || !user?.email_confirmed_at || claims?.sub !== user.id || typeof claims.session_id !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(claims.session_id) || typeof claims.exp !== "number" || claims.exp <= Date.now() / 1000) throw new Error("client_workspace_unavailable");
  const access = await client.rpc("auth_access_context", { p_app: "client" });
  const context = readAccess(access.data, "client");
  if (access.error || !hasAccess(context) || context?.role !== "client") throw new Error("client_workspace_unavailable");
  await limitAuth("client", "setup_read", user.id);
  const { data, error } = await adminClient("client").rpc("client_workspace_context", { p_actor_uid: user.id, p_session_id: claims.session_id });
  if (error || data?.ok !== true || typeof data.fullName !== "string" || !Array.isArray(data.scopes) || data.scopes.length > 100 || typeof data.truncated !== "boolean") throw new Error("client_workspace_unavailable");
  const scopes = data.scopes.map((item: { clientName?: unknown; outletName?: unknown }) => {
    if (typeof item.clientName !== "string" || !(item.outletName === null || typeof item.outletName === "string")) throw new Error("client_workspace_unavailable");
    return { clientName: item.clientName, outletName: item.outletName };
  });
  return { name: data.fullName, scopes, truncated: data.truncated };
}
