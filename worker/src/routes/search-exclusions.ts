import { errorResponse, successResponse } from "../lib/http";
interface Env { SUPABASE_URL:string; SUPABASE_ANON_KEY:string; SUPABASE_SERVICE_ROLE_KEY:string; }
export const DEFAULT_SEARCH_EXCLUSIONS = [
 {key:"ecommerce",label:"电商与购物平台",domains:["amazon.com","ebay.com","walmart.com","etsy.com","aliexpress.com","temu.com","shopee.com","lazada.com","taobao.com","tmall.com","jd.com","rakuten.co.jp"]},
 {key:"social",label:"社交媒体",domains:["facebook.com","instagram.com","linkedin.com","x.com","twitter.com","pinterest.com","tiktok.com"]},
 {key:"video",label:"视频平台",domains:["youtube.com","youtu.be","vimeo.com","dailymotion.com","twitch.tv","bilibili.com"]},
 {key:"directories",label:"企业目录与黄页",domains:["yellowpages.com","yelp.com","manta.com","kompass.com","europages.com","thomasnet.com"]},
 {key:"news",label:"新闻与媒体",domains:["news.google.com","cnn.com","bbc.com","reuters.com"]},
 {key:"forums",label:"论坛与问答",domains:["reddit.com","quora.com","stackexchange.com","answers.yahoo.com"]}
] as const;
async function userId(request:Request,env:Env):Promise<string|null>{
 const token=request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1]; if(!token)return null;
 const res=await fetch(env.SUPABASE_URL+"/auth/v1/user",{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:"Bearer "+token}});
 if(!res.ok)return null; const body=await res.json() as {id?:string}; return body.id??null;
}
async function db<T>(env:Env,path:string,init?:RequestInit):Promise<T>{
 const res=await fetch(env.SUPABASE_URL+"/rest/v1/"+path,{...init,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,"Content-Type":"application/json",...init?.headers}});
 const raw=await res.text(); if(!res.ok)throw new Error("DATABASE_"+res.status+": "+raw.slice(0,250)); return raw?JSON.parse(raw) as T:undefined as T;
}
function normalizeDomain(input:string):string|null{
 const raw=input.trim().toLowerCase(); if(!raw)return null;
 try{const u=new URL(raw.includes("://")?raw:"https://"+raw);if(!u.hostname||!u.hostname.includes("."))return null;return u.hostname.replace(/^www\./,"")+(u.pathname==="/"?"":u.pathname.replace(/\/$/,""));}catch{return null;}
}
export async function handleSearchExclusions(request:Request,env:Env):Promise<Response>{
 const path=new URL(request.url).pathname; if(path!=="/api/v1/settings/search-exclusions")return errorResponse(request,"NOT_FOUND","搜索排除规则接口不存在。",404);
 const owner=await userId(request,env); if(!owner)return errorResponse(request,"UNAUTHORIZED","请先登录后管理搜索排除规则。",401);
 if(request.method==="GET"){
  const rows=await db<Array<{category_key:string;category_label:string;domains:string[];enabled:boolean}>>(env,"search_exclusion_rules?owner_id=eq."+owner+"&select=category_key,category_label,domains,enabled");
  const saved=new Map((rows??[]).map(row=>[row.category_key,row]));
  return successResponse(request,DEFAULT_SEARCH_EXCLUSIONS.map(item=>{const row=saved.get(item.key);return {key:item.key,label:row?.category_label??item.label,domains:row?.domains??[...item.domains],enabled:row?.enabled??true};}));
 }
 if(request.method==="PUT"){
  let body:{categories?:Array<{key:string;label:string;domains:string[];enabled:boolean}>};try{body=await request.json() as typeof body;}catch{return errorResponse(request,"INVALID_JSON","请求内容格式不正确。",400);}
  if(!Array.isArray(body.categories)||body.categories.length!==DEFAULT_SEARCH_EXCLUSIONS.length)return errorResponse(request,"VALIDATION_ERROR","排除分类数据不完整。",400);
  const allowed=new Set<string>(DEFAULT_SEARCH_EXCLUSIONS.map(item=>item.key));
  const rows=body.categories.map(item=>{
   if(!item||!allowed.has(item.key)||typeof item.label!=="string"||item.label.trim().length<1||item.label.length>80||typeof item.enabled!=="boolean"||!Array.isArray(item.domains)||item.domains.length>300)throw new Error("INVALID_CATEGORY");
   const domains=[...new Set(item.domains.map(normalizeDomain).filter((v):v is string=>Boolean(v)))];
   if(domains.length!==item.domains.filter(v=>String(v).trim()).length)throw new Error("INVALID_DOMAIN");
   return {owner_id:owner,category_key:item.key,category_label:item.label.trim(),domains,enabled:item.enabled,updated_at:new Date().toISOString()};
  });
  const saved=await db(env,"search_exclusion_rules?on_conflict=owner_id,category_key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(rows)});
  return successResponse(request,{saved:true,categories:(saved as Array<Record<string,unknown>>|undefined)??rows});
 }
 return errorResponse(request,"METHOD_NOT_ALLOWED","不支持的请求方式。",405);
}
