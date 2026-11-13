/** Server transport only. Authorization belongs to the service-only DB functions, never these mappings. */
import type {UploadReservationArgs} from './request-service';

type Reply={data:unknown;error:unknown};
export type PrivateDocumentPorts={
 rpc(name:string,args:Record<string,unknown>):PromiseLike<Reply>;
 createSignedUpload(bucket:string,key:string,options:{upsert:false}):PromiseLike<Reply>;
};
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;}

/** Extract expiry only from a Storage-server response, never browser input or an identity JWT.
 * Decoding does not authenticate a user or authorize an operation. The request service also checks origin/path/TTL.
 */
function storageExpiry(token:string):string{
 if(token.length>8192)throw new Error('private_upload_unavailable');
 const parts=token.split('.');
 if(parts.length!==3||!parts.every(part=>/^[A-Za-z0-9_-]+$/.test(part)))throw new Error('private_upload_unavailable');
 let payload:unknown;
 try{payload=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));}catch{throw new Error('private_upload_unavailable');}
 if(!record(payload)||!Number.isSafeInteger(payload.exp)||(payload.exp as number)<=0)throw new Error('private_upload_unavailable');
 const expiry=new Date((payload.exp as number)*1000);
 if(!Number.isFinite(expiry.getTime()))throw new Error('private_upload_unavailable');
 return expiry.toISOString();
}

export function privateDocumentGateway(ports:PrivateDocumentPorts){
 return {
  reserve:(args:UploadReservationArgs):PromiseLike<Reply>=>ports.rpc('private_document_reserve',{
   p_actor_uid:args.actorUid,p_session_id:args.sessionId,p_request_id:args.request.requestId,
   p_purpose:args.request.purpose,p_filename:args.request.fileName,p_size:args.request.size,
   p_content_type:args.request.contentType,p_fingerprint:args.fingerprint,
  }),
  enqueue:(args:{actorUid:string;sessionId:string;requestId:string;uploadId:string}):PromiseLike<Reply>=>ports.rpc('private_document_enqueue',{
   p_actor_uid:args.actorUid,p_session_id:args.sessionId,p_request_id:args.requestId,p_upload_id:args.uploadId,
  }),
  status:(args:{actorUid:string;sessionId:string;uploadId:string}):PromiseLike<Reply>=>ports.rpc('private_document_status',{
   p_actor_uid:args.actorUid,p_session_id:args.sessionId,p_upload_id:args.uploadId,
  }),
  signUpload:async(input:{bucket:string;objectKey:string;upsert:false}):Promise<{url:string;expiresAt:string}>=>{
   if(input.bucket!=='applicant-document-quarantine'||input.upsert!==false||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\/source\.(pdf|docx|jpg|jpeg|png)$/.test(input.objectKey))throw new Error('private_upload_unavailable');
   let reply:Reply;
   try{reply=await ports.createSignedUpload(input.bucket,input.objectKey,{upsert:false});}catch{throw new Error('private_upload_unavailable');}
   if(!reply||reply.error||!record(reply.data))throw new Error('private_upload_unavailable');
   const data=reply.data;
   if(typeof data.signedUrl!=='string'||typeof data.token!=='string'||data.path!==input.objectKey)throw new Error('private_upload_unavailable');
   let url:URL;
   try{url=new URL(data.signedUrl);}catch{throw new Error('private_upload_unavailable');}
   if(url.searchParams.get('token')!==data.token)throw new Error('private_upload_unavailable');
   return {url:data.signedUrl,expiresAt:storageExpiry(data.token)};
  },
 };
}
