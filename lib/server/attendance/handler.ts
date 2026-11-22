import type {AttendanceAction,AttendanceCode,AttendanceDependencies} from './types';
import {attendanceAction} from './service';
const HEADERS={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const STATUS:Record<AttendanceCode,number>={unavailable:503,unauthenticated:401,forbidden:403,invalid_request:400,rate_limited:429,not_found:404,conflict:409,stale:409,outcome_unknown:503};
const MESSAGES:Record<AttendanceCode,string>={unavailable:'Attendance is temporarily unavailable.',unauthenticated:'Sign in to continue.',forbidden:'You do not have access to this attendance action.',invalid_request:'Check the attendance details and try again.',rate_limited:'Please wait before trying again.',not_found:'This attendance record is not available.',conflict:'Refresh attendance before trying again.',stale:'This record has changed. Refresh before editing.',outcome_unknown:'Check attendance before retrying this action.'};
function fail(code:AttendanceCode){return Response.json({ok:false,error:{code,message:MESSAGES[code]}},{status:STATUS[code],headers:HEADERS});}
async function json(request:Request):Promise<unknown>{
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw Error();
 const length=request.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>4096))throw Error();
 const reader=request.body?.getReader();if(!reader)throw Error();const parts:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw Error();}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.byteLength;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export async function handleAttendance(request:Request,action:string,config:{origin:string;deps:AttendanceDependencies}):Promise<Response>{
 if(!config.deps.enabled)return fail('unavailable');
 if(request.method!=='POST')return Response.json({ok:false},{status:405,headers:{...HEADERS,Allow:'POST'}});
 if(!['list','check-in','check-out','correct'].includes(action))return Response.json({ok:false},{status:404,headers:HEADERS});
 let origin;try{origin=new URL(request.url).origin;}catch{return fail('forbidden');}
 if(!config.origin||origin!==config.origin||request.headers.get('origin')!==config.origin||request.headers.get('sec-fetch-site')==='cross-site')return fail('forbidden');
 let input;try{input=await json(request);}catch{return fail('invalid_request');}
 try{const result=await attendanceAction(action as AttendanceAction,input,config.deps);if(result.ok)return Response.json(result,{headers:HEADERS});const response=fail(result.code);if(result.requestId)return Response.json({ok:false,error:{code:result.code,message:MESSAGES[result.code]},requestId:result.requestId},{status:STATUS[result.code],headers:HEADERS});return response;}catch{return fail('unavailable');}
}
