/** Own Applicant document facts; never paths, credentials or internal scan reports. */
import type { UploadIdentity } from './request-service';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SLOTS=['cv','passport-photo','valid-id'] as const;
type Code='unavailable'|'unauthenticated'|'no_access'|'invalid_request'|'rate_limited';
type FileFacts={uploadId:string;fileName:string;size:number;contentType:string};
export type SummaryItem={slot:typeof SLOTS[number];current:(FileFacts & {checkedAt:string;review:string})|null;incoming:(FileFacts & {status:'checking'|'rejected'|'unavailable';sentAt:string})|null};
export type SummaryResult={ok:true;items:SummaryItem[]}|{ok:false;code:Code};
export type SummaryDependencies={enabled:boolean;verifyIdentity():Promise<UploadIdentity|null>;consumeLimit(uid:string):Promise<void>;summary(args:{actorUid:string;sessionId:string}):PromiseLike<{data:unknown;error:unknown}>};
function record(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;}
function date(v:unknown):v is string{return typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v));}
function file(v:unknown,slot:string):FileFacts|null{
 if(!record(v)||typeof v.uploadId!=='string'||!UUID.test(v.uploadId)||typeof v.fileName!=='string'||v.fileName.length<1||v.fileName.length>255||/[\x00-\x1f\x7f]/.test(v.fileName)||!Number.isSafeInteger(v.size)||(v.size as number)<1||(v.size as number)>5000000)return null;
 const types=slot==='cv'?['application/pdf']:slot==='passport-photo'?['image/jpeg','image/png']:['application/pdf','image/jpeg','image/png'];
 if(typeof v.contentType!=='string'||!types.includes(v.contentType))return null;
 return {uploadId:v.uploadId,fileName:v.fileName,size:v.size as number,contentType:v.contentType};
}
/** Strict projection used by both the service and HTTP boundary. */
export function selectSummaryItems(raw:unknown):SummaryItem[]|null{
 if(!Array.isArray(raw)||raw.length!==3)return null;
 const out:SummaryItem[]=[];
 for(const slot of SLOTS){
  const matches=raw.filter(v=>record(v)&&v.slot===slot);if(matches.length!==1)return null;
  const item=matches[0];let current:SummaryItem['current']=null,incoming:SummaryItem['incoming']=null;
  if(item.current!==null){const v=item.current,f=file(v,slot);if(!f||!record(v)||!date(v.checkedAt)||typeof v.review!=='string'||!['not_requested','pending','verified','resubmission_required','rejected'].includes(v.review))return null;current={...f,checkedAt:v.checkedAt,review:v.review};}
  if(item.incoming!==null){const v=item.incoming,f=file(v,slot);if(!f||!record(v)||!date(v.sentAt)||!['checking','rejected','unavailable'].includes(v.status as string))return null;incoming={...f,sentAt:v.sentAt,status:v.status as 'checking'|'rejected'|'unavailable'};}
  out.push({slot,current,incoming});
 }
 return out;
}
export async function getApplicantDocumentSummary(raw:unknown,deps:SummaryDependencies):Promise<SummaryResult>{
 if(!deps.enabled)return {ok:false,code:'unavailable'};
 let identity:UploadIdentity|null;try{identity=await deps.verifyIdentity();}catch{return {ok:false,code:'unavailable'};}
 if(!identity||!identity.emailVerified||![identity.uid,identity.personId,identity.sessionId].every(v=>typeof v==='string'&&UUID.test(v)))return {ok:false,code:'unauthenticated'};
 if(identity.app!=='talent'||identity.status!=='active'||!Array.isArray(identity.entitlements)||!identity.entitlements.includes('applicant'))return {ok:false,code:'no_access'};
 if(!record(raw)||Object.keys(raw).length!==0)return {ok:false,code:'invalid_request'};
 try{await deps.consumeLimit(identity.uid);}catch(e){return {ok:false,code:record(e)&&e.code==='rate_limited'?'rate_limited':'unavailable'};}
 try{
  const reply=await deps.summary({actorUid:identity.uid,sessionId:identity.sessionId});
  if(!reply||reply.error||!record(reply.data))return {ok:false,code:'unavailable'};
  const data=reply.data;if(data.ok===false)return {ok:false,code:data.reason==='no_access'||data.reason==='rate_limited'?data.reason:'unavailable'};
  const items=data.ok===true?selectSummaryItems(data.items):null;return items?{ok:true,items}:{ok:false,code:'unavailable'};
 }catch{return {ok:false,code:'unavailable'};}
}
