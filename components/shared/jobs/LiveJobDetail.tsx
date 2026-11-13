import Link from 'next/link';
import type {PublishedVacancy} from '@/lib/server/public-jobs/repository';
import {CheckList,FactGrid} from '@/components/applicant/jobs/JobDetailSections';
/** Real content only; no sample journey, screening or schedule enrichment. */
export function LiveJobDetail({job,applicant=false}:{job:PublishedVacancy;applicant?:boolean}){
 const section=(title:string,items:string[])=>items.length?<section className="space-y-3"><h2 className="text-xl font-semibold">{title}</h2><CheckList items={items}/></section>:null;
 const labels={workingDays:'Working days',shiftSystem:'Shift system',hours:'Hours',weekends:'Weekends',publicHolidays:'Public holidays'};
 const conditions=Object.entries(job.conditions).filter(([,v])=>v.trim()).map(([key,value])=>[labels[key as keyof typeof labels],value] as [string,string]);
 const money=(amount:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(amount);
 return <main className="jc-public mx-auto max-w-5xl space-y-8 px-4 py-8">
  <Link href={applicant?'/applicant/jobs':'/jobs'} className="ap-btn">Back to jobs</Link>
  <header className="space-y-3"><p>{job.companyName} · {job.location}</p><h1 className="text-3xl font-semibold">{job.title}</h1><p>{job.department} · {job.employmentType}</p><p>{job.availability==='closed'?'Applications closed':job.availability==='closing-soon'?'Closing soon':'Open vacancy'}</p></header>
  <div className="ap-card rounded-2xl p-6"><FactGrid rows={[
   [job.availability==='closed'?'Applications':'Applications close',job.availability==='closed'?'Closed':job.closesOn],['Openings',String(job.openings)],['Experience',job.experience.summary||`${job.experience.minYears}${job.experience.maxYears===undefined?'+':`–${job.experience.maxYears}`} years`],
   ['Salary',!job.salary||job.salary.min===null?'Not published':`${money(job.salary.min)}${job.salary.max!==null?` – ${money(job.salary.max)}`:''} / ${job.salary.frequency.toLowerCase()}${job.salary.negotiable?' (negotiable)':''}`],
   ...(job.expectedResumption?[['Starts',job.expectedResumption] as [string,string]]:[]),['Job reference',job.reference],
  ]}/></div>
  {job.about?<section><h2 className="mb-3 text-xl font-semibold">About the role</h2><p className="whitespace-pre-line">{job.about}</p></section>:null}
  {section('Key responsibilities',job.responsibilities)}{section('Essential requirements',job.essential)}{section('Preferred requirements',job.preferred)}{section('Skills',job.skills)}
  {conditions.length?<section><h2 className="mb-3 text-xl font-semibold">Working conditions</h2><FactGrid rows={conditions}/></section>:null}
  {section('Benefits',job.benefits.map(b=>`${b.kind}: ${b.detail}`))}{section('Documents at application',job.requiredDocuments.atApplication)}{section('Documents after selection',job.requiredDocuments.afterSelection)}
  {job.recruitmentProcess.length?<section><h2 className="mb-3 text-xl font-semibold">Recruitment process</h2><ol className="list-inside list-decimal space-y-2">{job.recruitmentProcess.map((step,i)=><li key={i}>{step}</li>)}</ol></section>:null}
  <p role="status" className="ap-card rounded-2xl p-4">{job.availability==='closed'?'This vacancy is no longer accepting applications.':'Online applications are not available yet. Please check back.'}</p>
 </main>;
}
