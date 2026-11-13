import { errorResponse, successResponse } from "../lib/http";

interface SettingsEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GOOGLE_MAPS_API_KEY?: string;
  DEEPL_API_KEY?: string;
  SERPER_API_KEY?: string;
  SERPAPI_API_KEY?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_WORKER_NAME?: string;
  AI?: { run(model:string,input:Record<string,unknown>): Promise<unknown> };
}
type ServiceKey = "cloudflare" | "supabase" | "googleMaps" | "deepl" | "serper" | "serpapi";
type CredentialBody = { cloudflareApiToken?: string; supabaseServiceRoleKey?: string; googleMapsApiKey?: string; deeplApiKey?: string; serperApiKey?: string; serpapiApiKey?: string };
const secretNames: Record<ServiceKey, string> = {
  cloudflare: "CLOUDFLARE_API_TOKEN",
  supabase: "SUPABASE_SERVICE_ROLE_KEY",
  googleMaps: "GOOGLE_MAPS_API_KEY",
  deepl: "DEEPL_API_KEY",
  serper: "SERPER_API_KEY",
  serpapi: "SERPAPI_API_KEY",
};
const bodyFields: Record<ServiceKey, keyof CredentialBody> = {
  cloudflare: "cloudflareApiToken",
  supabase: "supabaseServiceRoleKey",
  googleMaps: "googleMapsApiKey",
  deepl: "deeplApiKey",
  serper: "serperApiKey",
  serpapi: "serpapiApiKey",
};

async function authenticated(request: Request, env: SettingsEnv): Promise<boolean> {
  const authorization = request.headers.get("Authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+(\S+)$/i);
  const token = bearerMatch?.[1];
  if (!token) return false;
  const response = await fetch(env.SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token },
  });
  return response.ok;
}

function cloudflareHeaders(token: string) {
  return { Authorization: "Bearer " + token, "Content-Type": "application/json" };
}

async function cloudflareRequest(token: string, path: string, init?: RequestInit) {
  const response = await fetch("https://api.cloudflare.com/client/v4" + path, {
    ...init,
    headers: { ...cloudflareHeaders(token), ...init?.headers },
  });
  const raw = await response.text();
  let body: { success?: boolean; errors?: Array<{ code?: number; message?: string }> } = {};
  try { body = raw ? JSON.parse(raw) as typeof body : {}; } catch { /* Preserve non-JSON API diagnostics below. */ }
  if (!response.ok || body.success === false) {
    const details = body.errors?.map((item) => [item.code ? `[${item.code}]` : "", item.message ?? ""].filter(Boolean).join(" ")).filter(Boolean).join("; ");
    throw new Error(details || `Cloudflare API HTTP ${response.status}: ${raw.slice(0, 240) || "无响应内容"}`);
  }
  return body;
}

async function saveOneSecret(service: ServiceKey, value: string, env: SettingsEnv): Promise<string> {
  const cloudflareToken = service === "cloudflare" ? value : env.CLOUDFLARE_API_TOKEN;
  if (!cloudflareToken) throw new Error("请先单独保存 Cloudflare API Token，再配置其他服务。");
  const accountId = env.CLOUDFLARE_ACCOUNT_ID ?? "ea4e98dce9c478d7dd5c07f10e5c722d";
  const workerName = env.CLOUDFLARE_WORKER_NAME ?? "tradepilot";
  await cloudflareRequest(cloudflareToken, "/user/tokens/verify");
  // This endpoint saves exactly one binding and avoids the bulk-merge path for the
  // one-key-at-a-time settings UI. Cloudflare's single-secret API is additive.
  await cloudflareRequest(cloudflareToken, `/accounts/${accountId}/workers/scripts/${workerName}/secrets`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: secretNames[service], type: "secret_text", text: value }),
  });
  return `${service === "cloudflare" ? "Cloudflare" : service === "supabase" ? "Supabase" : service === "googleMaps" ? "Google Maps" : service === "deepl" ? "DeepL" : service === "serper" ? "Serper" : "SerpApi"} 密钥已单独保存至 Cloudflare Worker Secrets。`;
}

async function testOneService(service: ServiceKey, env: SettingsEnv) {
  if (service === "cloudflare") {
    if (!env.CLOUDFLARE_API_TOKEN) return { ok: false, message: "尚未配置" };
    try {
      await cloudflareRequest(env.CLOUDFLARE_API_TOKEN, "/user/tokens/verify");
      return { ok: true, message: "Cloudflare Token 有效" };
    } catch { return { ok: false, message: "Cloudflare Token 无效或权限不足" }; }
  }
  if (service === "supabase") {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, message: "尚未配置" };
    try {
      const response = await fetch(env.SUPABASE_URL + "/rest/v1/", { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY } });
      return { ok: response.ok, message: response.ok ? "Supabase 服务密钥可用" : "Supabase 请求失败，请检查服务密钥" };
    } catch { return { ok: false, message: "无法连接 Supabase" }; }
  }
  if (service === "serper") {
    if (!env.SERPER_API_KEY) return { ok: false, message: "尚未配置" };
    try {
      const response = await fetch("https://google.serper.dev/search", { method: "POST", headers: { "X-API-KEY": env.SERPER_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ q: "TradePilot API connection test", gl: "us", hl: "en", num: 1 }) });
      if (!response.ok) return { ok: false, message: "Serper API 请求失败（HTTP " + response.status + "），请检查 Key 和账户额度" };
      const body = await response.json() as { organic?: unknown[] };
      return { ok: true, message: "Serper API 可用 · 已返回 " + (body.organic?.length ?? 0) + " 条测试结果（消耗 1 次搜索额度）" };
    } catch { return { ok: false, message: "无法连接 Serper API" }; }
  }
  if (service === "serpapi") {
    if (!env.SERPAPI_API_KEY) return { ok: false, message: "尚未配置" };
    try {
      const params = new URLSearchParams({ engine: "google", q: "TradePilot API connection test", gl: "us", hl: "en", num: "1", api_key: env.SERPAPI_API_KEY });
      const response = await fetch("https://serpapi.com/search.json?" + params.toString());
      if (!response.ok) return { ok: false, message: "SerpApi 请求失败（HTTP " + response.status + "），请检查 Key 和账户额度" };
      const body = await response.json() as { error?: string; organic_results?: unknown[] };
      if (body.error) return { ok: false, message: body.error.slice(0, 180) };
      return { ok: true, message: "SerpApi 可用 · 已返回 " + (body.organic_results?.length ?? 0) + " 条测试结果（消耗 1 次搜索额度）" };
    } catch { return { ok: false, message: "无法连接 SerpApi" }; }
  }
  if (service === "deepl") {
    if (!env.DEEPL_API_KEY) return { ok: false, message: "尚未配置" };
    try {
      const baseUrl = env.DEEPL_API_KEY.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
      const response = await fetch(baseUrl + "/v2/usage", { headers: { Authorization: "DeepL-Auth-Key " + env.DEEPL_API_KEY } });
      if (!response.ok) return { ok: false, message: response.status === 403 ? "DeepL API Key 无效或无权访问" : "DeepL API 请求失败（HTTP " + response.status + "）" };
      const usage = await response.json() as { character_count?: number; character_limit?: number };
      return { ok: true, message: typeof usage.character_count === "number" && typeof usage.character_limit === "number" ? "DeepL API 可用 · 已使用 " + usage.character_count.toLocaleString() + " / " + usage.character_limit.toLocaleString() + " 字符" : "DeepL API 可用" };
    } catch { return { ok: false, message: "无法连接 DeepL API" }; }
  }
  if (!env.GOOGLE_MAPS_API_KEY) return { ok: false, message: "尚未配置" };
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": "places.id" },
      body: JSON.stringify({ textQuery: "electronics store", maxResultCount: 1 }),
    });
    return { ok: response.ok, message: response.ok ? "Google Places API 可用" : "Google Places API 请求失败，请检查 API 启用状态、账单和密钥限制" };
  } catch { return { ok: false, message: "无法连接 Google Places API" }; }
}


type AIProtocol = "openai" | "anthropic" | "gemini" | "workers-ai";
type AIProviderConfig = {id:string;name:string;protocol:AIProtocol;baseUrl:string;model:string;configured:boolean};
type AIConfig = {defaultModel:string;taskModels:Record<string,string>;providers:AIProviderConfig[]};
const defaultAIConfig:AIConfig={defaultModel:"@cf/google/gemma-4-26b-a4b-it",taskModels:{},providers:[{id:"workers-ai",name:"Cloudflare Workers AI",protocol:"workers-ai",baseUrl:"",model:"@cf/google/gemma-4-26b-a4b-it",configured:true}]};
const aiSecretNames:Record<string,string>={openai:"AI_PROVIDER_OPENAI_API_KEY",anthropic:"AI_PROVIDER_ANTHROPIC_API_KEY",gemini:"AI_PROVIDER_GEMINI_API_KEY",deepseek:"AI_PROVIDER_DEEPSEEK_API_KEY",qwen:"AI_PROVIDER_QWEN_API_KEY",zhipu:"AI_PROVIDER_ZHIPU_API_KEY",kimi:"AI_PROVIDER_KIMI_API_KEY",minimax:"AI_PROVIDER_MINIMAX_API_KEY",openrouter:"AI_PROVIDER_OPENROUTER_API_KEY",siliconflow:"AI_PROVIDER_SILICONFLOW_API_KEY",custom:"AI_PROVIDER_CUSTOM_API_KEY"};
async function readAIConfig(env:SettingsEnv):Promise<AIConfig>{
 const key=env.SUPABASE_SERVICE_ROLE_KEY??"";
 const r=await fetch(env.SUPABASE_URL+"/rest/v1/ai_provider_settings?id=eq.true&select=config",{headers:{apikey:key,Authorization:"Bearer "+key}});
 if(!r.ok)throw new Error("读取 AI 配置失败");
 const rows=await r.json() as Array<{config:AIConfig}>;
 const c=rows[0]?.config??defaultAIConfig;
 return {...defaultAIConfig,...c,providers:(c.providers??defaultAIConfig.providers).map(p=>({...p,configured:p.id==="workers-ai"||Boolean(aiSecretNames[p.id]&&(env as unknown as Record<string,unknown>)[aiSecretNames[p.id]])}))};
}
async function writeAIConfig(config:AIConfig,env:SettingsEnv){
 const key=env.SUPABASE_SERVICE_ROLE_KEY??"";
 const safe:AIConfig={defaultModel:String(config.defaultModel??defaultAIConfig.defaultModel).slice(0,200),taskModels:Object.fromEntries(Object.entries(config.taskModels??{}).slice(0,30).map(([k,v])=>[k,String(v).slice(0,200)])),providers:(config.providers??[]).slice(0,40).map(p=>({id:String(p.id).slice(0,80),name:String(p.name).slice(0,100),protocol:p.protocol,baseUrl:String(p.baseUrl??"").slice(0,500),model:String(p.model??"").slice(0,200),configured:p.id==="workers-ai"||Boolean(aiSecretNames[p.id]&&(env as unknown as Record<string,unknown>)[aiSecretNames[p.id]])}))};
 const r=await fetch(env.SUPABASE_URL+"/rest/v1/ai_provider_settings?on_conflict=id",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id:true,config:safe,updated_at:new Date().toISOString()})});
 if(!r.ok)throw new Error("保存 AI 配置失败");
}
async function saveAISecret(id:string,value:string,env:SettingsEnv){
 const secret=aiSecretNames[id];if(!secret)throw new Error("不支持的 AI 服务商");
 if(!env.CLOUDFLARE_API_TOKEN)throw new Error("请先配置 Cloudflare API Token");
 if(value.length>4096)throw new Error("API Key 长度不符合要求");
 const token=env.CLOUDFLARE_API_TOKEN,account=env.CLOUDFLARE_ACCOUNT_ID??"ea4e98dce9c478d7dd5c07f10e5c722d",worker=env.CLOUDFLARE_WORKER_NAME??"tradepilot";
 await cloudflareRequest(token,"/user/tokens/verify");
 await cloudflareRequest(token,"/accounts/"+account+"/workers/scripts/"+worker+"/secrets",{method:"PUT",body:JSON.stringify({name:secret,type:"secret_text",text:value})});
}
function safeAIBaseUrl(raw:string,fallback:string):string{
 const value=(raw||fallback).trim();
 let url:URL;try{url=new URL(value)}catch{throw new Error('模型 Base URL 格式无效')}
 const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('模型接口只允许 HTTPS 公网地址');
 if(!host||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||host.endsWith('.test')||host.endsWith('.invalid')||host.endsWith('.example')||host.startsWith('[')||/^\d{1,3}(\.\d{1,3}){3}$/.test(host))throw new Error('模型 Base URL 不允许使用本地地址或 IP 地址');
 return url.toString().replace(/\/$/,'');
}
async function runAIProviderTest(id:string,env:SettingsEnv){
 if(id==="workers-ai"){if(!env.AI)return {ok:false,message:"Workers AI Binding 尚未启用"};try{await env.AI.run("@cf/google/gemma-4-26b-a4b-it",{messages:[{role:"user",content:"Reply with OK"}]});return {ok:true,message:"Workers AI 连接成功"};}catch{return {ok:false,message:"Workers AI 调用失败，请检查 AI Binding、模型状态与账户额度"};}}
 const config=await readAIConfig(env),p=config.providers.find(x=>x.id===id),secret=aiSecretNames[id],key=secret?(env as unknown as Record<string,unknown>)[secret] as string|undefined:undefined;
 if(!p||!key)return {ok:false,message:"请先添加服务商并保存 API Key"};
 try{
 const fallback=id==="openrouter"?"https://openrouter.ai/api/v1":p.protocol==="anthropic"?"https://api.anthropic.com/v1":p.protocol==="gemini"?"https://generativelanguage.googleapis.com/v1beta":"https://api.openai.com/v1";
 const base=safeAIBaseUrl(p.baseUrl,fallback);
 let r:Response;
 if(p.protocol==="anthropic")r=await fetch(base+"/messages",{method:"POST",redirect:"manual",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:p.model,max_tokens:12,messages:[{role:"user",content:"Reply with OK"}]})});
 else if(p.protocol==="gemini")r=await fetch(base+"/models/"+encodeURIComponent(p.model)+":generateContent?key="+encodeURIComponent(key),{method:"POST",redirect:"manual",headers:{"content-type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:"Reply with OK"}]}],generationConfig:{maxOutputTokens:12}})});
 else {const headers:Record<string,string>={Authorization:"Bearer "+key,"content-type":"application/json"};if(id==="openrouter"){headers["HTTP-Referer"]="https://tradepilot.xg-y.workers.dev";headers["X-Title"]="TradePilot";}r=await fetch(base+"/chat/completions",{method:"POST",redirect:"manual",headers,body:JSON.stringify({model:p.model||"gpt-4o-mini",messages:[{role:"user",content:"Reply with OK"}],max_tokens:12})});}
 if(r.status>=300&&r.status<400)return {ok:false,message:"模型服务返回 HTTP "+r.status+" 重定向。边缘运行环境不自动跟随此类请求，请检查 Base URL 是否为服务商的最终 API 地址。"};
 if(!r.ok){const body=await r.text();return {ok:false,message:"模型接口返回 HTTP "+r.status+"："+body.slice(0,180)};}
 return {ok:true,message:"模型服务连接成功，已收到测试响应"};
 }catch(error){const detail=error instanceof Error?error.message:String(error);return {ok:false,message:"模型连接异常："+detail.slice(0,180)};}
}

export async function handleSettings(request: Request, env: SettingsEnv): Promise<Response> {
  if (!(await authenticated(request, env))) return errorResponse(request, "UNAUTHORIZED", "请先登录后再管理集成密钥。", 401);
  const url = new URL(request.url);

  if(url.pathname==="/api/v1/settings/ai-config"&&request.method==="GET"){
   try{return successResponse(request,await readAIConfig(env));}catch(error){return errorResponse(request,"AI_CONFIG_READ_FAILED",error instanceof Error?error.message:"读取 AI 配置失败",502);}
  }
  if(url.pathname==="/api/v1/settings/ai-config"&&request.method==="PUT"){
   try{const config=await request.json() as AIConfig;await writeAIConfig(config,env);return successResponse(request,{saved:true});}catch(error){return errorResponse(request,"AI_CONFIG_SAVE_FAILED",error instanceof Error?error.message:"保存 AI 配置失败",502);}
  }
  if(url.pathname==="/api/v1/settings/ai-providers"&&request.method==="POST"){
   try{const body=await request.json() as {id?:string;apiKey?:string};if(!body.id||!body.apiKey?.trim())return errorResponse(request,"INVALID_AI_CREDENTIAL","服务商和 API Key 不能为空",400);await saveAISecret(body.id,body.apiKey.trim(),env);return successResponse(request,{saved:true});}catch(error){return errorResponse(request,"AI_SECRET_SAVE_FAILED",error instanceof Error?error.message:"保存 AI 密钥失败",502);}
  }
  if(url.pathname==="/api/v1/settings/ai-providers/test"&&request.method==="POST"){
   try{const body=await request.json() as {providerId?:string};if(!body.providerId)return errorResponse(request,"INVALID_AI_PROVIDER","请选择服务商",400);return successResponse(request,await runAIProviderTest(body.providerId,env));}catch(error){return errorResponse(request,"AI_PROVIDER_TEST_FAILED",error instanceof Error?error.message:"AI 连接测试失败",502);}
  }

  if (request.method === "GET" && url.pathname === "/api/v1/settings/integrations") {
    return successResponse(request, {
      cloudflare: Boolean(env.CLOUDFLARE_API_TOKEN),
      supabase: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      googleMaps: Boolean(env.GOOGLE_MAPS_API_KEY),
      deepl: Boolean(env.DEEPL_API_KEY),
      serper: Boolean(env.SERPER_API_KEY),
      serpapi: Boolean(env.SERPAPI_API_KEY),
    });
  }

  if (request.method === "POST" && url.pathname === "/api/v1/settings/integrations") {
    let body: CredentialBody;
    try { body = await request.json() as CredentialBody; } catch { return errorResponse(request, "INVALID_JSON", "请求内容格式不正确。", 400); }
    const supplied = (Object.entries(bodyFields) as Array<[ServiceKey, keyof CredentialBody]>)
      .filter(([, field]) => typeof body[field] === "string" && Boolean(body[field]?.trim()));
    if (supplied.length !== 1) return errorResponse(request, "ONE_KEY_AT_A_TIME", "每次只能提交一个服务的密钥，请分别保存。", 400);
    const [service, field] = supplied[0];
    const value = body[field]?.trim() ?? "";
    if (value.length > 4096) return errorResponse(request, "INVALID_CREDENTIAL", "密钥长度不符合要求。", 400);
    try {
      const message = await saveOneSecret(service, value, env);
      return successResponse(request, { saved: true, service, message });
    } catch (error) {
      return errorResponse(request, "SECRET_UPDATE_FAILED", error instanceof Error ? error.message : "密钥保存失败，请检查 Cloudflare Token 权限。", 502);
    }
  }

  if (request.method === "POST" && url.pathname === "/api/v1/settings/integrations/test") {
    let body: { service?: ServiceKey };
    try { body = await request.json() as { service?: ServiceKey }; } catch { return errorResponse(request, "INVALID_JSON", "请求内容格式不正确。", 400); }
    if (!body.service || !(body.service in secretNames)) return errorResponse(request, "INVALID_SERVICE", "请选择需要测试的服务。", 400);
    const result = await testOneService(body.service, env);
    return successResponse(request, { service: body.service, ...result });
  }

  return errorResponse(request, "NOT_FOUND", "设置接口不存在。", 404);
}
