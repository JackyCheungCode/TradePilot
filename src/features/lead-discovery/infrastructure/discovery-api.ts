import type { DiscoveryRun, DiscoveryRunInput, DiscoveryLog } from "../domain/model";
import type { DiscoveryGateway } from "../application/ports";
async function request<T>(path: string, init?: RequestInit): Promise<T> {
 const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
 const body = await response.json();
 if (!response.ok) throw new Error(body?.error?.message ?? "请求失败，请稍后重试");
 return body.data as T;
}
export const discoveryApi: DiscoveryGateway = {
 start: (input: DiscoveryRunInput) => request<DiscoveryRun>("/api/v1/discovery-runs", { method: "POST", body: JSON.stringify(input) }),
 getRun: (id: string) => request<DiscoveryRun & { logs: DiscoveryLog[] }>(`/api/v1/discovery-runs/${encodeURIComponent(id)}`),
};
