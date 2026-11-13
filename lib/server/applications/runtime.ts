import "server-only";
import { createHmac } from "node:crypto";
import { authConfig } from "../auth/config";
import { adminClient, sessionClient } from "../auth/session";
import { readAccess } from "../auth/policy";
import { limitAuth, RateFailure } from "../auth/rate";
import { applicationsGateway } from "./gateway";
import type { ApplicationsDependencies } from "./types";

/** Every flag must be exactly "true". All are ABSENT today; no route selects live mode by default. */
const READY_FLAGS = [
  "APPLICATIONS_BACKEND_ENABLED", "APPLICATIONS_SCHEMA_READY", "APPLICATIONS_PRIVATE_DOCUMENTS_READY",
  "APPLICATIONS_DOCUMENT_RULE_VERIFIED", "VACANCIES_SCHEMA_READY",
] as const;

export function applicationsEnabled(): boolean {
  return READY_FLAGS.every((key) => process.env[key] === "true");
}

const off = async (): Promise<never> => { throw new Error("unavailable"); };
function disabledDeps(): ApplicationsDependencies {
  const gateway = applicationsGateway({ rpc: off });
  return { enabled: false, adminReadsEnabled: false, verifyApplicant: off, verifyAdmin: off, consumeLimit: off, fingerprint: () => { throw new Error("unavailable"); }, gateway };
}

/** `app` selects which origin the same-origin check uses: Talent for Applicant routes, Admin for Admin routes. */
export function applicationsRuntime(app: "talent" | "admin"): { deps: ApplicationsDependencies; origin: string } {
  if (!applicationsEnabled()) return { deps: disabledDeps(), origin: "" };
  const { origin } = authConfig(app);
  const server = adminClient(app);
  const gateway = applicationsGateway({ rpc: async (name, args) => await server.rpc(name, args) });

  // Same canonical provider checks Codex's private-documents runtime uses: getUser + getClaims + access context.
  const claimsOf = async (target: "talent" | "admin") => {
    const client = await sessionClient(target);
    const { data: identity, error: userError } = await client.auth.getUser();
    const { data: proof, error: claimError } = await client.auth.getClaims();
    const user = identity.user, claims = proof?.claims;
    if (userError || claimError || !user?.email_confirmed_at || claims?.sub !== user.id || typeof claims.session_id !== "string" || typeof claims.exp !== "number" || claims.exp <= Date.now() / 1000) return null;
    return { client, user, claims };
  };
  return {
    origin,
    deps: {
      enabled: true,
      adminReadsEnabled: process.env.APPLICATIONS_ADMIN_READS_ENABLED === "true",
      gateway,
      verifyApplicant: async () => {
        const base = await claimsOf("talent");
        if (!base) return null;
        const { data, error } = await base.client.rpc("auth_access_context", { p_app: "talent" });
        if (error) throw new Error("unavailable");
        const access = readAccess(data, "talent");
        if (!access || access.role !== "talent") return null;
        return { uid: base.user.id, personId: access.personId, sessionId: base.claims.session_id as string, emailVerified: true, app: access.app, status: access.status, entitlements: access.entitlements };
      },
      verifyAdmin: async () => {
        const base = await claimsOf("admin");
        return base ? { uid: base.user.id, sessionId: base.claims.session_id as string, aal: String(base.claims.aal ?? ""), emailVerified: true } : null;
      },
      consumeLimit: async (uid) => {
        try { await limitAuth(app, "invite_manage_write", `applications:${uid}`); } catch (error) {
          if (error instanceof RateFailure) throw { code: "rate_limited" };
          throw new Error("unavailable");
        }
      },
      fingerprint: (operation, command) => {
        const key = process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;
        if (!key || key.length < 32) throw new Error("unavailable");
        return createHmac("sha256", key).update(`application:${operation}:`).update(JSON.stringify(command)).digest("hex");
      },
    },
  };
}
