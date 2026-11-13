import { writeVacancy, type VacancyWriteDependencies } from './write-service';
const MAX_BYTES = 280000;
const messages: Record<string,string> = {
 invalid_request: 'Check the vacancy details and try again.', unauthenticated: 'Sign in to continue.',
 mfa_required: 'Complete verification to continue.', no_access: 'You do not have access to this vacancy.',
 conflict: 'This vacancy changed. Reload before making another change.', invalid_transition: 'This action is no longer available.',
 publication_not_ready: 'This job is not ready to publish. Check its required content and features.',
 rate_limited: 'Too many requests. Please wait before trying again.',
 outcome_unknown: 'We could not confirm this save. Reload to check before trying again.',
 unavailable: 'Vacancy saving is temporarily unavailable.', forbidden: 'This request is not allowed.',
};
function fail(code:string,status:number,extra:Record<string,unknown>={}) {
 return Response.json({ok:false,error:{code,message:messages[code]??messages.unavailable,...extra}}, {status,headers:{'Cache-Control':'private, no-store',...(code==='rate_limited'?{'Retry-After':'300'}:{})}});
}
export async function readVacancyJson(request:Request,maxBytes=MAX_BYTES):Promise<unknown> {
 if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json') throw new Error('invalid_request');
 if(Number(request.headers.get('content-length'))>maxBytes) throw new Error('invalid_request');
 const reader=request.body?.getReader();if(!reader)throw new Error('invalid_request');
 let size=0;const chunks:Uint8Array[]=[];
 try {for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new Error('invalid_request');}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export async function handleVacancyWrite(request:Request,deps:VacancyWriteDependencies,origin:string):Promise<Response>{
 if(!deps.enabled)return fail('unavailable',503);
 if(request.method!=='POST')return fail('forbidden',405);
 if(!origin||request.headers.get('origin')!==origin||new URL(request.url).origin!==origin||request.headers.get('sec-fetch-site')==='cross-site')return fail('forbidden',403);
 let raw:unknown;try{raw=await readVacancyJson(request);}catch{return fail('invalid_request',400);}
 const result=await writeVacancy(raw,deps);
 if(result.ok)return Response.json(result,{status:200,headers:{'Cache-Control':'private, no-store'}});
 const status=result.code==='unauthenticated'?401:result.code==='no_access'||result.code==='mfa_required'?403:result.code==='rate_limited'?429:result.code==='conflict'||result.code==='invalid_transition'?409:result.code==='unavailable'||result.code==='outcome_unknown'?503:400;
 return fail(result.code,status,{...(result.fields?{fields:result.fields}:{}),...(result.requestId?{requestId:result.requestId}:{})});
}
