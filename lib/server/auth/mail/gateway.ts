import "server-only";
import { adminClient } from "../session";
import { record, isEmail, uuid, validIdentity, type Job, type MailGateway, type MailEvent, type SendOutcome, type Template } from "./model";
function parseJob(value: unknown): Job {
  const j=record(value); const t=record(j?.template);
  if (!j || !t || !["id","invitationId","templateId","keyVersion"].every(k=>typeof j[k]==="string") || !validIdentity(j as unknown as Job) || typeof j.leaseId!=="string" || !uuid.test(j.leaseId) || !["talent","client","admin"].includes(String(j.app)) || !["staff","client","internal"].includes(String(j.kind)) || !isEmail(j.recipient) || typeof j.tokenHash!=="string" || !/^[a-f0-9]{64}$/.test(j.tokenHash) || typeof j.expiresAt!=="string" || !Number.isFinite(Date.parse(j.expiresAt)) || !Number.isInteger(j.attemptCount) || Number(j.attemptCount)<1 || Number(j.attemptCount)>5 || typeof j.encryptedPayload!=="string" || j.encryptedPayload.length>950000 || t.id!==j.templateId || !["client","staff","internal","resend"].includes(String(t.kind)) || !["revision","subject","html","text"].every(k=>typeof t[k]==="string")) throw new Error("mail_storage_unavailable");
  return {id:String(j.id),invitationId:String(j.invitationId),tokenRevision:Number(j.tokenRevision),templateId:String(j.templateId),keyVersion:String(j.keyVersion),leaseId:j.leaseId,app:j.app as Job["app"],kind:j.kind as Job["kind"],recipient:j.recipient,tokenHash:j.tokenHash,expiresAt:j.expiresAt,attemptCount:Number(j.attemptCount),encryptedPayload:j.encryptedPayload,template:{id:String(t.id),kind:t.kind as Template["kind"],revision:String(t.revision),subject:String(t.subject),html:String(t.html),text:String(t.text)}};
}
export function mailGateway(): MailGateway {
  const client=adminClient("admin");
  const rpc=async(name:string,args:Record<string,unknown>={})=>{
    const {data,error}=await client.rpc(name,args);if(error)throw new Error("mail_storage_unavailable");return data;
  };
  return {
    claim:async()=>{const data=await rpc("auth_mail_claim");return data===null?null:parseJob(data);},
    begin:async(job:Job)=>{const data=await rpc("auth_mail_begin",{p_id:job.id,p_lease:job.leaseId});if(data!=="ready"&&data!=="paused"&&data!=="cancelled")throw new Error("mail_storage_unavailable");return data;},
    finish:async(job:Job,result:SendOutcome)=>{
      const data=await rpc("auth_mail_finish",{p_id:job.id,p_lease:job.leaseId,p_status:result.status,p_provider_id:result.status==="sent"?result.providerId:null,p_code:"code" in result?result.code:null,p_delay:result.status==="retry"?result.delaySeconds:null});
      if(data!==true)throw new Error("mail_storage_unavailable");
    },
    recordEvent:async(event:MailEvent)=>{const data=await rpc("auth_mail_record_event",{p_event_id:event.eventId,p_provider_id:event.providerId,p_type:event.type,p_at:event.occurredAt,p_source:event.source??"webhook"});if(data!==true)throw new Error("mail_storage_unavailable");}
  };
}
