import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import isoCountries from "i18n-iso-countries";
import zhLocale from "i18n-iso-countries/langs/zh.json";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Badge, Button, Input } from "@/shared/ui/primitives";
isoCountries.registerLocale(zhLocale);
const flag = (code: string) => String.fromCodePoint(...code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0)));
const specialNames: Record<string, string> = { HK: "中国香港", MO: "中国澳门", TW: "中国台湾" };
const numericCodes = isoCountries.getNumericCodes();
const numericByAlpha2 = Object.fromEntries(Object.entries(numericCodes).map(([numeric, alpha2]) => [alpha2, numeric]));
const countries = Object.keys(isoCountries.getAlpha2Codes()).map((code) => ({ code, numericCode: numericByAlpha2[code] ?? "", name: specialNames[code] ?? isoCountries.getName(code, "zh") ?? code, flag: flag(code) })).sort((a,b) => a.name.localeCompare(b.name));
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
export function CountryMapPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
 const [search, setSearch] = useState("");
 const selected = useMemo(() => new Set(value), [value]);
 const filtered = countries.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()));
 const toggle = (code: string) => onChange(selected.has(code) ? value.filter((item) => item !== code) : [...value, code]);
 return <div className="space-y-3">
  <Popover.Root><Popover.Trigger asChild><Button variant="outline" className="w-full justify-between font-normal"><span className="truncate">{value.length ? `已选择 ${value.length} 个国家 / 地区` : "搜索并选择国家或地区"}</span><ChevronDown className="h-4 w-4 text-muted-foreground" /></Button></Popover.Trigger>
   <Popover.Portal><Popover.Content align="start" sideOffset={6} className="z-50 w-[min(92vw,390px)] rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg">
    <div className="relative mb-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索国家 / 地区" className="pl-9" /></div>
    <div className="max-h-64 overflow-y-auto">{filtered.map((c) => <Button key={c.code} type="button" variant="ghost" onClick={() => toggle(c.code)} className="flex h-auto w-full justify-start gap-3 rounded-md px-2 py-2 text-left text-sm font-normal"><span className="text-lg">{c.flag}</span><span className="flex-1">{c.name}</span><span className="text-xs text-muted-foreground">{c.code}</span>{selected.has(c.code) && <Check className="h-4 w-4 text-primary" />}</Button>)}{!filtered.length && <p className="p-4 text-center text-sm text-muted-foreground">没有匹配的国家或地区</p>}</div>
    <div className="flex justify-between border-t pt-2"><Button size="sm" variant="ghost" onClick={() => onChange([])}>清空</Button><Popover.Close asChild><Button size="sm">完成</Button></Popover.Close></div>
   </Popover.Content></Popover.Portal>
  </Popover.Root>
  {value.length > 0 && <div className="flex flex-wrap gap-1.5">{value.map((code) => { const c = countries.find((item) => item.code === code); return <Badge key={code} variant="outline" className="gap-1.5 py-1">{c?.flag} {c?.name}<Button type="button" size="icon" variant="ghost" aria-label={`移除${c?.name}`} onClick={() => toggle(code)} className="h-5 w-5"><X className="h-3 w-3" /></Button></Badge>; })}</div>}
  <div className="overflow-hidden rounded-xl border bg-slate-50 dark:bg-slate-950">
   <div className="flex items-center justify-between px-3 pt-3"><div><p className="text-sm font-medium">全球目标市场</p><p className="text-xs text-muted-foreground">点击地图领土即可选择 / 取消</p></div><Badge variant="outline">{value.length} 已选</Badge></div>
   <ComposableMap projectionConfig={{ scale: 145 }} width={800} height={380} style={{ width: "100%", height: "auto" }}><ZoomableGroup><Geographies geography={geoUrl}>{({ geographies }) => geographies.map((geo) => {
    const numeric = String(geo.id).padStart(3, "0"); const code = numericCodes[numeric]; const active = !!code && selected.has(code);
    return <Geography key={geo.rsmKey} geography={geo} onClick={() => code && toggle(code)} className={code ? "cursor-pointer transition-opacity hover:opacity-80" : ""} style={{ fill: active ? "#2563eb" : "#dbe3ed", stroke: "#fff", strokeWidth: 0.65, outline: "none" }} />;
   })}</Geographies></ZoomableGroup></ComposableMap>
   <div className="flex items-center gap-2 px-3 pb-3 text-xs text-muted-foreground"><span className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> 已选择领土 <span className="ml-3 h-2.5 w-2.5 rounded-sm bg-slate-300" /> 未选择</div>
  </div>
 </div>;
}
