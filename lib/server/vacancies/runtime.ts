import 'server-only';
import {createHmac} from 'node:crypto';
import {sessionClient,adminClient} from '../auth/session';
import {authConfig} from '../auth/config';
import {limitAuth,RateFailure} from '../auth/rate';
import type {VacancyWriteDependencies} from './write-service';
export function vacancyWriteRuntime():{deps:VacancyWriteDependencies;origin:string}{
 const enabled=process.env.VACANCIES_BACKEND_ENABLED==='true'&&process.env.VACANCIES_SCHEMA_READY==='true'&&process.env.VACANCY_CONFIGURATION_SCHEMA_READY==='true';
 if(!enabled)return {origin:'',deps:{enabled:false,verifyIdentity:async()=>{throw new Error('disabled');},consumeLimit:async()=>{},fingerprint:()=>'',mutate:async()=>{throw new Error('disabled');}}};
 const {origin}=authConfig('admin');
 const invalid=()=>({uid:'',sessionId:'',aal:'',emailVerified:false});
 return {origin,deps:{enabled:true,
  verifyIdentity:async()=>{
   const client=await sessionClient('admin');
   const {data:identity,error:userError}=await client.auth.getUser();
   const {data:proof,error:claimError}=await client.auth.getClaims();
   const user=identity.user,claims=proof?.claims;
   if(userError||claimError||!user?.email_confirmed_at||claims?.sub!==user.id||typeof claims.session_id!=='string'||typeof claims.exp!=='number'||claims.exp<=Date.now()/1000)return invalid();
   return {uid:user.id,sessionId:claims.session_id,aal:String(claims.aal??''),emailVerified:true};
  },
  consumeLimit:async uid=>{
   // Reuse the reviewed 15-per-five-minute write quota in a separate subject
   // bucket; vacancy writes never consume invitation sender quota for this UID.
   try{await limitAuth('admin','invite_manage_write','vacancy-write:'+uid);}catch(error){if(error instanceof RateFailure)throw {code:'rate_limited'};throw error;}
  },
  fingerprint:command=>{const key=process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;if(!key||key.length<32)throw new Error('unavailable');return createHmac('sha256',key).update(JSON.stringify(command)).digest('hex');},
  mutate:async args=>{const {data,error}=await adminClient('admin').rpc('recruitment_vacancy_mutate',args);return {data,error};},
 }};
}
