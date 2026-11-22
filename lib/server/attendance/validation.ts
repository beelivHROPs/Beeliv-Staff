import type {AttendanceAction,AttendancePortal} from './types';
export const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function plain(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;}
export function id(v:unknown):v is string{return typeof v==='string'&&UUID.test(v);}
export function day(v:unknown):v is string{return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
export function stamp(v:unknown):v is string{return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&day(v.slice(0,10))&&Number.isFinite(Date.parse(v));}
function keys(v:Record<string,unknown>,required:string[],optional:string[]=[]){return required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));}
export function validateAttendance(action:AttendanceAction,raw:unknown,portal:AttendancePortal):Record<string,unknown>|null{
 if(!plain(raw))return null;
 if(action==='list'){
  if(!keys(raw,['from','to'],['limit','after','clientId','outletId'])||!day(raw.from)||!day(raw.to)||raw.to<raw.from||(Date.parse(raw.to)-Date.parse(raw.from))/86400000>30)return null;
  const limit=raw.limit??50;if(!Number.isSafeInteger(limit)||(limit as number)<1||(limit as number)>100)return null;
  for(const key of ['clientId','outletId'])if(raw[key]!==undefined&&!id(raw[key]))return null;
  if(portal==='staff'&&(raw.clientId!==undefined||raw.outletId!==undefined))return null;
  let after=null;if(raw.after!==undefined&&raw.after!==null){if(!plain(raw.after)||!keys(raw.after,['workDate','attendanceId'])||!day(raw.after.workDate)||!id(raw.after.attendanceId))return null;after={workDate:raw.after.workDate,attendanceId:raw.after.attendanceId.toLowerCase()};}
  return {from:raw.from,to:raw.to,limit,after,clientId:raw.clientId??null,outletId:raw.outletId??null};
 }
 if(action==='check-in'||action==='check-out'){
  if(portal!=='staff'||!keys(raw,['requestId','shiftId'])||!id(raw.requestId)||!id(raw.shiftId))return null;
  return {requestId:raw.requestId.toLowerCase(),shiftId:raw.shiftId.toLowerCase()};
 }
 if(action==='correct'){
  if(portal!=='admin'||!keys(raw,['requestId','attendanceId','expectedRevision','checkedInAt','checkedOutAt','reason'])||!id(raw.requestId)||!id(raw.attendanceId)||!Number.isSafeInteger(raw.expectedRevision)||(raw.expectedRevision as number)<1||(raw.expectedRevision as number)>1000000||!stamp(raw.checkedInAt)||(raw.checkedOutAt!==null&&!stamp(raw.checkedOutAt)))return null;
  if(raw.checkedOutAt!==null&&Date.parse(raw.checkedOutAt as string)<=Date.parse(raw.checkedInAt))return null;
  if(typeof raw.reason!=='string'||raw.reason.trim().length<3||raw.reason.trim().length>500||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(raw.reason))return null;
  return {requestId:raw.requestId.toLowerCase(),attendanceId:raw.attendanceId.toLowerCase(),expectedRevision:raw.expectedRevision,checkedInAt:new Date(raw.checkedInAt).toISOString(),checkedOutAt:raw.checkedOutAt===null?null:new Date(raw.checkedOutAt as string).toISOString(),reason:raw.reason.trim()};
 }
 return null;
}
