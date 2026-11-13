import {readPublicJobs,type PublicJobGateway} from './repository';
function fail(code:string,status:number){return Response.json({ok:false,error:{code,message:code==='invalid_request'?'Check the job filters and try again.':'Jobs are temporarily unavailable.'}},{status,headers:{'Cache-Control':'no-store'}});}
export async function handlePublicJobs(request:Request,enabled:boolean,gateway:()=>PublicJobGateway){
 if(!enabled)return fail('unavailable',503);
 const params=new URL(request.url).searchParams;
 const raw:Record<string,unknown>={};
 for(const [key,value]of params){
  if(Object.hasOwn(raw,key))return fail('invalid_request',400);
  if(key==='page'||key==='limit'){if(!/^[1-9][0-9]{0,4}$/.test(value))return fail('invalid_request',400);raw[key]=Number(value);}
  else if(key==='featured'){if(value!=='true'&&value!=='false')return fail('invalid_request',400);raw[key]=value==='true';}
  else Object.defineProperty(raw,key,{value,enumerable:true});
 }
 try{return Response.json({ok:true,...await readPublicJobs(raw,gateway())},{headers:{'Cache-Control':'no-store'}});}
 catch(error){return fail(error instanceof Error&&error.message==='invalid_request'?'invalid_request':'unavailable',error instanceof Error&&error.message==='invalid_request'?400:503);}
}
