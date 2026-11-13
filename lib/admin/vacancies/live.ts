/** Gated HTTP adapter. Reads and writes never fall back to fixtures. */
import type { VacancyAdapter } from './adapter';
import { RestrictedError } from '../adapter';
import { VacancyValidationError, type VacancyDetail } from './types';
import { readVacancies } from './read-client';
import { submitVacancyCommand } from './write-client';
import { createVacancyMutationContext } from './mutation-context';

export function createLiveVacancyAdapter(fetcher: typeof fetch = fetch): VacancyAdapter {
 const listeners = new Set<Parameters<VacancyAdapter['subscribe']>[0]>();
 const mutation = createVacancyMutationContext();
 let confirmed: {signature:string;id:string} | null = null;
 const emit = () => listeners.forEach(listener => listener('reset'));
 const read = async (request: unknown) => {
  const result = await readVacancies(request,fetcher);
  if (!result.ok) {
   if (['no_access','forbidden'].includes(result.code)) throw new RestrictedError();
   throw new Error('Vacancies could not be loaded. Please try again.');
  }
  return result;
 };
 const detail = async (id:string):Promise<VacancyDetail|null> => {
  const result = await read({mode:'detail',id});
  if(result.mode!=='detail')throw new Error('Vacancies could not be loaded.');
  return result.record;
 };
 async function write(draft:Parameters<ReturnType<typeof createVacancyMutationContext>['start']>[0], displayed: {id:string;revision:number}|null) {
  const signature=JSON.stringify({draft,displayed});
  if(confirmed){
   if(confirmed.signature!==signature)throw new Error('A save was confirmed. Reload the vacancy before making another change.');
   const record=await detail(confirmed.id);
   if(!record)throw new Error('The save was confirmed. Reload the vacancy to check it.');
   confirmed=null;emit();return record;
  }
  // A second explicit submission retries only the identical uncertain command.
  const begin=mutation.current().phase==='uncertain'?mutation.retry(draft,displayed):mutation.start(draft,displayed,crypto.randomUUID());
  if(!begin.ok)throw new Error('Check the previous save and reload before changing this vacancy.');
  const result=await submitVacancyCommand(begin.command,fetcher);
  mutation.settle(begin.command.requestId,result);
  if(!result.ok){
   if(result.fields)throw new VacancyValidationError(result.fields);
   if(result.code==='no_access'||result.code==='forbidden')throw new RestrictedError();
   const message=result.code==='outcome_unknown'?'We could not confirm the save. Retry the same change or reload to check.':result.code==='conflict'?'This vacancy changed. Reload it before saving again.':'The vacancy could not be saved. Check your access and try again.';
   throw new Error(message);
  }
  confirmed={signature,id:result.id};
  let record:VacancyDetail|null;
  try{record=await detail(result.id);}catch{throw new Error('The save was confirmed, but the updated vacancy could not be loaded. Retry to load it.');}
  if(!record)throw new Error('The save was confirmed. Reload the vacancy to check it.');
  confirmed=null;emit();return record;
 }
 return {
  subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener);};},
  async listVacancies(query){const result=await read({mode:'list',...query});if(result.mode!=='list')throw new Error('Vacancies could not be loaded.');return result;},
  getVacancy:detail,
  async getConfig(){
   const result=await read({mode:'config'});if(result.mode!=='config')throw new Error('Vacancy settings could not be loaded.');
   const config=result.configuration;
   return {departments:config?.departments.filter(d=>d.active).map(d=>d.name)??[],employmentTypes:config?.employmentTypes??[],benefitKinds:config?.benefitKinds??[],clients:result.clients,recruiters:[],defaultRecruitmentProcess:[],defaultRequiredDocuments:config?.defaultRequiredDocuments??{atApplication:[],afterSelection:[]},capabilities:result.capabilities};
  },
  createVacancy(input,intent){return write({kind:'create',input,intent},null);},
  updateVacancy(id,input,intent,revision){return write({kind:'update',input,intent},{id,revision:revision??0});},
  performAction(id,input,revision){return write({kind:'action',...input},{id,revision:revision??0});},
 };
}

export const liveVacancyAdapter=createLiveVacancyAdapter();
