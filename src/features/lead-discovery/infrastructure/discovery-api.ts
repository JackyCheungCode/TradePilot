import type { DiscoveryRun, DiscoveryRunInput, DiscoveryLog } from "../domain/model";
import type { DiscoveryGateway } from "../application/ports";
import { getSupabaseClient } from "@/shared/lib/supabase";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
 const { data: { session } } = await getSupabaseClient().auth.getSession();
 if (!session?.access_token) throw new Error("请先登录 TradePilot，再启动潜客发现任务。");
 const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, ...init?.headers } });
 const raw = await response.text();
 let body: { data?: T; error?: { message?: string } };
 try {
  body = JSON.parse(raw) as { data?: T; error?: { message?: string } };
 } catch {
  const isHtml = /^\s*<!doctype html|^\s*<html/i.test(raw);
  if (isHtml) {
   throw new Error(`任务接口返回了网页而不是 JSON（HTTP ${response.status}，${path}）。请检查 Worker API 路由与部署状态。`);
  }
  throw new Error(`任务接口返回了无效 JSON（HTTP ${response.status}，${path}）。`);
 }
 if (!response.ok) throw new Error(body?.error?.message ?? `请求失败（HTTP ${response.status}），请稍后重试`);
 if (body.data === undefined) throw new Error("任务接口响应缺少 data 数据。");
 return body.data;
}

export const discoveryApi: DiscoveryGateway = {
 start: (input: DiscoveryRunInput) => request<DiscoveryRun>("/api/v1/discovery-runs", { method: "POST", body: JSON.stringify(input) }),
 getRun: (id: string) => request<DiscoveryRun & { logs: DiscoveryLog[] }>(`/api/v1/discovery-runs/${encodeURIComponent(id)}`),
};
