import { getSupabaseClient } from "@/shared/lib/supabase";
import type { AgentAppearanceConfig } from "../domain/appearance";
export type AgentProtocol="rest_api"|"mcp"|"webhook";
export type AgentAuthMode="none"|"bearer"|"header"|"oauth2"|"webhook_secret";
export interface AgentConnection {id:string;name:string;protocol:AgentProtocol;endpoint_url:string;auth_mode:AgentAuthMode;capabilities:string[];protocol_tools:Array<{name:string;description?:string;risk?:string;[key:string]:unknown}>;protocol_metadata:Record<string,unknown>;status:string;last_tested_at:string|null;last_error:string|null;created_at:string;updated_at:string;}
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
 getAppearance:()=>request<AgentAppearanceConfig>("/api/v1/agent/appearance"),
 saveAppearance:(config:AgentAppearanceConfig)=>request<AgentAppearanceConfig>("/api/v1/agent/appearance",{method:"PUT",body:JSON.stringify({config})}),
 listConnections:()=>request<AgentConnection[]>("/api/v1/agent/connections"),
 createConnection:(input:{name:string;protocol:AgentProtocol;endpointUrl:string;authMode:AgentAuthMode;credentials?:Record<string,string>;capabilities:string[]})=>request<AgentConnection>("/api/v1/agent/connections",{method:"POST",body:JSON.stringify(input)}),
 deleteConnection:(id:string)=>request<{id:string;deleted:boolean}>("/api/v1/agent/connections/"+encodeURIComponent(id),{method:"DELETE"}),
 discoverConnection:(id:string)=>request<{connectionId:string;status:string;tools:Array<{name:string;description?:string;risk?:string}>;metadata:Record<string,unknown>}>("/api/v1/agent/connections/"+encodeURIComponent(id)+"/discover",{method:"POST"}),
 listRuns:()=>request<AgentRun[]>("/api/v1/agent/runs"),
 createRun:(goal:string,execution?:{mode:"internal_discovery";country:string;searchEngine:"serper"|"serpapi";limitPerCountry:number})=>request<AgentRun & {taskCode?:string;message?:string}>("/api/v1/agent/runs",{method:"POST",body:JSON.stringify({goal,...(execution?{execution}:{})})}),
 invokeConnection:(connectionId:string,runId:string,toolName:string,args:Record<string,unknown>)=>request<{runId:string;status:string;approvalId?:string;toolName:string;result?:unknown}>("/api/v1/agent/connections/"+encodeURIComponent(connectionId)+"/invoke",{method:"POST",body:JSON.stringify({runId,toolName,arguments:args})}),
 listApprovals:()=>request<Array<{id:string;run_id:string;action_type:string;status:string;operation_snapshot?:Record<string,unknown>;created_at:string;expires_at:string}>>("/api/v1/agent/approvals"),
 decideApproval:(id:string,decision:"approve"|"reject",note?:string)=>request<{id:string;status:string;decision:string}>("/api/v1/agent/approvals/"+encodeURIComponent(id)+"/decision",{method:"POST",body:JSON.stringify({decision,note})}),
};
