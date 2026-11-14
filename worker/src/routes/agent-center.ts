import { errorResponse, successResponse } from "../lib/http";

type Protocol = "rest_api" | "mcp" | "webhook";
type AuthMode = "none" | "bearer" | "header" | "oauth2" | "webhook_secret";
interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  AGENT_ENCRYPTION_KEY?: string;
}
type ConnectionRow = {
  id:string; owner_id:string; name:string; protocol:Protocol; endpoint_url:string;
  auth_mode:AuthMode; capabilities:string[]; status:string; last_tested_at:string|null;
  last_error:string|null; created_at:string; updated_at:string;
};
const publicConnectionFields = "id,name,protocol,endpoint_url,auth_mode,capabilities,status,last_tested_at,last_error,created_at,updated_at";

async function ownerFromRequest(request:Request,env:Env):Promise<string|null>{
  const token=request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if(!token)return null;
  const response=await fetch(env.SUPABASE_URL+"/auth/v1/user",{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:"Bearer "+token}});
  if(!response.ok)return null;
  const user=await response.json() as {id?:string};
  return user.id??null;
}
async function db<T>(env:Env,path:string,init:RequestInit={}):Promise<T>{
  const response=await fetch(env.SUPABASE_URL+"/rest/v1/"+path,{...init,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,"Content-Type":"application/json",...init.headers}});
  const raw=await response.text();
  if(!response.ok)throw new Error("DATABASE_"+response.status+": "+raw.slice(0,240));
  return raw?JSON.parse(raw) as T:undefined as T;
}
function base64(bytes:Uint8Array):string{let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);}
function decodeKey(value:string):Uint8Array{
  const trimmed=value.trim();
  if(/^[a-f0-9]{64}$/i.test(trimmed))return new Uint8Array(trimmed.match(/.{2}/g)!.map(x=>parseInt(x,16)));
  try{const decoded=atob(trimmed);const bytes=Uint8Array.from(decoded,c=>c.charCodeAt(0));if(bytes.length===32)return bytes;}catch{/* validated below */}
  throw new Error("AGENT_ENCRYPTION_KEY 必须是 32 字节密钥的 Base64 或 64 位十六进制值。");
}
async function encryptCredentials(value:unknown,ownerId:string,secret:string):Promise<string>{
  const key=await crypto.subtle.importKey("raw",decodeKey(secret),{name:"AES-GCM"},false,["encrypt"]);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plaintext=new TextEncoder().encode(JSON.stringify(value));
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:new TextEncoder().encode(ownerId)},key,plaintext);
  return "v1."+base64(iv)+"."+base64(new Uint8Array(ciphertext));
}
function isPublicHttpsEndpoint(value:string):boolean{
  try{
    const url=new URL(value);
    if(url.protocol!=="https:"||url.username||url.password)return false;
    const host=url.hostname.toLowerCase().replace(/^\[|\]$/g,"");
    if(host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host==="::1"||host==="0.0.0.0")return false;
    if(/^127\./.test(host)||/^10\./.test(host)||/^192\.168\./.test(host)||/^169\.254\./.test(host))return false;
    const match=host.match(/^172\.(\d+)\./);if(match&&Number(match[1])>=16&&Number(match[1])<=31)return false;
    return true;
  }catch{return false;}
}
const allowedProtocols:Protocol[]=["rest_api","mcp","webhook"];
const allowedAuthModes:AuthMode[]=["none","bearer","header","oauth2","webhook_secret"];

export async function handleAgentCenter(request:Request,env:Env):Promise<Response>{
  const ownerId=await ownerFromRequest(request,env);
  if(!ownerId)return errorResponse(request,"UNAUTHORIZED","请先登录 TradePilot。",401);
  const url=new URL(request.url);
  const path=url.pathname.replace(/\/$/,"");
  try{
    if(path==="/api/v1/agent/connections"&&request.method==="GET"){
      const rows=await db<ConnectionRow[]>(env,"agent_connections?owner_id=eq."+ownerId+"&select="+publicConnectionFields+"&order=created_at.desc&limit=100");
      return successResponse(request,rows??[]);
    }
    if(path==="/api/v1/agent/connections"&&request.method==="POST"){
      let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return errorResponse(request,"INVALID_JSON","请求内容不是有效 JSON。",400);}
      const name=typeof body.name==="string"?body.name.trim():"";
      const protocol=body.protocol as Protocol;
      const endpoint=typeof body.endpointUrl==="string"?body.endpointUrl.trim():"";
      const authMode=(typeof body.authMode==="string"?body.authMode:"none") as AuthMode;
      const capabilities=Array.isArray(body.capabilities)?[...new Set(body.capabilities.filter((x):x is string=>typeof x==="string").map(x=>x.trim()).filter(x=>/^[a-z][a-z0-9_.-]{1,59}$/i.test(x)))].slice(0,30):[];
      if(name.length<2||name.length>120||!allowedProtocols.includes(protocol)||!isPublicHttpsEndpoint(endpoint)||!allowedAuthModes.includes(authMode)){
        return errorResponse(request,"VALIDATION_ERROR","请填写有效名称、协议、HTTPS 公网端点和认证方式。",400);
      }
      let encryptedCredentials:string|null=null;
      if(authMode!=="none"){
        if(!env.AGENT_ENCRYPTION_KEY)return errorResponse(request,"AGENT_ENCRYPTION_KEY_MISSING","尚未配置 Agent 凭据加密密钥，无法安全保存连接凭据。",503);
        const credentials=body.credentials;
        if(!credentials||typeof credentials!=="object"||Array.isArray(credentials)||!Object.keys(credentials as Record<string,unknown>).length)return errorResponse(request,"CREDENTIALS_REQUIRED","此认证方式需要提供连接凭据。",400);
        try{encryptedCredentials=await encryptCredentials(credentials,ownerId,env.AGENT_ENCRYPTION_KEY);}catch(error){return errorResponse(request,"ENCRYPTION_CONFIG_INVALID",error instanceof Error?error.message:"凭据加密失败。",503);}
      }
      const rows=await db<ConnectionRow[]>(env,"agent_connections?select="+publicConnectionFields,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:ownerId,name,protocol,endpoint_url:endpoint,auth_mode:authMode,encrypted_credentials:encryptedCredentials,capabilities,status:"pending"})});
      const created=rows?.[0];if(!created)return errorResponse(request,"CONNECTION_CREATE_FAILED","连接登记失败。",500);
      const {owner_id:_owner,...safe}=created as ConnectionRow;
      return successResponse(request,safe,201);
    }
    const connectionMatch=path.match(/^\/api\/v1\/agent\/connections\/([0-9a-f-]{36})$/i);
    if(connectionMatch&&request.method==="DELETE"){
      await db(env,"agent_connections?id=eq."+connectionMatch[1]+"&owner_id=eq."+ownerId,{method:"DELETE",headers:{Prefer:"return=minimal"}});
      return successResponse(request,{id:connectionMatch[1],deleted:true});
    }
    if(path==="/api/v1/agent/runs"&&request.method==="GET"){
      const rows=await db<unknown[]>(env,"agent_runs?owner_id=eq."+ownerId+"&select=id,agent_key,goal,status,plan,result,error_message,estimated_cost_usd,actual_cost_usd,created_at,updated_at&order=created_at.desc&limit=100");
      return successResponse(request,rows??[]);
    }
    if(path==="/api/v1/agent/runs"&&request.method==="POST"){
      let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return errorResponse(request,"INVALID_JSON","请求内容不是有效 JSON。",400);}
      const goal=typeof body.goal==="string"?body.goal.trim():"";
      if(goal.length<2||goal.length>10000)return errorResponse(request,"VALIDATION_ERROR","任务目标长度必须为 2–10000 个字符。",400);
      const rows=await db<Array<{id:string;agent_key:string;goal:string;status:string;created_at:string}>>(env,"agent_runs",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:ownerId,agent_key:"tradepilot_planner",goal,status:"planned",plan:{execution_state:"not_started",reason:"Agent execution adapters are not yet enabled",policy:{search_and_analysis:"automatic",send_email:"approval_required",bulk_import:"approval_required"}}})});
      const run=rows?.[0];if(!run)return errorResponse(request,"RUN_CREATE_FAILED","Agent 任务草案创建失败。",500);
      await db(env,"agent_run_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({owner_id:ownerId,run_id:run.id,event_type:"plan_created",message:"已保存 Agent 任务目标；等待执行引擎与工具权限接通。",payload:{execution_state:"not_started"}})});
      return successResponse(request,run,201);
    }
    if(path==="/api/v1/agent/approvals"&&request.method==="GET"){
      const rows=await db<unknown[]>(env,"agent_approvals?owner_id=eq."+ownerId+"&select=id,run_id,action_type,operation_snapshot,snapshot_sha256,status,decision_note,decided_at,expires_at,created_at&order=created_at.desc&limit=100");
      return successResponse(request,rows??[]);
    }
    return errorResponse(request,"NOT_FOUND","Agent API 路由不存在。",404);
  }catch(error){
    console.error("AGENT_CENTER_API_ERROR",String(error).slice(0,400));
    return errorResponse(request,"AGENT_CENTER_API_ERROR",error instanceof Error?error.message:"Agent 服务暂时不可用。",500);
  }
}
