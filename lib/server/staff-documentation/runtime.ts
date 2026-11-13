import "server-only";
import { createHmac } from "node:crypto";
import { requestDocumentScan } from "../scan-dispatch";
import { authConfig } from "../auth/config";
import { adminClient, sessionClient } from "../auth/session";
import { limitAuth, RateFailure } from "../auth/rate";
import { staffDocEnabled, staffDocStorageEnabled, staffDocWritesEnabled } from "./flags";
import { staffDocGateway } from "./gateway";
import type { StaffDocDependencies, StaffDocStoragePort } from "./types";
import { staffDocumentStorage } from "../private-documents/staff-storage";

/**
 * Inert unless every STAFF_DOCUMENTATION_* readiness flag (flags.ts) is exactly "true". All are ABSENT today.
 * The SQL (docs/contracts/staff-documentation-schema.sql) is an unapplied proposal and depends on the Codex private-documents Staff
 * extension; neither is installed. Own actions use the Talent session, HR actions the Admin session; each route selects one.
 */
const off = async (): Promise<never> => { throw new Error("unavailable"); };
const offStorage: StaffDocStoragePort = { signUpload: off, signRead: off };

function disabled(): { deps: StaffDocDependencies; origin: string } {
  const gateway = staffDocGateway({ rpc: off });
  return {
    origin: "",
    deps: {
      enabled: false, writesEnabled: false, storageEnabled: false, verifyStaff: off, verifyAdmin: off, verifyClient: off, consumeLimit: off,
      fingerprint: () => { throw new Error("unavailable"); }, now: () => new Date(), storageOrigin: "", gateway, storage: offStorage,
    },
  };
}

export function staffDocumentationRuntime(app: "talent" | "admin"): { deps: StaffDocDependencies; origin: string } {
  if (!staffDocEnabled()) return disabled();
  const config = authConfig(app);
  const server = adminClient(app);
  const gateway = staffDocGateway({ rpc: async (name, args) => {
    const reply = await server.rpc(name, args);
    if (name === "staff_doc_complete" && !reply.error && reply.data?.ok === true && reply.data.replayed !== true) {
      // Queue already committed: a failed dispatch must not change the upload result.
      await requestDocumentScan().catch(() => false);
    }
    return reply;
  } });
  const storage = staffDocumentStorage({
    upload: (bucket, key, options) => server.storage.from(bucket).createSignedUploadUrl(key, options),
    read: (bucket, key, seconds) => server.storage.from(bucket).createSignedUrl(key, seconds),
  }, config.url);
  // Same canonical provider checks the other runtimes use: getUser + getClaims. Identity, capability and scope are re-checked in SQL.
  async function proof(session: "talent" | "admin") {
    const client = await sessionClient(session);
    const { data: identity, error: userError } = await client.auth.getUser();
    const { data: claimsData, error: claimError } = await client.auth.getClaims();
    const user = identity.user, claims = claimsData?.claims;
    if (userError || claimError || !user?.email_confirmed_at || claims?.sub !== user.id || typeof claims.session_id !== "string" || typeof claims.exp !== "number" || claims.exp <= Date.now() / 1000) return null;
    return { client, user, claims };
  }
  return {
    origin: config.origin,
    deps: {
      enabled: true,
      writesEnabled: staffDocWritesEnabled(),
      storageEnabled: staffDocStorageEnabled(),
      gateway,
      storage,
      storageOrigin: config.url,
      now: () => new Date(),
      verifyClient: off, // the Client app has its own auth and a later route
      verifyStaff: async () => {
        if (app !== "talent") return null;
        const p = await proof("talent");
        if (!p) return null;
        const { readAccess } = await import("../auth/policy");
        const { data, error } = await p.client.rpc("auth_access_context", { p_app: "talent" });
        if (error) throw new Error("unavailable");
        const access = readAccess(data, "talent");
        // A person still in setup is allowed (documents are not an activation blocker); SQL decides Staff-ness from the record.
        if (!access || access.role !== "talent" || (access.status !== "active" && access.status !== "invited")) return null;
        return { uid: p.user.id, personId: access.personId, sessionId: p.claims.session_id as string, emailVerified: true };
      },
      verifyAdmin: async () => {
        if (app !== "admin") return null;
        const p = await proof("admin");
        return p ? { uid: p.user.id, sessionId: p.claims.session_id as string, aal: String(p.claims.aal ?? ""), emailVerified: true } : null;
      },
      consumeLimit: async (uid) => {
        try { await limitAuth(app, "invite_manage_write", `staff-documentation:${uid}`); } catch (error) {
          if (error instanceof RateFailure) throw { code: "rate_limited" };
          throw new Error("unavailable");
        }
      },
      fingerprint: (operation, command) => {
        const key = process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;
        if (!key || key.length < 32) throw new Error("unavailable");
        return createHmac("sha256", key).update(`staff-documentation:${operation}:`).update(JSON.stringify(command)).digest("hex");
      },
    },
  };
}
