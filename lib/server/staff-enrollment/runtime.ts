import "server-only";
import { createHmac } from "node:crypto";
import { authConfig } from "../auth/config";
import { adminClient, sessionClient } from "../auth/session";
import { readAccess } from "../auth/policy";
import { setupForClient, SetupFailure } from "../auth/setup";
import { limitAuth, RateFailure } from "../auth/rate";
import { createSealer, type KeyRing } from "./crypto";
import { staffEnrollmentGateway } from "./gateway";
import type { Sealer, StaffEnrollmentDependencies } from "./types";

/**
 * Every flag must be exactly "true". All are ABSENT today, so no route selects live mode and nothing below is evaluated.
 * The SQL (docs/contracts/staff-personal-details-schema.sql) is an unapplied proposal; STAFF_ENROLLMENT_SCHEMA_READY must only be
 * set after Codex has applied and verified it in an approved environment, and STAFF_ENROLLMENT_ORG_SCHEMA_READY only after
 * org-records-schema.sql is applied (the new tables hang off org_staff_records). STAFF_ENROLLMENT_KEYS_READY must only be set
 * after the encryption keys exist in the server environment and a rotation drill has been agreed (design section 2).
 */
const READY_FLAGS = [
  "STAFF_ENROLLMENT_BACKEND_ENABLED", "STAFF_ENROLLMENT_SCHEMA_READY", "STAFF_ENROLLMENT_AUTH_SCHEMA_READY",
  "STAFF_ENROLLMENT_ORG_SCHEMA_READY", "STAFF_ENROLLMENT_KEYS_READY",
] as const;

export function staffEnrollmentEnabled(): boolean {
  return READY_FLAGS.every((key) => process.env[key] === "true");
}

const off = async (): Promise<never> => { throw new Error("unavailable"); };
const offSealer: Sealer = { seal: () => { throw new Error("unavailable"); }, digest: () => { throw new Error("unavailable"); } };
/**
 * Own profile through the person's own session client and the EXISTING authenticated RPCs (auth_access_context, auth_setup_context).
 * No service role, no new SQL, no person id from the caller. The email is the verified session user's.
 */
async function readOwnProfile() {
  const client = await sessionClient("talent");
  const { data: identity, error: userError } = await client.auth.getUser();
  const user = identity.user;
  if (userError || !user?.email_confirmed_at || !user.email) return null;
  const { data, error } = await client.rpc("auth_access_context", { p_app: "talent" });
  if (error) throw new Error("unavailable");
  const access = readAccess(data, "talent");
  if (!access || (access.status !== "active" && access.status !== "invited" && access.status !== "agreement_required")) throw { code: "forbidden" };
  let setup;
  try { setup = await setupForClient(client, "talent"); } catch (e) {
    if (e instanceof SetupFailure && (e.code === "no_access" || e.code === "suspended")) throw { code: "forbidden" };
    throw new Error("unavailable");
  }
  return { uid: user.id, fullName: setup.fullName, phone: setup.phone, email: user.email, setupState: setup.state, entitlements: { applicant: access.entitlements.includes("applicant"), staff: access.entitlements.includes("staff") } };
}

function disabledDeps(): StaffEnrollmentDependencies {
  const gateway = staffEnrollmentGateway({ rpc: off });
  return { enabled: false, writesEnabled: false, verifyStaff: off, consumeLimit: off, fingerprint: () => { throw new Error("unavailable"); }, sealer: offSealer, gateway };
}

/**
 * Key ring from server-only configuration. Names only; no value is in this repo:
 *   STAFF_SENSITIVE_KEYS            JSON object { "<keyId>": "<base64 of 32 random bytes>" }  (active key plus any older key still needed)
 *   STAFF_SENSITIVE_ACTIVE_KEY_ID   which keyId seals new values
 *   STAFF_SENSITIVE_INDEX_KEY       base64 of at least 32 random bytes, a DIFFERENT secret, for the duplicate-detection digest
 *   STAFF_SENSITIVE_INDEX_KEY_ID    label stored beside each digest
 * Any problem throws "unavailable": the module fails closed and never says which setting was wrong.
 */
function keyRing(): KeyRing {
  try {
    const parsed: unknown = JSON.parse(process.env.STAFF_SENSITIVE_KEYS ?? "");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("x");
    const keys = new Map<string, Buffer>();
    for (const [id, value] of Object.entries(parsed)) keys.set(id, Buffer.from(String(value), "base64"));
    return {
      activeKeyId: process.env.STAFF_SENSITIVE_ACTIVE_KEY_ID ?? "", keys,
      indexKeyId: process.env.STAFF_SENSITIVE_INDEX_KEY_ID ?? "", indexKey: Buffer.from(process.env.STAFF_SENSITIVE_INDEX_KEY ?? "", "base64"),
    };
  } catch { throw new Error("unavailable"); }
}

/** Staff (Talent) session: Applicant-only people are refused, only an active person with the `staff` entitlement is accepted. */
export function staffEnrollmentRuntime(): { deps: StaffEnrollmentDependencies; origin: string } {
  if (!staffEnrollmentEnabled()) return { deps: disabledDeps(), origin: "" };
  const { origin } = authConfig("talent");
  const server = adminClient("talent");
  const gateway = staffEnrollmentGateway({ rpc: async (name, args) => await server.rpc(name, args) });
  let sealer: Sealer;
  try { sealer = createSealer(keyRing()); } catch { return { deps: disabledDeps(), origin: "" }; }
  return {
    origin,
    deps: {
      enabled: true,
      writesEnabled: process.env.STAFF_ENROLLMENT_WRITES_ENABLED === "true",
      gateway,
      sealer,
      readProfile: readOwnProfile,
      // Same canonical provider checks the applications runtime uses: getUser + getClaims + access context. Scope is the person's own row, checked in SQL.
      verifyStaff: async () => {
        const client = await sessionClient("talent");
        const { data: identity, error: userError } = await client.auth.getUser();
        const { data: proof, error: claimError } = await client.auth.getClaims();
        const user = identity.user, claims = proof?.claims;
        if (userError || claimError || !user?.email_confirmed_at || claims?.sub !== user.id || typeof claims.session_id !== "string" || typeof claims.exp !== "number" || claims.exp <= Date.now() / 1000) return null;
        const { data, error } = await client.rpc("auth_access_context", { p_app: "talent" });
        if (error) throw new Error("unavailable");
        const access = readAccess(data, "talent");
        if (!access || access.role !== "talent" || access.status !== "active" || !access.entitlements.includes("staff")) return null;
        return { uid: user.id, personId: access.personId, sessionId: claims.session_id, emailVerified: true };
      },
      consumeLimit: async (uid) => {
        try { await limitAuth("talent", "invite_manage_write", `staff-enrollment:${uid}`); } catch (error) {
          if (error instanceof RateFailure) throw { code: "rate_limited" };
          throw new Error("unavailable");
        }
      },
      // HMAC, because the command can contain a sensitive value. It includes the random requestId, so the stored fingerprint is not a
      // guessable digest of the value.
      fingerprint: (operation, command) => {
        const key = process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;
        if (!key || key.length < 32) throw new Error("unavailable");
        return createHmac("sha256", key).update(`staff-enrollment:${operation}:`).update(JSON.stringify(command)).digest("hex");
      },
    },
  };
}
