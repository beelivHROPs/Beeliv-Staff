'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {readVacancies,type VacancyReadConfiguration} from '@/lib/admin/vacancies/read-client';
import {submitVacancyConfiguration} from '@/lib/admin/vacancies/config-client';
const lines=(value:string)=>value.split('\n').map(v=>v.trim()).filter(Boolean);
const empty=():VacancyReadConfiguration=>({departments:[],employmentTypes:[],benefitKinds:[],defaultRequiredDocuments:{atApplication:[],afterSelection:[]},documentDefaultsReviewed:false});
/** Versioned settings; historical departments are retired rather than renamed/deleted. */
export function VacancySettings(){
 const [config,setConfig]=useState<VacancyReadConfiguration|null>(null),[revision,setRevision]=useState(0),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0);
 const [originalIds,setOriginalIds]=useState(new Set<string>()),[uncertain,setUncertain]=useState(false);
 const pending=useRef<{requestId:string;signature:string}|null>(null);
 useEffect(()=>{let active=true;readVacancies({mode:'config'}).then(result=>{
  if(!active)return;
  if(!result.ok||result.mode!=='config'){setMessage('Vacancy settings could not be loaded. Check your access and try again.');return;}
  const next=result.configuration??empty();setOriginalIds(new Set(next.departments.map(d=>d.id)));pending.current=null;setUncertain(false);setConfig(next);setRevision(result.configRevision);setMessage('');
 });return()=>{active=false;};},[reload]);
 const change=(next:VacancyReadConfiguration)=>{if(!busy&&!pending.current)setConfig(next);};
 async function save(form:HTMLFormElement){
  if(!config||busy)return;
  const data=new FormData(form);
  const next=pending.current?config:{...config,employmentTypes:lines(String(data.get('employmentTypes')??'')),benefitKinds:lines(String(data.get('benefitKinds')??'')),defaultRequiredDocuments:{atApplication:lines(String(data.get('atApplication')??'')),afterSelection:lines(String(data.get('afterSelection')??''))}};
  const signature=JSON.stringify({expectedRevision:revision,configuration:next});
  if(pending.current&&pending.current.signature!==signature){setMessage('Reload settings to check the previous save before changing them.');return;}
  pending.current??={requestId:crypto.randomUUID(),signature};setConfig(next);setBusy(true);setMessage('');
  const result=await submitVacancyConfiguration({requestId:pending.current.requestId,expectedRevision:revision,configuration:next});
  setBusy(false);
  if(result.ok){pending.current=null;setUncertain(false);setRevision(result.revision);setOriginalIds(new Set(config.departments.map(d=>d.id)));setMessage('Vacancy settings saved.');return;}
  if(result.code!=='outcome_unknown')pending.current=null;
  setUncertain(result.code==='outcome_unknown');
  setMessage(result.code==='outcome_unknown'?'We could not confirm the save. Retry the same save or reload to check.':result.code==='conflict'?'Settings changed. Reload before editing again.':result.code==='invalid_request'?'Check the settings. At least one active department and employment type are required; labels must be unique.':'Settings could not be saved. Check your access and try again.');
 }
 const locked=busy||uncertain;
 return <div className="mx-auto max-w-3xl space-y-6">
  <Link href="/admin/recruitment/vacancies" className="ap-btn">Back to vacancies</Link><h1 className="text-3xl font-semibold">Vacancy settings</h1>
  <p>Set the choices available when creating vacancies. Retire an existing department to keep its history; add a new department when its name changes.</p>
  {message?<p role="status" className="ap-card rounded-2xl p-4">{message}</p>:null}
  {!config?<button type="button" className="ap-btn" onClick={()=>setReload(v=>v+1)}>Reload settings</button>:<form key={revision} className="ap-card space-y-6 rounded-2xl p-6" onSubmit={e=>{e.preventDefault();void save(e.currentTarget);}}>
   <fieldset disabled={locked} className="space-y-4"><legend className="mb-3 text-xl font-semibold">Departments</legend>
    {config.departments.map((department,index)=><div key={department.id} className="flex flex-wrap items-center gap-3">
     <label className="min-w-0 flex-1">Department name<input value={department.name} maxLength={80} readOnly={originalIds.has(department.id)} required className="ap-input mt-1 w-full" onChange={e=>change({...config,departments:config.departments.map((d,i)=>i===index?{...d,name:e.target.value}:d)})}/></label>
     <label className="flex items-center gap-2"><input type="checkbox" checked={department.active} onChange={e=>change({...config,departments:config.departments.map((d,i)=>i===index?{...d,active:e.target.checked}:d)})}/>Active</label>
    </div>)}
    <button type="button" className="ap-btn" disabled={config.departments.length>=50} onClick={()=>change({...config,departments:[...config.departments,{id:crypto.randomUUID(),name:'',active:true}]})}>Add department</button>
   </fieldset>
   <fieldset disabled={locked} className="space-y-4"><legend className="mb-3 text-xl font-semibold">Form choices</legend>
    <label className="block">Employment types — one per line<textarea name="employmentTypes" className="ap-input mt-2 min-h-24 w-full" required defaultValue={config.employmentTypes.join('\n')}/></label>
    <label className="block">Benefit types — one per line<textarea name="benefitKinds" className="ap-input mt-2 min-h-24 w-full" defaultValue={config.benefitKinds.join('\n')}/></label>
    <label className="block">Default documents at application — one per line<textarea name="atApplication" className="ap-input mt-2 min-h-24 w-full" defaultValue={config.defaultRequiredDocuments.atApplication.join('\n')}/></label>
    <label className="block">Default documents after selection — one per line<textarea name="afterSelection" className="ap-input mt-2 min-h-24 w-full" defaultValue={config.defaultRequiredDocuments.afterSelection.join('\n')}/></label>
    <label className="flex items-start gap-3"><input type="checkbox" checked={config.documentDefaultsReviewed} onChange={e=>change({...config,documentDefaultsReviewed:e.target.checked})}/>I have reviewed the default document requirements, including any intentionally empty lists.</label>
   </fieldset>
   <div className="flex gap-3"><button className="ap-btn ap-btn-p" disabled={busy} type="submit">{busy?'Saving…':uncertain?'Retry same save':'Save settings'}</button><button className="ap-btn" type="button" disabled={busy} onClick={()=>{setConfig(null);setReload(v=>v+1);}}>Reload</button></div>
  </form>}
 </div>;
}
