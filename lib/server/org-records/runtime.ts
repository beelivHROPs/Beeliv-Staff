import "server-only";
import { createHmac } from "node:crypto";
import { authConfig } from "../auth/config";
import { adminClient, sessionClient } from "../auth/session";
import { limitAuth, RateFailure } from "../auth/rate";
import { orgRecordsGateway } from "./gateway";
import type { OrgRecordsDependencies } from "./types";

/**
 * Every flag must be exactly "true". All are ABSENT today, so no route selects live mode.
 * The SQL (docs/contracts/org-records-schema.sql) is an unapplied proposal; ORG_RECORDS_SCHEMA_READY
 * must only be set after Codex has applied and verified it in an approved environment.
 */
const READY_FLAGS = ["ORG_RECORDS_BACKEND_ENABLED", "ORG_RECORDS_SCHEMA_READY", "ORG_RECORDS_AUTH_SCHEMA_READY"] as const;

export function orgRecordsEnabled(): boolean {
  return READY_FLAGS.every((key) => process.env[key] === "true");
}

const off = async (): Promise<never> => { throw new Error("unavailable"); };
function disabledDeps(): OrgRecordsDependencies {
  const gateway = orgRecordsGateway({ rpc: off });
  return { enabled: false, writesEnabled: false, verifyAdmin: off, consumeLimit: off, fingerprint: () => { throw new Error("unavailable"); }, gateway };
}

/** Admin only: Operations, HR Manager and HR Officer all arrive through the Admin app. Client and Staff self-reads are a later slice. */
export function orgRecordsRuntime(): { deps: OrgRecordsDependencies; origin: string } {
  if (!orgRecordsEnabled()) return { deps: disabledDeps(), origin: "" };
  const { origin } = authConfig("admin");
  const server = adminClient("admin");
  const gateway = orgRecordsGateway({ rpc: async (name, args) => await server.rpc(name, args) });
  return {
    origin,
    deps: {
      enabled: true,
      writesEnabled: process.env.ORG_RECORDS_WRITES_ENABLED === "true",
      gateway,
      // Same canonical provider checks the applications runtime uses: getUser + getClaims. Capability and scope are checked in SQL.
      verifyAdmin: async () => {
        const client = await sessionClient("admin");
        const { data: identity, error: userError } = await client.auth.getUser();
        const { data: proof, error: claimError } = await client.auth.getClaims();
        const user = identity.user, claims = proof?.claims;
        if (userError || claimError || !user?.email_confirmed_at || claims?.sub !== user.id || typeof claims.session_id !== "string" || typeof claims.exp !== "number" || claims.exp <= Date.now() / 1000) return null;
        return { uid: user.id, sessionId: claims.session_id, aal: String(claims.aal ?? ""), emailVerified: true };
      },
      // Reads and writes use separate buckets. Before this split every read spent the 15-per-5-minutes write allowance.
      consumeLimit: async (uid, write) => {
        try { await limitAuth("admin", write ? "invite_manage_write" : "invite_manage_read", `org-records:${uid}`); } catch (error) {
          if (error instanceof RateFailure) throw { code: "rate_limited" };
          throw new Error("unavailable");
        }
      },
      fingerprint: (operation, command) => {
        const key = process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;
        if (!key || key.length < 32) throw new Error("unavailable");
        return createHmac("sha256", key).update(`org-records:${operation}:`).update(JSON.stringify(command)).digest("hex");
      },
    },
  };
}
