import 'server-only';
import {vacancyWriteRuntime} from './runtime';
import {adminClient} from '../auth/session';
import {limitAuth,RateFailure} from '../auth/rate';
import type {AdminReadDependencies} from './read-service';
export function vacancyReadRuntime():{deps:AdminReadDependencies;origin:string}{
 const base=vacancyWriteRuntime();
 return {origin:base.origin,deps:{enabled:base.deps.enabled,verifyIdentity:base.deps.verifyIdentity,
  consumeLimit:async uid=>{try{await limitAuth('admin','invite_manage_read','vacancy-read:'+uid);}catch(e){if(e instanceof RateFailure)throw new Error('rate_limited');throw e;}},
  read:async args=>{const configuration=args.p_mode==='config'&&process.env.VACANCY_CONFIGURATION_SCHEMA_READY==='true';const {data,error}=configuration
   ?await adminClient('admin').rpc('recruitment_config_read',{p_actor_uid:args.p_actor_uid,p_session_id:args.p_session_id})
   :await adminClient('admin').rpc('recruitment_vacancy_read',args);return {data,error};},
 }};
}
