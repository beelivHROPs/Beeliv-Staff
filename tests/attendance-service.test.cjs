/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {attendanceAction,projectAttendance}=require('../lib/server/attendance/service.ts');
const {validateAttendance}=require('../lib/server/attendance/validation.ts');
const {handleAttendance}=require('../lib/server/attendance/handler.ts');
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',session='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',shift='cccccccc-cccc-4ccc-8ccc-cccccccccccc',requestId='dddddddd-dddd-4ddd-8ddd-dddddddddddd',attendanceId='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const base={attendanceId,shiftId:shift,revision:1,workDate:'2026-11-22',name:'Fictional Staff',clientId:uid,clientName:'Fictional Client',outletId:session,outletName:'Fictional Outlet',role:'Cook',plannedStart:'2026-11-22T08:00:00Z',plannedEnd:'2026-11-22T16:00:00Z',checkedInAt:'2026-11-22T08:01:00Z',checkedOutAt:null,corrected:false};
const range={from:'2026-11-01',to:'2026-11-30'};
const correction={requestId,attendanceId,expectedRevision:1,checkedInAt:'2026-11-22T08:00:00Z',checkedOutAt:null,reason:'HR reviewed the clock entry'};
function harness(portal='staff'){
 const calls=[],who={uid,sessionId:session,emailVerified:true,active:true,aal:'aal2',staff:true};
 return {calls,who,deps:{enabled:true,writesEnabled:true,portal,verifyIdentity:async()=>{calls.push('identity');return who;},consumeLimit:async()=>calls.push('limit'),fingerprint:()=> 'a'.repeat(64),rpc:async(name,args)=>{calls.push({name,args});return {data:{ok:true,record:base,replayed:false},error:null};}}};
}
test('disabled and unauthorized portal mutations are inert before authentication or RPC',async()=>{
 for(const [portal,action,input] of [['client','check-in',{requestId,shiftId:shift}],['client','correct',correction],['admin','check-out',{requestId,shiftId:shift}],['staff','correct',correction]]){const h=harness(portal);assert.deepEqual(await attendanceAction(action,input,h.deps),{ok:false,code:'forbidden'});assert.deepEqual(h.calls,[]);}
 const h=harness();h.deps.enabled=false;assert.equal((await attendanceAction('list',range,h.deps)).code,'unavailable');assert.deepEqual(h.calls,[]);
 h.deps.enabled=true;h.deps.writesEnabled=false;assert.equal((await attendanceAction('check-in',{requestId,shiftId:shift},h.deps)).code,'unavailable');assert.deepEqual(h.calls,[]);
});
test('verified active Staff and MFA Admin required before any gateway call',async()=>{
 for(const patch of [{active:false},{staff:false},{emailVerified:false},{sessionId:'bad'}]){const h=harness();Object.assign(h.who,patch);assert.equal((await attendanceAction('check-in',{requestId,shiftId:shift},h.deps)).ok,false);assert.deepEqual(h.calls,['identity']);}
 const h=harness('admin');h.who.aal='aal1';assert.equal((await attendanceAction('correct',correction,h.deps)).code,'forbidden');assert.deepEqual(h.calls,['identity']);
});
test('clock command rejects browser time, scope, identity and status claims',async()=>{
 for(const extra of [{uid},{personId:uid},{clientId:uid},{checkedInAt:base.checkedInAt},{status:'present'},{portal:'admin'}]){const h=harness();assert.equal((await attendanceAction('check-in',{requestId,shiftId:shift,...extra},h.deps)).code,'invalid_request');assert.deepEqual(h.calls,['identity']);}
 const h=harness();assert.equal((await attendanceAction('check-in',{requestId,shiftId:shift},h.deps)).ok,true);const call=h.calls[2];assert.equal(call.name,'workforce_attendance_punch');assert.equal(call.args.p_portal,'staff');assert.equal(call.args.p_actor_uid,uid);assert.deepEqual(call.args.p_command,{requestId,shiftId:shift});assert.equal(call.args.p_action,'check-in');
});
test('lost mutation replies preserve original IDs; safe DB denials remain definite',async()=>{
 const h=harness();h.deps.rpc=async()=>{throw Error('private SQL detail');};const out=await attendanceAction('check-in',{requestId,shiftId:shift},h.deps);assert.deepEqual(out,{ok:false,code:'outcome_unknown',requestId});
 for(const reason of ['stale','conflict','forbidden','not_found','rate_limited']){h.deps.rpc=async()=>({data:{ok:false,reason},error:null});assert.deepEqual(await attendanceAction('check-in',{requestId,shiftId:shift},h.deps),{ok:false,code:reason});}
 for(const reason of ['outcome_unknown','unavailable','private failure']){h.deps.rpc=async()=>({data:{ok:false,reason},error:null});assert.deepEqual(await attendanceAction('check-in',{requestId,shiftId:shift},h.deps),{ok:false,code:'outcome_unknown',requestId});}
 h.deps.rpc=async()=>({data:{ok:true,record:{...base,shiftId:uid},replayed:false},error:null});assert.equal((await attendanceAction('check-in',{requestId,shiftId:shift},h.deps)).code,'outcome_unknown');
});
test('bounded valid calendar ranges and exact cursor; corrections preserve chronological order',()=>{
 for(const input of [{...range,from:'2026-02-30'},{...range,to:'2027-01-01'},{...range,to:'2026-10-01'},{...range,limit:101},{...range,personId:uid},{...range,after:{workDate:'2026-11-22',attendanceId,extra:true}},{...range,clientId:uid}])assert.equal(validateAttendance('list',input,'staff'),null);
 assert.ok(validateAttendance('list',{...range,limit:100,after:{workDate:'2026-11-22',attendanceId}},'staff'));
 for(const patch of [{reason:'  '},{expectedRevision:0},{checkedOutAt:'2026-11-22T07:00:00Z'},{checkedInAt:'yesterday'},{checkedInAt:'2026-02-30T09:00:00Z'},{checkedInAt:'2026-11-22T24:00:00Z'},{reason:'bad\u0000reason'}])assert.equal(validateAttendance('correct',{...correction,...patch},'admin'),null);
 assert.ok(validateAttendance('correct',correction,'admin'));
});
test('DTO excludes HR correction reason, medical/contact/bank/GPS; malformed facts fail closed',()=>{
 const out=projectAttendance({...base,reason:'private',phone:'private',nin:'private',bank:'private',gps:'private'});assert.deepEqual(out,base);
 for(const patch of [{revision:0},{plannedEnd:base.plannedStart},{checkedOutAt:'2026-11-22T07:00:00Z'},{corrected:'true'},{name:'bad\u0000name'},{workDate:'2026-02-30'}])assert.equal(projectAttendance({...base,...patch}),null);
});
test('list pages cannot exceed bounds or return rows outside requested scope/dates',async()=>{
 const h=harness('client');h.deps.rpc=async()=>({data:{ok:true,items:[{...base,phone:'private'}],next:null},error:null});assert.deepEqual(await attendanceAction('list',range,h.deps),{ok:true,page:{items:[base],next:null}});
 for(const payload of [{items:[{...base,workDate:'2026-10-31'}],next:null},{items:Array(51).fill(base),next:null},{items:[base],next:{workDate:'bad',attendanceId}}]){h.deps.rpc=async()=>({data:{ok:true,...payload},error:null});assert.equal((await attendanceAction('list',range,h.deps)).code,'unavailable');}
 h.deps.rpc=async()=>({data:{ok:true,items:[base],next:null},error:null});assert.equal((await attendanceAction('list',{...range,clientId:shift},h.deps)).code,'unavailable');
});
test('rate denial precedes mutation and provider errors never leave HTTP response',async()=>{
 const h=harness();h.deps.consumeLimit=async()=>{throw {code:'rate_limited'};};assert.equal((await attendanceAction('check-in',{requestId,shiftId:shift},h.deps)).code,'rate_limited');assert.deepEqual(h.calls,['identity']);
 const origin='https://staff.example.com',request=(body,from=origin)=>new Request(origin+'/api/staff/attendance/check-in',{method:'POST',headers:{origin:from,'content-type':'application/json'},body});
 for(const [req,status] of [[request('{}','https://evil.example.com'),403],[request('x'.repeat(4097)),400],[request('{'),400]]){const x=harness();const res=await handleAttendance(req,'check-in',{origin,deps:x.deps});assert.equal(res.status,status);assert.deepEqual(x.calls,[]);assert.equal(res.headers.get('cache-control'),'private, no-store');}
 const x=harness();x.deps.rpc=async()=>{throw Error('SECRET sql path');};const res=await handleAttendance(request(JSON.stringify({requestId,shiftId:shift})),'check-in',{origin,deps:x.deps});assert.equal(res.status,503);const body=await res.text();assert.equal(body.includes('SECRET'),false);assert.equal(JSON.parse(body).requestId,requestId);
});
