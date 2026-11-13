import 'server-only';
import {createHmac} from 'node:crypto';
import {vacancyWriteRuntime} from './runtime';
import {adminClient} from '../auth/session';
import {limitAuth,RateFailure} from '../auth/rate';
import type {VacancyConfigurationDependencies} from './config-service';
export function vacancyConfigurationRuntime():{deps:VacancyConfigurationDependencies;origin:string}{
 const base=vacancyWriteRuntime();
 return {origin:base.origin,deps:{enabled:base.deps.enabled,verifyIdentity:base.deps.verifyIdentity,
  consumeLimit:async uid=>{try{await limitAuth('admin','invite_manage_write','vacancy-config:'+uid);}catch(e){if(e instanceof RateFailure)throw {code:'rate_limited'};throw e;}},
  fingerprint:command=>{const key=process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;if(!key||key.length<32)throw new Error('unavailable');return createHmac('sha256',key).update(JSON.stringify(command)).digest('hex');},
  save:async args=>{const {data,error}=await adminClient('admin').rpc('recruitment_config_save',args);return {data,error};},
 }};
}
