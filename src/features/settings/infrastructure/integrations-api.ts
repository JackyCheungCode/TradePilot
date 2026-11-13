import { getSupabaseClient } from "@/shared/lib/supabase";

export interface IntegrationStatus {
  cloudflare: boolean;
  supabase: boolean;
  googleMaps: boolean;
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
  save: (credentials: { cloudflareApiToken: string; supabaseServiceRoleKey: string; googleMapsApiKey: string }) =>
    request<{ saved: boolean; message: string }>("/api/v1/settings/integrations", { method: "POST", body: JSON.stringify(credentials) }),
  test: () => request<Record<"cloudflare" | "supabase" | "googleMaps", IntegrationTestResult>>("/api/v1/settings/integrations/test", { method: "POST", body: "{}" }),
};
