import "server-only";
import { headers } from "next/headers";
import { authMode } from "@/lib/auth/mode";
import { sessionClient } from "./session";
import { readAccess, hasAccess } from "./policy";
import { setupForClient } from "./setup";
import { AuthFailure } from "./service";
import { rejectRpcRateLimit } from "./rate";
/** Presentation gate only. Proxy and each live data source/RLS still authorize independently. */
export async function staffSetupOnly():Promise<boolean>{
 if((await headers()).get("x-beeliv-staff-surface")==="public-auth")return false;
 if(authMode()==="preview")return false;
 const client=await sessionClient("talent",undefined,true);
 const {data,error}=await client.auth.getUser();
 if(error||!data.user?.email_confirmed_at)throw new AuthFailure("unauthenticated",401);
 const {data:raw,error:contextError}=await client.rpc("auth_access_context",{p_app:"talent"});
 if(contextError)throw new AuthFailure("unavailable",503);
 rejectRpcRateLimit(raw);
 const access=readAccess(raw,"talent");
 if(access&&access.status!=="active"&&access.status!=="invited"&&access.status!=="agreement_required")throw new AuthFailure("no_access",403);
 const setup=await setupForClient(client,"talent");
 if(setup.state==="active"){
  if(!hasAccess(access)||!access?.entitlements.includes("staff"))throw new AuthFailure("no_access",403);
  return false;
 }
 if(setup.state==="pending-setup"||setup.state==="pending-approval")return true;
 throw new AuthFailure("no_access",403);
}
