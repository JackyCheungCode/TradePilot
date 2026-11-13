import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

interface Env { SUPABASE_URL:string; SUPABASE_SERVICE_ROLE_KEY:string; }
interface Params { jobId:string; ownerId:string; recordIds:string[]; }
interface RecordRow { id:string; name:string; website:string|null; phone:string|null; email:string|null; address:string|null; raw_data:Record<string,unknown>|null; }
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
function decodeEntities(value:string):string{return value.replace(/&commat;|&#64;|&#x40;/gi,"@").replace(/&period;|&#46;|&#x2e;/gi,".").replace(/&amp;/gi,"&").replace(/&nbsp;/gi," ");}
function extractContacts(html:string){
 const decoded=decodeEntities(html),clean=decoded.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ");
 const validEmail=(value:string)=>{const x=value.toLowerCase().replace(/[.,;:)]+$/g,""),domain=x.split("@")[1]??"";return x.length<255&&!/\.(?:webp|png|jpe?g|gif|svg|ico|avif|bmp|tiff?|css|js|woff2?|ttf|eot|pdf)$/i.test(domain)&&!/(?:example\.|yourdomain\.|email\.com$)/i.test(domain);};
 const emails=[...decoded.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi)].map(m=>m[0]).filter(validEmail);
 for(const m of decoded.matchAll(/mailto:([^"'?\s>]+)/gi)){try{const v=decodeURIComponent(m[1]);if(validEmail(v))emails.push(v.toLowerCase());}catch{}}
 const phones:string[]=[];for(const m of decoded.matchAll(/tel:([^"'?\s>]+)/gi)){const v=decodeURIComponent(m[1]).replace(/[^+\d]/g,"");if(v.replace(/\D/g,"").length>=7&&v.replace(/\D/g,"").length<=15)phones.push(v);}
 for(const m of decoded.matchAll(/(?:https?:)?\/\/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)([+\d]+)/gi))phones.push(m[1]);
 for(const m of clean.matchAll(/(?:\+?\d[\d ().-]{6,18}\d)/g)){const v=m[0].replace(/[^+\d]/g,"");if(v.replace(/\D/g,"").length>=8&&v.replace(/\D/g,"").length<=15)phones.push(v);}
 const social:Record<string,string[]>={},patterns:Record<string,RegExp>={whatsapp:/https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[^\s"'<>]*/gi,telegram:/https?:\/\/(?:t\.me|telegram\.me)\/[^\s"'<>]*/gi,wechat:/https?:\/\/(?:weixin\.qq\.com|wechat\.com)\/[^\s"'<>]*/gi,line:/https?:\/\/(?:line\.me|lin\.ee)\/[^\s"'<>]*/gi,messenger:/https?:\/\/(?:m\.me|messenger\.com)\/[^\s"'<>]*/gi,skype:/skype:[^\s"'<>]*/gi,discord:/https?:\/\/(?:discord\.gg|discord\.com\/invite)\/[^\s"'<>]*/gi,facebook:/https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]*/gi,instagram:/https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]*/gi,linkedin:/https?:\/\/(?:[\w]+\.)?linkedin\.com\/[^\s"'<>]*/gi,x:/https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[^\s"'<>]*/gi,youtube:/https?:\/\/(?:www\.)?youtube\.com\/[^\s"'<>]*/gi,tiktok:/https?:\/\/(?:www\.)?tiktok\.com\/[^\s"'<>]*/gi,pinterest:/https?:\/\/(?:www\.)?pinterest\.com\/[^\s"'<>]*/gi};
 for(const [kind,re] of Object.entries(patterns)){const matches=[...decoded.matchAll(re)].map(m=>m[0].replace(/[),.;]+$/g,""));if(matches.length)social[kind]=[...new Set(matches)].slice(0,5);}
 const addresses:string[]=[];const addAddress=(v:unknown)=>{if(typeof v==="string"){const x=v.replace(/\s+/g," ").trim();if(x.length>=12&&x.length<=300&&!addresses.includes(x))addresses.push(x);}};
 for(const m of decoded.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const parsed=JSON.parse(m[1]);const walk=(v:any)=>{if(!v||typeof v!=="object")return;if(Array.isArray(v)){v.forEach(walk);return;}if(/Organization|LocalBusiness|Corporation|Store|PostalAddress/i.test(String(v["@type"]??""))){const a=v.address;if(typeof a==="string")addAddress(a);else if(a&&typeof a==="object")addAddress([a.streetAddress,a.addressLocality,a.addressRegion,a.postalCode,a.addressCountry].filter(Boolean).join(", "));}Object.values(v).forEach(walk);};walk(parsed);}catch{}}
 for(const m of decoded.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:street-address|business:contact_data:street_address|place:location:address|address)["'][^>]*content=["']([^"']+)["'][^>]*>/gi))addAddress(m[1]);
 const addr=clean.match(/\b\d{1,6}\s+[\w.'# -]{3,70}\s(?:street|st|road|rd|avenue|ave|boulevard|blvd|drive|dr|lane|ln|way|highway|hwy)\b[^,.;]{0,100}(?:,\s*[\w .-]{2,50}){1,3}/i);if(addr)addAddress(addr[0]);
 return {emails:[...new Set(emails.map(x=>x.toLowerCase()))].slice(0,20),phones:[...new Set(phones)].slice(0,20),addresses:addresses.slice(0,10),social};
}
function contactLinks(html:string,base:URL):URL[]{const out:URL[]=[];for(const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>/gi)){const href=m[1];if(!/(contact|about|company|team|support|imprint|location|office|privacy|legal)/i.test(href+" "+m[0]))continue;try{const u=new URL(href,base);if(u.origin===base.origin&&u.protocol==="https:"&&!out.some(x=>x.href===u.href))out.push(u);}catch{}}return out.slice(0,4);}
async function enrichOne(env:Env,owner:string,id:string){
 const rows=await db<RecordRow[]>(env,"discovery_records?id=eq."+id+"&owner_id=eq."+owner+"&select=id,name,website,phone,email,address,raw_data"),row=rows?.[0];if(!row)throw new Error("记录不存在");if(!row.website)throw new Error("没有官网地址");
 const home=safePageUrl(row.website),origin=home.origin;let robots="";try{const rr=await fetch(origin+"/robots.txt",{redirect:"manual",signal:AbortSignal.timeout(5000),headers:{"User-Agent":"TradePilotContactBot/1.0"}});if(rr.ok)robots=(await rr.text()).slice(0,100000);}catch{}
 const targets=[home],found={emails:[] as string[],phones:[] as string[],addresses:[] as string[],social:{} as Record<string,string[]>},sources:string[]=[];let visited=0;
 for(let i=0;i<targets.length&&visited<5;i++){const url=targets[i];if(url.origin!==origin||!robotsAllows(robots,url.pathname))continue;try{const html=await readHtml(url);visited++;const c=extractContacts(html);found.emails.push(...c.emails);found.phones.push(...c.phones);found.addresses.push(...c.addresses);for(const [k,v] of Object.entries(c.social))found.social[k]=[...new Set([...(found.social[k]??[]),...v])].slice(0,10);sources.push(url.href);if(i===0)for(const link of contactLinks(html,url))if(targets.length<5)targets.push(link);}catch(error){if(i===0)throw error;}}
 const emails=[...new Set(found.emails)].slice(0,20),phones=[...new Set(found.phones)].slice(0,20),addresses=[...new Set(found.addresses)].slice(0,10),email=emails[0]??null,phone=phones[0]??null,address=addresses[0]??null;
 const patch:Record<string,unknown>={updated_at:new Date().toISOString(),raw_data:{...(row.raw_data??{}),contact_enrichment:{captured_at:new Date().toISOString(),pages_visited:visited,emails,phones,addresses,social:found.social,source_pages:sources,method:"http_rules_structured_data"}}};
 if(!row.email&&email)patch.email=email;if(!row.phone&&phone)patch.phone=phone;if(!row.address&&address)patch.address=address;
 await db(env,"discovery_records?id=eq."+id+"&owner_id=eq."+owner,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(patch)});return {email:email??row.email,phone:phone??row.phone,address:address??row.address,pages:visited};
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
