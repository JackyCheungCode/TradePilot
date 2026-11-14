import { useEffect, useState } from "react";
import { ArrowUp, Bot, Globe2, Wrench, CheckCircle2, Clock3 } from "lucide-react";
import { AgentOrbIcon } from "./AgentOrbIcon";
import { Badge, Button, Card, CardContent } from "@/shared/ui/primitives";
import { agentApi, type AgentConnection } from "../../infrastructure/agent-api";

type ChatMessage={id:number;role:"user"|"assistant";content:string;kind?:"plan"|"progress"|"result"};
const agents=[
 {id:"auto",name:"小雅自动调度"},
 {id:"buyer_development",name:"全球买家开发"},
 {id:"market_research",name:"市场研究"},
 {id:"company_research",name:"企业调查"},
 {id:"lead_scoring",name:"客户评估"},
 {id:"multilingual_sales",name:"多语言销售"},
 {id:"follow_up",name:"外贸跟进"},
 {id:"trade_compliance",name:"贸易合规"},
];
export function AgentChatWorkspace({connections,onNotice}:{connections:AgentConnection[];onNotice:(message:string)=>void}){
 const [messages,setMessages]=useState<ChatMessage[]>([{id:1,role:"assistant",content:"你好，我是小雅。告诉我你想开发什么市场、寻找哪类客户，或者直接 @ 一位专业 Agent。我会先整理任务计划，等你确认后再执行。"}]);
 const [draft,setDraft]=useState("");
 const [selectedAgent,setSelectedAgent]=useState("auto");
 const [country,setCountry]=useState("US");
 const [mode,setMode]=useState<"planner"|"internal"|"external">("planner");
 const [connectionId,setConnectionId]=useState("");
 const [toolName,setToolName]=useState("");
 const [planGoal,setPlanGoal]=useState("");
 const [showPlan,setShowPlan]=useState(false);
 const [busy,setBusy]=useState(false);
 const [argsJson,setArgsJson]=useState("{}");
 const [activeRunId,setActiveRunId]=useState<string|null>(null);
 useEffect(()=>{if(!activeRunId)return;let alive=true;const poll=async()=>{try{const snapshot=await agentApi.getRun(activeRunId);if(!alive)return;const run=snapshot.run;const latest=snapshot.logs.at(-1)?.message??snapshot.events.at(-1)?.message??snapshot.discoveryRun?.message;const status=run.status;const statusText=status==="queued"?"已排队":status==="running"?"正在执行":status==="awaiting_approval"?"等待人工审批":status==="succeeded"?"执行成功":status==="completed"?"执行完成":status==="partial"?"部分完成":status==="failed"?"执行失败":status==="cancelled"?"已取消":status;const progress=snapshot.discoveryRun?.progress;const update=[statusText,typeof progress==="number"?"进度 "+progress+"%":null,latest].filter(Boolean).join(" · ");setMessages(old=>{const index=old.findIndex(item=>item.id===-1);if(index<0)return [...old,{id:-1,role:"assistant",content:update,kind:"progress"}];const next=[...old];next[index]={...next[index],content:update,kind:"progress"};return next;});if(["succeeded","completed","partial","failed","cancelled","awaiting_approval","planned"].includes(status)){setMessages(old=>[...old.filter(item=>item.id!==-2),{id:-2,role:"assistant",content:status==="awaiting_approval"?"任务已暂停，等待你在审批中心确认。":status==="failed"?(run.error_message??"任务执行失败，请查看执行记录。"):status==="partial"?"任务部分完成，请查看统一搜索结果和执行日志。":status==="cancelled"?"任务已取消。":"任务已完成。"+(snapshot.discoveryRun?.discovered_count!==undefined?" 发现 "+snapshot.discoveryRun.discovered_count+" 条结果。":""),kind:"result"}]);setActiveRunId(null);}}catch(error){if(alive)onNotice(error instanceof Error?error.message:"读取任务进度失败。");}};void poll();const timer=window.setInterval(()=>void poll(),3000);return()=>{alive=false;window.clearInterval(timer);};},[activeRunId,onNotice]);
 const activeConnections=connections.filter(c=>c.status==="active");
 const connection=activeConnections.find(c=>c.id===connectionId);
 const tools=connection?.protocol_tools??[];
 const chosenTool=tools.find(t=>t.name===toolName);
 function sendMessage(){
  const text=draft.trim();if(!text||busy)return;
  setMessages(old=>[...old,{id:Date.now(),role:"user",content:text}]);
  setPlanGoal(text);setShowPlan(true);setDraft("");
  const match=agents.find(a=>a.id!=="auto"&&(text.includes("@"+a.name)||text.includes("@"+a.name+" Agent")));
  if(match)setSelectedAgent(match.id);
  setMessages(old=>[...old,{id:Date.now()+1,role:"assistant",content:"收到。我先把目标整理成任务卡片。你可以在下方调整 Agent、国家市场和工具，确认后才会启动。"}]);
 }
 async function confirmTask(){
  if(!planGoal.trim()||busy)return;
  setBusy(true);onNotice("");
  setMessages(old=>[...old,{id:Date.now(),role:"assistant",content:"小雅正在提交任务，稍后会在这里反馈状态…",kind:"progress"}]);
  try{
   if(mode==="external"){
    if(!connection||!toolName)throw new Error("请先选择已连接的外部 Agent 和工具。");
    let args:Record<string,unknown>;try{const parsed=JSON.parse(argsJson);if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error();args=parsed as Record<string,unknown>;}catch{throw new Error("工具参数必须是有效 JSON 对象。");}
    const run=await agentApi.createRun(planGoal);
    const result=await agentApi.invokeConnection(connection.id,run.id,toolName,args);
    const message=result.status==="awaiting_approval"?"任务已提交审批中心。批准后才会执行外部写操作。":result.status==="succeeded"?"外部工具已执行，结果已写入执行记录。":"外部工具状态："+result.status;
    setMessages(old=>[...old,{id:Date.now()+2,role:"assistant",content:message,kind:"result"}]);
   }else{
    const run=await agentApi.createRun((selectedAgent==="auto"?"":("@"+selectedAgent+" "))+planGoal,{mode:mode==="planner"?"planner":"internal_discovery",country:country.toUpperCase(),searchEngine:"serper",limitPerCountry:50});
    const planner=run.plan?.planner as {summary?:string;steps?:string[]}|undefined;
    const status=run.status==="awaiting_approval"?"等待人工审批":run.status==="planned"?"等待补充执行条件":run.status==="failed"?"执行失败":"已进入统一任务执行中心";
    const detail=[planner?.summary??run.message??"小雅已接收任务。",status,"任务编号："+(run.taskCode??run.id),...(planner?.steps??[]).map((s,i)=>(i+1)+". "+s)].join("\n");
    setMessages(old=>[...old,{id:Date.now()+2,role:"assistant",content:detail,kind:"result"}]);
   }
   setShowPlan(false);
  }catch(error){setMessages(old=>[...old,{id:Date.now()+3,role:"assistant",content:error instanceof Error?error.message:"任务提交失败。",kind:"result"}]);}
  finally{setBusy(false);}
 }
 return <div className="grid min-h-[680px] gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
  <Card className="flex min-h-[680px] flex-col overflow-hidden border-0 shadow-sm">
   <div className="flex items-center gap-3 border-b bg-card px-5 py-4"><AgentOrbIcon className="h-11 w-11" sizePx={44} state={busy?"working":"happy"}/><div className="min-w-0 flex-1"><p className="font-semibold">小雅 <span className="text-xs font-normal text-muted-foreground">TradePilot 总协调 Agent</span></p><p className="text-xs text-muted-foreground">任务理解 · Agent 调度 · 进度汇报</p></div><Badge variant="success">在线</Badge></div>
   <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto bg-muted/20 p-4 md:p-6">
    {messages.map(m=><div key={m.id} className={m.role==="user"?"ml-auto max-w-[88%]":"mr-auto max-w-[94%]"}>
     <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">{m.role==="assistant"?<><Bot className="h-3.5 w-3.5"/>小雅</>:"你"}{m.kind==="progress"&&<Badge>处理中</Badge>}{m.kind==="result"&&<Badge variant="success">任务反馈</Badge>}</div>
     <div className={m.role==="user"?"whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm text-primary-foreground":"whitespace-pre-wrap rounded-2xl rounded-tl-sm border bg-card px-4 py-3 text-sm"}>{m.content}</div>
    </div>)}
    {showPlan&&<div className="mr-auto w-full max-w-[94%]"><Card className="border-primary/30"><CardContent className="space-y-4 p-4">
     <div className="flex items-center justify-between"><p className="font-semibold">任务确认卡片</p><Badge>待你确认</Badge></div>
     <div className="rounded-lg bg-muted p-3 text-sm"><p className="mb-1 text-xs text-muted-foreground">任务目标</p>{planGoal}</div>
     <div><p className="mb-2 text-xs font-medium text-muted-foreground">执行 Agent</p><div className="flex flex-wrap gap-2">{agents.map(a=><Button key={a.id} size="sm" variant={selectedAgent===a.id?"default":"outline"} onClick={()=>setSelectedAgent(a.id)}>{a.name}</Button>)}</div></div>
     <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs text-muted-foreground">目标国家 / 市场代码<input value={country} onChange={e=>setCountry(e.target.value.toUpperCase())} maxLength={2} placeholder="US" className="h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground"/></label><div className="space-y-1"><p className="text-xs text-muted-foreground">执行方式</p><div className="flex flex-wrap gap-2"><Button size="sm" variant={mode==="planner"?"default":"outline"} onClick={()=>setMode("planner")}>小雅规划</Button><Button size="sm" variant={mode==="internal"?"default":"outline"} onClick={()=>setMode("internal")}>内置搜索</Button><Button size="sm" variant={mode==="external"?"default":"outline"} onClick={()=>setMode("external")}>外部工具</Button></div></div></div>
     {mode==="external"&&<div className="space-y-2"><label className="block space-y-1 text-xs text-muted-foreground">外部 Agent<select value={connectionId} onChange={e=>{setConnectionId(e.target.value);setToolName("");}} className="h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground"><option value="">选择已连接 Agent</option>{activeConnections.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="block space-y-1 text-xs text-muted-foreground">工具<select value={toolName} onChange={e=>setToolName(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground"><option value="">选择工具</option>{tools.map(t=><option key={t.name} value={t.name}>{t.name} · {t.risk==="read_only"?"自动执行":"需审批"}</option>)}</select></label>{chosenTool&&<p className="text-xs text-muted-foreground">{chosenTool.description}</p>}<label className="block space-y-1 text-xs text-muted-foreground">工具参数 JSON<textarea value={argsJson} onChange={e=>setArgsJson(e.target.value)} rows={3} className="w-full rounded-md border bg-background p-2 font-mono text-xs text-foreground"/></label></div>}
     <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" size="sm" onClick={()=>setShowPlan(false)}>取消</Button><Button size="sm" disabled={busy||(mode!=="external"&&!/^[A-Z]{2}$/.test(country))||(mode==="external"&&(!connectionId||!toolName))} onClick={()=>void confirmTask()}>{busy?"正在提交…":"确认并启动任务"} <ArrowUp className="ml-1 h-4 w-4"/></Button></div>
    </CardContent></Card></div>}
   </CardContent>
   <div className="border-t bg-card p-3 md:p-4"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">快速指定：</span>{agents.slice(1).map(a=><Button key={a.id} size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={()=>setDraft(v=>(v? v+" ":"")+"@"+a.name+" ")}>@{a.name}</Button>)}</div><div className="flex items-end gap-2"><textarea value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="告诉小雅你的目标… 输入 @ 选择专业 Agent，Enter 发送" rows={2} className="min-h-12 flex-1 resize-y rounded-xl border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"/><Button disabled={!draft.trim()||busy} onClick={sendMessage} className="h-11 w-11 px-0"><ArrowUp className="h-4 w-4"/></Button></div><p className="mt-2 text-[11px] text-muted-foreground">发送消息只生成任务确认卡片；确认后才会调用 Agent。邮件发送、批量导入等操作仍需人工审批。</p></div>
  </Card>
  <aside className="space-y-3"><Card><CardContent className="space-y-3 p-4"><div className="flex items-center gap-2"><Globe2 className="h-4 w-4"/><p className="text-sm font-semibold">当前工作区</p></div><div><p className="text-xs text-muted-foreground">默认协调者</p><p className="text-sm font-medium">小雅</p></div><div><p className="text-xs text-muted-foreground">已连接外部 Agent</p><p className="text-sm font-medium">{activeConnections.length} 个</p></div><div><p className="text-xs text-muted-foreground">执行模式</p><p className="text-sm font-medium">{mode==="planner"?"AI 自动规划":mode==="internal"?"内置搜索":"外部工具"}</p></div></CardContent></Card><Card><CardContent className="space-y-3 p-4"><p className="text-sm font-semibold">安全执行策略</p><div className="flex items-center justify-between text-xs"><span>搜索与分析</span><Badge variant="success">自动执行</Badge></div><div className="flex items-center justify-between text-xs"><span>邮件 / 批量导入</span><Badge>人工审批</Badge></div><p className="text-xs text-muted-foreground">每次任务都会进入统一任务执行中心，审批和执行记录保留在原有模块。</p></CardContent></Card><Card><CardContent className="space-y-2 p-4"><div className="flex items-center gap-2"><Wrench className="h-4 w-4"/><p className="text-sm font-semibold">可用工具</p></div><p className="text-xs text-muted-foreground">内置 Agent、REST API、MCP 与 Webhook 接入共用同一工作台。</p><div className="flex items-center gap-2 text-xs"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600"/>任务需确认后启动</div><div className="flex items-center gap-2 text-xs"><Clock3 className="h-3.5 w-3.5"/>状态反馈写入聊天记录</div></CardContent></Card></aside>
 </div>;
}
