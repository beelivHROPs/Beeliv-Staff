import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authConfig } from "./config";
import { limitAuth, limitCaller } from "./rate";
import { AuthFailure, requestedApp } from "./service";
import type { AuthApp } from "./policy";

const lifetime = 600;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function secret() {
  const key = process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;
  if (!key || key.length < 32) throw new Error("auth_unconfigured");
  return key;
}
function sign(value: string) { return createHmac("sha256", secret()).update(`password-recovery:v1:${value}`).digest("hex"); }
function marker(app: AuthApp, sub: string, session: string, until: number) {
  const value = `${app}:${sub}:${session}:${until}`;
  return `${value}:${sign(value)}`;
}
export function validateRecoveryMarker(value: string | undefined, app: AuthApp, sub: string, session: string, now = Date.now()) {
  if (!value || value.length > 300 || !uuid.test(sub) || !uuid.test(session)) return false;
  const parts = value.split(":");
  if (parts.length !== 5 || parts[0] !== app || parts[1] !== sub || parts[2] !== session || !/^[0-9]{13}$/.test(parts[3]) || !/^[a-f0-9]{64}$/.test(parts[4])) return false;
  const until = Number(parts[3]);
  return until > now && until <= now + lifetime * 1000 && timingSafeEqual(Buffer.from(parts[4], "hex"), Buffer.from(sign(parts.slice(0,4).join(":")), "hex"));
}
async function recoveryClient(app: AuthApp) {
  const config = authConfig(app), store = await cookies();
  const name = `beeliv-${app}-recovery`, proofName = `${name}-proof`;
  const options = { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/" };
  const client = createServerClient(config.url, config.key, {
    cookieOptions: { ...options, name },
    cookies: {
      // Never feed ordinary app sessions to the recovery client.
      getAll: () => store.getAll().filter(c => c.name === name || c.name.startsWith(`${name}.`) || c.name.startsWith(`${name}-`)),
      setAll: values => { for (const {name: key, value, options: supplied} of values) store.set(key, value, {...supplied,...options,domain:undefined,maxAge:value ? lifetime : 0}); },
    },
  });
  return {client, store, proofName, options, clear: () => {
    for (const c of store.getAll()) if (c.name === name || c.name.startsWith(`${name}.`) || c.name.startsWith(`${name}-`)) store.set(c.name,"",{...options,maxAge:0});
    store.set(proofName,"",{...options,maxAge:0});
  }};
}
type Recovery = Awaited<ReturnType<typeof recoveryClient>>;
async function verified(recovery: Recovery, app: AuthApp) {
  const {data,error} = await recovery.client.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims || typeof claims.sub !== "string" || typeof claims.session_id !== "string" || !validateRecoveryMarker(recovery.store.get(recovery.proofName)?.value,app,claims.sub,claims.session_id)) throw new AuthFailure("link_invalid",401);
  return claims;
}
async function factors(recovery: Recovery) {
  const {data,error} = await recovery.client.auth.mfa.listFactors();
  if (error || !data) throw new AuthFailure("unavailable",503);
  const enrolled = data.all.filter(f => f.status === "verified");
  if (enrolled.some(f => f.factor_type !== "totp")) throw new AuthFailure("unavailable",503);
  return enrolled;
}
export async function passwordRecovery(input: Record<string,unknown>) {
  const app = requestedApp(input), config = authConfig(app);
  const action = input.action;
  if (action !== "request" && action !== "check" && action !== "complete") throw new AuthFailure("invalid_request");
  if (action === "request") {
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new AuthFailure("invalid_request");
    // Reuse installed limits with a separate subject; no unreviewed quota migration.
    await limitCaller(app,"sign_in_ip");
    await limitAuth(app,"sign_in",`recovery-request:${email}`);
    const recovery = await recoveryClient(app);
    const path = app === "talent" ? "/reset-password" : `/${app}/reset-password`;
    // Provider outcome is deliberately indistinguishable for registered/unregistered addresses.
    await recovery.client.auth.resetPasswordForEmail(email,{redirectTo:config.origin+path}).catch(() => undefined);
    return {ok:true};
  }
  const recovery = await recoveryClient(app);
  if (action === "check" && input.tokenHash !== undefined) {
    if (input.type !== "recovery" || typeof input.tokenHash !== "string" || !/^[A-Za-z0-9_-]{32,256}$/.test(input.tokenHash)) throw new AuthFailure("link_invalid",400);
    await limitCaller(app,"sign_in_ip");
    await limitAuth(app,"sign_in",`recovery-token:${input.tokenHash}`);
    // Only explicit email recovery verification may create this isolated session.
    recovery.clear();
    const {data,error} = await recovery.client.auth.verifyOtp({token_hash:input.tokenHash,type:"recovery"});
    if (error || !data.user || !data.session) throw new AuthFailure(error?.code === "otp_expired" ? "link_expired" : "link_invalid",400);
    const {data: proof,error: proofError} = await recovery.client.auth.getClaims();
    const claims = proof?.claims;
    if (proofError || claims?.sub !== data.user.id || typeof claims.session_id !== "string" || !uuid.test(claims.session_id)) {
      recovery.clear(); throw new AuthFailure("link_invalid",401);
    }
    recovery.store.set(recovery.proofName,marker(app,data.user.id,claims.session_id,Date.now()+lifetime*1000),{...recovery.options,maxAge:lifetime});
  } else if (action === "check" && (input.code || input.type)) throw new AuthFailure("link_invalid",400);
  const claims = await verified(recovery,app);
  await limitAuth(app,"sign_in",`recovery-session:${claims.session_id}`);
  const enrolled = await factors(recovery);
  if (action === "check") return {ok:true,mfaRequired:enrolled.length > 0};
  const password = typeof input.password === "string" ? input.password : "";
  if (password.length < 8 || password.length > 256 || !/\d/.test(password)) throw new AuthFailure("weak_password");
  if (enrolled.length > 0 && claims.aal !== "aal2") {
    if (typeof input.mfaCode !== "string" || !/^[0-9]{6}$/.test(input.mfaCode)) throw new AuthFailure("mfa_required",400);
    const {error} = await recovery.client.auth.mfa.challengeAndVerify({factorId:enrolled[0].id,code:input.mfaCode});
    if (error) throw new AuthFailure("mfa_invalid",400);
    const {data: upgraded,error: upgradeError} = await recovery.client.auth.getClaims();
    if (upgradeError || upgraded?.claims.sub !== claims.sub || upgraded.claims.session_id !== claims.session_id || upgraded.claims.aal !== "aal2") throw new AuthFailure("unavailable",503);
  }
  const {error} = await recovery.client.auth.updateUser({password});
  if (error) throw new AuthFailure(error.code === "weak_password" || error.code === "same_password" ? "weak_password" : error.code === "insufficient_aal" ? "mfa_required" : "unavailable",400);
  // Do not auto-login or bind a recovery session to any business app.
  const result = await recovery.client.auth.signOut({scope:"global"}).catch(() => ({error:true}));
  recovery.clear();
  return {ok:true,signOutConfirmed:!result.error};
}
