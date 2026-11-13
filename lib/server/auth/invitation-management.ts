import "server-only";
import { requestMailSend } from "@/lib/server/scan-dispatch";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { sessionClient, adminClient } from "./session";
import { readAccess, hasAccess, canGrantInvitation } from "./policy";
import { AuthFailure } from "./service";
import { limitAuth, rateBucketsV2Enabled, rejectRpcRateLimit } from "./rate";
import { parseManagedInvitation, parseInvitationList, INVITATION_LIST_STATUSES, LIST_TIMESTAMP, type InvitationDraftInput, type InvitationListInput } from "@/lib/auth/invitation-management-wire";
import { sealPayload } from "./mail/crypto";
import { workerConfig } from "./mail/config";
import { renderInvitation } from "./mail/render";
import { record, uuid, type Template } from "./mail/model";
import { retrieveResendStatus } from "./mail/provider";
import { mailGateway } from "./mail/gateway";
import { accessLinkUrl, appForKind, newAccessToken } from "./access-link";
export type ManagementAction="invite-create-draft"|"invite-edit-draft"|"invite-review"|"invite-send"|"invite-resend"|"invite-revoke"|"invite-replace"|"invite-status"|"invite-copy-link";
const draftKeys=["kind","email","role","personId","scopes","allClients","jobTitle"];
export function parseManagementInput(action:ManagementAction,input:Record<string,unknown>) {
 const create=action==="invite-create-draft";const draft=create||action==="invite-edit-draft";const status=action==="invite-status";
 const allowed=["portal",...(!create?["invitationId"]:[]),...(!status?["requestId"]:[]),...(!status&&!create?["expectedRevision"]:[]),...(draft?draftKeys:[])];
 if(input.portal!=="admin"||Object.keys(input).some(k=>!allowed.includes(k))||(!create&&(typeof input.invitationId!=="string"||!uuid.test(input.invitationId)))||(!status&&(typeof input.requestId!=="string"||!uuid.test(input.requestId)))||(!status&&!create&&(!Number.isSafeInteger(input.expectedRevision)||Number(input.expectedRevision)<1)))throw new AuthFailure("invalid_request");
 let spec:InvitationDraftInput|null=null;
 if(draft){
  const email=typeof input.email==="string"?input.email.trim().toLowerCase():"";
  if(!["client","staff","internal"].includes(String(input.kind))||email.length>254||!/^[^\s@<>,"\\]+@[^\s@<>,"\\]+\.[^\s@<>,"\\]{2,}$/.test(email)||!["client","talent","hr_officer","hr_manager"].includes(String(input.role))||!(input.personId===null||typeof input.personId==="string"&&uuid.test(input.personId))||typeof input.allClients!=="boolean"||!Array.isArray(input.scopes)||input.scopes.length>100||!(input.jobTitle===undefined||typeof input.jobTitle==="string"&&input.jobTitle.length<=60&&!/[\u0000-\u001f]/.test(input.jobTitle)))throw new AuthFailure("invalid_request");
  const scopes=input.scopes.map(raw=>{const s=record(raw);if(!s||Object.keys(s).some(k=>!["clientId","outletId"].includes(k))||typeof s.clientId!=="string"||!uuid.test(s.clientId)||!(s.outletId===null||typeof s.outletId==="string"&&uuid.test(s.outletId)))throw new AuthFailure("invalid_request");return{clientId:s.clientId.toLowerCase(),outletId:typeof s.outletId==="string"?s.outletId.toLowerCase():null};}).sort((a,b)=>(a.clientId+":"+a.outletId).localeCompare(b.clientId+":"+b.outletId));
  if(new Set(scopes.map(s=>s.clientId+":"+s.outletId)).size!==scopes.length)throw new AuthFailure("invalid_request");
  if(input.kind==="staff"&&(input.role!=="talent"||input.personId===null||scopes.length===0||input.allClients)||input.kind==="client"&&(input.role!=="client"||scopes.length===0||input.allClients)||input.kind==="internal"&&(!["hr_officer","hr_manager"].includes(String(input.role))||input.allClients&&input.role!=="hr_manager"))throw new AuthFailure("invalid_request");
  spec={kind:input.kind as InvitationDraftInput["kind"],email,role:input.role as InvitationDraftInput["role"],personId:typeof input.personId==="string"?input.personId.toLowerCase():null,scopes,allClients:input.allClients,jobTitle:typeof input.jobTitle==="string"?input.jobTitle.trim():""};
 }
 return {action,invitationId:create?null:String(input.invitationId).toLowerCase(),requestId:status?null:String(input.requestId).toLowerCase(),expectedRevision:status||create?null:Number(input.expectedRevision),spec};
}
export async function manageInvitation(action:ManagementAction,input:Record<string,unknown>) {
 const parsed=parseManagementInput(action,input);
 if(process.env.AUTH_INVITATIONS_ENABLED!=="true"||process.env.AUTH_INVITATION_SCHEMA_READY!=="true")throw new AuthFailure("unavailable",503);
 const client=await sessionClient("admin");
 const {data:identity,error:identityError}=await client.auth.getUser();
 const {data:proof,error:proofError}=await client.auth.getClaims();
 const user=identity.user;const claims=proof?.claims;
 if(identityError||!user?.email_confirmed_at||proofError||claims?.sub!==user.id||typeof claims.session_id!=="string"||!uuid.test(claims.session_id)||!uuid.test(user.id))throw new AuthFailure("unauthenticated",401);
 if(claims.aal!=="aal2")throw new AuthFailure("mfa_required",403);
 await limitAuth("admin",action==="invite-status"?"invite_manage_read":action==="invite-copy-link"&&rateBucketsV2Enabled()?"invite_copy_link":"invite_manage_write",user.id);
 const {data:context,error:contextError}=await client.rpc("auth_access_context",{p_app:"admin"});
 if(contextError)throw new AuthFailure("unavailable",503);
 rejectRpcRateLimit(context);
 const access=readAccess(context,"admin");if(!hasAccess(access))throw new AuthFailure("no_access",403);
 if(parsed.spec&&!canGrantInvitation(access,{kind:parsed.spec.kind,role:parsed.spec.role,scopes:parsed.spec.scopes,allClients:parsed.spec.allClients}))throw new AuthFailure("no_access",403);
 const gateway=adminClient("admin");
 const actor={p_actor_uid:user.id,p_session_id:claims.session_id};
 const secret=process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;if(!secret||secret.length<32)throw new AuthFailure("unavailable",503);
 const fingerprint=createHmac("sha256",secret).update(JSON.stringify(parsed)).digest("hex");
 const args={...actor,p_action:action,p_invitation_id:parsed.invitationId,p_request_id:parsed.requestId,p_revision:parsed.expectedRevision,p_fingerprint:fingerprint,p_spec:parsed.spec};
 if(action==="invite-copy-link")return copyLink(gateway,parsed,access!,actor,fingerprint);
 const checked=await gateway.rpc("auth_invitation_prepare",args);
 if(checked.error)throw new AuthFailure("unavailable",503);
 const prepare=record(checked.data);
 if(!prepare?.ok)throw managementFailure(prepare?.reason);
 if(prepare.replayed===true)return clean(prepare);
 if(action==="invite-status"){
  let checkedWithProvider=false;
  if(typeof prepare.providerId==="string"&&uuid.test(prepare.providerId)&&["queued","sent","delayed","unknown"].includes(String(record(prepare.invitation)?.deliveryStatus))&&process.env.RESEND_API_KEY?.startsWith("re_")){
   const observed=await retrieveResendStatus(prepare.providerId,process.env.RESEND_API_KEY);
   if(observed){
    const current=await gateway.rpc("auth_invitation_prepare",args);
    if(current.error)throw new AuthFailure("unavailable",503);
    const stillAuthorized=record(current.data);
    if(!stillAuthorized?.ok)throw managementFailure(stillAuthorized?.reason);
    if(stillAuthorized.providerId!==prepare.providerId)return clean({...stillAuthorized,checkedWithProvider:false,reconciliationRequired:record(stillAuthorized.invitation)?.deliveryStatus==="unknown"});
    await mailGateway().recordEvent({eventId:"poll_"+randomUUID(),providerId:prepare.providerId,type:observed,occurredAt:new Date().toISOString(),source:"poll"});
    checkedWithProvider=true;
   }
  }
  const fresh=checkedWithProvider?await gateway.rpc("auth_invitation_prepare",args):checked;
  if(fresh.error)throw new AuthFailure("unavailable",503);
  const data=record(fresh.data);if(!data?.ok)throw managementFailure(data?.reason);
  return clean({...data,checkedWithProvider,reconciliationRequired:record(data.invitation)?.deliveryStatus==="unknown"});
 }
 let queue:Record<string,unknown>|null=null;
 if(action==="invite-send"||action==="invite-resend"){
  const rawTemplate=record(prepare.template);const invite=record(prepare.invitation);
  if(!rawTemplate||!invite||typeof invite.email!=="string"||typeof prepare.app!=="string"||!["admin","client","talent"].includes(prepare.app)||typeof prepare.tokenRevision!=="number"||!Number.isSafeInteger(prepare.tokenRevision)||!["id","kind","revision","subject","html","text"].every(k=>typeof rawTemplate[k]==="string"))throw new AuthFailure("unavailable",503);
  const template={id:String(rawTemplate.id),kind:rawTemplate.kind as Template["kind"],revision:String(rawTemplate.revision),subject:String(rawTemplate.subject),html:String(rawTemplate.html),text:String(rawTemplate.text)};
  const config=workerConfig();const keyVersion=process.env.AUTH_MAIL_ACTIVE_KEY_VERSION;
  if(!keyVersion||!Object.hasOwn(config.keys,keyVersion))throw new AuthFailure("unavailable",503);
  const token=randomBytes(32).toString("base64url");const id=randomUUID();
  const metadata={id,invitationId:String(invite.id),tokenRevision:prepare.tokenRevision+1,templateId:template.id,keyVersion};
  const message=renderInvitation(template,{app:prepare.app as "admin"|"client"|"talent",kind:invite.kind as "staff"|"client"|"internal",recipient:invite.email,token,firstName:""},config.settings);
  queue={id,tokenRevision:metadata.tokenRevision,templateId:template.id,keyVersion,tokenHash:createHash("sha256").update(token).digest("hex"),encryptedPayload:sealPayload({token,firstName:"",message},metadata,config.keys[keyVersion])};
 }
 const result=await gateway.rpc("auth_invitation_apply",{...args,p_queue:queue,p_draft_hash:action==="invite-create-draft"||action==="invite-replace"?createHash("sha256").update(randomBytes(32)).digest("hex"):null});
 if(result.error)throw new AuthFailure("outcome_unknown",503);
 const data=record(result.data);if(!data?.ok)throw managementFailure(data?.reason);
 const output=clean(data);
 // The database write is committed. A wake-up failure may only delay delivery.
 if(queue && output.replayed!==true && output.invitation.deliveryStatus==="queued") await requestMailSend().catch(()=>false);
 return output;
}
/**
 * Copy-link delivery: no email, no outbox, no encrypted payload. The raw link is created here,
 * only its hash goes to the database, and the link is returned in THIS response only.
 */
async function copyLink(gateway:ReturnType<typeof adminClient>,parsed:ReturnType<typeof parseManagementInput>,access:NonNullable<ReturnType<typeof readAccess>>,actor:{p_actor_uid:string;p_session_id:string},fingerprint:string){
 // Observation-only read (also enforces actor, owner and scope in the database), then the same TS policy as drafts.
 const pre=await gateway.rpc("auth_invitation_prepare",{...actor,p_action:"invite-status",p_invitation_id:parsed.invitationId,p_request_id:null,p_revision:null,p_fingerprint:null,p_spec:null});
 if(pre.error)throw new AuthFailure("unavailable",503);
 const read=record(pre.data);if(!read?.ok)throw managementFailure(read?.reason);
 const view=parseManagedInvitation({ok:true,invitation:record(read.invitation)});
 if(!view.ok)throw new AuthFailure("unavailable",503);
 const inv=view.invitation;const app=appForKind(inv.kind);
 if(!app||!canGrantInvitation(access,{kind:inv.kind,role:inv.role,scopes:inv.scopes,allClients:inv.allClients}))throw new AuthFailure("no_access",403);
 if(!inv.actions.copyLink)throw new AuthFailure("conflict",409);
 const {token,hash}=newAccessToken();
 let url:string;
 try{url=accessLinkUrl(app,token);}catch{throw new AuthFailure("unavailable",503);}
 const result=await gateway.rpc("auth_invitation_copy_link",{...actor,p_invitation_id:parsed.invitationId,p_request_id:parsed.requestId,p_revision:parsed.expectedRevision,p_fingerprint:fingerprint,p_token_hash:hash});
 // A lost response may have committed a hash whose link we can no longer show: the admin regenerates. The token is dropped.
 if(result.error)throw new AuthFailure("outcome_unknown",503);
 const data=record(result.data);if(!data?.ok)throw managementFailure(data?.reason);
 const out=clean(data);
 if(!out.ok||data.replayed===true)return {...out,accessLink:null};
 return {...out,accessLink:{url,expiresAt:out.invitation.expiresAt}};
}
function clean(value:unknown){
 const parsed=parseManagedInvitation(value);if(!parsed.ok)throw new AuthFailure("outcome_unknown",503);
 // Disabled/unconfigured delivery must not appear actionable merely because a template exists.
 if(parsed.invitation.actions.send||parsed.invitation.actions.resend){
  try{const config=workerConfig();const version=process.env.AUTH_MAIL_ACTIVE_KEY_VERSION;if(!version||!Object.hasOwn(config.keys,version))throw new Error();}
  catch{parsed.invitation.actions.send=false;parsed.invitation.actions.resend=false;}
 }
 return parsed;
}
function managementFailure(reason:unknown){
 const code=["conflict","no_access","validation_failed","rate_limited","delivery_blocked","review_required","unavailable"].includes(String(reason))?String(reason):"no_access";
 return new AuthFailure(code,code==="conflict"?409:code==="rate_limited"?429:code==="unavailable"?503:code==="validation_failed"?400:403);
}

/**
 * Admin "Team and Access" list. Read-only. The actor and session come ONLY from the verified session; the body can carry
 * nothing but portal, limit, status and the keyset cursor. The database function re-derives the actor, and returns only
 * rows this actor may manage. Inert unless both invitation flags are on.
 */
export function parseListInput(input:Record<string,unknown>):InvitationListInput {
 const after=input.after===undefined||input.after===null?null:record(input.after);
 if(input.portal!=="admin"||Object.keys(input).some(k=>!["portal","limit","status","after"].includes(k)))throw new AuthFailure("invalid_request");
 const limit=input.limit===undefined?25:input.limit;
 if(typeof limit!=="number"||!Number.isSafeInteger(limit)||limit<1||limit>100)throw new AuthFailure("invalid_request");
 const status=input.status===undefined||input.status===null?null:input.status;
 if(status!==null&&!(INVITATION_LIST_STATUSES as readonly string[]).includes(String(status)))throw new AuthFailure("invalid_request");
 if(input.after!==undefined&&input.after!==null&&(!after||Object.keys(after).some(k=>!["createdAt","id"].includes(k))||typeof after.createdAt!=="string"||!LIST_TIMESTAMP.test(after.createdAt)||!Number.isFinite(Date.parse(after.createdAt))||typeof after.id!=="string"||!uuid.test(after.id)))throw new AuthFailure("invalid_request");
 return {limit,status:status as InvitationListInput["status"],after:after?{createdAt:String(after.createdAt),id:String(after.id).toLowerCase()}:null};
}
export async function listInvitations(input:Record<string,unknown>) {
 const parsed=parseListInput(input);
 if(process.env.AUTH_INVITATIONS_ENABLED!=="true"||process.env.AUTH_INVITATION_SCHEMA_READY!=="true")throw new AuthFailure("unavailable",503);
 const client=await sessionClient("admin");
 const {data:identity,error:identityError}=await client.auth.getUser();
 const {data:proof,error:proofError}=await client.auth.getClaims();
 const user=identity.user;const claims=proof?.claims;
 if(identityError||!user?.email_confirmed_at||proofError||claims?.sub!==user.id||typeof claims.session_id!=="string"||!uuid.test(claims.session_id)||!uuid.test(user.id))throw new AuthFailure("unauthenticated",401);
 if(claims.aal!=="aal2")throw new AuthFailure("mfa_required",403);
 await limitAuth("admin","invite_manage_read",user.id);
 const {data:context,error:contextError}=await client.rpc("auth_access_context",{p_app:"admin"});
 if(contextError)throw new AuthFailure("unavailable",503);
 rejectRpcRateLimit(context);
 if(!hasAccess(readAccess(context,"admin")))throw new AuthFailure("no_access",403);
 const result=await adminClient("admin").rpc("auth_invitation_list",{p_actor_uid:user.id,p_session_id:claims.session_id,p_limit:parsed.limit,p_after_created:parsed.after?.createdAt??null,p_after_id:parsed.after?.id??null,p_status:parsed.status});
 if(result.error)throw new AuthFailure("unavailable",503);
 const data=record(result.data);
 if(data?.ok===false){const r=String(data.reason);throw r==="invalid_request"?new AuthFailure("invalid_request",400):r==="no_access"?new AuthFailure("no_access",403):new AuthFailure("unavailable",503);}
 const list=parseInvitationList(data);
 if(!list.ok||list.items.length>parsed.limit)throw new AuthFailure("unavailable",503);
 return list;
}
