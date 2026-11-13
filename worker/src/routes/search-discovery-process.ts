import type { DiscoveryEnv, DiscoveryRunInput } from "./discovery";
import { DEFAULT_SEARCH_EXCLUSIONS } from "./search-exclusions";
type Engine="serper"|"serpapi"; type Vertical="web"|"shopping"|"images"|"news"|"videos"|"scholar"|"patents";
type Result={title:string;url:string;snippet:string;raw:Record<string,unknown>};
const serper:Record<Vertical,string>={web:"search",shopping:"shopping",images:"images",news:"news",videos:"videos",scholar:"scholar",patents:"patents"};
const serp:Record<Vertical,string>={web:"google",shopping:"google_shopping",images:"google_images",news:"google_news",videos:"google_videos",scholar:"google_scholar",patents:"google_patents"};
async function db<T>(env:DiscoveryEnv,path:string,init:RequestInit={}):Promise<T>{const r=await fetch(env.SUPABASE_URL+"/rest/v1/"+path,{...init,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,"Content-Type":"application/json",...init.headers}});const s=await r.text();if(!r.ok)throw new Error("DATABASE_"+r.status+": "+s.slice(0,300));return s?JSON.parse(s) as T:undefined as T;}
async function log(env:DiscoveryEnv,id:string,owner:string,level:string,message:string){await db(env,"discovery_run_logs",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({run_id:id,owner_id:owner,level,message})});}
async function update(env:DiscoveryEnv,id:string,patch:Record<string,unknown>){await db(env,"discovery_runs?id=eq."+id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({...patch,updated_at:new Date().toISOString()})});}
function pick(row:Record<string,unknown>):Result|null{const url=String(row.link??row.product_link??row.url??"");const title=String(row.title??row.name??row.product_title??"");if(!url||!title)return null;try{const u=new URL(url);if(u.protocol!=="http:"&&u.protocol!=="https:")return null;return{title,url:u.toString(),snippet:String(row.snippet??row.description??""),raw:row};}catch{return null;}}
async function search(engine:Engine,type:Vertical,q:string,country:string,hl:string,limit:number,location:string,env:DiscoveryEnv):Promise<Result[]>{
 const out:Result[]=[];let start=0;
 while(start<limit){const num=Math.min(100,limit-start);let response:Response;
 if(engine==="serper"){if(!env.SERPER_API_KEY)throw new Error("SERPER_API_KEY_NOT_CONFIGURED");response=await fetch("https://google.serper.dev/"+serper[type],{method:"POST",headers:{"X-API-KEY":env.SERPER_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({q,gl:country.toLowerCase(),hl:hl.toLowerCase(),num,page:Math.floor(start/num)+1,...(location?{location}:{})}),signal:AbortSignal.timeout(45000)});}
 else{if(!env.SERPAPI_API_KEY)throw new Error("SERPAPI_API_KEY_NOT_CONFIGURED");const p=new URLSearchParams({engine:serp[type],q,gl:country.toLowerCase(),hl:hl.toLowerCase(),num:String(num),start:String(start),api_key:env.SERPAPI_API_KEY});if(location)p.set("location",location);response=await fetch("https://serpapi.com/search.json?"+p.toString(),{signal:AbortSignal.timeout(45000)});}
 if(!response.ok)throw new Error(engine.toUpperCase()+"_HTTP_"+response.status);const body=await response.json() as Record<string,unknown>;if(body.error)throw new Error(String(body.error).slice(0,160));
 const keys:Record<Vertical,string[]>={web:engine==="serper"?["organic"]:["organic_results"],shopping:engine==="serper"?["shopping"]:["shopping_results"],images:engine==="serper"?["images"]:["images_results"],news:engine==="serper"?["news"]:["news_results"],videos:engine==="serper"?["videos"]:["video_results"],scholar:engine==="serper"?["organic"]:["organic_results"],patents:engine==="serper"?["organic"]:["patents_results","organic_results"]};
 let rows:Record<string,unknown>[]=[];for(const key of keys[type])if(Array.isArray(body[key])){rows=body[key] as Record<string,unknown>[];break;}out.push(...rows.map(pick).filter((x):x is Result=>!!x));if(rows.length<num)break;start+=num;
 }return out.slice(0,limit);
}
function excluded(url:string,rules:string[]){try{const u=new URL(url),host=u.hostname.toLowerCase(),path=u.pathname.toLowerCase();return rules.some(rule=>{const [domain,...rest]=rule.toLowerCase().split("/");const prefix=rest.length?"/"+rest.join("/"):"";return(host===domain||host.endsWith("."+domain))&&(!prefix||path.startsWith(prefix));});}catch{return true;}}
async function persist(env:DiscoveryEnv,owner:string,run:string,input:DiscoveryRunInput,engine:Engine,type:Vertical,item:Result){
 const parsed=new URL(item.url),shopping=type==="shopping",googleShoppingLink=parsed.hostname.toLowerCase().endsWith("google.com"),source=String(item.raw.source??item.raw.merchant??item.raw.seller??"").trim();
 const sourceDomain=/^[a-z0-9.-]+\\.[a-z]{2,}$/i.test(source)?source.toLowerCase().replace(/^www\\./,""):"";
 const domain=googleShoppingLink?sourceDomain:parsed.hostname.replace(/^www\\./,"").toLowerCase();
 const productKey=String(item.raw.product_id??item.title).toLowerCase();
 const key=domain?"search-domain:"+domain:shopping?"shopping-product:"+(source.toLowerCase()||"unknown")+":"+productKey:"search-domain:"+parsed.hostname.replace(/^www\\./,"").toLowerCase();
 const name=shopping?(source||item.title):item.title,website=domain?"https://"+domain:null;
 const entities=await db<Array<{id:string}>>(env,"discovery_entities?on_conflict=owner_id,dedupe_key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify({owner_id:owner,entity_type:"business",display_name:name,dedupe_key:key,attributes:{country_code:input.countries[0],domain:domain||null,merchant:source||null}})});
 let entity=entities?.[0]?.id;if(!entity)entity=(await db<Array<{id:string}>>(env,"discovery_entities?owner_id=eq."+owner+"&dedupe_key=eq."+encodeURIComponent(key)+"&select=id"))[0]?.id;if(!entity)throw new Error("SEARCH_ENTITY_UPSERT_FAILED");
 const old=(await db<Array<Record<string,unknown>>>(env,"discovery_records?owner_id=eq."+owner+"&channel=eq.search_engine&dedupe_key=eq."+encodeURIComponent(key)+"&select=raw_data"))[0]??{};
 const raw={...(old.raw_data&&typeof old.raw_data==="object"?old.raw_data as Record<string,unknown>:{}),last_search_result:{title:item.title,snippet:item.snippet,search_type:type,engine,url:item.url,merchant:source||null,product_id:item.raw.product_id??null,price:item.raw.price??null,raw:item.raw}};
 const rec=await db<Array<{id:string}>>(env,"discovery_records?on_conflict=owner_id,channel,dedupe_key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify({owner_id:owner,channel:"search_engine",record_type:shopping&&!domain?"shopping_product":"website",entity_id:entity,name,country_code:input.countries[0],website,business_type:input.businessTypes?.join(", ")||null,dedupe_key:key,raw_data:raw})});
 let record=rec?.[0]?.id;if(!record)record=(await db<Array<{id:string}>>(env,"discovery_records?owner_id=eq."+owner+"&channel=eq.search_engine&dedupe_key=eq."+encodeURIComponent(key)+"&select=id"))[0]?.id;if(!record)throw new Error("SEARCH_RECORD_UPSERT_FAILED");
 await db(env,"discovery_record_occurrences?on_conflict=owner_id,run_id,provider,external_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({owner_id:owner,record_id:record,run_id:run,provider:engine,keyword:input.query,external_id:type+":"+item.url,source_url:item.url,raw_data:{...item.raw,title:item.title,snippet:item.snippet,search_type:type,engine,advanced_query:input.advancedQuery}})});
}
export async function processSearchRun(env:DiscoveryEnv,run:string,owner:string,input:DiscoveryRunInput){
 const engines=input.searchEngines??[],types=input.searchTypes??["web"],country=input.countries[0],hl=input.searchLanguage??"en",location=[input.city,input.state].filter(Boolean).join(", ");
 const cats=await db<Array<{category_key:string;domains:string[];enabled:boolean}>>(env,"search_exclusion_rules?owner_id=eq."+owner+"&select=category_key,domains,enabled");
 const effective=DEFAULT_SEARCH_EXCLUSIONS.map(item=>{const saved=cats.find(row=>row.category_key===item.key);return{category_key:item.key,domains:saved?saved.domains:item.domains,enabled:saved?saved.enabled:true};});
 const selected=new Set(input.excludeCategories??effective.filter(x=>x.enabled).map(x=>x.category_key));
 const rules=[...new Set(effective.filter(x=>x.enabled&&selected.has(x.category_key)).flatMap(x=>x.domains??[]))];
 const q=input.advancedQuery?.trim()||input.query;
 const jobs=engines.flatMap(engine=>types.map(type=>({engine,type})));let done=0,failed=0,raw=0;const all:Array<{engine:Engine;type:Vertical;item:Result}>=[];
 await update(env,run,{status:"running",progress:1,message:"正在连接搜索引擎并执行查询"});
 await log(env,run,owner,"info","关键词："+input.query+"；实际搜索语法："+q+"；国家："+country+"；搜索类型："+types.join("、")+"；搜索引擎："+engines.join("、"));
 for(const job of jobs){try{const found=await search(job.engine,job.type,q,country,hl,input.limitPerCountry,location,env);raw+=found.length;all.push(...found.map(item=>({...job,item})));await log(env,run,owner,found.length?"success":"warning",job.engine+" · "+job.type+" 返回 "+found.length+" 条");}catch(e){failed++;await log(env,run,owner,"warning",job.engine+" · "+job.type+" 失败："+String(e).slice(0,180));}done++;await update(env,run,{progress:Math.max(1,Math.round(done/jobs.length*85)),message:"搜索中 · "+done+"/"+jobs.length+" 个引擎/类型组合"});}
 const unique=new Map<string,{engine:Engine;type:Vertical;item:Result}>();for(const row of all){if(excluded(row.item.url,rules))continue;const domain=new URL(row.item.url).hostname.replace(/^www\./,"").toLowerCase();if(!unique.has(domain))unique.set(domain,row);}
 const chosen=[...unique.values()].slice(0,input.limitPerCountry);for(const row of chosen)await persist(env,owner,run,input,row.engine,row.type,row.item);
 const status=failed===0?"completed":failed<jobs.length?"partial":"failed";await update(env,run,{status,progress:100,discovered_count:chosen.length,created_lead_count:0,message:"搜索完成 · "+chosen.length+" 个独立网站 · "+raw+" 条原始结果"});
 await log(env,run,owner,status==="completed"?"success":"warning","任务结束；原始结果 "+raw+" 条，排除及去重后保存 "+chosen.length+" 个网站。");return{status,discovered:chosen.length,rawCount:raw,failed};
}
