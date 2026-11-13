import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

interface Env { SUPABASE_URL:string; SUPABASE_SERVICE_ROLE_KEY:string; }
interface Params { jobId:string; ownerId:string; recordIds:string[]; }
interface RecordRow { id:string; name:string; website:string|null; phone:string|null; email:string|null; raw_data:Record<string,unknown>|null; }
async function db<T>(env:Env,path:string,init:RequestInit={}):Promise<T>{
 const response=await fetch(env.SUPABASE_URL+"/rest/v1/"+path,{...init,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,"Content-Type":"application/json",...init.headers}});
 const raw=await response.text();if(!response.ok)throw new Error("DATABASE_"+response.status+": "+raw.slice(0,240));return raw?JSON.parse(raw) as T:undefined as T;
}
function safePageUrl(raw:string):URL{
 let url:URL;try{url=new URL(raw)}catch{throw new Error("官网地址无效")}
 const host=url.hostname.toLowerCase();
 if(!["https:","http:"].includes(url.protocol)||url.username||url.password||!host||host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host.endsWith(".internal")||host.endsWith(".test")||host.startsWith("[")||/^\d{1,3}(\.\d{1,3}){3}$/.test(host))throw new Error("官网地址不是允许访问的 HTTPS 公网域名");
 if(url.protocol==="http:")url.protocol="https:";
 return url;
}
async function readHtml(url:URL):Promise<string>{
 const response=await fetch(url.toString(),{redirect:"manual",signal:AbortSignal.timeout(12000),headers:{"User-Agent":"TradePilotContactBot/1.0 (+contact discovery)","Accept":"text/html,application/xhtml+xml"}});
 if(response.status>=300&&response.status<400)throw new Error("网站重定向未自动跟随，已跳过以避免跨域访问");
 if(!response.ok)throw new Error("网站返回 HTTP "+response.status);
 if(!(response.headers.get("content-type")??"").toLowerCase().includes("html"))throw new Error("页面不是 HTML");
 if(!response.body)throw new Error("网站没有返回页面内容");
 const reader=response.body.getReader(),decoder=new TextDecoder();let output="",size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>1024*1024){await reader.cancel();break;}output+=decoder.decode(part.value,{stream:true});}
 return output+decoder.decode();
}
function robotsAllows(text:string,path:string):boolean{
 let agent="",blocked=false;for(const line of text.split(/\r?\n/)){const clean=line.split("#")[0].trim();if(!clean)continue;const colon=clean.indexOf(":");if(colon<0)continue;const key=clean.slice(0,colon).trim().toLowerCase(),value=clean.slice(colon+1).trim();if(key==="user-agent"){agent=value.toLowerCase();continue;}if(key==="disallow"&&value&&["*","tradepilotcontactbot"].includes(agent)&&path.startsWith(value))blocked=true;}return !blocked;
}
function extractContacts(html:string){
 const emails=[...html.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map(m=>m[0].toLowerCase()).filter(x=>!/(example\.|\.png$|\.jpg$)/i.test(x));
 for(const m of html.matchAll(/mailto:([^"'?\s>]+)/gi))emails.push(decodeURIComponent(m[1]).toLowerCase());
 const phones=[...html.matchAll(/tel:([^"'?\s>]+)/gi)].map(m=>decodeURIComponent(m[1]).replace(/[^+\d]/g,""));
 for(const m of html.matchAll(/(?:https?:)?\/\/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)([+\d]+)/gi))phones.push(m[1]);
 const text=html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ");
 for(const m of text.matchAll(/(?:\+?\d[\d ().-]{6,18}\d)/g)){const v=m[0].replace(/[^+\d]/g,"");if(v.replace(/\D/g,"").length>=8&&v.replace(/\D/g,"").length<=15)phones.push(v);}
 return {emails:[...new Set(emails)].filter(x=>x.length<255).slice(0,10),phones:[...new Set(phones)].filter(x=>x.replace(/\D/g,"").length>=8).slice(0,10)};
}
function contactLinks(html:string,base:URL):URL[]{
 const out:URL[]=[];for(const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>/gi)){const href=m[1];if(!/(contact|about|company|team|support|imprint|location|office)/i.test(href+" "+m[0]))continue;try{const u=new URL(href,base);if(u.origin===base.origin&&u.protocol==="https:"&&!out.some(x=>x.href===u.href))out.push(u);}catch { /* Ignore malformed contact links. */ }}
 return out.slice(0,4);
}
async function enrichOne(env:Env,owner:string,id:string){
 const rows=await db<RecordRow[]>(env,"discovery_records?id=eq."+id+"&owner_id=eq."+owner+"&select=id,name,website,phone,email,raw_data");
 const row=rows?.[0];if(!row)throw new Error("记录不存在");
 if(!row.website)throw new Error("没有官网地址");
 const home=safePageUrl(row.website);const origin=home.origin;
 let robots="";try{const rr=await fetch(origin+"/robots.txt",{redirect:"manual",signal:AbortSignal.timeout(5000),headers:{"User-Agent":"TradePilotContactBot/1.0"}});if(rr.ok)robots=(await rr.text()).slice(0,100000);}catch { /* robots.txt may be unavailable; continue with conservative page limits. */ }
 const targets=[home,...[]];const found={emails:[] as string[],phones:[] as string[]};let visited=0;
 for(let index=0;index<targets.length&&visited<5;index++){
  const url=targets[index];if(url.origin!==origin||!robotsAllows(robots,url.pathname))continue;
  try{const html=await readHtml(url);visited++;const contacts=extractContacts(html);found.emails.push(...contacts.emails);found.phones.push(...contacts.phones);if(index===0)for(const link of contactLinks(html,url)){if(targets.length<5)targets.push(link);}}catch(error){if(index===0)throw error;}
 }
 const email=[...new Set(found.emails)][0]??null,phone=[...new Set(found.phones)][0]??null;
 const patch:Record<string,unknown>={updated_at:new Date().toISOString(),raw_data:{...(row.raw_data??{}),contact_enrichment:{captured_at:new Date().toISOString(),pages_visited:visited,emails:found.emails,phones:found.phones,method:"http_rules"}}};
 if(!row.email&&email)patch.email=email;if(!row.phone&&phone)patch.phone=phone;
 await db(env,"discovery_records?id=eq."+id+"&owner_id=eq."+owner,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(patch)});
 return {email:email??row.email,phone:phone??row.phone,pages:visited};
}
export class ContactEnrichmentWorkflow extends WorkflowEntrypoint<Env,Params>{
 async run(event:WorkflowEvent<Params>,step:WorkflowStep){
  const {jobId,ownerId,recordIds}=event.payload;let completed=0,failed=0;const total=recordIds.length;
  await step.do("mark-contact-enrichment-running",async()=>{await db(this.env,"discovery_contact_enrichment_runs?id=eq."+jobId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"running",message:"正在采集官网公开联系方式"})});return true;});
  for(let index=0;index<recordIds.length;index++){
   const recordId=recordIds[index];
   try{await step.do("enrich-record-"+recordId,{retries:{limit:1,delay:"5 seconds",backoff:"exponential"},timeout:"2 minutes"},async()=>enrichOne(this.env,ownerId,recordId));completed++;}
   catch { failed++; }
   const progress=Math.round((index+1)/total*100);
   await step.do("save-contact-progress-"+(index+1),async()=>{await db(this.env,"discovery_contact_enrichment_runs?id=eq."+jobId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:index===total-1?(failed===0?"completed":completed===0?"failed":"partial"):"running",progress,completed_count:completed,failed_count:failed,message:(index===total-1?(failed===0?"联系方式采集完成":completed===0?"联系方式采集失败":"联系方式采集部分完成"):"联系方式采集中")+" · "+completed+" 条完成 · "+failed+" 条失败"})});return progress;});
  }
  return {completed,failed,total};
 }
}
