import { useEffect,useMemo,useState } from "react";
import { AgentCharacterSelector,CharacterMark,COLOR_IDS,SHAPE_IDS,type ColorId,type ShapeId,type CharacterState } from "@aora-bot/react";
import { Palette,RotateCcw,Save,Sparkles } from "lucide-react";
import { Badge,Button,Card,CardContent,CardHeader,CardTitle } from "@/shared/ui/primitives";
import { AGENT_APPEARANCE_PROFILES,DEFAULT_AGENT_APPEARANCE,DEFAULT_AGENT_APPEARANCE_CONFIG,type AgentAppearance,type AgentAppearanceConfig } from "../../domain/appearance";
import { loadAgentAppearanceConfig,saveAgentAppearanceConfig } from "../hooks/useAgentAppearance";
const styles=[
{id:"vector",label:"矢量",variants:["soft","sticker","outline","glass","neon"]},
{id:"pixel",label:"像素",variants:["crisp","dot","block"]},
{id:"kaomoji",label:"颜文字",variants:["plain","bubble"]},
] as const;
const faces=[{id:"cute",label:"可爱脸"},{id:"eyes",label:"眼睛脸"},{id:"line",label:"线条脸"},{id:"symbol",label:"符号脸"},{id:"button",label:"按钮脸"},{id:"capsule",label:"胶囊脸"},{id:"brow",label:"眉眼脸"},{id:"glossy",label:"亮晶脸"},{id:"sparkle",label:"星光脸"},{id:"shades",label:"墨镜脸"},{id:"droopy",label:"慵懒脸"},{id:"bigmouth",label:"大嘴脸"},{id:"pie",label:"派脸"},{id:"screen",label:"屏幕脸"},{id:"teardrop",label:"泪滴脸"},{id:"specs",label:"眼镜脸"}] as const;
const SAFE_SHAPES=SHAPE_IDS.filter(shape=>!["blob","gem"].includes(shape));
const states:Array<{id:CharacterState;label:string}>=[
{id:"idle",label:"待机"},{id:"thinking",label:"思考"},{id:"searching",label:"搜索"},{id:"working",label:"执行"},
{id:"happy",label:"开心"},{id:"celebrate",label:"完成"},{id:"sleeping",label:"休眠"},{id:"alerting",label:"异常提醒"},
];
export function AgentAppearanceSettingsPage(){
 const [config,setConfig]=useState<AgentAppearanceConfig>(DEFAULT_AGENT_APPEARANCE_CONFIG);
 const [activeAgent,setActiveAgent]=useState("default");
 const [previewState,setPreviewState]=useState<CharacterState>("idle");
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const current=useMemo(()=>activeAgent==="default"?config.default:config.agents[activeAgent]??config.default,[activeAgent,config]);
 const setCurrent=(next:AgentAppearance)=>setConfig(old=>activeAgent==="default"?{...old,default:next}:{...old,agents:{...old.agents,[activeAgent]:next}});
 useEffect(()=>{let alive=true;void loadAgentAppearanceConfig().then(value=>{if(alive)setConfig(value);});return()=>{alive=false;};},[]);
 const save=async()=>{setBusy(true);setNotice("");try{const saved=await saveAgentAppearanceConfig(config);setConfig(saved);setNotice("形象配置已保存，所有 Agent 入口已同步更新。");}catch(error){setNotice(error instanceof Error?error.message:"保存形象配置失败。");}finally{setBusy(false);}};
 const reset=()=>{if(activeAgent==="default")setConfig(old=>({...old,default:DEFAULT_AGENT_APPEARANCE}));else setConfig(old=>{const agents={...old.agents};delete agents[activeAgent];return {...old,agents};});setNotice("已恢复默认预览，请保存后应用。");};
 const variants=styles.find(item=>item.id===current.styleId)?.variants??styles[0].variants;
 return <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-8">
 <header className="flex flex-wrap items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Palette className="h-5 w-5"/></div><div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-[.18em] text-muted-foreground">SYSTEM SETTINGS</p><h1 className="text-2xl font-semibold">Agent 形象设计</h1><p className="text-sm text-muted-foreground">为 TradePilot 的每个专业智能体设置专属角色形象</p></div><Badge variant="success">实时预览</Badge></header>
 <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]"><div className="min-w-0 space-y-5">
 <Card><CardHeader><CardTitle className="text-base">选择要设计的 Agent</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Button size="sm" variant={activeAgent==="default"?"default":"outline"} onClick={()=>setActiveAgent("default")}>全局默认形象</Button>{AGENT_APPEARANCE_PROFILES.map(item=><Button key={item.id} size="sm" variant={activeAgent===item.id?"default":"outline"} onClick={()=>setActiveAgent(item.id)}>{item.name}</Button>)}</CardContent></Card>
 <Card><CardHeader><CardTitle className="text-base">角色与配色</CardTitle></CardHeader><CardContent className="min-w-0 space-y-4 overflow-hidden"><p className="text-sm text-muted-foreground">选择角色造型与主色。修改会同步到右侧预览，保存后在 Agent 菜单、工作台和 Agent 市场中统一显示。</p><AgentCharacterSelector value={{shape:current.shape as ShapeId,color:current.color as ColorId,face:current.face}} onCommit={choice=>setCurrent({...current,shape:choice.shape,color:choice.color,face:choice.face??"cute"})} immediate actions={false} shapes={SAFE_SHAPES} colors={COLOR_IDS} layout="grid"/></CardContent></Card>
 <Card><CardHeader><CardTitle className="text-base">画风与脸型</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2">{styles.map(style=><Button key={style.id} size="sm" variant={current.styleId===style.id?"default":"outline"} onClick={()=>setCurrent({...current,styleId:style.id,variant:style.variants[0]})}>{style.label}</Button>)}</div><div className="flex flex-wrap gap-2">{variants.map(variant=><Button key={variant} size="sm" variant={current.variant===variant?"secondary":"outline"} onClick={()=>setCurrent({...current,variant})}>{variant}</Button>)}</div><div className="flex flex-wrap gap-2">{faces.map(face=><Button key={face.id} size="sm" variant={current.face===face.id?"secondary":"outline"} onClick={()=>setCurrent({...current,face:face.id})}>{face.label}</Button>)}</div></CardContent></Card>
 <Card><CardHeader><CardTitle className="text-base">动画状态预览</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{states.map(item=><Button key={item.id} size="sm" variant={previewState===item.id?"secondary":"outline"} onClick={()=>setPreviewState(item.id)}>{item.label}</Button>)}</CardContent></Card>
 </div>
 <aside className="min-w-0 space-y-4 2xl:sticky 2xl:top-20 2xl:self-start"><Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-[#18234c] to-[#33245c] text-white"><CardContent className="flex min-h-[330px] flex-col items-center justify-center gap-5 p-6 text-center"><div className="agent-avatar-preview"><CharacterMark shape={current.shape as ShapeId} color={current.color as ColorId} styleId={current.styleId} variant={current.variant as never} face={current.face} state={previewState} sizePx={156} autoPause entryEffects={false} seed={"tradepilot-preview-"+activeAgent}/></div><div><p className="font-semibold">{activeAgent==="default"?"全局默认 Agent":AGENT_APPEARANCE_PROFILES.find(item=>item.id===activeAgent)?.name}</p><p className="mt-1 text-xs text-white/65">正在预览：{states.find(item=>item.id===previewState)?.label}</p></div><Badge className="border-white/20 bg-white/10 text-white">{current.shape} · {current.styleId} · {current.face}</Badge></CardContent></Card>
 <div className="flex gap-2"><Button className="flex-1" onClick={()=>void save()} disabled={busy}><Save className="mr-2 h-4 w-4"/>{busy?"保存中…":"保存形象"}</Button><Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4"/></Button></div>{notice&&<p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{notice}</p>}
 <Card><CardContent className="space-y-2 p-4 text-xs text-muted-foreground"><div className="flex items-center gap-2 font-medium text-foreground"><Sparkles className="h-4 w-4"/>Powered by Aora Bot</div><p>角色引擎与动画由 Aora Bot 提供。感谢 sam70361 的开源创作。</p><a className="underline underline-offset-4" href="https://github.com/sam70361/aora-bot" target="_blank" rel="noreferrer">查看 Aora Bot 项目与授权</a></CardContent></Card>
 </aside></div></div>;
}
