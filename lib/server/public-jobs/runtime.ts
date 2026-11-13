import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {readPublicJobs,type PublicJobGateway} from './repository';
export function publicJobsEnabled(){return process.env.PUBLIC_JOBS_BACKEND_ENABLED==='true'&&process.env.VACANCIES_SCHEMA_READY==='true';}
export function publicJobsGateway():PublicJobGateway{
 if(!publicJobsEnabled())throw new Error('public_jobs_unavailable');
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key?.startsWith('sb_secret_'))throw new Error('public_jobs_unavailable');
 const project=new URL(url);if(project.protocol!=='https:'||!project.hostname.endsWith('.supabase.co')||project.origin!==url)throw new Error('public_jobs_unavailable');
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}});
 return {read:async q=>{const {data,error}=await client.rpc('recruitment_public_jobs',{p_search:q.search,p_department:q.department,p_location:q.location,p_page:q.page,p_limit:q.limit,p_lookup:q.lookup,p_featured:q.featured});return {data,error};}};
}
export async function getLivePublicJobs(query:Record<string,unknown>={}){return readPublicJobs(query,publicJobsGateway());}
