import {errorResponse,successResponse} from "../lib/http";
type AccountType="business"|"creator"|"personal";
export interface InstagramInput {keywords:string[];countries:string[];languageCodes:string[];accountTypes:AccountType[];minFollowers:number;maxFollowers:number;recentDays:number;requireContact:boolean;excludeTerms:string[];limit:number;maxCostUsd?:number;includeCaptions:boolean;}
interface Env {SUPABASE_URL:string;SUPABASE_ANON_KEY:string;SUPABASE_SERVICE_ROLE_KEY:string;INSTAGRAM_DISCOVERY_WORKFLOW:{create(options:{id:string;params:{runId:string;ownerId:string;input:InstagramInput}}):Promise<{id:string}>};}
async function auth(request:Request,env:Env){const token=request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"");if(!token)return null;const r=await fetch(env.SUPABASE_URL+"/auth/v1/user",{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:"Bearer "+token}});if(!r.ok)return null;const u=await r.json() as {id?:string};return u.id??null;}
async function db<T>(env:Env,path:string,init:RequestInit={}):Promise<T>{const r=await fetch(env.SUPABASE_URL+"/rest/v1/"+path,{...init,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,"Content-Type":"application/json",...init.headers}});const raw=await r.text();if(!r.ok)throw new Error("DATABASE_"+r.status+": "+raw.slice(0,240));return raw?JSON.parse(raw) as T:undefined as T;}
export async function handleInstagramDiscovery(request:Request,env:Env):Promise<Response>{
 if(request.method!=="POST")return errorResponse(request,"METHOD_NOT_ALLOWED","只支持 POST 请求。",405);
 const ownerId=await auth(request,env);if(!ownerId)return errorResponse(request,"UNAUTHORIZED","请先登录 TradePilot。",401);
 let body:InstagramInput;try{body=await request.json() as InstagramInput;}catch{return errorResponse(request,"INVALID_JSON","请求内容不是有效 JSON。",400);}
 const keywords=[...new Set((Array.isArray(body.keywords)?body.keywords:[]).map(x=>String(x).trim()).filter(Boolean))].slice(0,30);
 const countries=[...new Set((Array.isArray(body.countries)?body.countries:[]).map(x=>String(x).toUpperCase()).filter(x=>/^[A-Z]{2}$/.test(x)))].slice(0,20);
 const languageCodes=[...new Set((Array.isArray(body.languageCodes)?body.languageCodes:[]).map(String).filter(x=>/^[a-z]{2,3}$/.test(x)))].slice(0,20);
 const accountTypes=[...new Set((Array.isArray(body.accountTypes)?body.accountTypes:[]).filter((x):x is AccountType=>["business","creator","personal"].includes(x)))];
 const minFollowers=Math.floor(Number(body.minFollowers)),maxFollowers=Math.floor(Number(body.maxFollowers)),recentDays=Math.floor(Number(body.recentDays)),limit=Math.floor(Number(body.limit));
 if(!keywords.length||!countries.length||!accountTypes.length||!Number.isInteger(minFollowers)||minFollowers<0||!Number.isInteger(maxFollowers)||maxFollowers<minFollowers||maxFollowers>100000000||!Number.isInteger(recentDays)||recentDays<0||recentDays>3650||!Number.isInteger(limit)||limit<1||limit>1000)return errorResponse(request,"VALIDATION_ERROR","请检查关键词、国家、账号类型、粉丝数范围、活跃时间和候选数量。",400);
 const excludeTerms=(Array.isArray(body.excludeTerms)?body.excludeTerms:[]).map(x=>String(x).trim()).filter(Boolean).slice(0,50);
 const input:InstagramInput={keywords,countries,languageCodes,accountTypes,minFollowers,maxFollowers,recentDays,requireContact:body.requireContact!==false,excludeTerms,limit,maxCostUsd:typeof body.maxCostUsd==="number"&&body.maxCostUsd>0?Math.min(body.maxCostUsd,10000):undefined,includeCaptions:body.includeCaptions===true};
 const query=keywords.join(" · ");
 const taskCode="IG-"+countries[0]+"-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+crypto.randomUUID().replace(/-/g,"").slice(0,6).toUpperCase();
 const searchConfig={keywords,countries,languageCodes,accountTypes,minFollowers,maxFollowers,recentDays,requireContact:input.requireContact,excludeTerms,limit,maxCostUsd:input.maxCostUsd??null,includeCaptions:input.includeCaptions,validCount:0,actualCostUsd:0,costPerValidLeadUsd:null,actorVersions:{}};
 try{
  const rows=await db<Array<{id:string}>>(env,"discovery_runs",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:ownerId,query,countries,limit_per_country:limit,providers:["apify"],channel:"instagram",search_config:searchConfig,status:"queued",progress:0,discovered_count:0,created_lead_count:0,message:"Instagram 发现任务已排队",task_code:taskCode})});
  const run=rows?.[0];if(!run?.id)return errorResponse(request,"RUN_CREATE_FAILED","无法创建 Instagram 发现任务。",500);
  await db(env,"discovery_run_logs",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({run_id:run.id,owner_id:ownerId,level:"info",message:"任务编号："+taskCode+"；关键词："+query+"；目标国家："+countries.join("、")+"；候选上限："+limit+"；仅采集公开账号。"})});
  try{await env.INSTAGRAM_DISCOVERY_WORKFLOW.create({id:run.id,params:{runId:run.id,ownerId,input}});}catch(error){await db(env,"discovery_runs?id=eq."+run.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"failed",message:"工作流启动失败："+String(error).slice(0,160)})});return errorResponse(request,"WORKFLOW_START_FAILED","任务已创建，但 Instagram 后台工作流启动失败。",503);}
  return successResponse(request,{id:run.id,taskCode,channel:"instagram",query,countries,providers:["apify"],status:"queued",progress:0,discoveredCount:0,createdLeadCount:0,message:"Instagram 发现任务已排队",searchConfig},202);
 }catch(error){return errorResponse(request,"RUN_CREATE_FAILED",error instanceof Error?error.message:"创建 Instagram 任务失败。",500);}
}

