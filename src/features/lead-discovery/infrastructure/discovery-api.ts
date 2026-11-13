import type { DiscoveryRun, DiscoveryRunInput, DiscoveryLog, DiscoveryRecord, FormalLead } from "../domain/model";
import type { DiscoveryGateway } from "../application/ports";
import { getSupabaseClient } from "@/shared/lib/supabase";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
 const { data: { session } } = await getSupabaseClient().auth.getSession();
 if (!session?.access_token) throw new Error("请先登录 TradePilot，再启动潜客发现任务。");
 const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, ...init?.headers } });
 const raw = await response.text();
 let body: { data?: T; error?: { message?: string } };
 try { body = JSON.parse(raw) as { data?: T; error?: { message?: string } }; }
 catch { const isHtml=/^\s*<!doctype html|^\s*<html/i.test(raw); throw new Error(isHtml ? `任务接口返回了网页而不是 JSON（HTTP ${response.status}，${path}）。请检查 Worker API 路由与部署状态。` : `任务接口返回了无效 JSON（HTTP ${response.status}，${path}）。`); }
 if (!response.ok) throw new Error(body?.error?.message ?? `请求失败（HTTP ${response.status}），请稍后重试`);
 if (body.data === undefined) throw new Error("任务接口响应缺少 data 数据。");
 return body.data;
}
export const discoveryApi: DiscoveryGateway = {
 start: (input: DiscoveryRunInput) => request<DiscoveryRun>("/api/v1/discovery-runs", { method: "POST", body: JSON.stringify(input) }),
 getRun: (id: string) => request<DiscoveryRun & { logs: DiscoveryLog[] }>(`/api/v1/discovery-runs/${encodeURIComponent(id)}`),
};
export const discoveryWorkspaceApi = {
 listRuns: () => request<DiscoveryRun[]>("/api/v1/discovery-runs"),
 listRecords: (runId?: string) => request<DiscoveryRecord[]>(`/api/v1/discovery-records${runId ? "?runId="+encodeURIComponent(runId) : ""}`),
 action: (id: string, action: "remove" | "discard" | "promote", runId?: string) => request<{id:string;status:string;leadId?:string}>(`/api/v1/discovery-records/${encodeURIComponent(id)}/action`, {method:"POST",body:JSON.stringify({action,runId})}),
 listLeads: () => request<FormalLead[]>("/api/v1/leads"),
};

export interface SearchDiscoveryInput {
 country:string; state?:string; city?:string; query:string; advancedQuery:string; limitPerCountry:number;
 searchEngines:Array<"serper"|"serpapi">; searchTypes:Array<"web"|"shopping"|"images"|"news"|"videos"|"scholar"|"patents">;
 searchLanguage:string; excludeCategories:string[]; originalQuery?:string; translatedQuery?:string; targetLanguage?:string;
}
export const searchDiscoveryApi = {
 start: async (input:SearchDiscoveryInput) => {
  const {data:{session}}=await getSupabaseClient().auth.getSession();
  if(!session?.access_token)throw new Error("请先登录 TradePilot，再启动搜索任务。");
  const response=await fetch("/api/v1/search-discovery-runs",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify(input)});
  const raw=await response.text();let body:{data?:DiscoveryRun;error?:{message?:string}};
  try{body=JSON.parse(raw) as typeof body;}catch{throw new Error("搜索任务接口返回了无效响应（HTTP "+response.status+"）。");}
  if(!response.ok||!body.data)throw new Error(body.error?.message??"搜索任务创建失败。");return body.data;
 }
};
