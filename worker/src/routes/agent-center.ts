import { errorResponse, successResponse } from "../lib/http";
import type { DiscoveryRunInput } from "./discovery";

type Protocol = "rest_api" | "mcp" | "webhook";
type AuthMode = "none" | "bearer" | "header" | "oauth2" | "webhook_secret";
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  AGENT_ENCRYPTION_KEY?: string;
  SERPER_API_KEY?: string;
  SERPAPI_API_KEY?: string;
  GOOGLE_MAPS_API_KEY?: string;
  OVERPASS_API_URL?: string;
  AI?: {run(model:string,input:Record<string,unknown>):Promise<unknown>};
  LEAD_DISCOVERY_WORKFLOW?: { create(options:{id:string;params:{runId:string;ownerId:string;input:DiscoveryRunInput}}):Promise<{id:string}> };
  AGENT_ORCHESTRATION_WORKFLOW?: { create(options:{id:string;params:{runId:string;ownerId:string;input:DiscoveryRunInput;goal:string;specialists:Array<{agentKey:string;instruction:string}>}}):Promise<{id:string}> };
}
type ConnectionRow = {
  id:string; owner_id:string; name:string; protocol:Protocol; endpoint_url:string;
  auth_mode:AuthMode; encrypted_credentials:string|null; capabilities:string[]; protocol_tools:Array<Record<string,unknown>>; protocol_metadata:Record<string,unknown>; status:string; last_tested_at:string|null;
  last_error:string|null; created_at:string; updated_at:string;
};
const publicConnectionFields = "id,name,protocol,endpoint_url,auth_mode,capabilities,protocol_tools,protocol_metadata,status,last_tested_at,last_error,created_at,updated_at";

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
  const keyBytes=decodeKey(secret);const keyBuffer=new ArrayBuffer(keyBytes.length);new Uint8Array(keyBuffer).set(keyBytes);const key=await crypto.subtle.importKey("raw",keyBuffer,{name:"AES-GCM"},false,["encrypt"]);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plaintext=new TextEncoder().encode(JSON.stringify(value));
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:new TextEncoder().encode(ownerId)},key,plaintext);
  return "v1."+base64(iv)+"."+base64(new Uint8Array(ciphertext));
}
async function decryptCredentials(value:string|null,ownerId:string,secret:string):Promise<Record<string,unknown>>{
  if(!value)return {};
  const parts=value.split(".");if(parts.length!==3||parts[0]!=="v1")throw new Error("连接凭据密文格式无效。");
  const decode=(text:string)=>Uint8Array.from(atob(text),ch=>ch.charCodeAt(0));
  const keyBytes=decodeKey(secret);const keyBuffer=new ArrayBuffer(keyBytes.length);new Uint8Array(keyBuffer).set(keyBytes);
  const key=await crypto.subtle.importKey("raw",keyBuffer,{name:"AES-GCM"},false,["decrypt"]);
  const iv=decode(parts[1]);const cipher=decode(parts[2]);
  const ivBuffer=new ArrayBuffer(iv.length);new Uint8Array(ivBuffer).set(iv);
  const cipherBuffer=new ArrayBuffer(cipher.length);new Uint8Array(cipherBuffer).set(cipher);
  const plaintext=await crypto.subtle.decrypt({name:"AES-GCM",iv:ivBuffer,additionalData:new TextEncoder().encode(ownerId)},key,cipherBuffer);
  const parsed=JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
  return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed as Record<string,unknown>:{};
}
function credentialHeaders(authMode:AuthMode,credentials:Record<string,unknown>):Record<string,string>{
  if(authMode==="bearer"&&typeof credentials.token==="string")return {Authorization:"Bearer "+credentials.token};
  if(authMode==="header"&&typeof credentials.headerName==="string"&&typeof credentials.headerValue==="string"&&/^[A-Za-z0-9-]{1,80}$/.test(credentials.headerName))return {[credentials.headerName]:credentials.headerValue};
  if(authMode==="webhook_secret"&&typeof credentials.token==="string")return {"X-Webhook-Secret":credentials.token};
  if(authMode==="oauth2")throw new Error("OAuth2 连接暂未支持自动刷新 Token，请先使用 Bearer Token。");
  return {};
}
async function parseMcpBody(response:Response):Promise<Record<string,unknown>>{
  const raw=await response.text();if(!response.ok)throw new Error("MCP_HTTP_"+response.status+": "+raw.slice(0,240));
  let parsed:unknown;
  if(response.headers.get("content-type")?.includes("text/event-stream")){
    const data=raw.split(/\r?\n/).filter(line=>line.startsWith("data:")).map(line=>line.slice(5).trim()).filter(Boolean).at(-1);
    if(!data)throw new Error("MCP_RESPONSE_EMPTY");parsed=JSON.parse(data);
  }else parsed=JSON.parse(raw);
  if(!parsed||typeof parsed!=="object")throw new Error("MCP_RESPONSE_INVALID");
  const result=parsed as Record<string,unknown>;
  if(result.error)throw new Error("MCP_RPC_ERROR: "+JSON.stringify(result.error).slice(0,240));
  return result;
}
async function mcpRequest(endpoint:string,headers:Record<string,string>,payload:Record<string,unknown>,sessionId?:string):Promise<{body:Record<string,unknown>;sessionId:string|null}>{
  const response=await fetch(endpoint,{method:"POST",redirect:"manual",headers:{"Content-Type":"application/json","Accept":"application/json, text/event-stream",...headers,...(sessionId?{"Mcp-Session-Id":sessionId}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
  return {body:await parseMcpBody(response),sessionId:response.headers.get("Mcp-Session-Id")??sessionId??null};
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
function stableStringify(value:unknown):string{
  if(value===null||typeof value!=="object")return JSON.stringify(value) ?? "null";
  if(Array.isArray(value))return "["+value.map(stableStringify).join(",")+"]";
  const object=value as Record<string,unknown>;
  return "{"+Object.keys(object).sort().map(key=>JSON.stringify(key)+":"+stableStringify(object[key])).join(",")+"}";
}
async function sha256(value:string):Promise<string>{
  const bytes=new TextEncoder().encode(value);const buffer=new ArrayBuffer(bytes.length);new Uint8Array(buffer).set(bytes);
  const digest=await crypto.subtle.digest("SHA-256",buffer);
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
}

function asRecord(value:unknown):Record<string,unknown>{
  return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
}
function boundedResult(value:unknown):unknown{
  const raw=JSON.stringify(value)??"null";
  if(raw.length<=150000)return value;
  return {truncated:true,preview:raw.slice(0,150000),originalLength:raw.length};
}
function approvalActionType(toolName:string,description:string,method?:string):string{
  const text=(toolName+" "+description).toLowerCase();
  if(/email|mail|send_message|send_email/.test(text))return "send_email";
  if(/delete|remove|purge/.test(text))return "delete_records";
  if(/merge|deduplicate/.test(text))return "merge_records";
  if(/import|create|add|insert/.test(text)||method==="POST")return "bulk_import";
  return "bulk_update";
}
async function executeMcpTool(connection:ConnectionRow,headers:Record<string,string>,toolName:string,args:Record<string,unknown>):Promise<unknown>{
  const init=await mcpRequest(connection.endpoint_url,headers,{jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"TradePilot",version:"0.1.0"}}});
  const initResult=init.body.result as Record<string,unknown>|undefined;
  if(!initResult)throw new Error("MCP_INITIALIZE_FAILED");
  if(init.sessionId){
    await fetch(connection.endpoint_url,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json, text/event-stream",...headers,"Mcp-Session-Id":init.sessionId},body:JSON.stringify({jsonrpc:"2.0",method:"notifications/initialized"}),signal:AbortSignal.timeout(15000)});
  }
  const called=await mcpRequest(connection.endpoint_url,headers,{jsonrpc:"2.0",id:2,method:"tools/call",params:{name:toolName,arguments:args}},init.sessionId??undefined);
  const result=called.body.result;
  if(!result)throw new Error("MCP_TOOL_RESULT_EMPTY");
  if(asRecord(result).isError===true)throw new Error("MCP_TOOL_EXECUTION_FAILED: "+JSON.stringify(result).slice(0,500));
  return result;
}
async function executeRestTool(connection:ConnectionRow,tool:Record<string,unknown>,headers:Record<string,string>,args:Record<string,unknown>):Promise<unknown>{
  const method=String(tool.method??"").toUpperCase();
  if(!["GET","POST","PUT","PATCH","DELETE"].includes(method))throw new Error("REST_METHOD_UNSUPPORTED");
  const routePath=typeof tool.path==="string"?tool.path:"";
  if(!routePath.startsWith("/"))throw new Error("REST_PATH_INVALID");
  const endpoint=new URL(connection.endpoint_url);
  const metadata=connection.protocol_metadata??{};
  const baseUrl=typeof metadata.baseUrl==="string"?metadata.baseUrl:endpoint.origin;
  const base=new URL(baseUrl);
  if(!isPublicHttpsEndpoint(base.href)||base.hostname!==endpoint.hostname)throw new Error("REST_BASE_URL_NOT_ALLOWED");
  const pathArgs=asRecord(args.path);
  const queryArgs=asRecord(args.query);
  const headerArgs=asRecord(args.headers);
  const parameters=Array.isArray(tool.parameters)?tool.parameters.map(asRecord):[];
  const resolvedPath=routePath.replace(/\{([^}]+)\}/g,(_match,name:string)=>{
    const value=pathArgs[name]??args[name];
    if(value===undefined||value===null)throw new Error("REST_PATH_PARAMETER_REQUIRED: "+name);
    return encodeURIComponent(String(value));
  });
  const prefix=base.pathname.replace(/\/$/,"");
  const target=new URL(base.origin+prefix+resolvedPath);
  if(target.protocol!=="https:"||target.hostname!==base.hostname||target.port!==base.port||target.origin!==base.origin)throw new Error("REST_TARGET_HOST_NOT_ALLOWED");
  const requestHeaders:Record<string,string>={Accept:"application/json",...headers};
  for(const parameter of parameters){
    const name=typeof parameter.name==="string"?parameter.name:"";
    const location=typeof parameter.in==="string"?parameter.in:"";
    if(!name||!["path","query","header"].includes(location))continue;
    const value=location==="path"?(pathArgs[name]??args[name]):location==="query"?(queryArgs[name]??args[name]):(headerArgs[name]??args[name]);
    if(value===undefined||value===null){
      if(parameter.required===true)throw new Error("REST_PARAMETER_REQUIRED: "+name);
      continue;
    }
    const textValue=Array.isArray(value)?value.map(String).join(","):typeof value==="object"?JSON.stringify(value):String(value);
    if(location==="query")target.searchParams.set(name,textValue);
    if(location==="header"&&!["authorization","host","cookie","set-cookie","content-length","connection","transfer-encoding"].includes(name.toLowerCase()))requestHeaders[name]=textValue;
  }
  let body:string|undefined;
  if(method!=="GET"&&method!=="DELETE"){
    const hasExplicitBody=Object.prototype.hasOwnProperty.call(args,"body");
    const implicitBody=Object.fromEntries(Object.entries(args).filter(([key])=>!["path","query","headers"].includes(key)));
    const bodyValue=hasExplicitBody?args.body:implicitBody;
    const requestBody=asRecord(tool.requestBody);
    if(requestBody.required===true&&!hasExplicitBody&&Object.keys(implicitBody).length===0)throw new Error("REST_REQUEST_BODY_REQUIRED");
    const content=asRecord(requestBody.content);
    if(Object.keys(content).length&&!content["application/json"]&&!content["application/*+json"])throw new Error("REST_REQUEST_BODY_CONTENT_TYPE_UNSUPPORTED");
    if(bodyValue!==undefined){body=JSON.stringify(bodyValue);requestHeaders["Content-Type"]="application/json";}
  }
  const response=await fetch(target.toString(),{method,redirect:"manual",headers:requestHeaders,...(body!==undefined?{body}:{}),signal:AbortSignal.timeout(30000)});
  const contentLength=Number(response.headers.get("content-length")??0);
  if(contentLength>1000000)throw new Error("REST_RESPONSE_TOO_LARGE");
  const raw=await response.text();
  if(raw.length>1000000)throw new Error("REST_RESPONSE_TOO_LARGE");
  let data:unknown=raw;
  if(raw){
    try{data=JSON.parse(raw);}catch{data={text:raw.slice(0,20000)};}
  }
  if(!response.ok)throw new Error("REST_API_HTTP_"+response.status+": "+JSON.stringify(data).slice(0,500));
  return {httpStatus:response.status,data};
}
async function executeExternalTool(env:Env,ownerId:string,connection:ConnectionRow,tool:Record<string,unknown>,run:{id:string;goal:string},args:Record<string,unknown>):Promise<unknown>{
  let credentials:Record<string,unknown>={};
  if(connection.encrypted_credentials){
    if(!env.AGENT_ENCRYPTION_KEY)throw new Error("AGENT_ENCRYPTION_KEY_MISSING");
    credentials=await decryptCredentials(connection.encrypted_credentials,ownerId,env.AGENT_ENCRYPTION_KEY);
  }
  const headers=credentialHeaders(connection.auth_mode,credentials);
  const toolName=String(tool.name??"");
  if(connection.protocol==="mcp")return executeMcpTool(connection,headers,toolName,args);
  if(connection.protocol==="rest_api")return executeRestTool(connection,tool,headers,args);
  const response=await fetch(connection.endpoint_url,{method:"POST",redirect:"manual",headers:{"Content-Type":"application/json","Accept":"application/json",...headers},body:JSON.stringify({event:"tradepilot.agent.tool.invoke",run:{id:run.id,goal:run.goal},tool:{name:toolName,arguments:args}}),signal:AbortSignal.timeout(30000)});
  const raw=await response.text();
  if(!response.ok)throw new Error("WEBHOOK_HTTP_"+response.status+": "+raw.slice(0,500));
  try{return raw?JSON.parse(raw):{accepted:true,status:response.status};}catch{return {accepted:true,status:response.status,response:raw.slice(0,20000)};}
}
async function writeRunLog(env:Env,ownerId:string,runId:string,level:"info"|"error",message:string,payload:Record<string,unknown>={}):Promise<void>{
  await db(env,"discovery_run_logs",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({run_id:runId,owner_id:ownerId,level,message,payload})});
  await db(env,"agent_run_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({owner_id:ownerId,run_id:runId,event_type:level==="error"?"execution_failed":"execution_update",message,payload})});
}


type PlannerAction =
 | {type:"internal_discovery";query:string;country:string;limitPerCountry:number}
 | {type:"external_tool";connectionId:string;toolName:string;arguments:Record<string,unknown>}
 | {type:"needs_clarification";question:string};
type PlannerResult={agentKey:string;summary:string;steps:string[];action:PlannerAction;specialists:Array<{agentKey:string;instruction:string}>;model:string;fallback?:boolean};
function extractModelText(value:unknown):string{
 const root=asRecord(value);
 if(typeof root.response==="string")return root.response;
 const choices=Array.isArray(root.choices)?root.choices:[];
 const choice=asRecord(choices[0]);
 const message=asRecord(choice.message);
 if(typeof message.content==="string")return message.content;
 if(Array.isArray(message.content))return message.content.map(item=>String(asRecord(item).text??"")).join("\\n");
 const candidates=Array.isArray(root.candidates)?root.candidates:[];
 const content=asRecord(asRecord(candidates[0]).content);
 if(Array.isArray(content.parts))return content.parts.map(item=>String(asRecord(item).text??"")).join("\\n");
 return "";
}
function parsePlannerJson(raw:string):Record<string,unknown>{
 const cleaned=raw.trim().replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
 const start=cleaned.indexOf("{"),end=cleaned.lastIndexOf("}");
 if(start<0||end<=start)throw new Error("AGENT_PLANNER_INVALID_JSON");
 return JSON.parse(cleaned.slice(start,end+1)) as Record<string,unknown>;
}
async function generateAgentPlan(env:Env,ownerId:string,goal:string,country:string,searchEngine:"serper"|"serpapi",connections:ConnectionRow[]):Promise<PlannerResult>{
 const settings=await db<Array<{config:Record<string,unknown>}>>(env,"ai_provider_settings?id=eq.true&select=config&limit=1");
 const config=asRecord(settings?.[0]?.config);
 const taskModels=asRecord(config.taskModels);
 const selectedModel=String(taskModels.agent_planning??taskModels.company_analysis??config.defaultModel??"@cf/google/gemma-4-26b-a4b-it");
 const providers=Array.isArray(config.providers)?config.providers.map(asRecord):[];
 const provider=providers.find(item=>item.model===selectedModel)??(selectedModel.startsWith("@cf/")?{id:"workers-ai",protocol:"workers-ai",baseUrl:"",model:selectedModel}:null);
 const tools=connections.filter(row=>row.status==="active").flatMap(row=>(row.protocol_tools??[]).map(tool=>({connectionId:row.id,connectionName:row.name,protocol:row.protocol,name:tool.name,description:tool.description??"",risk:tool.risk==="read_only"?"read_only":"approval_required",inputSchema:tool.inputSchema??{}})));
 const system="You are TradePilot's task planner for international B2B trade. Return ONLY strict JSON, no markdown. Schema: {agentKey:string,summary:string,steps:string[],specialists:Array<{agentKey:string,instruction:string}>,action:{type:'internal_discovery',query:string,country:string,limitPerCountry:number}|{type:'external_tool',connectionId:string,toolName:string,arguments:object}|{type:'needs_clarification',question:string}}. Available agentKey values: buyer_development, market_research, company_research, lead_scoring, multilingual_sales, follow_up, trade_compliance. Choose exactly one executable action. For finding importers, distributors, wholesalers, buyers, or prospects use internal_discovery unless an exact suitable external tool is listed. For external_tool you MUST choose exact connectionId and toolName from the supplied list and provide arguments matching its schema. Never invent tools. If the goal is not executable with available tools, use needs_clarification. All read-only research/search tools may run automatically. Never plan sending email, CRM imports, writes, deletes, merges, purchases, or other side effects as automatic; choose the relevant write tool only if it will be gated by human approval. Country must be a two-letter ISO code. Keep steps to 2-5 concise actions. For buyer discovery, propose a sequence of 1-3 specialist agents AFTER the discovery action, chosen from company_research, market_research, lead_scoring, trade_compliance. Each specialist must receive a short concrete instruction based on the goal and the previous discovery results. Never include email sending or CRM import. For non-discovery research, specialists may be empty. The specialists are sequential and each receives prior specialist outputs.";
 const user=JSON.stringify({goal,marketCountry:country,searchEngine,availableTools:tools});
 let raw="";
 if(provider&&String(provider.protocol)==="workers-ai"&&env.AI){
   const model=selectedModel.startsWith("@cf/")?selectedModel:String(provider.model??selectedModel);
   raw=extractModelText(await env.AI.run(model,{messages:[{role:"system",content:system},{role:"user",content:user}],response_format:{type:"json_object"},max_tokens:1200}));
 }else if(provider){
   const id=String(provider.id??"");
   const secretNames:Record<string,string>={openai:"AI_PROVIDER_OPENAI_API_KEY",anthropic:"AI_PROVIDER_ANTHROPIC_API_KEY",gemini:"AI_PROVIDER_GEMINI_API_KEY",deepseek:"AI_PROVIDER_DEEPSEEK_API_KEY",qwen:"AI_PROVIDER_QWEN_API_KEY",zhipu:"AI_PROVIDER_ZHIPU_API_KEY",kimi:"AI_PROVIDER_KIMI_API_KEY",minimax:"AI_PROVIDER_MINIMAX_API_KEY",openrouter:"AI_PROVIDER_OPENROUTER_API_KEY",siliconflow:"AI_PROVIDER_SILICONFLOW_API_KEY",custom:"AI_PROVIDER_CUSTOM_API_KEY"};
   const keyName=secretNames[id],key=keyName?(env as unknown as Record<string,unknown>)[keyName]:undefined;
   if(typeof key!=="string"||!key)throw new Error("AGENT_PLANNER_MODEL_NOT_CONFIGURED: 请在 AI 与 API 集成配置 Agent 规划模型及 API Key。");
   const base=String(provider.baseUrl??"").replace(/\/$/,"");
   const model=String(provider.model??selectedModel);
   if(String(provider.protocol)==="anthropic"){
     const response=await fetch(base+"/messages",{method:"POST",redirect:"manual",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model,max_tokens:1200,system,messages:[{role:"user",content:user}]}),signal:AbortSignal.timeout(45000)});
     if(!response.ok)throw new Error("AGENT_PLANNER_HTTP_"+response.status+": "+(await response.text()).slice(0,200));
     const body=await response.json() as Record<string,unknown>;raw=Array.isArray(body.content)?(body.content as unknown[]).map(item=>String(asRecord(item).text??"")).join("\\n"):"";
   }else if(String(provider.protocol)==="gemini"){
     const response=await fetch(base+"/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(key),{method:"POST",redirect:"manual",headers:{"content-type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{parts:[{text:user}]}],generationConfig:{responseMimeType:"application/json",maxOutputTokens:1200}}),signal:AbortSignal.timeout(45000)});
     if(!response.ok)throw new Error("AGENT_PLANNER_HTTP_"+response.status+": "+(await response.text()).slice(0,200));
     raw=extractModelText(await response.json());
   }else{
     const response=await fetch(base+"/chat/completions",{method:"POST",redirect:"manual",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"system",content:system},{role:"user",content:user}],response_format:{type:"json_object"},max_tokens:1200}),signal:AbortSignal.timeout(45000)});
     if(!response.ok)throw new Error("AGENT_PLANNER_HTTP_"+response.status+": "+(await response.text()).slice(0,200));
     raw=extractModelText(await response.json());
   }
 }else{
   const normalized=goal.toLowerCase();
   if(/importer|buyer|distributor|wholesaler|采购商|进口商|经销商|批发商|买家|潜客|客户开发/.test(normalized)){
     return {agentKey:"buyer_development",summary:"使用 TradePilot 原生搜索发现目标市场买家。",steps:["根据行业和目标市场构建搜索条件","调用搜索引擎发现企业官网与潜在买家","将结果写入统一搜索结果中心"],action:{type:"internal_discovery",query:goal,country,limitPerCountry:50},specialists:[],model:"deterministic-fallback",fallback:true};
   }
   return {agentKey:"company_research",summary:"当前未配置可用规划模型，无法可靠判断所需工具。",steps:["配置 AI 规划模型后重新提交任务"],action:{type:"needs_clarification",question:"请先在「AI 与 API 集成」配置一个可用模型，再由 Agent 自动规划此任务。"},model:"none",fallback:true};
 }
 const parsed=parsePlannerJson(raw);
 const agentKey=String(parsed.agentKey??"buyer_development");
 const allowedAgents=new Set(["buyer_development","market_research","company_research","lead_scoring","multilingual_sales","follow_up","trade_compliance"]);
 if(!allowedAgents.has(agentKey))throw new Error("AGENT_PLANNER_INVALID_AGENT");
 const summary=String(parsed.summary??"已生成执行方案。").slice(0,1000);
 const steps=Array.isArray(parsed.steps)?parsed.steps.filter((item):item is string=>typeof item==="string").slice(0,8).map(item=>item.slice(0,300)):[];
 const actionRaw=asRecord(parsed.action);
 let action:PlannerAction;
 if(actionRaw.type==="internal_discovery"){
   const plannedCountry=String(actionRaw.country??country).toUpperCase();
   const limit=Number(actionRaw.limitPerCountry??50);
   if(!/^[A-Z]{2}$/.test(plannedCountry)||!Number.isInteger(limit)||limit<1||limit>100)throw new Error("AGENT_PLANNER_INVALID_SEARCH_ACTION");
   action={type:"internal_discovery",query:String(actionRaw.query??goal).slice(0,500),country:plannedCountry,limitPerCountry:limit};
 }else if(actionRaw.type==="external_tool"){
   const connectionId=String(actionRaw.connectionId??"");
   const toolName=String(actionRaw.toolName??"");
   const connection=connections.find(row=>row.id===connectionId&&row.status==="active");
   const tool=connection?.protocol_tools?.find(item=>item.name===toolName);
   if(!connection||!tool)throw new Error("AGENT_PLANNER_SELECTED_UNKNOWN_TOOL");
   action={type:"external_tool",connectionId,toolName,arguments:asRecord(actionRaw.arguments)};
 }else if(actionRaw.type==="needs_clarification"){
   action={type:"needs_clarification",question:String(actionRaw.question??"请补充目标市场或执行条件。").slice(0,1000)};
 }else throw new Error("AGENT_PLANNER_INVALID_ACTION");
 return {agentKey,summary,steps,action,model:selectedModel};
}


type ChatTurn={role:"user"|"assistant";content:string};
export async function callAgentChatModel(env:Env,messages:ChatTurn[],systemOverride?:string,taskKey="agent_chat"):Promise<{text:string;model:string}>{
 const settings=await db<Array<{config:Record<string,unknown>}>>(env,"ai_provider_settings?id=eq.true&select=config&limit=1");
 const config=asRecord(settings?.[0]?.config),taskModels=asRecord(config.taskModels);
 const selectedModel=String(taskModels[taskKey]??taskModels.agent_planning??config.defaultModel??"@cf/google/gemma-4-26b-a4b-it");
 const providers=Array.isArray(config.providers)?config.providers.map(asRecord):[];
 const provider=providers.find(item=>item.model===selectedModel)??(selectedModel.startsWith("@cf/")?{id:"workers-ai",protocol:"workers-ai",model:selectedModel}:null);
 if(!provider)throw new Error("尚未配置小雅对话模型，请在「AI 与 API 集成」设置 Agent 对话模型。");
 const defaultSystem="你是 TradePilot 的总协调 Agent「小雅」，专门协助外贸团队开发全球 B2B 买家。请使用中文，语气专业、简洁、主动。结合对话历史理解上下文，不要重复询问已提供的信息。你需要判断用户是否已提出可执行任务。只返回严格 JSON：{reply:string,task:{goal:string,agentKey:string,country:string,mode:'planner'|'internal'|'external'}|null}。如果缺少关键条件（例如目标客户/产品或目标市场），task=null，并在 reply 中只追问最关键的一项；不要凭空补国家、产品或行业。若用户明确 @ 某 Agent，agentKey 必须按以下映射：buyer_development,market_research,company_research,lead_scoring,multilingual_sales,follow_up,trade_compliance；否则使用 auto。国家使用 ISO 3166-1 alpha-2；不确定时 task=null 并追问。mode 默认 planner。task.goal 应整理成清晰完整目标，保留对话中已确认的条件。绝不自行执行任务，只生成待用户确认的任务建议。邮件发送和批量导入不得建议自动执行。";
 const system=systemOverride??defaultSystem;
 let raw="";
 if(String(provider.protocol)==="workers-ai"&&env.AI){
  const model=selectedModel.startsWith("@cf/")?selectedModel:String(provider.model??selectedModel);
  raw=extractModelText(await env.AI.run(model,{messages:[{role:"system",content:system},...messages],response_format:{type:"json_object"},max_tokens:900}));
 }else{
  const id=String(provider.id??""),secrets:Record<string,string>={openai:"AI_PROVIDER_OPENAI_API_KEY",anthropic:"AI_PROVIDER_ANTHROPIC_API_KEY",gemini:"AI_PROVIDER_GEMINI_API_KEY",deepseek:"AI_PROVIDER_DEEPSEEK_API_KEY",qwen:"AI_PROVIDER_QWEN_API_KEY",zhipu:"AI_PROVIDER_ZHIPU_API_KEY",kimi:"AI_PROVIDER_KIMI_API_KEY",minimax:"AI_PROVIDER_MINIMAX_API_KEY",openrouter:"AI_PROVIDER_OPENROUTER_API_KEY",siliconflow:"AI_PROVIDER_SILICONFLOW_API_KEY",custom:"AI_PROVIDER_CUSTOM_API_KEY"};
  const key=(env as unknown as Record<string,unknown>)[secrets[id]??""];if(typeof key!=="string"||!key)throw new Error("小雅对话模型 API Key 未配置，请在「AI 与 API 集成」保存对应密钥。");
  const protocol=String(provider.protocol??"openai"),model=String(provider.model??selectedModel);
  const fallback=protocol==="anthropic"?"https://api.anthropic.com/v1":protocol==="gemini"?"https://generativelanguage.googleapis.com/v1beta":id==="openrouter"?"https://openrouter.ai/api/v1":"https://api.openai.com/v1";
  const base=String(provider.baseUrl||fallback).replace(/\/$/,"");
  if(!isPublicHttpsEndpoint(base))throw new Error("小雅模型 Base URL 必须是 HTTPS 公网地址。");
  let response:Response;
  if(protocol==="anthropic"){
   response=await fetch(base+"/messages",{method:"POST",redirect:"manual",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model,max_tokens:900,system,messages:messages.map(m=>({role:m.role,content:m.content}))}),signal:AbortSignal.timeout(45000)});
   if(!response.ok)throw new Error("小雅模型请求失败（HTTP "+response.status+"）。");
   const body=await response.json() as Record<string,unknown>;raw=Array.isArray(body.content)?(body.content as unknown[]).map(item=>String(asRecord(item).text??"")).join("\n"):"";
  }else if(protocol==="gemini"){
   const contents=messages.map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));
   response=await fetch(base+"/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(key),{method:"POST",redirect:"manual",headers:{"content-type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{responseMimeType:"application/json",maxOutputTokens:900}}),signal:AbortSignal.timeout(45000)});
   if(!response.ok)throw new Error("小雅模型请求失败（HTTP "+response.status+"）。");
   raw=extractModelText(await response.json());
  }else{
   response=await fetch(base+"/chat/completions",{method:"POST",redirect:"manual",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"system",content:system},...messages],response_format:{type:"json_object"},max_tokens:900}),signal:AbortSignal.timeout(45000)});
   if(!response.ok)throw new Error("小雅模型请求失败（HTTP "+response.status+"）。");
   raw=extractModelText(await response.json());
  }
 }
 if(!raw)throw new Error("小雅模型返回空内容，请检查模型配置。");
 return {text:raw,model:selectedModel};
}

export async function handleAgentCenter(request:Request,env:Env):Promise<Response>{
  const ownerId=await ownerFromRequest(request,env);
  if(!ownerId)return errorResponse(request,"UNAUTHORIZED","请先登录 TradePilot。",401);
  const url=new URL(request.url);
  const path=url.pathname.replace(/\/$/,"");
  try{
    if(path==="/api/v1/agent/appearance"&&request.method==="GET"){
      const rows=await db<Array<{config:Record<string,unknown>}>>(env,"agent_appearance_settings?owner_id=eq."+ownerId+"&select=config&limit=1");
      const fallback={default:{shape:"mochi",color:"cream",styleId:"vector",variant:"soft",face:"cute"},agents:{}};
      return successResponse(request,rows?.[0]?.config??fallback);
    }
    if(path==="/api/v1/agent/appearance"&&request.method==="PUT"){
      let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return errorResponse(request,"INVALID_JSON","请求内容不是有效 JSON。",400);}
      const input=body.config as Record<string,unknown>|undefined;
      if(!input||typeof input!=="object"||Array.isArray(input))return errorResponse(request,"VALIDATION_ERROR","形象配置格式无效。",400);
      const allowedColors=new Set(["cream","ivory","black","brown","red","orange","yellow","green","cyan","blue","violet","magenta","pink","gray","sage","clay","navy","mauve","night","cocoa","sky","blush","lilac","butter","meadow"]);
      const variants:Record<string,Set<string>>={vector:new Set(["solid","outline","glass","sticker","paper","soft","riso","pencil","marker","crayon","watercolor","neon","chalk","origami","relief","gothic"]),pixel:new Set(["crisp","dot","block"]),kaomoji:new Set(["plain","bubble"])};
      const normalizeAppearance=(value:unknown)=>{
        if(!value||typeof value!=="object"||Array.isArray(value))return null;
        const item=value as Record<string,unknown>;
        const styleId=typeof item.styleId==="string"?item.styleId:"vector";
        if(!variants[styleId]||typeof item.shape!=="string"||!/^[a-z0-9-]{2,40}$/.test(item.shape)||typeof item.color!=="string"||!allowedColors.has(item.color)||typeof item.variant!=="string"||!variants[styleId].has(item.variant)||!["cute","eyes","line","symbol","button","capsule","brow","glossy","sparkle","shades","droopy","bigmouth","pie","screen","teardrop","specs"].includes(String(item.face)))return null;
        return {shape:item.shape,color:item.color,styleId,variant:item.variant,face:item.face};
      };
      const defaultAppearance=normalizeAppearance(input.default);
      const rawAgents=input.agents&&typeof input.agents==="object"&&!Array.isArray(input.agents)?input.agents as Record<string,unknown>:{};
      const agents:Record<string,unknown>={};
      for(const [key,value] of Object.entries(rawAgents).slice(0,20)){
        if(!/^[a-z][a-z0-9_-]{1,50}$/i.test(key))continue;
        const appearance=normalizeAppearance(value);if(appearance)agents[key]=appearance;
      }
      if(!defaultAppearance)return errorResponse(request,"VALIDATION_ERROR","默认 Agent 形象不完整或包含不支持的设置。",400);
      const config={default:defaultAppearance,agents};
      if(JSON.stringify(config).length>30000)return errorResponse(request,"PAYLOAD_TOO_LARGE","形象配置过大。",413);
      const rows=await db<Array<{config:Record<string,unknown>}>>(env,"agent_appearance_settings?on_conflict=owner_id&select=config",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify({owner_id:ownerId,config,updated_at:new Date().toISOString()})});
      return successResponse(request,rows?.[0]?.config??config);
    }
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
      return successResponse(request,created,201);
    }
    const discoverMatch=path.match(/^\/api\/v1\/agent\/connections\/([0-9a-f-]{36})\/discover$/i);
    if(discoverMatch&&request.method==="POST"){
      const rows=await db<ConnectionRow[]>(env,"agent_connections?id=eq."+discoverMatch[1]+"&owner_id=eq."+ownerId+"&select=id,owner_id,name,protocol,endpoint_url,auth_mode,encrypted_credentials,capabilities,protocol_tools,protocol_metadata,status,last_tested_at,last_error,created_at,updated_at&limit=1");
      const connection=rows?.[0];if(!connection)return errorResponse(request,"CONNECTION_NOT_FOUND","外部 Agent 连接不存在。",404);
      let credentials:Record<string,unknown>={};
      if(connection.encrypted_credentials){
        if(!env.AGENT_ENCRYPTION_KEY)return errorResponse(request,"AGENT_ENCRYPTION_KEY_MISSING","Agent 加密密钥未配置。",503);
        credentials=await decryptCredentials(connection.encrypted_credentials,ownerId,env.AGENT_ENCRYPTION_KEY);
      }
      const headers=credentialHeaders(connection.auth_mode,credentials);
      let tools:Array<Record<string,unknown>>=[];let metadata:Record<string,unknown>={};
      if(connection.protocol==="mcp"){
        const init=await mcpRequest(connection.endpoint_url,headers,{jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"TradePilot",version:"0.1.0"}}});
        const initResult=init.body.result as Record<string,unknown>|undefined;
        if(!initResult)throw new Error("MCP_INITIALIZE_FAILED");
        await fetch(connection.endpoint_url,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json, text/event-stream",...headers,...(init.sessionId?{"Mcp-Session-Id":init.sessionId}:{})},body:JSON.stringify({jsonrpc:"2.0",method:"notifications/initialized"}),signal:AbortSignal.timeout(15000)});
        const listed=await mcpRequest(connection.endpoint_url,headers,{jsonrpc:"2.0",id:2,method:"tools/list",params:{}},init.sessionId??undefined);
        const result=listed.body.result as {tools?:Array<Record<string,unknown>>}|undefined;
        tools=(result?.tools??[]).slice(0,100).map(tool=>{const name=String(tool.name??"").slice(0,120);const description=String(tool.description??"").slice(0,1000);const safe=/^(search|find|lookup|list|get|read|query|discover|research|analyze|analyse|fetch|scrape)([-_ .]|$)/i.test(name)&&!/(send|write|create|update|delete|remove|import|export|purchase|payment)/i.test(name+" "+description);return {name,description,inputSchema:tool.inputSchema??{},risk:safe?"read_only":"approval_required",protocol:"mcp"};}).filter(tool=>tool.name);
        metadata={serverInfo:initResult.serverInfo??{},protocolVersion:initResult.protocolVersion??"2025-03-26",toolCount:tools.length};
      }else if(connection.protocol==="rest_api"){
        const response=await fetch(connection.endpoint_url,{method:"GET",headers:{Accept:"application/json",...headers},signal:AbortSignal.timeout(20000)});
        if(!response.ok)throw new Error("OPENAPI_HTTP_"+response.status);
        const spec=await response.json() as {openapi?:string;info?:{title?:string;version?:string};servers?:Array<{url?:string}>;paths?:Record<string,Record<string,Record<string,unknown>>>};
        if(!spec.openapi?.startsWith("3.")||!spec.paths)throw new Error("REST_API_REQUIRES_OPENAPI3: 请将端点设置为 OpenAPI 3.x JSON 文档地址。");
        for(const [routePath,operations] of Object.entries(spec.paths)){
          for(const [method,operation] of Object.entries(operations)){
            if(!["get","post","put","patch","delete"].includes(method)||!operation||typeof operation!=="object")continue;
            const op=operation as Record<string,unknown>;
            const name=String(op.operationId??(method+"_"+routePath.replace(/[^a-z0-9]+/gi,"_"))).slice(0,120);
            tools.push({name,description:String(op.summary??op.description??name).slice(0,1000),method:method.toUpperCase(),path:routePath,parameters:op.parameters??[],requestBody:op.requestBody??null,risk:method==="get"?"read_only":"approval_required",protocol:"rest_api"});
          }
        }
        tools=tools.slice(0,150);const openApiHost=new URL(connection.endpoint_url);const apiBase=new URL(spec.servers?.[0]?.url??openApiHost.origin,connection.endpoint_url);if(!isPublicHttpsEndpoint(apiBase.href)||apiBase.hostname!==openApiHost.hostname)throw new Error("OPENAPI_SERVER_NOT_ALLOWED: OpenAPI server 必须使用配置端点的同一公网主机。");metadata={title:spec.info?.title??connection.name,version:spec.info?.version??"",openapi:spec.openapi,baseUrl:apiBase.toString().replace(/\/$/,""),toolCount:tools.length};
      }else{
        const capabilityList=connection.capabilities??[];
        tools=[{name:"trigger_webhook",description:"向已登记的 Webhook 发送任务请求",risk:capabilityList.some(x=>["buyer_discovery","market_research","company_research"].includes(x))?"read_only":"approval_required",protocol:"webhook"}];
        metadata={toolCount:1,mode:"outbound_webhook"};
      }
      if(!tools.length)throw new Error("AGENT_NO_TOOLS_DISCOVERED: 该端点没有发现可用工具。");
      await db<ConnectionRow[]>(env,"agent_connections?id=eq."+connection.id+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({protocol_tools:tools,protocol_metadata:metadata,status:"active",last_tested_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()})});
      return successResponse(request,{connectionId:connection.id,status:"active",tools,metadata},200);
    }

    const invokeMatch=path.match(/^\/api\/v1\/agent\/connections\/([0-9a-f-]{36})\/invoke$/i);
    if(invokeMatch&&request.method==="POST"){
      let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return errorResponse(request,"INVALID_JSON","请求内容不是有效 JSON。",400);}
      const runId=typeof body.runId==="string"?body.runId:"";
      const toolName=typeof body.toolName==="string"?body.toolName.trim():"";
      const args=asRecord(body.arguments);
      if(!/^[0-9a-f-]{36}$/i.test(runId)||!toolName||JSON.stringify(args).length>30000)return errorResponse(request,"VALIDATION_ERROR","调用请求缺少有效任务、工具名称或参数过大。",400);
      const connectionRows=await db<ConnectionRow[]>(env,"agent_connections?id=eq."+invokeMatch[1]+"&owner_id=eq."+ownerId+"&select=id,owner_id,name,protocol,endpoint_url,auth_mode,encrypted_credentials,capabilities,protocol_tools,protocol_metadata,status,last_tested_at,last_error,created_at,updated_at&limit=1");
      const connection=connectionRows?.[0];if(!connection||connection.status!=="active")return errorResponse(request,"CONNECTION_NOT_ACTIVE","外部 Agent 尚未连接或不可用。",409);
      const tool=connection.protocol_tools?.find(item=>item.name===toolName);
      if(!tool)return errorResponse(request,"TOOL_NOT_FOUND","该工具不在此连接已发现的能力列表中，请重新验证能力。",404);
      const runRows=await db<Array<{id:string;goal:string;status:string;connection_id:string|null}>>(env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId+"&select=id,goal,status,connection_id&limit=1");
      const run=runRows?.[0];if(!run)return errorResponse(request,"RUN_NOT_FOUND","Agent 任务不存在。",404);
      if(!["planned","queued"].includes(run.status))return errorResponse(request,"RUN_NOT_READY","只有草案或排队中的 Agent 任务可以启动工具。",409);
      const risk=tool.risk==="read_only"?"read_only":"approval_required";
      const snapshot={connectionId:connection.id,connectionName:connection.name,endpointUrl:connection.endpoint_url,protocol:connection.protocol,toolName,tool,arguments:args,runId,goal:run.goal};
      if(risk==="approval_required"){
        const actionType=approvalActionType(toolName,String(tool.description??""),typeof tool.method==="string"?tool.method:undefined);
        const snapshotHash=await sha256(stableStringify(snapshot));
        const approvals=await db<Array<{id:string;expires_at:string}>>(env,"agent_approvals?select=id,expires_at",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:ownerId,run_id:runId,action_type:actionType,operation_snapshot:snapshot,snapshot_sha256:snapshotHash})});
        const approval=approvals?.[0];if(!approval)return errorResponse(request,"APPROVAL_CREATE_FAILED","无法创建审批记录。",500);
        await db(env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({connection_id:connection.id,status:"awaiting_approval",plan:{execution_state:"awaiting_approval",connection_id:connection.id,tool_name:toolName,risk},updated_at:new Date().toISOString()})});
        await db(env,"discovery_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"awaiting_approval",message:"外部 Agent 操作等待人工审批："+toolName})});
        await writeRunLog(env,ownerId,runId,"info","外部 Agent 操作已进入人工审批："+toolName,{approvalId:approval.id,connectionId:connection.id,toolName,risk});
        return successResponse(request,{runId,status:"awaiting_approval",approvalId:approval.id,expiresAt:approval.expires_at,toolName},202);
      }
      await db(env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({connection_id:connection.id,status:"running",started_at:new Date().toISOString(),plan:{execution_state:"running",connection_id:connection.id,tool_name:toolName,risk},updated_at:new Date().toISOString()})});
      await db(env,"discovery_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"running",progress:15,message:"正在调用外部 Agent 工具："+toolName})});
      await writeRunLog(env,ownerId,runId,"info","开始执行外部 Agent 工具："+toolName,{connectionId:connection.id,toolName,risk});
      try{
        const result=boundedResult(await executeExternalTool(env,ownerId,connection,tool,{id:run.id,goal:run.goal},args));
        await db(env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"succeeded",result:{toolName,connectionId:connection.id,data:result},actual_cost_usd:0,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
        await db(env,"discovery_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"completed",progress:100,message:"外部 Agent 工具执行完成："+toolName})});
        await writeRunLog(env,ownerId,runId,"info","外部 Agent 工具执行完成："+toolName,{connectionId:connection.id,toolName});
        return successResponse(request,{runId,status:"succeeded",toolName,result},200);
      }catch(error){
        const message=error instanceof Error?error.message:"外部 Agent 工具执行失败。";
        await db(env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"failed",error_message:message,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
        await db(env,"discovery_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"failed",progress:100,message})});
        await writeRunLog(env,ownerId,runId,"error","外部 Agent 工具执行失败："+message,{connectionId:connection.id,toolName});
        return errorResponse(request,"AGENT_TOOL_EXECUTION_FAILED",message,502);
      }
    }
    const connectionMatch=path.match(/^\/api\/v1\/agent\/connections\/([0-9a-f-]{36})$/i);
    if(connectionMatch&&request.method==="DELETE"){
      await db(env,"agent_connections?id=eq."+connectionMatch[1]+"&owner_id=eq."+ownerId,{method:"DELETE",headers:{Prefer:"return=minimal"}});
      return successResponse(request,{id:connectionMatch[1],deleted:true});
    }
    const runDetailMatch=path.match(/^\/api\/v1\/agent\/runs\/([0-9a-f-]{36})$/i);
    if(runDetailMatch&&request.method==="GET"){
      const runId=runDetailMatch[1];
      const runs=await db<Array<Record<string,unknown>>>(env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId+"&select=id,agent_key,goal,status,plan,result,error_message,estimated_cost_usd,actual_cost_usd,started_at,completed_at,created_at,updated_at&limit=1");
      const run=runs?.[0];if(!run)return errorResponse(request,"RUN_NOT_FOUND","Agent 任务不存在。",404);
      const [discovery,events,logs]=await Promise.all([
        db<Array<Record<string,unknown>>>(env,"discovery_runs?id=eq."+runId+"&owner_id=eq."+ownerId+"&select=id,status,progress,message,discovered_count,created_lead_count,search_config,updated_at&limit=1"),
        db<Array<Record<string,unknown>>>(env,"agent_run_events?run_id=eq."+runId+"&owner_id=eq."+ownerId+"&select=id,event_type,message,payload,created_at&order=created_at.asc&limit=100"),
        db<Array<Record<string,unknown>>>(env,"discovery_run_logs?run_id=eq."+runId+"&owner_id=eq."+ownerId+"&select=id,level,message,payload,created_at&order=created_at.asc&limit=100")
      ]);
      return successResponse(request,{run,discoveryRun:discovery?.[0]??null,events:events??[],logs:logs??[]});
    }

    if(path==="/api/v1/agent/chat"&&request.method==="POST"){
      let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return errorResponse(request,"INVALID_JSON","请求内容不是有效 JSON。",400);}
      const message=typeof body.message==="string"?body.message.trim():"";
      if(message.length<1||message.length>5000)return errorResponse(request,"VALIDATION_ERROR","消息长度必须为 1–5000 个字符。",400);
      let conversationId=typeof body.conversationId==="string"&&/^[0-9a-f-]{36}$/i.test(body.conversationId)?body.conversationId:crypto.randomUUID();
      const existing=await db<Array<{id:string}>>(env,"agent_conversations?id=eq."+conversationId+"&owner_id=eq."+ownerId+"&select=id&limit=1");
      if(!existing?.length){
        conversationId=crypto.randomUUID();
        await db(env,"agent_conversations",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({id:conversationId,owner_id:ownerId,title:message.slice(0,100),last_message_at:new Date().toISOString()})});
      }
      const history=await db<Array<{role:"user"|"assistant";content:string}>>(env,"agent_chat_messages?conversation_id=eq."+conversationId+"&owner_id=eq."+ownerId+"&select=role,content&order=created_at.desc&limit=16");
      const turns:ChatTurn[]=[...(history??[]).reverse(),{role:"user",content:message}];
      await db(env,"agent_chat_messages",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({owner_id:ownerId,conversation_id:conversationId,role:"user",content:message})});
      try{
        const generated=await callAgentChatModel(env,turns);
        const parsed=parsePlannerJson(generated.text);
        const reply=String(parsed.reply??"我已理解你的意思，请再补充一点目标信息。").slice(0,3000);
        const taskRaw=parsed.task===null?null:asRecord(parsed.task);
        let task:Record<string,unknown>|null=null;
        if(taskRaw&&typeof taskRaw.goal==="string"&&taskRaw.goal.trim().length>=2){
          const allowed=new Set(["auto","buyer_development","market_research","company_research","lead_scoring","multilingual_sales","follow_up","trade_compliance"]);
          const agentKey=allowed.has(String(taskRaw.agentKey))?String(taskRaw.agentKey):"auto";
          const country=String(taskRaw.country??"").toUpperCase();
          const mode=["planner","internal","external"].includes(String(taskRaw.mode))?String(taskRaw.mode):"planner";
          if(!/^[A-Z]{2}$/.test(country))task=null;
          else task={goal:String(taskRaw.goal).slice(0,10000),agentKey,country,mode};
        }
        await db(env,"agent_chat_messages",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({owner_id:ownerId,conversation_id:conversationId,role:"assistant",content:reply,metadata:{task,model:generated.model}})});
        await db(env,"agent_conversations?id=eq."+conversationId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({last_message_at:new Date().toISOString()})});
        return successResponse(request,{conversationId,reply,task,model:generated.model});
      }catch(error){
        const message=error instanceof Error?error.message:"小雅暂时无法生成回复。";
        await db(env,"agent_chat_messages",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({owner_id:ownerId,conversation_id:conversationId,role:"assistant",content:message,metadata:{error:true}})});
        return errorResponse(request,"AGENT_CHAT_FAILED",message,503);
      }
    }

    if(path==="/api/v1/agent/runs"&&request.method==="GET"){
      const rows=await db<unknown[]>(env,"agent_runs?owner_id=eq."+ownerId+"&select=id,agent_key,goal,status,plan,result,error_message,estimated_cost_usd,actual_cost_usd,created_at,updated_at&order=created_at.desc&limit=100");
      return successResponse(request,rows??[]);
    }
    if(path==="/api/v1/agent/runs"&&request.method==="POST"){
      let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return errorResponse(request,"INVALID_JSON","请求内容不是有效 JSON。",400);}
      const goal=typeof body.goal==="string"?body.goal.trim():"";
      if(goal.length<2||goal.length>10000)return errorResponse(request,"VALIDATION_ERROR","任务目标长度必须为 2–10000 个字符。",400);
      const execution=asRecord(body.execution);
      const requestedAgentKey=typeof execution.agentKey==="string"&&["buyer_development","market_research","company_research","lead_scoring","multilingual_sales","follow_up","trade_compliance"].includes(execution.agentKey)?execution.agentKey:"";
      const plannerMode=execution.mode==="planner";
      const explicitInternal=execution.mode==="internal_discovery";
      const engine:"serper"|"serpapi"=execution.searchEngine==="serpapi"?"serpapi":"serper";
      let country=typeof execution.country==="string"?execution.country.trim().toUpperCase():"US";
      let limit=Number.isInteger(execution.limitPerCountry)?Number(execution.limitPerCountry):50;
      let planner:PlannerResult|undefined;
      let connection:ConnectionRow|undefined;
      let selectedTool:Record<string,unknown>|undefined;
      if(plannerMode){
        if(!/^[A-Z]{2}$/.test(country))return errorResponse(request,"VALIDATION_ERROR","请选择有效的目标国家。",400);
        const available=await db<ConnectionRow[]>(env,"agent_connections?owner_id=eq."+ownerId+"&select=id,owner_id,name,protocol,endpoint_url,auth_mode,encrypted_credentials,capabilities,protocol_tools,protocol_metadata,status,last_tested_at,last_error,created_at,updated_at&order=created_at.desc&limit=100");
        planner=await generateAgentPlan(env,ownerId,goal,country,engine,available??[]);
        if(requestedAgentKey)planner.agentKey=requestedAgentKey;
        if(planner.action.type==="internal_discovery"){country=planner.action.country;limit=planner.action.limitPerCountry;}
        if(planner.action.type==="external_tool"){
          const externalAction=planner.action;
          connection=available?.find(row=>row.id===externalAction.connectionId);
          selectedTool=connection?.protocol_tools?.find(tool=>tool.name===externalAction.toolName);
          if(!connection||!selectedTool)return errorResponse(request,"AGENT_PLAN_TOOL_INVALID","规划器选择的工具已不可用，请重新规划。",409);
        }
      }
      const internalSearch=explicitInternal||(planner?.action.type==="internal_discovery");
      if(internalSearch){
        if(!/^[A-Z]{2}$/.test(country)||limit<1||limit>100)return errorResponse(request,"VALIDATION_ERROR","目标国家代码无效，或每个市场结果数量不在 1–100 范围内。",400);
        if((engine==="serper"&&!env.SERPER_API_KEY)||(engine==="serpapi"&&!env.SERPAPI_API_KEY))return errorResponse(request,"PROVIDER_NOT_CONFIGURED",engine==="serper"?"Serper API 尚未配置，请先前往 AI 与 API 集成保存密钥。":"SerpApi 尚未配置，请先前往 AI 与 API 集成保存密钥。",400);
        if(!env.LEAD_DISCOVERY_WORKFLOW)return errorResponse(request,"WORKFLOW_NOT_CONFIGURED","潜客发现工作流尚未部署。",503);
      }
      let input:DiscoveryRunInput|undefined;
      if(internalSearch)input={countries:[country],query:planner?.action.type==="internal_discovery"?planner.action.query:goal,limitPerCountry:limit,providers:[],channel:"search_engine",searchEngines:[engine],searchTypes:["web"],searchLanguage:"en",advancedQuery:goal,excludeCategories:[]};
      const actionType=planner?.action.type??(explicitInternal?"internal_discovery":"needs_clarification");
      const runId=crypto.randomUUID();
      const taskCode="AGENT-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+runId.replace(/-/g,"").slice(0,6).toUpperCase();
      const initialStatus=internalSearch||actionType==="external_tool"?"queued":"planned";
      const agentKey=requestedAgentKey||planner?.agentKey||"buyer_development";
      const plan={planner:{summary:planner?.summary??"直接执行用户指定的买家发现任务。",steps:planner?.steps??["启动 TradePilot 原生买家发现搜索"],model:planner?.model??"manual",fallback:planner?.fallback??false},execution_state:initialStatus,action:planner?.action??{type:"internal_discovery",country,searchEngine:engine,limitPerCountry:limit},specialists:planner?.specialists??[],execution_steps:[...(internalSearch?[{agentKey:"buyer_development",title:"全球买家发现",status:"queued"}]:[]),...(planner?.specialists??[]).map(s=>({agentKey:s.agentKey,title:s.agentKey,instruction:s.instruction,status:"queued"}))],policy:{search_and_analysis:"automatic",send_email:"approval_required",bulk_import:"approval_required"}};
      const rows=await db<Array<{id:string;agent_key:string;goal:string;status:string;created_at:string}>>(env,"agent_runs",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({id:runId,owner_id:ownerId,agent_key:agentKey,goal,status:initialStatus,plan,connection_id:connection?.id??null})});
      const run=rows?.[0];if(!run)return errorResponse(request,"RUN_CREATE_FAILED","Agent 任务创建失败。",500);
      try{
        const userMessage=planner?.summary??(internalSearch?"TradePilot 买家开发 Agent 已启动原生搜索工作流。":"Agent 任务已创建。");
        await db(env,"discovery_runs",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({id:runId,owner_id:ownerId,query:goal,countries:internalSearch?[country]:["GLOBAL"],limit_per_country:internalSearch?limit:1,status:initialStatus,progress:0,discovered_count:0,created_lead_count:0,message:userMessage,task_code:taskCode,channel:"agent",providers:internalSearch?[engine]:connection?[connection.protocol]:["agent"],search_config:{...(internalSearch?{searchEngine:engine,searchTypes:["web"],searchLanguage:"en"}:{}),agentKey,planner:plan.planner}})});
        await db(env,"discovery_run_logs",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({run_id:runId,owner_id:ownerId,level:"info",message:"Agent 规划完成："+userMessage,payload:{agentKey,steps:plan.planner.steps,actionType}})});
        await db(env,"agent_run_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({owner_id:ownerId,run_id:runId,event_type:"plan_created",message:"Agent 已自动选择专业角色并生成执行方案。",payload:{agentKey,steps:plan.planner.steps,actionType,model:plan.planner.model}})});
        if(internalSearch&&input){
          if(plannerMode&&(planner?.specialists.length??0)>0){
            if(!env.AGENT_ORCHESTRATION_WORKFLOW)throw new Error("AGENT_ORCHESTRATION_WORKFLOW_NOT_CONFIGURED");
            await env.AGENT_ORCHESTRATION_WORKFLOW.create({id:runId,params:{runId,ownerId,input,goal,specialists:planner!.specialists}});
          }else{
            await env.LEAD_DISCOVERY_WORKFLOW!.create({id:runId,params:{runId,ownerId,input}});
          }
        }else if(actionType==="external_tool"&&connection&&selectedTool&&planner?.action.type==="external_tool"){
          const risk=selectedTool.risk==="read_only"?"read_only":"approval_required";
          const args=planner.action.arguments;
          const snapshot={connectionId:connection.id,connectionName:connection.name,endpointUrl:connection.endpoint_url,protocol:connection.protocol,toolName:planner.action.toolName,tool:selectedTool,arguments:args,runId,goal};
          if(risk==="approval_required"){
            const action=approvalActionType(planner.action.toolName,String(selectedTool.description??""),typeof selectedTool.method==="string"?selectedTool.method:undefined);
            const hash=await sha256(stableStringify(snapshot));
            const approvals=await db<Array<{id:string;expires_at:string}>>(env,"agent_approvals?select=id,expires_at",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:ownerId,run_id:runId,action_type:action,operation_snapshot:snapshot,snapshot_sha256:hash})});
            const approval=approvals?.[0];if(!approval)throw new Error("APPROVAL_CREATE_FAILED");
            await db(env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"awaiting_approval",plan:{...plan,execution_state:"awaiting_approval",approvalId:approval.id}})});
            await db(env,"discovery_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"awaiting_approval",message:"方案中的工具操作等待人工审批："+planner.action.toolName})});
            await writeRunLog(env,ownerId,runId,"info","Agent 已自动规划并提交人工审批："+planner.action.toolName,{approvalId:approval.id});
            return successResponse(request,{...run,taskCode,agentKey,plan,status:"awaiting_approval",approvalId:approval.id,message:"方案已生成，等待人工审批后执行。"},202);
          }
          await db(env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"running",started_at:new Date().toISOString(),plan:{...plan,execution_state:"running"}})});
          await db(env,"discovery_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"running",progress:15,message:"Agent 正在调用："+planner.action.toolName})});
          const result=boundedResult(await executeExternalTool(env,ownerId,connection,selectedTool,{id:runId,goal},args));
          await db(env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"succeeded",result:{toolName:planner.action.toolName,connectionId:connection.id,data:result},completed_at:new Date().toISOString(),updated_at:new Date().toISOString(),plan:{...plan,execution_state:"completed"}})});
          await db(env,"discovery_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"completed",progress:100,message:"Agent 工具执行完成："+planner.action.toolName})});
          await writeRunLog(env,ownerId,runId,"info","Agent 工具执行完成："+planner.action.toolName,{connectionId:connection.id});
        }else{
          await writeRunLog(env,ownerId,runId,"info",planner?.action.type==="needs_clarification"?planner.action.question:"Agent 方案已生成。");
        }
      }catch(error){
        const message="Agent 任务启动失败："+String(error).slice(0,180);
        await db(env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"failed",error_message:message,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
        await db(env,"discovery_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"failed",progress:100,message})});
        await writeRunLog(env,ownerId,runId,"error",message);
        return errorResponse(request,"AGENT_RUN_START_FAILED",message,503);
      }
      return successResponse(request,{...run,taskCode,channel:"agent",agentKey,plan,countries:internalSearch?[country]:["GLOBAL"],progress:internalSearch?0:actionType==="external_tool"?100:0,discoveredCount:0,message:planner?.summary??"Agent 任务已创建"},internalSearch?202:201);
    }
    if(path==="/api/v1/agent/approvals"&&request.method==="GET"){
      const rows=await db<unknown[]>(env,"agent_approvals?owner_id=eq."+ownerId+"&select=id,run_id,action_type,status,operation_snapshot,decision_note,decided_at,expires_at,created_at&order=created_at.desc&limit=100");
      return successResponse(request,rows??[]);
    }
    if(path==="/api/v1/agent/approvals"&&request.method==="POST"){
      let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return errorResponse(request,"INVALID_JSON","请求内容不是有效 JSON。",400);}
      const runId=typeof body.runId==="string"?body.runId:"";
      const actionType=typeof body.actionType==="string"?body.actionType:"";
      const snapshot=body.operationSnapshot;
      const allowedActions=["send_email","bulk_import","bulk_update","delete_records","merge_records"];
      if(!/^[0-9a-f-]{36}$/i.test(runId)||!allowedActions.includes(actionType)||!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot))return errorResponse(request,"VALIDATION_ERROR","审批请求缺少有效任务、操作类型或操作快照。",400);
      const runs=await db<Array<{id:string}>>(env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId+"&select=id&limit=1");
      if(!runs?.length)return errorResponse(request,"RUN_NOT_FOUND","找不到该用户的 Agent 任务。",404);
      const snapshotHash=await sha256(stableStringify(snapshot));
      const rows=await db<Array<{id:string;run_id:string;action_type:string;status:string;expires_at:string}>>(env,"agent_approvals?select=id,run_id,action_type,status,expires_at",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:ownerId,run_id:runId,action_type:actionType,operation_snapshot:snapshot,snapshot_sha256:snapshotHash})});
      const approval=rows?.[0];if(!approval)return errorResponse(request,"APPROVAL_CREATE_FAILED","无法创建审批记录。",500);
      await db(env,"agent_run_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({owner_id:ownerId,run_id:runId,event_type:"approval_requested",message:"操作已进入人工审批队列："+actionType,payload:{approvalId:approval.id,snapshotSha256:snapshotHash}})});
      await db(env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"awaiting_approval",updated_at:new Date().toISOString()})});
      await db(env,"discovery_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"awaiting_approval",message:"Agent 操作等待人工审批："+actionType})});
      return successResponse(request,approval,201);
    }

    const approvalDecision=path.match(/^\/api\/v1\/agent\/approvals\/([0-9a-f-]{36})\/decision$/i);
    if(approvalDecision&&request.method==="POST"){
      let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return errorResponse(request,"INVALID_JSON","请求内容不是有效 JSON。",400);}
      const decision=body.decision;
      if(decision!=="approve"&&decision!=="reject")return errorResponse(request,"VALIDATION_ERROR","审批决定只能是 approve 或 reject。",400);
      const rows=await db<Array<{id:string;run_id:string;action_type:string;operation_snapshot:unknown;snapshot_sha256:string;status:string;expires_at:string}>>(env,"agent_approvals?id=eq."+approvalDecision[1]+"&owner_id=eq."+ownerId+"&select=id,run_id,action_type,operation_snapshot,snapshot_sha256,status,expires_at&limit=1");
      const approval=rows?.[0];if(!approval)return errorResponse(request,"APPROVAL_NOT_FOUND","审批记录不存在。",404);
      if(approval.status!=="pending")return errorResponse(request,"APPROVAL_ALREADY_DECIDED","该审批已处理，不能重复操作。",409);
      if(Date.parse(approval.expires_at)<=Date.now()){await db(env,"agent_approvals?id=eq."+approval.id+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"expired"})});return errorResponse(request,"APPROVAL_EXPIRED","该审批已过期，请重新发起。",409);}
      const verifiedHash=await sha256(stableStringify(approval.operation_snapshot));
      if(verifiedHash!==approval.snapshot_sha256)return errorResponse(request,"APPROVAL_SNAPSHOT_MISMATCH","审批快照校验失败，已阻止此操作。",409);
      const snapshot=asRecord(approval.operation_snapshot);
      const runRows=await db<Array<{id:string;goal:string;status:string}>>(env,"agent_runs?id=eq."+approval.run_id+"&owner_id=eq."+ownerId+"&select=id,goal,status&limit=1");
      const run=runRows?.[0];if(!run)return errorResponse(request,"RUN_NOT_FOUND","审批关联的 Agent 任务不存在。",404);
      const note=typeof body.note==="string"?body.note.slice(0,1000):null;
      if(decision==="reject"){
        await db(env,"agent_approvals?id=eq."+approval.id+"&owner_id=eq."+ownerId+"&status=eq.pending",{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"rejected",decision_note:note,decided_at:new Date().toISOString()})});
        await db(env,"agent_runs?id=eq."+run.id+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"cancelled",error_message:"人工审批已拒绝。",completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
        await db(env,"discovery_runs?id=eq."+run.id+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"cancelled",progress:100,message:"人工审批已拒绝。"})});
        await writeRunLog(env,ownerId,run.id,"info","人工审批已拒绝。",{approvalId:approval.id});
        return successResponse(request,{id:approval.id,status:"rejected",decision});
      }
      const connectionId=typeof snapshot.connectionId==="string"?snapshot.connectionId:"";
      const toolName=typeof snapshot.toolName==="string"?snapshot.toolName:"";
      const endpointUrl=typeof snapshot.endpointUrl==="string"?snapshot.endpointUrl:"";
      const protocol=snapshot.protocol as Protocol;
      const args=asRecord(snapshot.arguments);
      if(!/^[0-9a-f-]{36}$/i.test(connectionId)||!toolName||!endpointUrl||!allowedProtocols.includes(protocol))return errorResponse(request,"APPROVAL_SNAPSHOT_INVALID","审批快照缺少可执行的连接或工具信息。",409);
      const connectionRows=await db<ConnectionRow[]>(env,"agent_connections?id=eq."+connectionId+"&owner_id=eq."+ownerId+"&select=id,owner_id,name,protocol,endpoint_url,auth_mode,encrypted_credentials,capabilities,protocol_tools,protocol_metadata,status,last_tested_at,last_error,created_at,updated_at&limit=1");
      const connection=connectionRows?.[0];
      if(!connection||connection.status!=="active"||connection.endpoint_url!==endpointUrl||connection.protocol!==protocol)return errorResponse(request,"APPROVAL_CONNECTION_CHANGED","审批后连接信息发生变化，已阻止执行，请重新发起审批。",409);
      const tool=connection.protocol_tools?.find(item=>item.name===toolName);
      if(!tool||stableStringify(tool)!==stableStringify(snapshot.tool))return errorResponse(request,"APPROVAL_TOOL_CHANGED","审批后工具定义发生变化，已阻止执行，请重新发起审批。",409);
      const claimed=await db<Array<{id:string}>>(env,"agent_approvals?id=eq."+approval.id+"&owner_id=eq."+ownerId+"&status=eq.pending&select=id",{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status:"approved",decision_note:note,decided_at:new Date().toISOString()})});
      if(!claimed?.length)return errorResponse(request,"APPROVAL_ALREADY_DECIDED","该审批已被处理，不能重复执行。",409);
      await db(env,"agent_runs?id=eq."+run.id+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({connection_id:connection.id,status:"running",started_at:new Date().toISOString(),plan:{execution_state:"approved_and_running",connection_id:connection.id,tool_name:toolName},updated_at:new Date().toISOString()})});
      await db(env,"discovery_runs?id=eq."+run.id+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"running",progress:20,message:"审批已通过，正在执行："+toolName})});
      await writeRunLog(env,ownerId,run.id,"info","人工审批已通过，开始执行外部 Agent 工具："+toolName,{approvalId:approval.id,connectionId:connection.id});
      try{
        const result=boundedResult(await executeExternalTool(env,ownerId,connection,tool,{id:run.id,goal:run.goal},args));
        await db(env,"agent_approvals?id=eq."+approval.id+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"executed",executed_at:new Date().toISOString()})});
        await db(env,"agent_runs?id=eq."+run.id+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"succeeded",result:{toolName,connectionId:connection.id,data:result},completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
        await db(env,"discovery_runs?id=eq."+run.id+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"completed",progress:100,message:"审批操作执行完成："+toolName})});
        await writeRunLog(env,ownerId,run.id,"info","审批操作执行完成："+toolName,{approvalId:approval.id,connectionId:connection.id});
        return successResponse(request,{id:approval.id,status:"executed",decision,result});
      }catch(error){
        const message=error instanceof Error?error.message:"审批操作执行失败。";
        await db(env,"agent_approvals?id=eq."+approval.id+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"execution_failed"})});
        await db(env,"agent_runs?id=eq."+run.id+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"failed",error_message:message,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
        await db(env,"discovery_runs?id=eq."+run.id+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"failed",progress:100,message})});
        await writeRunLog(env,ownerId,run.id,"error","审批操作执行失败："+message,{approvalId:approval.id,connectionId:connection.id});
        return errorResponse(request,"APPROVED_TOOL_EXECUTION_FAILED",message,502);
      }
    }
    return errorResponse(request,"NOT_FOUND","Agent API 路由不存在。",404);
  }catch(error){
    console.error("AGENT_CENTER_API_ERROR",String(error).slice(0,400));
    return errorResponse(request,"AGENT_CENTER_API_ERROR",error instanceof Error?error.message:"Agent 服务暂时不可用。",500);
  }
}
