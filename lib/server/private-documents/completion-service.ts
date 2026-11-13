/** Queue verification only. This service never accepts client claims about stored bytes or scan results. */
import type {UploadIdentity} from './request-service';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
type Command={requestId:string;uploadId:string};
type FailureCode='unavailable'|'unauthenticated'|'no_access'|'invalid_request'|'rate_limited'|'conflict'|'expired'|'outcome_unknown';
export type CompletionResult={ok:true;uploadId:string;status:'checking';replayed:boolean}|{ok:false;code:FailureCode;requestId?:string};
export type CompletionDependencies={
 enabled:boolean;
 verifyIdentity():Promise<UploadIdentity|null>;
 consumeLimit(uid:string):Promise<void>;
 /** Proposed DB transaction rechecks session/owner/expiry, locks the intent and durably queues one verification job.
  * It must NOT promote a document or trust a browser/provider MIME claim. No scan means no clean version.
  */
 enqueue(args:Command&{actorUid:string;sessionId:string}):Promise<{data:unknown;error:unknown}>;
};
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;}

export async function completePrivateUpload(raw:unknown,deps:CompletionDependencies):Promise<CompletionResult>{
 if(!deps.enabled)return {ok:false,code:'unavailable'};
 let identity:UploadIdentity|null;
 try{identity=await deps.verifyIdentity();}catch{return {ok:false,code:'unavailable'};}
 if(!identity||!identity.emailVerified||![identity.uid,identity.personId,identity.sessionId].every(id=>typeof id==='string'&&UUID.test(id)))return {ok:false,code:'unauthenticated'};
 if(identity.app!=='talent'||identity.status!=='active'||!Array.isArray(identity.entitlements)||!identity.entitlements.includes('applicant'))return {ok:false,code:'no_access'};
 if(!record(raw)||Object.keys(raw).length!==2||!Object.hasOwn(raw,'requestId')||!Object.hasOwn(raw,'uploadId')||
  typeof raw.requestId!=='string'||!UUID.test(raw.requestId)||typeof raw.uploadId!=='string'||!UUID.test(raw.uploadId))return {ok:false,code:'invalid_request'};
 const requestId=raw.requestId.toLowerCase(),uploadId=raw.uploadId.toLowerCase();
 try{await deps.consumeLimit(identity.uid);}catch(error){return {ok:false,code:record(error)&&error.code==='rate_limited'?'rate_limited':'unavailable'};}
 const unknown=():CompletionResult=>({ok:false,code:'outcome_unknown',requestId});
 let response:{data:unknown;error:unknown};
 try{response=await deps.enqueue({requestId,uploadId,actorUid:identity.uid,sessionId:identity.sessionId});}catch{return unknown();}
 if(!response||response.error||!record(response.data))return unknown();
 const data=response.data;
 if(data.ok===false){
  const allowed=['no_access','conflict','expired','unavailable','rate_limited'] as const;
  return {ok:false,code:typeof data.reason==='string'&&allowed.includes(data.reason as typeof allowed[number])?data.reason as typeof allowed[number]:'unavailable'};
 }
 if(data.ok!==true||data.uploadId!==uploadId||data.requestId!==requestId||data.ownerId!==identity.personId||
  data.status!=='checking'||typeof data.replayed!=='boolean')return unknown();
 return {ok:true,uploadId,status:'checking',replayed:data.replayed};
}
