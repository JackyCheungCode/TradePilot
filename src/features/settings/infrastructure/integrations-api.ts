import { getSupabaseClient } from "@/shared/lib/supabase";

export type IntegrationService = "cloudflare" | "supabase" | "googleMaps" | "deepl" | "serper" | "serpapi";
export interface IntegrationStatus {
  cloudflare: boolean;
  supabase: boolean;
  googleMaps: boolean;
  deepl: boolean;
  serper: boolean;
  serpapi: boolean;
}
export interface IntegrationTestResult {
  ok: boolean;
  message: string;
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  if (!session?.access_token) throw new Error("请先登录 TradePilot，再管理集成密钥。");
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, ...init?.headers },
  });
  const body = await response.json() as { data?: T; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? "请求失败，请稍后重试。");
  return body.data as T;
}
export const integrationsApi = {
  getStatus: () => request<IntegrationStatus>("/api/v1/settings/integrations"),
  save: (service: IntegrationService, value: string) => {
    const fields = {
      cloudflare: { cloudflareApiToken: value },
      supabase: { supabaseServiceRoleKey: value },
      googleMaps: { googleMapsApiKey: value },
      deepl: { deeplApiKey: value },
      serper: { serperApiKey: value },
      serpapi: { serpapiApiKey: value },
    };
    return request<{ saved: boolean; service: IntegrationService; message: string }>("/api/v1/settings/integrations", {
      method: "POST",
      body: JSON.stringify(fields[service]),
    });
  },
  test: (service: IntegrationService) => request<IntegrationTestResult & { service: IntegrationService }>(
    "/api/v1/settings/integrations/test",
    { method: "POST", body: JSON.stringify({ service }) },
  ),
};
