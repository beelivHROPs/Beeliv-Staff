import 'server-only';
import {getLivePublicJobs} from './runtime';
import {toLiveJobDisplay} from '../../jobs/live-display';
import type {JobIntent} from '../../public-site/job-intent';
/** Resolves a real ID/slug without consulting sample records. Eligibility is rechecked on submission. */
export async function resolveLiveJobIntent(raw:string|string[]|undefined):Promise<JobIntent>{
 const id=Array.isArray(raw)?raw[0]:raw;
 if(!id)return {job:null,notice:null};
 if(!/^[a-zA-Z0-9-]{1,180}$/.test(id))return {job:null,notice:'That vacancy is not available. You can continue and browse other roles.'};
 try{
  const result=await getLivePublicJobs({lookup:id,limit:1}),source=result.items[0];
  if(!source||source.availability==='closed')return {job:null,notice:'That vacancy is no longer accepting applications. You can browse other roles.'};
  const job=toLiveJobDisplay(source,result.asOf);
  return {job:{id:job.id,role:job.role,company:job.company,location:job.location,employmentType:job.employmentType,department:job.department,postedLabel:job.postedLabel,postedDaysAgo:job.daysAgo,href:job.publicHref,image:job.image,state:job.state,closesOn:job.closesOn},notice:'Online applications are not available yet. You can continue creating your account.'};
 }catch{return {job:null,notice:'We could not check the vacancy. You can continue and browse jobs later.'};}
}
