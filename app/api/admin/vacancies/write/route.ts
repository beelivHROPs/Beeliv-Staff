import {handleVacancyWrite} from '@/lib/server/vacancies/handler';
import {vacancyWriteRuntime} from '@/lib/server/vacancies/runtime';
export const runtime='nodejs';
export async function POST(request:Request){
 try{const {deps,origin}=vacancyWriteRuntime();return await handleVacancyWrite(request,deps,origin);}
 catch{return Response.json({ok:false,error:{code:'unavailable',message:'Vacancy saving is temporarily unavailable.'}},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
