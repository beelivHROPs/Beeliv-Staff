import {attendanceRuntime} from '@/lib/server/attendance/runtime';
import {handleAttendance} from '@/lib/server/attendance/handler';
export const runtime='nodejs';
export async function POST(request:Request,context:{params:Promise<{action:string}>}){
 try{const {action}=await context.params;return await handleAttendance(request,action,attendanceRuntime('staff'));}
 catch{return Response.json({ok:false,error:{code:'unavailable',message:'Attendance is temporarily unavailable.'}},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
