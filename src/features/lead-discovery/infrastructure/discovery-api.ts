import type { DiscoveryRun, DiscoveryRunInput, DiscoveryLog } from "../domain/model";
import type { DiscoveryGateway } from "../application/ports";
import { getSupabaseClient } from "@/shared/lib/supabase";
async function request<T>(path: string, init?: RequestInit): Promise<T> {
 const { data: { session } } = await getSupabaseClient().auth.getSession();
 if (!session?.access_token) throw new Error("请先登录 TradePilot，再启动潜客发现任务。");
 const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, ...init?.headers } });
 const body = await response.json();
 if (!response.ok) throw new Error(body?.error?.message ?? "请求失败，请稍后重试");
 return body.data as T;
}
export const discoveryApi: DiscoveryGateway = {
 start: (input: DiscoveryRunInput) => request<DiscoveryRun>("/api/v1/discovery-runs", { method: "POST", body: JSON.stringify(input) }),
 getRun: (id: string) => request<DiscoveryRun & { logs: DiscoveryLog[] }>(`/api/v1/discovery-runs/${encodeURIComponent(id)}`),
};
