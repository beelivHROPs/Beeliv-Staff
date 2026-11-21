import "server-only";
import { createClient } from "@supabase/supabase-js";
import { authConfig } from "./config";
import { adminClient } from "./session";
import { AuthFailure } from "./service";
import { limitAuth, limitCaller } from "./rate";
import { normaliseAccountPhone } from "@/lib/auth/identity";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function enabled() {
  if (process.env.APPLICANT_SIGNUP_ENABLED !== "true" || process.env.APPLICANT_SIGNUP_SCHEMA_READY !== "true") throw new AuthFailure("unavailable", 503);
  return authConfig("talent");
}
function provider() {
  const config = enabled();
  return createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
function exact(input: Record<string, unknown>, keys: string[]) {
  if (Object.keys(input).some(key => !keys.includes(key))) throw new AuthFailure("invalid_request");
}
function email(value: unknown) {
  const result = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (result.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(result)) throw new AuthFailure("validation_failed");
  return result;
}
function providerFailure(code?: string): AuthFailure {
  return code === "weak_password" ? new AuthFailure("weak_password")
    : code === "over_email_send_rate_limit" || code === "over_request_rate_limit" ? new AuthFailure("rate_limited", 429, 300)
    : new AuthFailure("unavailable", 503);
}
async function quota(subject: string) {
  await limitCaller("talent", "sign_in_ip");
  // Separate subject namespace, using already installed, bounded rate-limit actions.
  await limitAuth("talent", "sign_in", `applicant-registration:${subject}`);
}
async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await adminClient("talent").rpc(name, args);
  if (error || !data || typeof data.ok !== "boolean") throw new AuthFailure("unavailable", 503);
  return data;
}

type VerifiedProvider = { auth: { getClaims(): Promise<{ data: { claims: unknown } | null; error: unknown }> } };
/** Called only with a provider-verified password or email-confirmation session, never browser claims. */
async function verifiedClaims(client: VerifiedProvider, userId: string) {
  const { data, error } = await client.auth.getClaims();
  const claims = data?.claims && typeof data.claims === "object" ? data.claims as Record<string, unknown> : null;
  if (error || !claims || claims.sub !== userId || !uuid.test(userId) || typeof claims.session_id !== "string" || !uuid.test(claims.session_id)) throw new AuthFailure("no_access", 403);
  return claims;
}
export async function finishApplicantRegistration(client: VerifiedProvider, userId: string) {
  const claims = await verifiedClaims(client, userId);
  return rpc("auth_applicant_registration_finish", { p_auth_user_id: userId, p_session_id: claims.session_id });
}

export async function applicantSignup(input: Record<string, unknown>) {
  const config = enabled();
  if (input.portal !== "talent") throw new AuthFailure("forbidden", 403);
  if (input.action === "request") {
    exact(input, ["action", "portal", "email", "fullName", "phone", "password", "acceptedTerms"]);
    const address = email(input.email), phone = normaliseAccountPhone(input.phone);
    const name = typeof input.fullName === "string" ? input.fullName.trim() : "";
    const password = typeof input.password === "string" ? input.password : "";
    if (!phone || name.length < 2 || name.length > 200 || /[\u0000-\u001f\u007f]/.test(name)) throw new AuthFailure("validation_failed");
    if (password.length < 8 || password.length > 256 || !/\d/.test(password)) throw new AuthFailure("weak_password");
    // Lead permits signup with unpublished legal text. Never fabricate acceptance.
    const termsRevision = process.env.APPLICANT_SIGNUP_TERMS_REVISION || null;
    if (termsRevision && input.acceptedTerms !== true) throw new AuthFailure("agreement_required", 400);
    await quota(address);
    const begin = await rpc("auth_applicant_registration_begin", { p_email: address, p_full_name: name, p_phone: phone, p_terms_revision: termsRevision });
    if (!begin.ok) {
      if (begin.reason !== "existing_account") throw new AuthFailure("unavailable", 503);
      // An expired/redacted public registration may resume only after verified
      // password + email ownership. An invited account never gains access here.
      const resumeClient = provider();
      const signed = await resumeClient.auth.signInWithPassword({ email: address, password });
      if (signed.error || !signed.data.user?.email_confirmed_at || !signed.data.session) {
        if (signed.data.session) await resumeClient.auth.signOut({ scope: "local" }).catch(() => undefined);
        throw new AuthFailure("conflict", 409);
      }
      try {
        const claims = await verifiedClaims(resumeClient, signed.data.user.id);
        const resumed = await rpc("auth_applicant_registration_resume", { p_auth_user_id: signed.data.user.id, p_session_id: claims.session_id, p_full_name: name, p_phone: phone, p_terms_revision: termsRevision });
        if (!resumed.ok) throw new AuthFailure("conflict", 409);
        return { ok: true as const, confirmed: true as const, destination: "/login" as const };
      } finally { await resumeClient.auth.signOut({ scope: "local" }).catch(() => undefined); }
    }
    const client = provider();
    // Profile/authority is stored only in the trusted intent. Metadata never grants a role.
    const { data, error } = await client.auth.signUp({ email: address, password, options: { emailRedirectTo: `${config.origin}/verify-email/success` } });
    if (error) throw providerFailure(error.code);
    if (!data.user || data.user.email_confirmed_at || data.session) {
      if (data.session) await client.auth.signOut({ scope: "local" }).catch(() => undefined);
      throw new AuthFailure("unavailable", 503); // Confirmation must remain enabled.
    }
    return { ok: true as const };
  }
  if (input.action === "resend") {
    exact(input, ["action", "portal", "email"]);
    const address = email(input.email);
    await quota(address);
    const allowed = await rpc("auth_applicant_registration_can_resend", { p_email: address });
    if (!allowed.ok) throw new AuthFailure("unavailable", 503);
    if (allowed.allowed === true) {
      const { error } = await provider().auth.resend({ type: "signup", email: address, options: { emailRedirectTo: `${config.origin}/verify-email/success` } });
      if (error) throw providerFailure(error.code);
    }
    return { ok: true as const }; // No account enumeration from resend.
  }
  if (input.action === "confirm") {
    exact(input, ["action", "portal", "tokenHash", "type"]);
    if (input.type !== "signup" || typeof input.tokenHash !== "string" || !/^[A-Za-z0-9_-]{20,512}$/.test(input.tokenHash)) throw new AuthFailure("link_invalid");
    await quota(`confirmation:${input.tokenHash}`);
    const client = provider();
    const { data, error } = await client.auth.verifyOtp({ token_hash: input.tokenHash, type: "signup" });
    if (error || !data.user?.email_confirmed_at || !data.session) throw new AuthFailure(error?.code === "otp_expired" ? "link_expired" : "link_invalid");
    try {
      const result = await finishApplicantRegistration(client, data.user.id);
      if (!result.ok) throw new AuthFailure(result.reason === "requires_profile" ? "registration_incomplete" : "no_access", 403);
      return { ok: true as const, destination: "/login" as const };
    } finally {
      // Confirmation sessions never enter app cookies or receive an app-session binding.
      await client.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
  }
  throw new AuthFailure("invalid_request");
}
