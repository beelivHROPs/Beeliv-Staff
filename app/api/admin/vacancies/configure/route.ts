import {handleVacancyConfiguration} from '@/lib/server/vacancies/config-handler';
import {vacancyConfigurationRuntime} from '@/lib/server/vacancies/config-runtime';
export const runtime='nodejs';
export async function POST(request:Request){
 try{const {deps,origin}=vacancyConfigurationRuntime();return await handleVacancyConfiguration(request,deps,origin);}
 catch{return Response.json({ok:false,error:{code:'unavailable',message:'Vacancy configuration is temporarily unavailable.'}},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
