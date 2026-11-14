import { getSupabaseClient } from "@/shared/lib/supabase";
import type { AgentAppearanceConfig } from "../domain/appearance";
export type AgentProtocol="rest_api"|"mcp"|"webhook";
export type AgentAuthMode="none"|"bearer"|"header"|"oauth2"|"webhook_secret";
export interface AgentConnection {id:string;name:string;protocol:AgentProtocol;endpoint_url:string;auth_mode:AgentAuthMode;capabilities:string[];protocol_tools:Array<{name:string;description?:string;risk?:string;[key:string]:unknown}>;protocol_metadata:Record<string,unknown>;status:string;last_tested_at:string|null;last_error:string|null;created_at:string;updated_at:string;}
export interface AgentRun {id:string;agent_key:string;goal:string;status:string;plan?:Record<string,unknown>;result?:Record<string,unknown>|null;error_message?:string|null;estimated_cost_usd?:number|null;actual_cost_usd?:number|null;created_at:string;updated_at:string;}
async function request<T>(path:string,init?:RequestInit):Promise<T>{
 const {data:{session}}=await getSupabaseClient().auth.getSession();
 if(!session?.access_token)throw new Error("请先登录 TradePilot。");
 let response:Response;
 try{response=await fetch(path,{...init,signal:init?.signal??AbortSignal.timeout(path==="/api/v1/agent/chat"?55000:20000),headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token,...init?.headers}});}
 catch(error){if(error instanceof DOMException&&error.name==="TimeoutError")throw new Error(path==="/api/v1/agent/chat"?"小雅响应超时（55 秒）。请检查「AI 与 API 集成」中的 Agent 对话模型和 API Key，然后重试。":"Agent 服务请求超时，请重试。");throw error;}
 const raw=await response.text();let body:{data?:T;error?:{message?:string}};
 try{body=JSON.parse(raw) as typeof body;}catch{throw new Error("Agent API 返回无效响应（HTTP "+response.status+"）。");}
 if(!response.ok||body.data===undefined)throw new Error(body.error?.message??"Agent API 请求失败（HTTP "+response.status+"）。");
 return body.data;
}
export interface AgentWorkflow {id:string;name:string;description:string;enabled:boolean;definition:{steps:Array<{id:string;agentKey:string;instruction:string}>};created_at:string;updated_at:string;}
export interface AgentProfile {agent_key:string;enabled:boolean;config:{systemPrompt:string;description:string};updated_at:string;}
export const agentApi={
 listWorkflows:()=>request<AgentWorkflow[]>("/api/v1/agent/workflows"),
 createWorkflow:(input:{name:string;description:string;definition:AgentWorkflow["definition"]})=>request<AgentWorkflow>("/api/v1/agent/workflows",{method:"POST",body:JSON.stringify(input)}),
 saveWorkflow:(id:string,input:{name:string;description:string;enabled:boolean;definition:AgentWorkflow["definition"]})=>request<AgentWorkflow>("/api/v1/agent/workflows/"+encodeURIComponent(id),{method:"PUT",body:JSON.stringify(input)}),
 runWorkflow:(id:string,input:{goal:string;country:string})=>request<{runId:string;taskCode:string;status:string;message:string}>("/api/v1/agent/workflows/"+encodeURIComponent(id)+"/run",{method:"POST",body:JSON.stringify(input)}),
 testWorkflow:(id:string)=>request<{valid:boolean;stepCount:number;disabledAgents:string[];mode:string;message:string}>("/api/v1/agent/workflows/"+encodeURIComponent(id)+"/test",{method:"POST"}),
 deleteWorkflow:(id:string)=>request<{id:string;deleted:boolean}>("/api/v1/agent/workflows/"+encodeURIComponent(id),{method:"DELETE"}),
 listProfiles:()=>request<AgentProfile[]>("/api/v1/agent/profiles"),
 saveProfile:(agentKey:string,input:{enabled:boolean;config:{systemPrompt:string;description:string}})=>request<AgentProfile>("/api/v1/agent/profiles/"+encodeURIComponent(agentKey),{method:"PUT",body:JSON.stringify(input)}),
 getAppearance:()=>request<AgentAppearanceConfig>("/api/v1/agent/appearance"),
 saveAppearance:(config:AgentAppearanceConfig)=>request<AgentAppearanceConfig>("/api/v1/agent/appearance",{method:"PUT",body:JSON.stringify({config})}),
 listConnections:()=>request<AgentConnection[]>("/api/v1/agent/connections"),
 createConnection:(input:{name:string;protocol:AgentProtocol;endpointUrl:string;authMode:AgentAuthMode;credentials?:Record<string,string>;capabilities:string[]})=>request<AgentConnection>("/api/v1/agent/connections",{method:"POST",body:JSON.stringify(input)}),
 deleteConnection:(id:string)=>request<{id:string;deleted:boolean}>("/api/v1/agent/connections/"+encodeURIComponent(id),{method:"DELETE"}),
 discoverConnection:(id:string)=>request<{connectionId:string;status:string;tools:Array<{name:string;description?:string;risk?:string}>;metadata:Record<string,unknown>}>("/api/v1/agent/connections/"+encodeURIComponent(id)+"/discover",{method:"POST"}),

 chat:(message:string,conversationId?:string)=>request<{conversationId:string;reply:string;task:{goal:string;agentKey:string;country:string;mode:"planner"|"internal"|"external"}|null;model:string}>("/api/v1/agent/chat",{method:"POST",body:JSON.stringify({message,...(conversationId?{conversationId}:{})})}),
 listRuns:()=>request<AgentRun[]>("/api/v1/agent/runs"),
 getRun:(id:string)=>request<{run:AgentRun;discoveryRun:{status:string;progress:number;message:string;discovered_count:number;created_lead_count:number}|null;records:Array<{id:string;name:string;country_code?:string|null;address?:string|null;phone?:string|null;email?:string|null;website?:string|null;business_type?:string|null;confidence_score?:number|null;channel?:string;record_type?:string;raw_data?:Record<string,unknown>;status?:string;sources?:Array<{provider?:string;keyword?:string;source_url?:string;raw_data?:Record<string,unknown>}>}>;events:Array<{id:string;event_type:string;message:string;created_at:string}>;logs:Array<{id:string;level:string;message:string;created_at:string}>}>("/api/v1/agent/runs/"+encodeURIComponent(id)),
 createRun:(goal:string,execution?:{mode:"internal_discovery"|"planner";country:string;searchEngine:"serper"|"serpapi";limitPerCountry:number;agentKey?:string})=>request<AgentRun & {taskCode?:string;message?:string;agentKey?:string;plan?:Record<string,unknown>;approvalId?:string}>("/api/v1/agent/runs",{method:"POST",body:JSON.stringify({goal,...(execution?{execution}:{})})}),
 invokeConnection:(connectionId:string,runId:string,toolName:string,args:Record<string,unknown>)=>request<{runId:string;status:string;approvalId?:string;toolName:string;result?:unknown}>("/api/v1/agent/connections/"+encodeURIComponent(connectionId)+"/invoke",{method:"POST",body:JSON.stringify({runId,toolName,arguments:args})}),
 listApprovals:()=>request<Array<{id:string;run_id:string;action_type:string;status:string;operation_snapshot?:Record<string,unknown>;created_at:string;expires_at:string}>>("/api/v1/agent/approvals"),
 decideApproval:(id:string,decision:"approve"|"reject",note?:string)=>request<{id:string;status:string;decision:string}>("/api/v1/agent/approvals/"+encodeURIComponent(id)+"/decision",{method:"POST",body:JSON.stringify({decision,note})}),
};
