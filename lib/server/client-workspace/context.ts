import "server-only";
import { sessionClient, adminClient } from "../auth/session";
import { readAccess, hasAccess } from "../auth/policy";
import { limitAuth } from "../auth/rate";

export type ClientWorkspace = { name: string; scopes: { clientName: string; outletName: string | null }[]; truncated: boolean };

/** Verified Client actor (provider user + claims + active client access), or throws. Shared by every Client read. */
async function verifiedClientActor() {
  if (process.env.CLIENT_WORKSPACE_SCHEMA_READY !== "true") throw new Error("client_workspace_unavailable");
  const client = await sessionClient("client", undefined, true);
  const [{ data: identity, error: identityError }, { data: proof, error: proofError }] = await Promise.all([client.auth.getUser(), client.auth.getClaims()]);
  const user = identity.user, claims = proof?.claims;
  if (identityError || proofError || !user?.email_confirmed_at || claims?.sub !== user.id || typeof claims.session_id !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(claims.session_id) || typeof claims.exp !== "number" || claims.exp <= Date.now() / 1000) throw new Error("client_workspace_unavailable");
  const access = await client.rpc("auth_access_context", { p_app: "client" });
  const context = readAccess(access.data, "client");
  if (access.error || !hasAccess(context) || context?.role !== "client") throw new Error("client_workspace_unavailable");
  await limitAuth("client", "org_read", `client-portal:${user.id}`);
  return { uid: user.id, email: user.email ?? "", sessionId: claims.session_id as string };
}

export type ClientPortalOutlet = { outletId: string; outletName: string; clientId: string; clientName: string; city: string };
export type ClientPortalMember = { placementId: string; clientId: string; clientName: string; outletId: string; outletName: string; name: string; role: string; department: string; startDate: string; status: string };
export type ClientPortalProfile = { phone: string; jobTitle: string; notifications: Record<string, boolean> };
export type ClientPortal = { fullName: string; email: string; outlets: ClientPortalOutlet[]; workforce: ClientPortalMember[]; workforceAvailable: boolean; profile: ClientPortalProfile | null };

const str = (v: unknown) => (typeof v === "string" ? v : "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The signed-in client user's OWN details, outlets and currently placed staff (data-visibility-matrix: name, role,
 * department, outlet, start date, status only). Uses client_portal_workforce when installed; before that, outlets come
 * from the installed client_workspace_context and the workforce is reported unavailable (never sample).
 */
export async function readClientPortal(): Promise<ClientPortal> {
  const actor = await verifiedClientActor();
  const server = adminClient("client");
  const ws = await server.rpc("client_workspace_context", { p_actor_uid: actor.uid, p_session_id: actor.sessionId });
  if (ws.error || ws.data?.ok !== true || typeof ws.data.fullName !== "string" || !Array.isArray(ws.data.scopes)) throw new Error("client_workspace_unavailable");
  const fullName: string = ws.data.fullName;
  // Own profile (client-portal-profile.sql); null before it is installed.
  const prof = await server.rpc("client_portal_profile", { p_actor_uid: actor.uid, p_session_id: actor.sessionId });
  const profile: ClientPortalProfile | null = !prof.error && prof.data?.ok === true ? {
    phone: str(prof.data.phone), jobTitle: str(prof.data.jobTitle),
    notifications: Object.fromEntries(Object.entries((prof.data.notifications ?? {}) as Record<string, unknown>).filter(([, v]) => typeof v === "boolean")) as Record<string, boolean>,
  } : null;
  const portal = await server.rpc("client_portal_workforce", { p_actor_uid: actor.uid, p_session_id: actor.sessionId });
  if (!portal.error && portal.data?.ok === true && Array.isArray(portal.data.outlets) && Array.isArray(portal.data.items)) {
    const outlets = (portal.data.outlets as Record<string, unknown>[]).filter((o) => UUID.test(str(o.outletId)) && UUID.test(str(o.clientId)))
      .map((o) => ({ outletId: str(o.outletId), outletName: str(o.outletName), clientId: str(o.clientId), clientName: str(o.clientName), city: str(o.city) }));
    const workforce = (portal.data.items as Record<string, unknown>[]).filter((m) => UUID.test(str(m.placementId)) && UUID.test(str(m.outletId)))
      .map((m) => ({ placementId: str(m.placementId), clientId: str(m.clientId), clientName: str(m.clientName), outletId: str(m.outletId), outletName: str(m.outletName), name: str(m.name), role: str(m.role), department: str(m.department), startDate: str(m.startDate), status: str(m.status) }));
    return { fullName: profile ? str(prof.data.fullName) || fullName : fullName, email: actor.email, outlets, workforce, workforceAvailable: true, profile };
  }
  // Not installed yet: outlets from the workspace scopes that name an outlet; whole-client scopes list none.
  const outlets = (ws.data.scopes as Record<string, unknown>[]).filter((x) => UUID.test(str(x.outletId)) && UUID.test(str(x.clientId)))
    .map((x) => ({ outletId: str(x.outletId), outletName: str(x.outletName), clientId: str(x.clientId), clientName: str(x.clientName), city: "" }));
  return { fullName, email: actor.email, outlets, workforce: [], workforceAvailable: false, profile };
}

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
  await limitAuth("client", "org_read", `client-portal:${user.id}`);
  const { data, error } = await adminClient("client").rpc("client_workspace_context", { p_actor_uid: user.id, p_session_id: claims.session_id });
  if (error || data?.ok !== true || typeof data.fullName !== "string" || !Array.isArray(data.scopes) || data.scopes.length > 100 || typeof data.truncated !== "boolean") throw new Error("client_workspace_unavailable");
  const scopes = data.scopes.map((item: { clientName?: unknown; outletName?: unknown }) => {
    if (typeof item.clientName !== "string" || !(item.outletName === null || typeof item.outletName === "string")) throw new Error("client_workspace_unavailable");
    return { clientName: item.clientName, outletName: item.outletName };
  });
  return { name: data.fullName, scopes, truncated: data.truncated };
}

/** Save the signed-in client user's OWN profile / preferences. Throws "phone_in_use" / "invalid_request" / "unavailable". */
export async function saveClientProfile(input: { fullName?: string; phone?: string; jobTitle?: string; notifications?: Record<string, boolean> }) {
  const actor = await verifiedClientActor();
  const { data, error } = await adminClient("client").rpc("client_portal_profile_save", {
    p_actor_uid: actor.uid, p_session_id: actor.sessionId, p_full_name: input.fullName ?? null, p_phone: input.phone ?? null,
    p_job_title: input.jobTitle ?? null, p_notifications: input.notifications ?? null,
  });
  if (error) throw new Error("unavailable");
  if (data?.ok !== true) throw new Error(typeof data?.reason === "string" ? data.reason : "unavailable");
}
