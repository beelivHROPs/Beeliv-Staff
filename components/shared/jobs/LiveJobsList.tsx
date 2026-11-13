import Link from 'next/link';
import {GlassIcon} from '@/components/shared/icons';
import {getLivePublicJobs} from '@/lib/server/public-jobs/runtime';
import {toLiveJobDisplay} from '@/lib/jobs/live-display';
import {JobCard} from '@/components/applicant/jobs/JobCard';
export type JobSearchParams=Record<string,string|string[]|undefined>;
/** Server pagination; no page is treated as a complete feed. */
export async function LiveJobsList({params,applicant=false}:{params:JobSearchParams;applicant?:boolean}){
 const one=(key:string,max:number)=>typeof params[key]==='string'&&params[key].length<=max?params[key] as string:'';
 const search=one('q',120),department=one('dept',100),location=one('loc',200),rawPage=one('page',5);
 const page=/^[1-9][0-9]{0,3}$/.test(rawPage)?Number(rawPage):1,base=applicant?'/applicant/jobs':'/jobs';
 const href=(next:number)=>{const p=new URLSearchParams();if(search)p.set('q',search);if(department)p.set('dept',department);if(location)p.set('loc',location);p.set('page',String(next));return `${base}?${p}`;};
 let data;
 try{data=await getLivePublicJobs({search,department,location,page,limit:20});}
 catch{return <div role="alert" className="ap-card rounded-2xl p-6"><p>We could not load jobs. Please try again.</p><Link href={href(page)} className="ap-btn ap-btn-p">Try again</Link></div>;}
 return <section aria-label="Job results" className="jc-public mx-auto max-w-6xl space-y-6 px-4 py-8">
  <form action={base} className="ap-card grid gap-4 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-4">
   <label className="text-sm font-semibold">Search jobs<input name="q" defaultValue={search} maxLength={120} className="ap-input mt-2 w-full" type="search" /></label>
   <label className="text-sm font-semibold">Location<input name="loc" defaultValue={location} maxLength={200} className="ap-input mt-2 w-full" /></label>
   <label className="text-sm font-semibold">Department<input name="dept" defaultValue={department} maxLength={100} className="ap-input mt-2 w-full" /></label>
   <div className="flex items-end gap-3"><button className="ap-btn ap-btn-p" type="submit">Search</button><Link href={base} className="ap-btn">Clear</Link></div>
  </form>
  <p role="status">{data.total} {data.total===1?'role':'roles'} found</p>
  {data.items.length?<div className="space-y-4">{data.items.map(item=>{const job=toLiveJobDisplay(item,data.asOf);return <JobCard key={job.id} job={job} state={null} showMatch={false} detailHref={`${base}/${item.slug}`} saveSlot={false}/>;})}</div>:<div className="ap-card rounded-2xl p-6"><GlassIcon name="jobs" size={80} /><h2 className="text-xl font-semibold">No roles here yet</h2><p>Try different filters or check back for new vacancies.</p></div>}
  <nav aria-label="Job result pages" className="flex items-center justify-between gap-4">{page>1?<Link href={href(page-1)} className="ap-btn">Previous</Link>:<span/>}<span>Page {page} of {Math.max(1,Math.ceil(data.total/20))}</span>{page*20<data.total?<Link href={href(page+1)} className="ap-btn">Next</Link>:<span/>}</nav>
 </section>;
}
