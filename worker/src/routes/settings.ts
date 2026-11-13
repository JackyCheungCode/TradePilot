import { errorResponse, successResponse } from "../lib/http";

interface SettingsEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GOOGLE_MAPS_API_KEY?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_WORKER_NAME?: string;
}

async function authenticated(request: Request, env: SettingsEnv): Promise<boolean> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\\s+/i, "");
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
  const body = await response.json() as { success?: boolean; errors?: Array<{ message?: string }> };
  if (!response.ok || body.success === false) {
    throw new Error(body.errors?.map((item) => item.message).filter(Boolean).join("; ") || "Cloudflare API 请求失败");
  }
  return body;
}

export async function handleSettings(request: Request, env: SettingsEnv): Promise<Response> {
  if (!(await authenticated(request, env))) return errorResponse(request, "UNAUTHORIZED", "请先登录后再管理集成密钥。", 401);
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/api/v1/settings/integrations") {
    return successResponse(request, {
      cloudflare: Boolean(env.CLOUDFLARE_API_TOKEN),
      supabase: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      googleMaps: Boolean(env.GOOGLE_MAPS_API_KEY),
    });
  }

  if (request.method === "POST" && url.pathname === "/api/v1/settings/integrations") {
    let body: { cloudflareApiToken?: string; supabaseServiceRoleKey?: string; googleMapsApiKey?: string };
    try { body = await request.json() as typeof body; } catch { return errorResponse(request, "INVALID_JSON", "请求内容格式不正确。", 400); }
    const cloudflareToken = body.cloudflareApiToken?.trim() || env.CLOUDFLARE_API_TOKEN;
    const serviceRoleKey = body.supabaseServiceRoleKey?.trim();
    const googleMapsKey = body.googleMapsApiKey?.trim();
    if (!cloudflareToken || !serviceRoleKey || !googleMapsKey) {
      return errorResponse(request, "MISSING_CREDENTIALS", "首次配置需要填写 Cloudflare、Supabase 和 Google Maps 三个密钥。", 400);
    }
    if (cloudflareToken.length > 4096 || serviceRoleKey.length > 4096 || googleMapsKey.length > 4096) {
      return errorResponse(request, "INVALID_CREDENTIAL", "密钥长度不符合要求。", 400);
    }
    const accountId = env.CLOUDFLARE_ACCOUNT_ID ?? "ea4e98dce9c478d7dd5c07f10e5c722d";
    const workerName = env.CLOUDFLARE_WORKER_NAME ?? "tradepilot";
    try {
      await cloudflareRequest(cloudflareToken, "/user/tokens/verify");
      await cloudflareRequest(cloudflareToken, `/accounts/${accountId}/workers/scripts/${workerName}/secrets-bulk`, {
        method: "PATCH",
        body: JSON.stringify({
          secrets: {
            CLOUDFLARE_API_TOKEN: { name: "CLOUDFLARE_API_TOKEN", type: "secret_text", text: cloudflareToken },
            SUPABASE_SERVICE_ROLE_KEY: { name: "SUPABASE_SERVICE_ROLE_KEY", type: "secret_text", text: serviceRoleKey },
            GOOGLE_MAPS_API_KEY: { name: "GOOGLE_MAPS_API_KEY", type: "secret_text", text: googleMapsKey },
          },
        }),
      });
      return successResponse(request, { saved: true, message: "三个密钥已安全提交至 Cloudflare Worker Secrets。" });
    } catch (error) {
      return errorResponse(request, "SECRET_UPDATE_FAILED", error instanceof Error ? error.message : "密钥保存失败，请检查 Cloudflare Token 权限。", 502);
    }
  }

  if (request.method === "POST" && url.pathname === "/api/v1/settings/integrations/test") {
    const results: Record<string, { ok: boolean; message: string }> = {};
    if (!env.CLOUDFLARE_API_TOKEN) results.cloudflare = { ok: false, message: "尚未配置" };
    else {
      try { await cloudflareRequest(env.CLOUDFLARE_API_TOKEN, "/user/tokens/verify"); results.cloudflare = { ok: true, message: "Cloudflare Token 有效" }; }
      catch { results.cloudflare = { ok: false, message: "Cloudflare Token 无效或权限不足" }; }
    }
    if (!env.SUPABASE_SERVICE_ROLE_KEY) results.supabase = { ok: false, message: "尚未配置" };
    else {
      try {
        const response = await fetch(env.SUPABASE_URL + "/rest/v1/", { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY } });
        results.supabase = { ok: response.ok, message: response.ok ? "Supabase 服务密钥可用" : "Supabase 请求失败，请检查服务密钥" };
      } catch { results.supabase = { ok: false, message: "无法连接 Supabase" }; }
    }
    if (!env.GOOGLE_MAPS_API_KEY) results.googleMaps = { ok: false, message: "尚未配置" };
    else {
      try {
        const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": "places.id" },
          body: JSON.stringify({ textQuery: "electronics store", maxResultCount: 1 }),
        });
        results.googleMaps = { ok: response.ok, message: response.ok ? "Google Places API 可用" : "Google Places API 请求失败，请检查 API 启用状态、账单和密钥限制" };
      } catch { results.googleMaps = { ok: false, message: "无法连接 Google Places API" }; }
    }
    return successResponse(request, results);
  }

  return errorResponse(request, "NOT_FOUND", "设置接口不存在。", 404);
}
