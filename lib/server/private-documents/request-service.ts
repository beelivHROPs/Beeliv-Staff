/** Prepare a private upload. This does not verify bytes, publish a document or grant download access. */
import {APPROVED_APPLICATION_UPLOAD_POLICY,validateUploadRequest,type UploadRequest} from './validation';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
const DENIALS=['no_access','conflict','limit_reached','expired','unavailable','rate_limited'] as const;
export type UploadRequestCode=typeof DENIALS[number]|'unauthenticated'|'invalid_request'|'rate_limited'|'outcome_unknown';
export type UploadIdentity={uid:string;personId:string;sessionId:string;emailVerified:boolean;app:string;status:string;entitlements:readonly string[]};
export type UploadReservationArgs={actorUid:string;sessionId:string;request:UploadRequest;fingerprint:string};
export type UploadRequestDependencies={
 enabled:boolean;policy:unknown;storageOrigin:string;authOrigin:string;now():Date;
 verifyIdentity():Promise<UploadIdentity|null>;
 consumeLimit(uid:string):Promise<void>;
 fingerprint(request:UploadRequest):string;
 /** Proposed service-only transaction must independently recheck actor/binding/access/quota and same-key replay. */
 reserve(args:UploadReservationArgs):Promise<{data:unknown;error:unknown}>;
 /** Storage provider only; signed upload must have overwrite/upsert disabled. Never log returned credentials. */
 signUpload(input:{bucket:string;objectKey:string;upsert:false}):Promise<{url:string;expiresAt:string}>;
};
export type UploadRequestResult=
 |{ok:true;uploadId:string;status:'awaiting-bytes';uploadUrl:string;uploadUrlExpiresAt:string;completeBefore:string;replayed:boolean}
 |{ok:false;code:UploadRequestCode;fields?:Record<string,string>;requestId?:string};
function object(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;}
function unknown(requestId:string):UploadRequestResult{return {ok:false,code:'outcome_unknown',requestId};}
function time(value:unknown):number{return typeof value==='string'?Date.parse(value):NaN;}
function validOrigin(value:string):boolean{
 try{const url=new URL(value);return url.origin===value&&url.protocol==='https:'&&/^[a-z0-9]+\.supabase\.co$/.test(url.hostname);}catch{return false;}
}

export async function requestPrivateUpload(raw:unknown,deps:UploadRequestDependencies):Promise<UploadRequestResult>{
 if(!deps.enabled)return {ok:false,code:'unavailable'};
 let identity:UploadIdentity|null;
 try{identity=await deps.verifyIdentity();}catch{return {ok:false,code:'unavailable'};}
 if(!identity||!identity.emailVerified||![identity.uid,identity.personId,identity.sessionId].every(id=>typeof id==='string'&&UUID.test(id)))return {ok:false,code:'unauthenticated'};
 if(identity.app!=='talent'||identity.status!=='active'||!Array.isArray(identity.entitlements)||!identity.entitlements.includes('applicant'))return {ok:false,code:'no_access'};
 if(deps.policy!==APPROVED_APPLICATION_UPLOAD_POLICY)return {ok:false,code:'unavailable'};
 const validated=validateUploadRequest(raw,deps.policy);
 if(!validated.ok)return Object.hasOwn(validated.fields,'policy')?{ok:false,code:'unavailable'}:{ok:false,code:'invalid_request',fields:validated.fields};
 const request=validated.value;
 if(!validOrigin(deps.storageOrigin)||deps.storageOrigin!==deps.authOrigin)return {ok:false,code:'unavailable'};
 let fingerprint:string;
 try{fingerprint=deps.fingerprint(request);if(!HASH.test(fingerprint))throw new Error();}
 catch{return {ok:false,code:'unavailable'};}
 try{await deps.consumeLimit(identity.uid);}catch(error){return {ok:false,code:object(error)&&error.code==='rate_limited'?'rate_limited':'unavailable'};}
 let response:{data:unknown;error:unknown};
 try{response=await deps.reserve({actorUid:identity.uid,sessionId:identity.sessionId,request,fingerprint});}
 catch{return unknown(request.requestId);}
 if(!response||response.error||!object(response.data))return unknown(request.requestId);
 const reservation=response.data;
 if(reservation.ok===false){
  const code=typeof reservation.reason==='string'&&DENIALS.includes(reservation.reason as typeof DENIALS[number])?reservation.reason as typeof DENIALS[number]:'unavailable';
  return {ok:false,code};
 }
 let now:number;
 try{now=deps.now().getTime();}catch{return unknown(request.requestId);}
 const deadline=time(reservation.completeBefore);
 const uploadId=reservation.uploadId;
 const extension=request.fileName.slice(request.fileName.lastIndexOf('.')).toLowerCase();
 const objectKey=`${String(uploadId).toLowerCase()}/source${extension}`;
 // Exact binding prevents a malformed gateway reply from minting access for a different owner or object.
 if(reservation.ok!==true||typeof uploadId!=='string'||!UUID.test(uploadId)||reservation.ownerId!==identity.personId||reservation.requestId!==request.requestId||
  reservation.fingerprint!==fingerprint||reservation.purpose!==request.purpose||reservation.size!==request.size||reservation.contentType!==request.contentType||reservation.state!=='reserved'||
  reservation.bucket!=='applicant-document-quarantine'||reservation.objectKey!==objectKey||typeof reservation.replayed!=='boolean'||
  !Number.isFinite(now)||!Number.isFinite(deadline)||deadline>now+605000)return unknown(request.requestId);
 if(deadline<=now)return {ok:false,code:'expired'};
 let signed:{url:string;expiresAt:string};
 try{signed=await deps.signUpload({bucket:reservation.bucket,objectKey,upsert:false});}
 catch{return {ok:false,code:'unavailable',requestId:request.requestId};}
 let after:number;
 try{after=deps.now().getTime();}catch{return unknown(request.requestId);}
 try{
  const url=new URL(signed.url),expires=time(signed.expiresAt);
  const token=url.searchParams.get('token');
  if(!Number.isFinite(after)||after>=deadline)return {ok:false,code:'expired'};
  // Supabase signed upload links currently last two hours; the shorter app completion deadline does not revoke them.
  if(url.origin!==deps.storageOrigin||url.username||url.password||url.hash||url.pathname!==`/storage/v1/object/upload/sign/${reservation.bucket}/${objectKey}`||
   !token||token.length>8192||[...url.searchParams.keys()].length!==1||!url.searchParams.has('token')||
   !Number.isFinite(expires)||expires<deadline||expires>after+7260000)return {ok:false,code:'unavailable',requestId:request.requestId};
  return {ok:true,uploadId,status:'awaiting-bytes',uploadUrl:url.toString(),uploadUrlExpiresAt:new Date(expires).toISOString(),completeBefore:new Date(deadline).toISOString(),replayed:reservation.replayed};
 }catch{return {ok:false,code:'unavailable',requestId:request.requestId};}
}
