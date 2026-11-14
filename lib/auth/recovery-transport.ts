import type { AuthResult } from "@/lib/public-site/auth";
import type { Portal } from "./types";
export async function recoveryRequest(portal: Portal, action: string, input: Record<string,unknown> = {}): Promise<{ok:true;mfaRequired?:boolean;signOutConfirmed?:boolean}|Extract<AuthResult,{ok:false}>> {
  try {
    const response=await fetch("/api/auth/recovery",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({...input,portal,action}),signal:AbortSignal.timeout(15000)});
    const body=await response.json();
    if(response.ok && body?.ok===true) return {ok:true,mfaRequired:body.mfaRequired===true,signOutConfirmed:body.signOutConfirmed!==false};
    const reason=body?.reason;
    const code=reason==="rate_limited" ? "rate-limited" : reason==="link_expired" ? "link-expired" : reason==="link_invalid" ? "link-invalid" : reason==="weak_password" ? "weak-password" : "unknown";
    const message=reason==="mfa_required" || reason==="mfa_invalid" ? "Enter the current six-digit code from your authenticator app." : code==="weak-password" ? "Use a different password with at least 8 characters and a number." : code==="rate-limited" ? "Too many attempts. Please wait before trying again." : "We could not complete this request. Please try again or request a new link.";
    return {ok:false,code,message,retryAfterSeconds:typeof body?.retryAfterSeconds==="number" ? body.retryAfterSeconds : undefined};
  } catch { return {ok:false,code:"network",message:"We could not confirm completion. Please check your connection before trying again."}; }
}
