import {projectPublicVacancy,type PublicVacancy} from './projection';
import {validateVacancyInput} from '../vacancies/validation';
import {STEP_META} from '../../journeys/types';
export type PublicJobQuery={search:string;department:string;location:string;page:number;limit:number;lookup:string|null;featured:boolean};
export type PublishedVacancy=PublicVacancy&{slug:string};
export type PublicJobPage={items:PublishedVacancy[];total:number;page:number;limit:number;asOf:string};
export type PublicJobGateway={read(query:PublicJobQuery):Promise<{data:unknown;error:unknown}>};
function record(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parsePublicJobQuery(raw:Record<string,unknown>):PublicJobQuery{
 if(Object.keys(raw).some(k=>!['search','department','location','page','limit','lookup','featured'].includes(k)))throw new Error('invalid_request');
 const text=(key:string,max:number)=>{const value=raw[key]??'';if(typeof value!=='string'||value.length>max||/[\u0000-\u001f]/.test(value))throw new Error('invalid_request');return value.trim();};
 const page=raw.page??1,limit=raw.limit??20,lookup=raw.lookup??null,featured=raw.featured??false;
 if(!Number.isSafeInteger(page)||Number(page)<1||Number(page)>10000||!Number.isSafeInteger(limit)||Number(limit)<1||Number(limit)>50||typeof featured!=='boolean'||!(lookup===null||typeof lookup==='string'&&lookup.length>=1&&lookup.length<=180&&/^[a-zA-Z0-9-]+$/.test(lookup)))throw new Error('invalid_request');
 return {search:text('search',120),department:text('department',100),location:text('location',200),page:Number(page),limit:Number(limit),lookup,featured};
}
export async function readPublicJobs(raw:Record<string,unknown>,gateway:PublicJobGateway):Promise<PublicJobPage>{
 const query=parsePublicJobQuery(raw);
 let response:Awaited<ReturnType<PublicJobGateway['read']>>;
 try{response=await gateway.read(query);}catch{throw new Error('public_jobs_unavailable');}
 const d=response&&record(response.data)?response.data:null;
 if(response?.error||!d||d.ok!==true||typeof d.asOf!=='string'||!Number.isFinite(Date.parse(d.asOf))||!Number.isSafeInteger(d.total)||Number(d.total)<0||!Array.isArray(d.items)||d.items.length>query.limit||d.items.length>Number(d.total))throw new Error('public_jobs_unavailable');
 const now=new Date(d.asOf),seen=new Set<string>();
 const items=d.items.map((r:unknown):PublishedVacancy=>{
  if(!record(r)||typeof r.id!=='string'||!uuid.test(r.id)||seen.has(r.id)||typeof r.reference!=='string'||r.reference.length>64||typeof r.slug!=='string'||r.slug.length>180||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug)||typeof r.companyName!=='string'||r.companyName.length>200||!['published','closed'].includes(String(r.status))||typeof r.postedAt!=='string'||typeof r.closesOn!=='string'||!(r.endedAt===null||typeof r.endedAt==='string'))throw new Error('public_jobs_unavailable');
  const parsed=validateVacancyInput(r.snapshot);if(!parsed.ok)throw new Error('public_jobs_unavailable');
  const v=parsed.value;
  const projection=projectPublicVacancy({...v,id:r.id,reference:r.reference,client:{id:v.clientId,name:r.companyName},status:String(r.status),postedAt:r.postedAt,closesOn:r.closesOn,endedAt:r.endedAt,recruitmentProcess:v.journey.map(step=>step.kind==='interview'?step.interview?.stageName??STEP_META[step.kind].label:STEP_META[step.kind].label)},now);
  if(!projection||query.featured&&projection.availability==='closed')throw new Error('public_jobs_unavailable');
  seen.add(r.id);return {...projection,slug:r.slug};
 });
 return {items,total:Number(d.total),page:query.page,limit:query.limit,asOf:now.toISOString()};
}
