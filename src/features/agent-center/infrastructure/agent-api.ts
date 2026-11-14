import { getSupabaseClient } from "@/shared/lib/supabase";
export type AgentProtocol="rest_api"|"mcp"|"webhook";
export type AgentAuthMode="none"|"bearer"|"header"|"oauth2"|"webhook_secret";
export interface AgentConnection {id:string;name:string;protocol:AgentProtocol;endpoint_url:string;auth_mode:AgentAuthMode;capabilities:string[];status:string;last_tested_at:string|null;last_error:string|null;created_at:string;updated_at:string;}
export interface AgentRun {id:string;agent_key:string;goal:string;status:string;plan?:Record<string,unknown>;result?:Record<string,unknown>|null;error_message?:string|null;estimated_cost_usd?:number|null;actual_cost_usd?:number|null;created_at:string;updated_at:string;}
async function request<T>(path:string,init?:RequestInit):Promise<T>{
 const {data:{session}}=await getSupabaseClient().auth.getSession();
 if(!session?.access_token)throw new Error("请先登录 TradePilot。");
 const response=await fetch(path,{...init,headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token,...init?.headers}});
 const raw=await response.text();let body:{data?:T;error?:{message?:string}};
 try{body=JSON.parse(raw) as typeof body;}catch{throw new Error("Agent API 返回无效响应（HTTP "+response.status+"）。");}
 if(!response.ok||body.data===undefined)throw new Error(body.error?.message??"Agent API 请求失败（HTTP "+response.status+"）。");
 return body.data;
}
export const agentApi={
 listConnections:()=>request<AgentConnection[]>("/api/v1/agent/connections"),
 createConnection:(input:{name:string;protocol:AgentProtocol;endpointUrl:string;authMode:AgentAuthMode;credentials?:Record<string,string>;capabilities:string[]})=>request<AgentConnection>("/api/v1/agent/connections",{method:"POST",body:JSON.stringify(input)}),
 deleteConnection:(id:string)=>request<{id:string;deleted:boolean}>("/api/v1/agent/connections/"+encodeURIComponent(id),{method:"DELETE"}),
 listRuns:()=>request<AgentRun[]>("/api/v1/agent/runs"),
 createRun:(goal:string)=>request<AgentRun>("/api/v1/agent/runs",{method:"POST",body:JSON.stringify({goal})}),
 listApprovals:()=>request<Array<{id:string;action_type:string;status:string;created_at:string;expires_at:string}>>("/api/v1/agent/approvals"),
};
