import type {AttendanceAction,AttendanceCode,AttendanceDependencies,AttendanceFailure,AttendanceResult,AttendanceRow} from './types';
import {day,id,plain,stamp,validateAttendance} from './validation';
const DENIALS:readonly AttendanceCode[]=['forbidden','not_found','invalid_request','rate_limited','conflict','stale'];
function text(v:unknown,max=200):v is string{return typeof v==='string'&&v.length<=max&&!/[\x00-\x1f\x7f]/.test(v);}
/** Select only displayable attendance facts. No contacts, HR notes, reason, GPS or payroll. */
export function projectAttendance(v:unknown):AttendanceRow|null{
 if(!plain(v)||!['attendanceId','shiftId','clientId','outletId'].every(k=>id(v[k]))||!day(v.workDate)||!Number.isSafeInteger(v.revision)||(v.revision as number)<1||(v.revision as number)>1000000||!['name','clientName','outletName','role'].every(k=>text(v[k]))||!stamp(v.plannedStart)||!stamp(v.plannedEnd)||Date.parse(v.plannedEnd)<=Date.parse(v.plannedStart)||typeof v.corrected!=='boolean')return null;
 if(v.checkedInAt!==null&&!stamp(v.checkedInAt))return null;if(v.checkedOutAt!==null&&(!stamp(v.checkedOutAt)||!stamp(v.checkedInAt)||Date.parse(v.checkedOutAt)<=Date.parse(v.checkedInAt)))return null;
 return {attendanceId:v.attendanceId as string,shiftId:v.shiftId as string,revision:v.revision as number,workDate:v.workDate,name:v.name as string,clientId:v.clientId as string,clientName:v.clientName as string,outletId:v.outletId as string,outletName:v.outletName as string,role:v.role as string,plannedStart:v.plannedStart,plannedEnd:v.plannedEnd,checkedInAt:v.checkedInAt as string|null,checkedOutAt:v.checkedOutAt as string|null,corrected:v.corrected};
}
export async function attendanceAction(action:AttendanceAction,raw:unknown,deps:AttendanceDependencies):Promise<AttendanceResult>{
 const write=action!=='list';if(!deps.enabled||(write&&!deps.writesEnabled))return {ok:false,code:'unavailable'};
 // A caller cannot enable mutations on Client, or use HR actions on Staff.
 if((deps.portal==='client'&&write)||(deps.portal==='admin'&&write&&action!=='correct')||(deps.portal==='staff'&&action==='correct'))return {ok:false,code:'forbidden'};
 let who;try{who=await deps.verifyIdentity();}catch{return {ok:false,code:'unavailable'};}
 if(!who||!who.emailVerified||!id(who.uid)||!id(who.sessionId))return {ok:false,code:'unauthenticated'};
 if(!who.active||(deps.portal==='admin'&&who.aal!=='aal2')||(deps.portal==='staff'&&!who.staff))return {ok:false,code:'forbidden'};
 const command=validateAttendance(action,raw,deps.portal);if(!command)return {ok:false,code:'invalid_request'};
 let fingerprint:string|null=null;
 if(write){try{fingerprint=deps.fingerprint(action,command);}catch{return {ok:false,code:'unavailable'};}if(!/^[a-f0-9]{64}$/.test(fingerprint??''))return {ok:false,code:'unavailable'};}
 try{await deps.consumeLimit(who.uid,write);}catch(e){return {ok:false,code:plain(e)&&e.code==='rate_limited'?'rate_limited':'unavailable'};}
 const uncertain=():AttendanceFailure=>write?{ok:false,code:'outcome_unknown',requestId:command.requestId as string}:{ok:false,code:'unavailable'};
 const name=action==='list'?'workforce_attendance_list':action==='correct'?'workforce_attendance_correct':'workforce_attendance_punch';
 const args={p_actor_uid:who.uid,p_session_id:who.sessionId,p_portal:deps.portal,p_command:command,...(write?{p_fingerprint:fingerprint,...(action==='correct'?{}:{p_action:action})}:{})};
 try{
  const reply=await deps.rpc(name,args);if(!reply||reply.error||!plain(reply.data))return uncertain();const data=reply.data;
  if(data.ok===false){if(typeof data.reason==='string'&&DENIALS.includes(data.reason as AttendanceCode))return {ok:false,code:data.reason as AttendanceCode};return uncertain();}
  if(data.ok!==true)return uncertain();
  if(action==='list'){
   if(!Array.isArray(data.items)||data.items.length>(command.limit as number))return uncertain();const items=data.items.map(projectAttendance);if(items.some(v=>v===null))return uncertain();
   let next=null;if(data.next!==null){if(!plain(data.next)||!day(data.next.workDate)||!id(data.next.attendanceId))return uncertain();next={workDate:data.next.workDate,attendanceId:data.next.attendanceId};}
   const rows=items as AttendanceRow[];
   // A malformed gateway response must not cross requested filters or smuggle an unrelated page.
   if(rows.some(v=>v.workDate<(command.from as string)||v.workDate>(command.to as string)||(command.clientId!==null&&v.clientId!==command.clientId)||(command.outletId!==null&&v.outletId!==command.outletId)))return uncertain();
   return {ok:true,page:{items:rows,next}};
  }
  const record=projectAttendance(data.record);if(!record||typeof data.replayed!=='boolean'||(action==='correct'?record.attendanceId!==command.attendanceId:record.shiftId!==command.shiftId))return uncertain();
  return {ok:true,record,replayed:data.replayed};
 }catch{return uncertain();}
}
