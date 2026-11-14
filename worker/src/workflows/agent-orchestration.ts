import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { processRun, type DiscoveryEnv, type DiscoveryRunInput } from "../routes/discovery";
import { callAgentChatModel, type Env as AgentEnv } from "../routes/agent-center";

interface Specialist { agentKey:string; instruction:string; }
interface Params { runId:string; ownerId:string; input:DiscoveryRunInput; goal:string; specialists:Specialist[]; }
type WorkflowEnv=AgentEnv & DiscoveryEnv;

async function db<T>(env:WorkflowEnv,path:string,init:RequestInit={}):Promise<T>{
 const response=await fetch(env.SUPABASE_URL+"/rest/v1/"+path,{...init,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,"Content-Type":"application/json",...init.headers}});
 const raw=await response.text();if(!response.ok)throw new Error("DATABASE_"+response.status+": "+raw.slice(0,300));return raw?JSON.parse(raw) as T:undefined as T;
}
async function patchRun(env:WorkflowEnv,runId:string,ownerId:string,patch:Record<string,unknown>):Promise<void>{
 await db(env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({...patch,updated_at:new Date().toISOString()})});
}
async function patchDiscovery(env:WorkflowEnv,runId:string,ownerId:string,patch:Record<string,unknown>):Promise<void>{
 await db(env,"discovery_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({...patch,updated_at:new Date().toISOString()})});
}
async function log(env:WorkflowEnv,runId:string,ownerId:string,message:string,payload:Record<string,unknown>={}):Promise<void>{
 await db(env,"discovery_run_logs",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({run_id:runId,owner_id:ownerId,level:"info",message,payload})});
 await db(env,"agent_run_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({owner_id:ownerId,run_id:runId,event_type:"specialist_update",message,payload})});
}
const labels:Record<string,string>={buyer_development:"全球买家开发 Agent",company_research:"企业调查 Agent",market_research:"市场研究 Agent",lead_scoring:"客户评估 Agent",trade_compliance:"贸易合规 Agent"};
const prompts:Record<string,string>={
 company_research:"你是企业调查 Agent。基于提供的公开企业线索，分析企业名称、官网、产品、联系方式、经营角色和证据完整度。把事实与推断分开，缺失信息明确标注，不得编造企业资料。",
 market_research:"你是市场研究 Agent。基于本次发现结果归纳目标市场的买家类型、区域分布、行业信号、潜在需求和数据局限。不得将少量样本夸大为市场整体结论。",
 lead_scoring:"你是客户评估 Agent。逐条评估线索与用户目标的匹配度，给出0-100分、A/B/C等级、评分依据、证据和需要人工核实的风险。没有足够证据时降低置信度，不得凭空补全。",
 trade_compliance:"你是贸易合规 Agent。只依据提供的信息指出可能需要核验的贸易合规风险、产品分类/目的地/主体信息缺口。不得声称已完成制裁筛查或提供确定法律结论。"
};
async function getDiscoveryData(env:WorkflowEnv,runId:string,ownerId:string):Promise<{records:Array<Record<string,unknown>>;occurrences:Array<Record<string,unknown>>}>{
 const occurrences=await db<Array<Record<string,unknown>>>(env,"discovery_record_occurrences?run_id=eq."+runId+"&owner_id=eq."+ownerId+"&select=record_id,provider,keyword,source_url,raw_data,captured_at&order=captured_at.desc&limit=300");
 const ids=[...new Set((occurrences??[]).map(row=>String(row.record_id??"")).filter(id=>/^[0-9a-f-]{36}$/i.test(id)))];
 if(!ids.length)return {records:[],occurrences:occurrences??[]};
 const records=await db<Array<Record<string,unknown>>>(env,"discovery_records?id=in.("+ids.join(",")+")&owner_id=eq."+ownerId+"&select=id,name,country_code,address,phone,website,channel,record_type,raw_data,status&limit=300");
 return {records:records??[],occurrences:occurrences??[]};
}
export class AgentOrchestrationWorkflow extends WorkflowEntrypoint<WorkflowEnv,Params>{
 async run(event:WorkflowEvent<Params>,step:WorkflowStep){
  const {runId,ownerId,input,goal,specialists}=event.payload;
  let plan:Record<string,unknown>={};
  try{
   const rows=await db<Array<{plan:Record<string,unknown>}>>(this.env,"agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId+"&select=plan&limit=1");
   plan=rows?.[0]?.plan??{};
   await patchRun(this.env,runId,ownerId,{status:"running",started_at:new Date().toISOString(),plan:{...plan,execution_state:"running"}});
   const profileRows=await db<Array<{agent_key:string;enabled:boolean;config:Record<string,unknown>}>>(this.env,"agent_profiles?owner_id=eq."+ownerId+"&select=agent_key,enabled,config");
   const profileMap=new Map((profileRows??[]).map(profile=>[profile.agent_key,profile]));
   const disabled=specialists.filter(item=>profileMap.has(item.agentKey)&&profileMap.get(item.agentKey)?.enabled===false);
   if(disabled.length)throw new Error("AGENT_DISABLED: "+disabled.map(item=>item.agentKey).join(", "));
   await log(this.env,runId,ownerId,"小雅启动多 Agent 协作：先发现买家，再由专业 Agent 依次分析。",{specialists:specialists.map(s=>s.agentKey)});
   const discovery=await step.do("buyer-discovery",{retries:{limit:1,delay:"10 seconds"},timeout:"30 minutes"},async()=>{
    const result=await processRun(this.env,runId,ownerId,input);
    const state=Array.isArray(plan.execution_steps)?[...(plan.execution_steps as Array<Record<string,unknown>>)]:[];
    if(state[0])state[0]={...state[0],status:"completed",completedAt:new Date().toISOString(),resultSummary:"搜索工作流已完成"};
    plan={...plan,execution_state:"running",execution_steps:state};
    await patchRun(this.env,runId,ownerId,{plan});
    await patchDiscovery(this.env,runId,ownerId,{status:"running",progress:35,message:"买家发现完成，正在启动专业 Agent 分析。"});
    await log(this.env,runId,ownerId,"全球买家开发 Agent 完成搜索，交接给专业分析 Agent。",{discoveryStatus:result.status});
    return result;
   });
   const dataset=await step.do("load-discovery-results",async()=>await getDiscoveryData(this.env,runId,ownerId));
   const specialistResults:Array<Record<string,unknown>>=[];
   for(let index=0;index<specialists.length;index++){
    const specialist=specialists[index],label=labels[specialist.agentKey]??specialist.agentKey;
    const result=await step.do("specialist-"+(index+1)+"-"+specialist.agentKey,{retries:{limit:1,delay:"5 seconds"},timeout:"5 minutes"},async()=>{
     const executionSteps=Array.isArray(plan.execution_steps)?[...(plan.execution_steps as Array<Record<string,unknown>>)]:[];
     const targetIndex=executionSteps.findIndex(item=>item.agentKey===specialist.agentKey&&item.status!=="completed");
     if(targetIndex>=0)executionSteps[targetIndex]={...executionSteps[targetIndex],status:"running",startedAt:new Date().toISOString()};
     plan={...plan,execution_state:"running",execution_steps:executionSteps};
     await patchRun(this.env,runId,ownerId,{plan});
     await patchDiscovery(this.env,runId,ownerId,{status:"running",progress:Math.min(90,40+Math.round((index/specialists.length)*45)),message:label+" 正在分析 "+dataset.records.length+" 条线索。"});
     await log(this.env,runId,ownerId,label+" 开始执行。",{agentKey:specialist.agentKey,records:dataset.records.length});
     const context={goal,instruction:specialist.instruction,discovery,records:dataset.records.slice(0,150),sources:dataset.occurrences.slice(0,200),previousAgents:specialistResults};
     const profile=profileMap.get(specialist.agentKey);
     const customPrompt=typeof profile?.config?.systemPrompt==="string"?profile.config.systemPrompt.trim():"";
     const system="你是 TradePilot 的"+label+"。"+(customPrompt||(prompts[specialist.agentKey]??"请对输入数据进行专业分析。"))+"\\n请用中文输出清晰、可执行的分析结果。只依据输入证据，不要虚构。若没有搜索结果，要明确说明无法得出结论。不得发送邮件、导入 CRM 或执行外部写操作。";
     const generated=await callAgentChatModel(this.env,[{role:"user",content:JSON.stringify(context)}],system,"company_analysis",false,1800);
     const output=generated.text.slice(0,16000);
     const completedSteps=Array.isArray(plan.execution_steps)?[...(plan.execution_steps as Array<Record<string,unknown>>)]:[];
     const completedIndex=completedSteps.findIndex(item=>item.agentKey===specialist.agentKey&&item.status!=="completed");
     if(completedIndex>=0)completedSteps[completedIndex]={...completedSteps[completedIndex],status:"completed",completedAt:new Date().toISOString(),model:generated.model,result:output};
     plan={...plan,execution_state:"running",execution_steps:completedSteps};
     await patchRun(this.env,runId,ownerId,{plan});
     await log(this.env,runId,ownerId,label+" 完成分析并交接给下一位 Agent。",{agentKey:specialist.agentKey,model:generated.model});
     return {agentKey:specialist.agentKey,label,model:generated.model,output};
    });
    specialistResults.push(result);
   }
   const finalResult={discovery,specialists:specialistResults,recordCount:dataset.records.length,completedAt:new Date().toISOString()};
   plan={...plan,execution_state:"completed"};
   await patchRun(this.env,runId,ownerId,{status:"succeeded",result:finalResult,plan,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()});
   await patchDiscovery(this.env,runId,ownerId,{status:"completed",progress:100,message:"多 Agent 协作完成：买家发现及 "+specialists.length+" 个专业 Agent 分析已完成。"});
   await log(this.env,runId,ownerId,"小雅已汇总多 Agent 协作结果。",{recordCount:dataset.records.length,specialists:specialistResults.map(s=>s.agentKey)});
   return finalResult;
  }catch(error){
   const message=error instanceof Error?error.message:"多 Agent 协作执行失败。";
   const failedAt=new Date().toISOString();
   const executionSteps=Array.isArray(plan.execution_steps)?[...(plan.execution_steps as Array<Record<string,unknown>>)]:[];
   const activeIndex=executionSteps.findIndex(item=>item.status==="running");
   const failedStep=activeIndex>=0?String(executionSteps[activeIndex].agentKey??"unknown"):null;
   if(activeIndex>=0)executionSteps[activeIndex]={...executionSteps[activeIndex],status:"failed",failedAt,error:message.slice(0,1000)};
   const preserved=executionSteps.filter(item=>item.status==="completed").length;
   const failedPlan={...plan,execution_state:"failed",execution_steps:executionSteps,failure:{message:message.slice(0,2000),failedAt,failedStep,preservedCompletedSteps:preserved}};
   await patchRun(this.env,runId,ownerId,{status:"failed",error_message:message,completed_at:failedAt,plan:failedPlan});
   await patchDiscovery(this.env,runId,ownerId,{status:"failed",progress:100,message});
   await log(this.env,runId,ownerId,"多 Agent 协作失败："+message,{error:true,failedStep,preservedCompletedSteps:preserved,failedAt});
   throw error;
  }
 }
}
