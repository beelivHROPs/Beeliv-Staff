import 'server-only';
import {createHmac} from 'node:crypto';
import {authConfig} from '../auth/config';
import {sessionClient,adminClient} from '../auth/session';
import {readAccess} from '../auth/policy';
import {limitAuth,RateFailure} from '../auth/rate';
import {APPROVED_APPLICATION_UPLOAD_POLICY} from './validation';
import {privateDocumentGateway} from './gateway';
import type {UploadRequestDependencies} from './request-service';
import type {CompletionDependencies} from './completion-service';
import type {UploadStatusDependencies} from './status-service';

/** No route selects this runtime yet. All four readiness flags are absent/disabled. */
export function privateDocumentRuntime():{origin:string;request:UploadRequestDependencies;completion:CompletionDependencies;status:UploadStatusDependencies}{
 const enabled=['PRIVATE_DOCUMENTS_BACKEND_ENABLED','PRIVATE_DOCUMENTS_SCHEMA_READY','PRIVATE_DOCUMENTS_STORAGE_READY','PRIVATE_DOCUMENTS_SCANNER_READY'].every(key=>process.env[key]==='true');
 const disabled=async():Promise<never>=>{throw new Error('private_upload_unavailable');};
 if(!enabled)return {origin:'',request:{enabled:false,policy:APPROVED_APPLICATION_UPLOAD_POLICY,storageOrigin:'',authOrigin:'',now:()=>new Date(),verifyIdentity:disabled,consumeLimit:disabled,fingerprint:()=>'',reserve:disabled,signUpload:disabled},completion:{enabled:false,verifyIdentity:disabled,consumeLimit:disabled,enqueue:disabled},status:{enabled:false,audience:'applicant',verifyIdentity:disabled,consumeLimit:disabled,status:disabled}};
 const config=authConfig('talent');
 const server=adminClient('talent');
 const gateway=privateDocumentGateway({
  rpc:async(name,args)=>await server.rpc(name,args),
  createSignedUpload:async(bucket,key,options)=>await server.storage.from(bucket).createSignedUploadUrl(key,options),
 });
 const verifyIdentity:UploadRequestDependencies['verifyIdentity']=async()=>{
  const client=await sessionClient('talent');
  const {data:identity,error:userError}=await client.auth.getUser();
  const {data:proof,error:claimError}=await client.auth.getClaims();
  const user=identity.user,claims=proof?.claims;
  if(userError||claimError||!user?.email_confirmed_at||claims?.sub!==user.id||typeof claims.session_id!=='string'||typeof claims.exp!=='number'||claims.exp<=Date.now()/1000)return null;
  const {data,error}=await client.rpc('auth_access_context',{p_app:'talent'});
  if(error)throw new Error('private_upload_unavailable');
  const access=readAccess(data,'talent');
  if(!access||access.role!=='talent')return null;
  return {uid:user.id,personId:access.personId,sessionId:claims.session_id,emailVerified:true,app:access.app,status:access.status,entitlements:access.entitlements};
 };
 const consumeLimit=async(uid:string)=>{
  try{await limitAuth('talent','invite_manage_write','private-document:'+uid);}catch(error){if(error instanceof RateFailure)throw {code:'rate_limited'};throw new Error('private_upload_unavailable');}
 };
 return {origin:config.origin,request:{enabled:true,policy:APPROVED_APPLICATION_UPLOAD_POLICY,storageOrigin:config.url,authOrigin:config.url,now:()=>new Date(),verifyIdentity,consumeLimit,
  fingerprint:request=>{const key=process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;if(!key||key.length<32)throw new Error('private_upload_unavailable');return createHmac('sha256',key).update('private-document:initiate:').update(JSON.stringify(request)).digest('hex');},
  reserve:async args=>await gateway.reserve(args),signUpload:gateway.signUpload,
 },completion:{enabled:true,verifyIdentity,consumeLimit,enqueue:async args=>await gateway.enqueue(args)},status:{enabled:true,audience:'applicant',verifyIdentity,consumeLimit,status:gateway.status}};
}
