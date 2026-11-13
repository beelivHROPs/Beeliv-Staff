import {saveVacancyConfiguration,type VacancyConfigurationDependencies} from './config-service';
import {readVacancyJson} from './handler';
const messages:Record<string,string>={unavailable:'Vacancy configuration is temporarily unavailable.',invalid_request:'Check the configuration and try again.',forbidden:'This request is not allowed.',unauthenticated:'Sign in to continue.',mfa_required:'Complete verification to continue.',no_access:'You do not have access to change this configuration.',conflict:'The configuration changed. Reload before saving.',rate_limited:'Too many requests. Please wait before trying again.',outcome_unknown:'We could not confirm this save. Reload to check before trying again.'};
function fail(code:string,status:number,extra:Record<string,unknown>={}){return Response.json({ok:false,error:{code,message:messages[code],...extra}},{status,headers:{'Cache-Control':'private, no-store',...(code==='rate_limited'?{'Retry-After':'300'}:{})}});}
export async function handleVacancyConfiguration(request:Request,deps:VacancyConfigurationDependencies,origin:string){
 if(!deps.enabled)return fail('unavailable',503);
 if(request.method!=='POST'||!origin||request.headers.get('origin')!==origin||new URL(request.url).origin!==origin||request.headers.get('sec-fetch-site')==='cross-site')return fail('forbidden',403);
 let raw:unknown;try{raw=await readVacancyJson(request,140000);}catch{return fail('invalid_request',400);}
 const result=await saveVacancyConfiguration(raw,deps);
 if(result.ok)return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
 return fail(result.code,result.code==='invalid_request'?400:result.code==='unauthenticated'?401:result.code==='mfa_required'||result.code==='no_access'?403:result.code==='conflict'?409:result.code==='rate_limited'?429:503,
  {...(result.fields?{fields:result.fields}:{}),...(result.requestId?{requestId:result.requestId}:{})});
}
