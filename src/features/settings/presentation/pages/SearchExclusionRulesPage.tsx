import { useEffect,useState } from "react";
import { Check,LoaderCircle,Save,ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button,Card,CardContent,CardDescription,CardHeader,CardTitle, Textarea } from "@/shared/ui/primitives";
import { PageControlPanel } from "@/shared/ui/page-layout";
import { searchExclusionsApi,type SearchExclusionCategory } from "../../infrastructure/search-exclusions-api";
export function SearchExclusionRulesPage(){
 const [categories,setCategories]=useState<SearchExclusionCategory[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 useEffect(()=>{void searchExclusionsApi.get().then(setCategories).catch(e=>toast.error(e instanceof Error?e.message:"读取排除规则失败")).finally(()=>setLoading(false));},[]);
 const update=(key:string,patch:Partial<SearchExclusionCategory>)=>setCategories(current=>current.map(item=>item.key===key?{...item,...patch}:item));
 const save=async()=>{setSaving(true);try{await searchExclusionsApi.save(categories);toast.success("搜索排除规则已保存");}catch(e){toast.error(e instanceof Error?e.message:"保存失败");}finally{setSaving(false);}};
 return <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-4 lg:p-6">
  <PageControlPanel eyebrow="系统设置 / 搜索规则" title="搜索排除规则" description="按分类维护需要排除的网站域名。规则会应用于搜索语法生成和结果二次过滤。"/>
  <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/><span>每行填写一个域名或网址路径，例如 example.com 或 example.com/jobs。系统会规范化域名，不需要填写协议。</span></div>
  {loading?<div className="flex justify-center py-16"><LoaderCircle className="h-5 w-5 animate-spin"/></div>:<div className="space-y-4">{categories.map(item=><Card key={item.key}><CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><div><CardTitle>{item.label}</CardTitle><CardDescription>{item.domains.length} 个排除网址</CardDescription></div><Button type="button" size="sm" variant={item.enabled?"secondary":"outline"} onClick={()=>update(item.key,{enabled:!item.enabled})}>{item.enabled?<Check className="h-4 w-4"/>:null}{item.enabled?"已启用":"已停用"}</Button></div></CardHeader><CardContent className="space-y-2"><Textarea value={item.domains.join("\n")} onChange={e=>update(item.key,{domains:e.target.value.split("\n")})} rows={Math.min(9,Math.max(3,item.domains.length))} className="font-mono text-sm leading-6" spellCheck={false}/><p className="text-xs text-muted-foreground">一行一个域名；支持子路径，保存时自动去重。</p></CardContent></Card>)}</div>}
  <div className="flex justify-end"><Button onClick={()=>void save()} disabled={loading||saving}>{saving?<LoaderCircle className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}{saving?"正在保存…":"保存全部规则"}</Button></div>
 </div>;
}
