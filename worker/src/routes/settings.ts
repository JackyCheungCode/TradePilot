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

export async function handleSettings(request: Request, env: SettingsEnv): Promise<Response> {
  if (!(await authenticated(request, env))) return errorResponse(request, "UNAUTHORIZED", "请先登录后再管理集成密钥。", 401);
  const url = new URL(request.url);

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
