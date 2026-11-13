/** Versioned vacancy configuration only; never grants access or upload rights. */
export type VacancyConfiguration={departments:{id:string;name:string;active:boolean}[];employmentTypes:string[];benefitKinds:string[];defaultRequiredDocuments:{atApplication:string[];afterSelection:string[]};documentDefaultsReviewed:boolean};
type Result={ok:true;value:VacancyConfiguration}|{ok:false;fields:Record<string,string>};
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function record(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;}
function array(v:unknown):v is unknown[]{return Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&Object.keys(v).length===v.length&&Object.keys(v).every((key,i)=>key===String(i));}
export function validateVacancyConfiguration(raw:unknown):Result{
 const fields:Record<string,string>=Object.create(null);
 const bad=(key:string)=>{fields[key]='Check this configuration value.';};
 let bytes:number;try{bytes=new TextEncoder().encode(JSON.stringify(raw)).byteLength;}catch{return {ok:false,fields:{configuration:'Invalid configuration.'}};}
 if(bytes>131072||!record(raw))return {ok:false,fields:{configuration:'Invalid configuration.'}};
 const obj=(v:unknown,path:string,keys:string[])=>{if(!record(v)){bad(path);return {} as Record<string,unknown>;}for(const key of Object.keys(v))if(!keys.includes(key))bad(path+'.'+key);return v;};
 const text=(v:unknown,path:string,max:number)=>{if(typeof v!=='string'){bad(path);return '';}const s=v.trim();if(!s||s.length>max||/[\u0000-\u001f\u007f]/.test(v))bad(path);return s;};
 const names=(v:unknown,path:string,maxItems:number,maxLength:number,min=0)=>{if(!array(v)||v.length<min||v.length>maxItems){bad(path);return [];}const list=v.map((x,i)=>text(x,path+'.'+i,maxLength));if(new Set(list.map(x=>x.toLowerCase())).size!==list.length)bad(path);return list;};
 const source=obj(raw,'configuration',['departments','employmentTypes','benefitKinds','defaultRequiredDocuments','documentDefaultsReviewed']);
 const departments:VacancyConfiguration['departments']=[];
 if(!array(source.departments)||source.departments.length<1||source.departments.length>50)bad('departments');
 else for(const [i,value]of source.departments.entries()){
  const d=obj(value,'departments.'+i,['id','name','active']);
  if(typeof d.id!=='string'||!UUID.test(d.id))bad('departments.'+i+'.id');
  if(typeof d.active!=='boolean')bad('departments.'+i+'.active');
  departments.push({id:typeof d.id==='string'?d.id.toLowerCase():'',name:text(d.name,'departments.'+i+'.name',80),active:d.active===true});
 }
 if(!departments.some(d=>d.active)||new Set(departments.map(d=>d.id)).size!==departments.length||new Set(departments.map(d=>d.name.toLowerCase())).size!==departments.length)bad('departments');
 const employmentTypes=names(source.employmentTypes,'employmentTypes',30,100,1),benefitKinds=names(source.benefitKinds,'benefitKinds',40,100);
 const docs=obj(source.defaultRequiredDocuments,'defaultRequiredDocuments',['atApplication','afterSelection']);
 const defaultRequiredDocuments={atApplication:names(docs.atApplication,'defaultRequiredDocuments.atApplication',30,150),afterSelection:names(docs.afterSelection,'defaultRequiredDocuments.afterSelection',30,150)};
 if(typeof source.documentDefaultsReviewed!=='boolean')bad('documentDefaultsReviewed');
 if(Object.keys(fields).length)return {ok:false,fields};
 return {ok:true,value:{departments,employmentTypes,benefitKinds,defaultRequiredDocuments,documentDefaultsReviewed:source.documentDefaultsReviewed===true}};
}
