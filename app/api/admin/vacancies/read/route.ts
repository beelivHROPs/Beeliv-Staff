import {handleVacancyRead} from '@/lib/server/vacancies/read-handler';
import {vacancyReadRuntime} from '@/lib/server/vacancies/read-runtime';
export const runtime='nodejs';
export async function POST(request:Request){
 try{const {deps,origin}=vacancyReadRuntime();return await handleVacancyRead(request,deps,origin);}
 catch{return Response.json({ok:false,error:{code:'unavailable',message:'Vacancies are temporarily unavailable.'}},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
