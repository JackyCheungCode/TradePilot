import { useEffect, useState } from "react";
import { Activity, ArrowRight, Building2, CheckCircle2, ChevronDown, Clock3, Languages, LoaderCircle, MapPinned, Play, Search, SlidersHorizontal, Sparkles, Terminal, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Popover, PopoverContent, PopoverTrigger, Progress, Separator } from "@/shared/ui/primitives";
import { PageControlPanel } from "@/shared/ui/page-layout";
import { TaskExecutionPanel } from "../components/TaskExecutionPanel";
import { CountrySelect } from "../components/CountrySelect";
import { RegionCityPicker } from "../components/RegionCityPicker";
import { discoveryApi } from "../../infrastructure/discovery-api";
import type { DiscoveryLog, DiscoveryRun } from "../../domain/model";
import { mapOsmTags, type OsmTagRule } from "../osm-mapping";
import { BUSINESS_TYPE_OPTIONS, mapBusinessTypeOsmTags } from "../business-types";
import { DEEPL_TARGET_LANGUAGES, defaultDeepLTargetLanguage } from "../deepl-languages";
import { translateDiscoveryKeyword } from "../../infrastructure/translation-api";
const levelStyle: Record<DiscoveryLog["level"], string> = { info: "text-sky-300", success: "text-emerald-300", warning: "text-amber-300", error: "text-rose-300" };
export function MapLocalDiscoveryPage() {
 const [country, setCountry] = useState("US"); const [providers, setProviders] = useState<Array<"google_maps" | "openstreetmap">>(["google_maps", "openstreetmap"]); const [state, setState] = useState(""); const [city, setCity] = useState("");
 const [query, setQuery] = useState("electrical equipment distributor"); const [businessTypes, setBusinessTypes] = useState<string[]>(["distributor"]); const [filters, setFilters] = useState({ minRating: "", openNow: false, requireWebsite: false, requirePhone: false });
 const [osmTags, setOsmTags] = useState<OsmTagRule[]>(() => mapBusinessTypeOsmTags(["distributor"])); const [limit, setLimit] = useState("100"); const [run, setRun] = useState<DiscoveryRun | null>(null); const [logs, setLogs] = useState<DiscoveryLog[]>([]); const [starting, setStarting] = useState(false);
 const [targetLanguage, setTargetLanguage] = useState(defaultDeepLTargetLanguage("US")); const [languageOpen, setLanguageOpen] = useState(false); const [translation, setTranslation] = useState<{ source: string; translated: string; detected?: string } | null>(null); const [translationApplied, setTranslationApplied] = useState(false); const [translating, setTranslating] = useState(false);
 useEffect(() => { if (!run || !["queued", "running"].includes(run.status)) return; let active = true; const poll = async () => { try { const latest = await discoveryApi.getRun(run.id); if (!active) return; setRun(latest); setLogs(latest.logs ?? []); } catch { /* retry on next poll */ } }; void poll(); const timer = window.setInterval(poll, 2200); return () => { active = false; window.clearInterval(timer); }; }, [run?.id, run?.status]);
 const translate = async () => {
  if (!query.trim()) { toast.error("请先输入需要翻译的关键词"); return; }
  setTranslating(true);
  try { const result = await translateDiscoveryKeyword(query.trim(), targetLanguage); setTranslation({ source: query.trim(), translated: result.translatedText, detected: result.detectedSourceLanguage }); setTranslationApplied(false); toast.success("关键词翻译完成"); }
  catch (error) { toast.error(error instanceof Error ? error.message : "DeepL 翻译失败"); }
  finally { setTranslating(false); }
 };
 const start = async () => {
  if (!country) { toast.error("请先选择一个国家或地区"); return; }
  if (!query.trim()) { toast.error("请输入企业或行业关键词"); return; }
  if (providers.includes("openstreetmap") && !osmTags.some((tag) => /^[a-z0-9_:-]{1,64}$/i.test(tag.key) && /^[a-z0-9_:-]{1,100}$/i.test(tag.value))) { toast.error("请为 OpenStreetMap 添加至少一条有效标签映射"); return; }
  setStarting(true);
  try {
   const created = await discoveryApi.start({
    countries: [country], state: state || undefined, city: city || undefined, query: query.trim(),
    originalQuery: translationApplied && translation ? translation.source : undefined,
    translatedQuery: translationApplied && translation ? translation.translated : undefined,
    targetLanguage: translationApplied ? targetLanguage : undefined,
    businessTypes, filters: { minRating: providers.includes("google_maps") && filters.minRating ? Number(filters.minRating) : undefined, openNow: providers.includes("google_maps") && filters.openNow, requireWebsite: filters.requireWebsite, requirePhone: filters.requirePhone },
    limitPerCountry: Math.max(1, Math.min(500, Number(limit) || 100)), providers,
    osmTags: providers.includes("openstreetmap") ? osmTags.filter((tag) => /^[a-z0-9_:-]{1,64}$/i.test(tag.key) && /^[a-z0-9_:-]{1,100}$/i.test(tag.value)).map(({key,value}) => ({key,value})) : undefined
   });
   setRun(created); setLogs([]); toast.success("搜索任务已创建：" + (created.taskCode ?? created.id));
  } catch (error) { toast.error(error instanceof Error ? error.message : "任务创建失败"); }
  finally { setStarting(false); }
 };
 const running = run && ["queued", "running"].includes(run.status);
 useEffect(() => { setOsmTags(businessTypes.length ? mapBusinessTypeOsmTags(businessTypes) : mapOsmTags(query)); }, [query, businessTypes]);
 const updateOsmTag = (index: number, raw: string) => { const [key = "", value = ""] = raw.split("=", 2); setOsmTags((current) => current.map((tag, i) => i === index ? { ...tag, key: key.trim(), value: (value ?? "").trim() } : tag)); };
 const addOsmTag = () => setOsmTags((current) => [...current, { key: "shop", value: "", label: "自定义标签", match: "related", reason: "用户自定义 OSM 标签" }]);
 return <div className="mx-auto w-full max-w-[1500px] space-y-5 p-3 sm:p-4 lg:p-6">
  <PageControlPanel eyebrow="潜客发现 / 地图与本地商家" title="地图与本地商家" description="配置目标市场、关键词和数据源后创建搜索任务；所有发现结果进入搜索结果中心统一管理。" actions={<div className="flex flex-wrap gap-2"><Badge variant="outline" className="gap-1.5 py-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Google Maps</Badge><Badge variant="outline" className="gap-1.5 py-1.5"><span className="h-2 w-2 rounded-full bg-sky-500"/>OpenStreetMap</Badge></div>}/>
  {run && <Card className="border-primary/30 bg-primary/5"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">本次搜索任务编号</p><a href={"/lead-discovery/results?runId=" + encodeURIComponent(run.id)} className="mt-1 inline-flex items-center gap-2 font-mono text-sm font-semibold text-primary hover:underline">{run.taskCode ?? run.id}<ArrowRight className="h-4 w-4" /></a></div><Button variant="outline" size="sm" onClick={() => { window.location.href = "/lead-discovery/results?runId=" + encodeURIComponent(run.id); }}>查看任务详情<ArrowRight className="h-4 w-4" /></Button></CardContent></Card>}
  <div className="space-y-5">
   <Card><CardHeader><div className="flex items-center gap-2"><Search className="h-5 w-5" /><CardTitle>发现条件</CardTitle></div></CardHeader><CardContent className="space-y-6">
    <div className="space-y-2"><label className="text-sm font-medium" htmlFor="discovery-query">企业 / 行业关键词</label><Input id="discovery-query" value={query} onChange={(e) => { setQuery(e.target.value); setTranslation(null); setTranslationApplied(false); }} placeholder="例如：solar panel installer" /></div>
    <div className="flex flex-wrap items-center gap-2">
     <Button type="button" variant="outline" size="sm" onClick={() => void translate()} disabled={translating || !query.trim()}><Languages className="h-4 w-4" />{translating ? "正在翻译…" : "DeepL 翻译"}</Button>
     <Popover open={languageOpen} onOpenChange={setLanguageOpen}><PopoverTrigger asChild><Button type="button" variant="outline" size="sm">{DEEPL_TARGET_LANGUAGES.find((item) => item.code === targetLanguage)?.label ?? targetLanguage}<ChevronDown className="h-3.5 w-3.5" /></Button></PopoverTrigger><PopoverContent align="start" className="w-60 p-2"><div className="max-h-64 space-y-1 overflow-y-auto">{DEEPL_TARGET_LANGUAGES.map((item) => <Button key={item.code} type="button" variant={targetLanguage === item.code ? "secondary" : "ghost"} className="w-full justify-start" size="sm" onClick={() => { if (translationApplied && translation) setQuery(translation.source); setTargetLanguage(item.code); setLanguageOpen(false); setTranslation(null); setTranslationApplied(false); }}>{item.label}</Button>)}</div></PopoverContent></Popover>
     <span className="text-xs text-muted-foreground">按目标国家推荐语言；无对应映射时默认英语，可自行更改。翻译会消耗 DeepL 字符额度。</span>
    </div>
    {translation && <div className="space-y-2 rounded-lg border bg-muted/30 p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium">DeepL 翻译预览{translation.detected ? " · 源语言 " + translation.detected : ""}</p><Badge variant="outline">{targetLanguage}</Badge></div><p className="text-sm text-muted-foreground">{translation.translated}</p><div className="flex flex-wrap gap-2"><Button type="button" size="sm" onClick={() => { setQuery(translation.translated); setTranslationApplied(true); }}>替换企业 / 行业关键词</Button><Button type="button" size="sm" variant="ghost" onClick={() => { if (translationApplied) setQuery(translation.source); setTranslation(null); setTranslationApplied(false); }}>保留原关键词</Button></div></div>}
    <section className="space-y-4 rounded-lg bg-muted/35 p-4"><div className="flex items-center gap-2"><MapPinned className="h-4 w-4" /><h3 className="text-sm font-semibold">目标市场</h3></div><CountrySelect value={country} onChange={(next) => { if (translationApplied && translation) setQuery(translation.source); setCountry(next); setState(""); setCity(""); setTargetLanguage(defaultDeepLTargetLanguage(next)); setTranslation(null); setTranslationApplied(false); }} /><RegionCityPicker countryCode={country} state={state} city={city} onStateChange={setState} onCityChange={setCity} /></section>

<div className="space-y-2"><p className="text-sm font-medium">数据来源</p><div className="grid gap-2 sm:grid-cols-2"><Button type="button" variant={providers.includes("google_maps") ? "secondary" : "outline"} aria-pressed={providers.includes("google_maps")} onClick={() => setProviders((current) => current.includes("google_maps") ? current.filter((item) => item !== "google_maps") : [...current, "google_maps"])} className="flex h-auto items-center justify-start gap-3 p-3 text-sm"><img src="https://www.google.com/s2/favicons?domain=maps.google.com&sz=64" alt="" className="h-5 w-5 rounded-sm" /><span className="flex-1 text-left font-medium">Google Maps</span>{providers.includes("google_maps") ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <span className="h-4 w-4 rounded-full border" />}</Button><Button type="button" variant={providers.includes("openstreetmap") ? "secondary" : "outline"} aria-pressed={providers.includes("openstreetmap")} onClick={() => setProviders((current) => current.includes("openstreetmap") ? current.filter((item) => item !== "openstreetmap") : [...current, "openstreetmap"])} className="flex h-auto items-center justify-start gap-3 p-3 text-sm"><img src="https://www.openstreetmap.org/favicon.ico" alt="" className="h-5 w-5 rounded-sm" /><span className="flex-1 text-left font-medium">OpenStreetMap</span>{providers.includes("openstreetmap") ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <span className="h-4 w-4 rounded-full border" />}</Button></div></div>
<div className="space-y-2">
     <div className="flex items-center justify-between gap-2"><label className="text-sm font-medium">业务类型（可多选）</label><Badge variant="secondary">{businessTypes.length} 项已选</Badge></div>
     <Popover>
      <PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-between"><span>{businessTypes.length ? BUSINESS_TYPE_OPTIONS.filter((option) => businessTypes.includes(option.id)).map((option) => option.label).join("、") : "选择业务类型"}</span><ChevronDown className="h-4 w-4 shrink-0" /></Button></PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2"><div className="max-h-72 space-y-1 overflow-y-auto">{BUSINESS_TYPE_OPTIONS.map((option) => <button key={option.id} type="button" aria-pressed={businessTypes.includes(option.id)} onClick={() => setBusinessTypes((current) => current.includes(option.id) ? current.filter((item) => item !== option.id) : [...current, option.id])} className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-accent"><span className={businessTypes.includes(option.id) ? "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground" : "mt-0.5 h-4 w-4 shrink-0 rounded-sm border"}>{businessTypes.includes(option.id) ? <CheckCircle2 className="h-3 w-3" /> : null}</span><span className="min-w-0"><span className="block text-sm font-medium">{option.label}</span><span className="block text-xs text-muted-foreground">{option.description}</span></span></button>)}</div><div className="mt-2 flex items-center justify-between border-t pt-2"><Button type="button" size="sm" variant="ghost" onClick={() => setBusinessTypes([])}>清空</Button><span className="text-xs text-muted-foreground">可同时选择多项</span></div></PopoverContent>
     </Popover>
     
    </div>
<div className="space-y-3 rounded-lg bg-muted/35 p-4"><div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /><p className="text-sm font-medium">精准筛选条件</p></div>
     <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><label htmlFor="discovery-min-rating" className="text-xs font-medium">Google 最低评分</label><Input id="discovery-min-rating" type="number" min="0" max="5" step="0.5" placeholder="不限（0–5）" value={filters.minRating} disabled={!providers.includes("google_maps")} onChange={(e) => setFilters((current) => ({ ...current, minRating: e.target.value }))} /><p className="text-[11px] text-muted-foreground">仅 Google Maps 支持</p></div>
      <div className="space-y-1"><label className="text-xs font-medium">营业状态</label><Button type="button" size="sm" variant={filters.openNow ? "secondary" : "outline"} className="w-full justify-start" disabled={!providers.includes("google_maps")} aria-pressed={filters.openNow} onClick={() => setFilters((current) => ({ ...current, openNow: !current.openNow }))}>{filters.openNow ? "仅搜索当前营业商家" : "不限营业状态"}</Button><p className="text-[11px] text-muted-foreground">仅 Google Maps 支持</p></div></div>
     <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant={filters.requireWebsite ? "secondary" : "outline"} aria-pressed={filters.requireWebsite} onClick={() => setFilters((current) => ({ ...current, requireWebsite: !current.requireWebsite }))}>必须有官网</Button><Button type="button" size="sm" variant={filters.requirePhone ? "secondary" : "outline"} aria-pressed={filters.requirePhone} onClick={() => setFilters((current) => ({ ...current, requirePhone: !current.requirePhone }))}>必须有电话</Button></div>
     
    </div>
    {providers.includes("openstreetmap") && <details className="rounded-lg bg-muted/35 p-4">
     <summary className="cursor-pointer text-sm font-medium">高级设置 · OpenStreetMap 标签映射</summary>
     <div className="mt-3 space-y-3">

     <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">OpenStreetMap 标签映射</p><p className="mt-1 text-xs text-muted-foreground">{businessTypes.length ? "根据已选业务类型生成 OSM 标签" : "根据企业 / 行业关键词自动匹配 OSM 标签"} · 可编辑后执行。</p></div><Badge variant="secondary">{osmTags.filter((tag) => tag.key && tag.value).length} 条规则</Badge></div>
     {osmTags.length ? <div className="space-y-2">{osmTags.map((tag,index) => <div key={index} className="flex items-start gap-2"><div className="min-w-0 flex-1 space-y-1"><Input aria-label="OSM 标签键值" value={tag.key + (tag.value ? "=" + tag.value : "=")} onChange={(event) => updateOsmTag(index,event.target.value)} placeholder="例如 shop=electrical" className="font-mono text-xs" /><p className="text-xs text-muted-foreground">{tag.label} · {tag.reason}</p></div><Badge variant={tag.match === "primary" ? "default" : "outline"}>{tag.match === "primary" ? "主要匹配" : "扩展匹配"}</Badge><Button type="button" size="sm" variant="ghost" onClick={() => setOsmTags((current) => current.filter((_,i) => i !== index))}>移除</Button></div>)}</div> : <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">当前关键词没有自动匹配规则，请手动添加 OSM 标签。</p>}
     <Button type="button" size="sm" variant="outline" onClick={addOsmTag}>添加标签规则</Button>
     <p className="text-xs leading-5 text-muted-foreground">主要匹配优先；扩展匹配会增加结果覆盖面，也可能带来不相关商家。标签仅代表 OSM 地图分类，不保证该地区存在对应商家。</p>
    
     </div>
    </details>}
<div className="max-w-xs space-y-2"><label className="text-sm font-medium" htmlFor="discovery-limit">每个目标市场最多处理数量</label><Input id="discovery-limit" type="number" min="1" max="500" value={limit} onChange={(e) => setLimit(e.target.value)} /></div>

    

    
    
    
    
    <Button className="w-full" onClick={start} disabled={starting || !!running || !country || providers.length === 0}><Play className="h-4 w-4" />{starting ? "正在创建任务…" : running ? "任务执行中" : "开始发现潜在客户"}</Button>
   </CardContent></Card>
   <div className="tp-metric-grid grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3"><Card><CardContent className="p-4"><Users className="mb-2 h-4 w-4 text-muted-foreground" /><p className="text-xl font-semibold tabular-nums sm:text-2xl">{run?.discoveredCount ?? "—"}</p><p className="text-xs text-muted-foreground">发现候选</p></CardContent></Card><Card><CardContent className="p-4"><Building2 className="mb-2 h-4 w-4 text-muted-foreground" /><p className="text-xl font-semibold tabular-nums sm:text-2xl">{run?.createdLeadCount ?? "—"}</p><p className="text-xs text-muted-foreground">发现记录</p></CardContent></Card><Card><CardContent className="p-4"><CheckCircle2 className="mb-2 h-4 w-4 text-muted-foreground" /><p className="text-xl font-semibold tabular-nums sm:text-2xl">{run ? run.progress + "%" : "—"}</p><p className="text-xs text-muted-foreground">任务进度</p></CardContent></Card></div></div>
  <TaskExecutionPanel description="实时显示地图与本地商家数据源查询状态。" status={run?.status} taskCode={run?.taskCode??run?.id} taskHref={run?"/lead-discovery/results?runId="+encodeURIComponent(run.id):undefined} query={run?.query??query} providers={(run?.providers??providers).join(" + ")} progress={run?.progress??0} message={run?.message} summary={<span className="tabular-nums">{run?.discoveredCount??0} 个候选 · {run?.createdLeadCount??0} 条草稿</span>} progressNote="正在连接数据源并查询，首次返回结果前进度保持在 0% 属正常现象。" isRunning={running} emptyTitle="尚未启动发现任务" emptyDescription="配置目标国家、省州、城市和关键词后，点击开始发现潜在客户。" resultsHref={run?"/lead-discovery/results?runId="+encodeURIComponent(run.id):undefined}><div className="flex items-center gap-2 text-sm font-medium"><Terminal className="h-4 w-4" /> 实时执行日志 <span className="text-xs font-normal text-muted-foreground">({logs.length})</span></div>
   <div className="max-h-64 min-h-36 space-y-2 overflow-y-auto rounded-lg bg-slate-950 p-4 font-mono text-xs">{logs.length ? logs.map((log) => <div key={log.id} className="flex gap-3"><span className="shrink-0 text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</span><span className={levelStyle[log.level]}>{log.message}</span></div>) : <div className="flex h-28 flex-col items-center justify-center gap-2 text-slate-500"><Sparkles className="h-4 w-4" /><span>任务启动后，执行日志会显示在这里</span></div>}</div>
  </TaskExecutionPanel>
 </div>;
}
