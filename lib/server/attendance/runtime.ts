import 'server-only';
import {createHmac} from 'node:crypto';
import {authConfig} from '../auth/config';
import {adminClient,sessionClient} from '../auth/session';
import {readAccess} from '../auth/policy';
import {limitAuth,RateFailure} from '../auth/rate';
import type {AttendanceDependencies,AttendancePortal} from './types';
/** No flags are enabled by this implementation; schema/permission/schedule checks must precede release. */
export function attendanceRuntime(portal:AttendancePortal):{origin:string;deps:AttendanceDependencies}{
 const enabled=['ATTENDANCE_BACKEND_ENABLED','ATTENDANCE_SCHEMA_READY'].every(k=>process.env[k]==='true');
 const off=async():Promise<never>=>{throw Error('unavailable');};
 if(!enabled)return {origin:'',deps:{enabled:false,writesEnabled:false,portal,verifyIdentity:off,consumeLimit:off,fingerprint:()=>{throw Error('unavailable');},rpc:off}};
 const app=portal==='staff'?'talent':portal,config=authConfig(app),server=adminClient(app);
 return {origin:config.origin,deps:{enabled:true,writesEnabled:process.env.ATTENDANCE_WRITES_ENABLED==='true',portal,
 verifyIdentity:async()=>{
  const client=await sessionClient(app);const {data:identity,error:ue}=await client.auth.getUser();const {data:proof,error:ce}=await client.auth.getClaims();const user=identity.user,claims=proof?.claims;
  if(ue||ce||!user?.email_confirmed_at||claims?.sub!==user.id||typeof claims.session_id!=='string'||typeof claims.exp!=='number'||claims.exp<=Date.now()/1000)return null;
  const {data,error}=await client.rpc('auth_access_context',{p_app:app});if(error)throw Error('unavailable');const access=readAccess(data,app);if(!access||(portal==='staff'&&access.role!=='talent')||(portal==='client'&&access.role!=='client')||(portal==='admin'&&!['hr_officer','hr_manager','head_of_operations'].includes(access.role)))return null;
  return {uid:user.id,sessionId:claims.session_id,emailVerified:true,active:access.status==='active',aal:String(claims.aal??''),staff:access.entitlements.includes('staff')};
 },consumeLimit:async(uid,write)=>{try{await limitAuth(app,write?'org_write':'org_read','attendance:'+uid);}catch(e){if(e instanceof RateFailure)throw {code:'rate_limited'};throw Error('unavailable');}},
 fingerprint:(action,command)=>{const key=process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;if(!key||key.length<32)throw Error('unavailable');return createHmac('sha256',key).update('workforce:attendance:'+portal+':'+action+':').update(JSON.stringify(command)).digest('hex');},rpc:async(name,args)=>await server.rpc(name,args)}};
}
