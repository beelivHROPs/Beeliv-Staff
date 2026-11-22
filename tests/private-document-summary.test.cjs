/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {getApplicantDocumentSummary,selectSummaryItems}=require('../lib/server/private-documents/summary-service.ts');
const {handlePrivateDocument}=require('../lib/server/private-documents/handler.ts');
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',personId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',sessionId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const empty=()=>['cv','passport-photo','valid-id'].map(slot=>({slot,current:null,incoming:null}));
function harness(){const calls=[],identity={uid,personId,sessionId,emailVerified:true,app:'talent',status:'active',entitlements:['applicant']};return {calls,identity,deps:{enabled:true,verifyIdentity:async()=>identity,consumeLimit:async()=>calls.push('limit'),summary:async args=>{calls.push(args);return {data:{ok:true,items:empty()},error:null};}}};}
test('summary owner comes only from verified session; input cannot override it',async()=>{
 const h=harness();assert.deepEqual(await getApplicantDocumentSummary({personId},h.deps),{ok:false,code:'invalid_request'});assert.deepEqual(h.calls,[]);
 assert.deepEqual(await getApplicantDocumentSummary({},h.deps),{ok:true,items:empty()});assert.deepEqual(h.calls,['limit',{actorUid:uid,sessionId}]);
});
test('disabled, suspended and Staff-only actors cannot read Applicant facts',async()=>{
 for(const patch of [{status:'suspended'},{entitlements:['staff']},{sessionId:'bad'},{emailVerified:false}]){const h=harness();Object.assign(h.identity,patch);assert.equal((await getApplicantDocumentSummary({},h.deps)).ok,false);assert.deepEqual(h.calls,[]);}
 const h=harness();h.deps.enabled=false;assert.equal((await getApplicantDocumentSummary({},h.deps)).ok,false);assert.deepEqual(h.calls,[]);
});
test('summary selects safe facts, preserving HR state without inventing approval',()=>{
 for(const review of ['pending','verified','resubmission_required','rejected','not_requested']){
  const items=empty();items[0].current={uploadId:uid,fileName:'cv.pdf',size:10,contentType:'application/pdf',checkedAt:'2026-11-22T10:00:00Z',review,objectKey:'private',signedUrl:'secret'};
  const out=selectSummaryItems(items);assert.equal(out[0].current.review,review);assert.equal(JSON.stringify(out).includes('secret'),false);assert.equal('objectKey' in out[0].current,false);
 }
 for(const items of [[],[...empty(),empty()[0]],[empty()[0],empty()[0],empty()[2]]])assert.equal(selectSummaryItems(items),null);
 const items=empty();items[0].current={uploadId:uid,fileName:'cv.docx',size:10,contentType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',checkedAt:'2026-11-22T10:00:00Z',review:'pending'};assert.equal(selectSummaryItems(items),null);
});
test('provider failures and quota denials fail closed without exposing provider text',async()=>{
 const h=harness();h.deps.consumeLimit=async()=>{throw {code:'rate_limited'};};assert.deepEqual(await getApplicantDocumentSummary({},h.deps),{ok:false,code:'rate_limited'});assert.deepEqual(h.calls,[]);
 h.deps.consumeLimit=async()=>{};h.deps.summary=async()=>{throw Error('secret');};assert.deepEqual(await getApplicantDocumentSummary({},h.deps),{ok:false,code:'unavailable'});
});
test('HTTP summary inherits exact origin and safe no-store projection; unavailable callback stays 404',async()=>{
 const origin='https://talent.example.com',req=(from=origin)=>new Request(origin+'/api/applicant/documents/summary',{method:'POST',headers:{origin:from,'content-type':'application/json'},body:'{}'});
 const unused=async()=>({ok:false,code:'unavailable'}),config={enabled:true,origin,actions:{request:unused,complete:unused,status:unused,summary:async()=>({ok:true,items:empty(),secret:'private'})}};
 assert.equal((await handlePrivateDocument(req('https://evil.example.com'),'summary',config)).status,403);
 const response=await handlePrivateDocument(req(),'summary',config);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(await response.json(),{ok:true,items:empty()});
 delete config.actions.summary;assert.equal((await handlePrivateDocument(req(),'summary',config)).status,404);
});
