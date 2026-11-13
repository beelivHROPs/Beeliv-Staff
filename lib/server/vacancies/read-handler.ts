import {readAdminVacancies,type AdminReadDependencies} from './read-service';
import {readVacancyJson} from './handler';
import {projectAdminVacancyDetail} from './frontend-projection';
const messages:Record<string,string>={unavailable:'Vacancies are temporarily unavailable.',invalid_request:'Check the vacancy filters and try again.',forbidden:'This request is not allowed.',unauthenticated:'Sign in to continue.',mfa_required:'Complete verification to continue.',no_access:'You do not have access to these vacancies.',rate_limited:'Too many requests. Please wait before trying again.'};
function fail(code:string,status:number){return Response.json({ok:false,error:{code,message:messages[code]}},{status,headers:{'Cache-Control':'private, no-store',...(code==='rate_limited'?{'Retry-After':'300'}:{})}});}
export async function handleVacancyRead(request:Request,deps:AdminReadDependencies,origin:string){
 if(!deps.enabled)return fail('unavailable',503);
 if(request.method!=='POST'||!origin||request.headers.get('origin')!==origin||new URL(request.url).origin!==origin||request.headers.get('sec-fetch-site')==='cross-site')return fail('forbidden',403);
 let raw:unknown;try{raw=await readVacancyJson(request,24000);}catch{return fail('invalid_request',400);}
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return fail('invalid_request',400);
 try{
  const result=await readAdminVacancies(raw as Record<string,unknown>,deps);
  if(result.mode==='detail'){
   const source=result.items[0];if(source&&!('input' in source))throw new Error('unavailable');
   return Response.json({ok:true,mode:'detail',record:source?projectAdminVacancyDetail(source,result.capabilities,result.asOf):null,capabilities:result.capabilities,asOf:result.asOf},{headers:{'Cache-Control':'private, no-store'}});
  }
  if(result.mode==='list'){
   const {items,...metadata}=result;
   return Response.json({...metadata,rows:items.map(row=>({...row,counts:null,countsReady:false}))},{headers:{'Cache-Control':'private, no-store'}});
  }
  return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
 }
 catch(error){const code=error instanceof Error&&Object.hasOwn(messages,error.message)?error.message:'unavailable';return fail(code,code==='invalid_request'?400:code==='unauthenticated'?401:code==='forbidden'||code==='no_access'||code==='mfa_required'?403:code==='rate_limited'?429:503);}
}
