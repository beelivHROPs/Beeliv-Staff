import {validateVacancyInput,type ValidatedVacancyInput} from './validation';
import {validateVacancyConfiguration} from './config-validation';
import type {VacancyWriteIdentity} from './write-service';
export type AdminReadInput={mode:'list'|'detail'|'config';id:string|null;query:{page:number;pageSize:number;search:string;status:string;tab:string;department:string;clientId:string;recruiterId:string;sort:string}};
export type AdminReadDependencies={enabled:boolean;verifyIdentity():Promise<VacancyWriteIdentity>;consumeLimit(uid:string):Promise<void>;read(args:{p_actor_uid:string;p_session_id:string;p_mode:string;p_id:string|null;p_query:AdminReadInput['query']}):Promise<{data:unknown;error:unknown}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const states=['draft','pending-approval','published','paused','closed','filled','cancelled'];
const displayStates=[...states,'closing-soon'];
function record(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;}
function invalid():never{throw new Error('unavailable');}
export function parseAdminRead(raw:Record<string,unknown>):AdminReadInput{
 if(Object.keys(raw).some(k=>!['mode','id','page','pageSize','search','status','tab','department','clientId','recruiterId','sort'].includes(k)))throw new Error('invalid_request');
 const mode=raw.mode??'list',id=raw.id??null,page=raw.page??1,pageSize=raw.pageSize??20,search=raw.search??'',status=raw.status??'';
 if(!['list','detail','config'].includes(String(mode))||!(mode==='detail'?typeof id==='string'&&uuid.test(id):id===null)||!Number.isSafeInteger(page)||Number(page)<1||Number(page)>9999||!Number.isSafeInteger(pageSize)||Number(pageSize)<1||Number(pageSize)>50||typeof search!=='string'||search.length>120||/[\u0000-\u001f]/.test(search)||typeof status!=='string'||status!==''&&!displayStates.includes(status))throw new Error('invalid_request');
 const tab=raw.tab??'all',department=raw.department??'',clientId=raw.clientId??'',recruiterId=raw.recruiterId??'',sort=raw.sort??'newest';
 if(typeof tab!=='string'||!['all','open','draft','pending','paused','ended'].includes(tab)||typeof department!=='string'||department.length>100||/[\u0000-\u001f]/.test(department)||typeof clientId!=='string'||clientId!==''&&!uuid.test(clientId)||typeof recruiterId!=='string'||recruiterId!==''&&recruiterId!=='none'&&!uuid.test(recruiterId)||typeof sort!=='string'||!['newest','oldest','closing','title'].includes(sort))throw new Error('invalid_request');
 return {mode:mode as AdminReadInput['mode'],id:typeof id==='string'?id.toLowerCase():null,query:{page:Number(page),pageSize:Number(pageSize),search:search.trim(),status,tab,department:department.trim(),clientId:clientId.toLowerCase(),recruiterId:recruiterId.toLowerCase(),sort}};
}
function named(v:unknown){if(!record(v)||typeof v.id!=='string'||!uuid.test(v.id)||typeof v.name!=='string'||v.name.length>200)return invalid();return {id:v.id,name:v.name};}
function date(v:unknown,nullable=false):string|null{if(nullable&&v===null)return null;if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))return invalid();return v;}
export type AdminVacancyRecord={id:string;revision:number;reference:string;slug:string;status:string;storedStatus:string;postedAt:string|null;closesOn:string;endedAt:string|null;client:{id:string;name:string};outlet:{id:string;name:string}|null;recruiter:{id:string;name:string}|null;input:ValidatedVacancyInput;activity:{id:string;at:string;actor:string;action:string;from:string|null;to:string;reason:string|null}[]};
function vacancy(r:unknown):AdminVacancyRecord{
 if(!record(r)||typeof r.id!=='string'||!uuid.test(r.id)||!Number.isSafeInteger(r.revision)||Number(r.revision)<1||typeof r.reference!=='string'||r.reference.length>64||typeof r.slug!=='string'||r.slug.length>180||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug)||typeof r.status!=='string'||!displayStates.includes(r.status)||typeof r.storedStatus!=='string'||!states.includes(r.storedStatus)||typeof r.closesOn!=='string'||!Array.isArray(r.activity)||r.activity.length>100)return invalid();
 const parsed=validateVacancyInput(r.snapshot);if(!parsed.ok)return invalid();
 const client=named(r.client),outlet=r.outlet===null?null:named(r.outlet),recruiter=r.recruiter===null?null:named(r.recruiter);
 if(client.id!==parsed.value.clientId||(outlet?.id??null)!==parsed.value.outletId||(recruiter?.id??null)!==parsed.value.recruiterId||r.closesOn!==parsed.value.closesOn)return invalid();
 const activity=r.activity.map((a:unknown)=>{if(!record(a)||typeof a.id!=='string'||!uuid.test(a.id)||typeof a.actor!=='string'||a.actor.length>200||typeof a.action!=='string'||!['created','edited','submitted','published','resumed','paused','closed','filled','cancelled'].includes(a.action)||!(a.from===null||typeof a.from==='string'&&states.includes(a.from))||typeof a.to!=='string'||!states.includes(a.to)||!(a.reason===null||typeof a.reason==='string'&&a.reason.length<=2000))return invalid();return {id:a.id,at:date(a.at)!,actor:a.actor,action:a.action,from:a.from,to:a.to,reason:a.reason};});
 return {id:r.id,revision:Number(r.revision),reference:r.reference,slug:r.slug,status:r.status,storedStatus:r.storedStatus,postedAt:date(r.postedAt,true),endedAt:date(r.endedAt,true),closesOn:r.closesOn,client,outlet,recruiter,input:parsed.value,activity};
}
function summary(r:unknown){
 if(!record(r)||typeof r.id!=='string'||!uuid.test(r.id)||!Number.isSafeInteger(r.revision)||Number(r.revision)<1||typeof r.reference!=='string'||r.reference.length>64||typeof r.status!=='string'||!displayStates.includes(r.status)||typeof r.storedStatus!=='string'||!states.includes(r.storedStatus)||typeof r.title!=='string'||r.title.length>160||typeof r.department!=='string'||r.department.length>100||typeof r.location!=='string'||r.location.length>200||typeof r.employmentType!=='string'||r.employmentType.length>100||!Number.isSafeInteger(r.openings)||Number(r.openings)<1||typeof r.closesOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.closesOn))return invalid();
 return {id:r.id,revision:Number(r.revision),reference:r.reference,status:r.status,storedStatus:r.storedStatus,title:r.title,department:r.department,location:r.location,employmentType:r.employmentType,openings:Number(r.openings),closesOn:r.closesOn,postedAt:date(r.postedAt,true),endedAt:date(r.endedAt,true),client:named(r.client),outlet:r.outlet===null?null:named(r.outlet),recruiter:r.recruiter===null?null:named(r.recruiter)};
}
export async function readAdminVacancies(raw:Record<string,unknown>,deps:AdminReadDependencies){
 if(!deps.enabled)throw new Error('unavailable');
 const identity=await deps.verifyIdentity();
 if(!identity?.emailVerified||!uuid.test(identity.uid)||!uuid.test(identity.sessionId))throw new Error('unauthenticated');
 if(identity.aal!=='aal2')throw new Error('mfa_required');
 const input=parseAdminRead(raw);await deps.consumeLimit(identity.uid);
 const response=await deps.read({p_actor_uid:identity.uid,p_session_id:identity.sessionId,p_mode:input.mode,p_id:input.id,p_query:input.query});
 const d=record(response.data)?response.data:null;
 if(response.error||!d)return invalid();if(d.ok===false&&d.reason==='no_access')throw new Error('no_access');
 if(d.ok!==true||d.mode!==input.mode||!record(d.permissions)||!['hr_officer','hr_manager','head_of_operations'].includes(String(d.role)))return invalid();
 const can=(key:string)=>d.role!=='hr_officer'&&(d.permissions as Record<string,unknown>)[key]===true;
 const capabilities={canCreate:can('vacancy.create'),canEdit:can('vacancy.edit'),canPublish:can('vacancy.publish'),canSubmitForApproval:can('vacancy.submit'),canPause:can('vacancy.pause'),canClose:can('vacancy.close'),canMarkFilled:can('vacancy.mark_filled'),canCancel:can('vacancy.cancel')};
 const asOf=date(d.asOf)!;
 if(input.mode==='config'){
  if(typeof d.configurationReady!=='boolean'||!Array.isArray(d.clients))return invalid();
  const configRevision=d.configRevision??0;
  if(!Number.isSafeInteger(configRevision)||Number(configRevision)<0||Number(configRevision)>2147483646)return invalid();
  let configuration=null;
  if(Number(configRevision)>0){const parsed=validateVacancyConfiguration(d.configuration);if(!parsed.ok||d.configurationReady!==parsed.value.documentDefaultsReviewed)return invalid();configuration=parsed.value;}
  else if(d.configurationReady!==false||d.configuration!=null)return invalid();
  return {ok:true as const,mode:'config' as const,configRevision:Number(configRevision),configurationReady:d.configurationReady,configuration,
   clients:d.clients.map((c:unknown)=>{const n=named(c);if(!record(c)||!Array.isArray(c.outlets))return invalid();return {...n,outlets:c.outlets.map(named)};}),
   capabilities:{...capabilities,canCreate:capabilities.canCreate&&d.configurationReady,canPublish:capabilities.canPublish&&d.configurationReady},asOf};
 }
 if(!Array.isArray(d.items)||d.items.length>(input.mode==='detail'?1:input.query.pageSize)||!Number.isSafeInteger(d.total)||Number(d.total)<d.items.length||d.page!==input.query.page||d.pageSize!==input.query.pageSize)return invalid();
 const items=input.mode==='detail'?d.items.map(vacancy):d.items.map(summary);if(new Set(items.map(i=>i.id)).size!==items.length||input.mode==='detail'&&items.some(i=>i.id!==input.id))return invalid();
 if(input.mode==='list'){
  const tabs=['all','open','draft','pending','paused','ended'];
  if(!record(d.tabCounts)||Object.keys(d.tabCounts).length!==tabs.length||tabs.some(k=>!Number.isSafeInteger((d.tabCounts as Record<string,unknown>)[k])||Number((d.tabCounts as Record<string,unknown>)[k])<0)||!record(d.facets)||!Array.isArray(d.facets.departments)||!Array.isArray(d.facets.clients)||!Array.isArray(d.facets.recruiters)||typeof d.workspaceEmpty!=='boolean')return invalid();
  const tabCounts=Object.fromEntries(tabs.map(k=>[k,Number((d.tabCounts as Record<string,unknown>)[k])]));
  if(tabCounts.all!==tabs.slice(1).reduce((sum,k)=>sum+tabCounts[k],0)||tabCounts[input.query.tab]!==d.total||d.workspaceEmpty&&tabCounts.all!==0)return invalid();
  const departments=d.facets.departments.map((s:unknown)=>{if(typeof s!=='string'||s.length>100)return invalid();return s;});
  const clients=d.facets.clients.map(named),recruiters=d.facets.recruiters.map(named);
  if(new Set(departments).size!==departments.length||new Set(clients.map(c=>c.id)).size!==clients.length||new Set(recruiters.map(r=>r.id)).size!==recruiters.length)return invalid();
  return {ok:true as const,mode:'list' as const,items,total:Number(d.total),page:input.query.page,pageSize:input.query.pageSize,tabCounts,facets:{departments,clients,recruiters},workspaceEmpty:d.workspaceEmpty,capabilities,asOf};
 }
 return {ok:true as const,mode:input.mode,items,total:Number(d.total),page:input.query.page,pageSize:input.query.pageSize,capabilities,asOf};
}
