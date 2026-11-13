import "server-only";
import { limitAuth, rejectRpcRateLimit } from "./rate";
import { hasAccess, readAccess } from "./policy";
import { sessionClient } from "./session";
import { setupForClient, SetupFailure } from "./setup";

/** Own-session TOTP only; business access separately requires provider-verified AAL2 in SQL. */
export async function adminMfa(action: "mfa-status" | "mfa-enroll" | "mfa-verify" | "mfa-cancel-enrollment", input: Record<string, unknown>) {
  const allowed = action === "mfa-verify" ? ["portal","factorId","code"] : action === "mfa-cancel-enrollment" ? ["portal","factorId"] : ["portal"];
  if (input.portal !== "admin" || Object.keys(input).some(key => !allowed.includes(key))) throw new SetupFailure("invalid_request");
  const client = await sessionClient("admin");
  const { data: identity, error: identityError } = await client.auth.getUser();
  if (identityError || !identity.user?.email_confirmed_at) throw new SetupFailure("unauthenticated", 401);
  await limitAuth("admin", ["mfa-enroll","mfa-cancel-enrollment"].includes(action) ? "mfa_enroll" : action === "mfa-verify" ? "mfa_verify" : "setup_read", identity.user.id);
  await setupForClient(client, "admin"); // verifies active person + same-app setup/interactive binding
  if (action === "mfa-verify") {
    if (typeof input.factorId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.factorId) || typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) throw new SetupFailure("mfa_invalid");
    // A previous TOTP proof may have succeeded while session promotion failed.
    // Retry promotion from provider-verified claims without reusing the one-time code.
    let { data: claimsData, error: claimsError } = await client.auth.getClaims();
    if (claimsError || claimsData?.claims.sub !== identity.user.id) throw new SetupFailure("unavailable", 503);
    if (claimsData.claims.aal !== "aal2") {
      const { error } = await client.auth.mfa.challengeAndVerify({ factorId: input.factorId, code: input.code });
      if (error) {
        const status = typeof error.status === "number" ? error.status : 0;
        if (status === 429) throw new SetupFailure("rate_limited", 429);
        if (status >= 500 || status === 0) throw new SetupFailure("unavailable", 503);
        throw new SetupFailure("mfa_invalid");
      }
      ({ data: claimsData, error: claimsError } = await client.auth.getClaims());
      if (claimsError || claimsData?.claims.sub !== identity.user.id || claimsData.claims.aal !== "aal2") throw new SetupFailure("unavailable", 503);
    }
    const setup = await setupForClient(client, "admin");
    if (!setup.mfaVerified) throw new SetupFailure("outcome_unknown", 503);
    if (setup.state === "active") {
      // A returning Admin can be AAL2 while the same session remains setup-bound.
      // The existing SQL finish branch rechecks active access and provider AAL2.
      const { data: finish, error: finishError } = await client.rpc("auth_setup_finish", { p_app: "admin", p_revision: setup.revision });
      if (finishError) throw new SetupFailure("outcome_unknown", 503);
      rejectRpcRateLimit(finish);
      // The TOTP proof succeeded, but a required document may have published
      // before session promotion. Keep the verified session for re-acceptance.
      if (finish?.reason === "agreement_required") return { ok: true, verified: true };
      if (!finish || finish.ok !== true) throw new SetupFailure("outcome_unknown", 503);
      const { data: access, error: accessError } = await client.rpc("auth_access_context", { p_app: "admin" });
      if (accessError) throw new SetupFailure("outcome_unknown", 503);
      rejectRpcRateLimit(access);
      if (!hasAccess(readAccess(access, "admin"))) throw new SetupFailure("outcome_unknown", 503);
    }
    return { ok: true, verified: true }; // never return provider tokens/claims/session
  }
  const { data: factors, error: listError } = await client.auth.mfa.listFactors();
  if (listError) throw new SetupFailure("unavailable", 503);
  if (action === "mfa-cancel-enrollment") {
    if (typeof input.factorId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.factorId)) throw new SetupFailure("invalid_request");
    const factor = factors.all.find(candidate => candidate.id === input.factorId);
    if (!factor) return { ok: true, cancelled: true }; // repeated own cancellation; no provider mutation
    if (factor.factor_type !== "totp" || factor.status !== "unverified") throw new SetupFailure("conflict", 409);
    const { error } = await client.auth.mfa.unenroll({ factorId: factor.id });
    if (error) throw new SetupFailure("unavailable", 503);
    const { error: refreshError } = await client.auth.refreshSession();
    if (refreshError) throw new SetupFailure("unavailable", 503);
    return { ok: true, cancelled: true }; // never removes a known verified factor or relaxes AAL2
  }
  const verified = factors.totp.filter(factor => factor.status === "verified");
  if (action === "mfa-status") return { ok: true, factors: factors.all.filter(factor => factor.factor_type === "totp").map(factor => ({ id: factor.id, type: "totp" as const, status: factor.status, name: factor.friendly_name ?? "Authenticator" })) };
  if (factors.all.some(factor => factor.factor_type === "totp" && factor.status === "unverified")) throw new SetupFailure("conflict", 409); // reconcile/cancel pending enrollment explicitly
  if (verified.length > 0) throw new SetupFailure("conflict", 409); // challenge existing device, no silent replacement
  const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Beeliv Admin", issuer: "Beeliv" });
  if (error) throw new SetupFailure("unavailable", 503);
  return { ok: true, enrollment: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri } };
}
