import { useEffect, useState } from "react";
import isoCountries from "i18n-iso-countries";
import { AlertCircle, Check, ChevronDown, LoaderCircle, Search } from "lucide-react";
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/primitives";

interface GeoResponse<T> { error?: boolean; msg?: string; data?: T; }
interface StateRecord { name: string; state_code?: string; }
const API = "https://countriesnow.space/api/v0.1";

function SearchablePicker({ label, value, options, placeholder, disabled, loading, onChange }: {
 label: string; value: string; options: string[]; placeholder: string; disabled?: boolean; loading?: boolean; onChange: (value: string) => void;
}) {
 const [open, setOpen] = useState(false);
 const [search, setSearch] = useState("");
 const filtered = options.filter((item) => item.toLowerCase().includes(search.toLowerCase()));
 return <div className="min-w-0 space-y-1.5">
  <label className="text-sm font-medium">{label}</label>
  <Popover open={open} onOpenChange={setOpen}>
   <PopoverTrigger asChild><Button type="button" variant="outline" disabled={disabled || loading} className="w-full justify-between font-normal"><span className="truncate">{loading ? "正在加载…" : value || placeholder}</span>{loading ? <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</Button></PopoverTrigger>
   <PopoverContent align="start" sideOffset={6} className="z-50 w-[min(86vw,340px)] p-2">
    <div className="relative mb-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={"搜索" + label} className="pl-9" /></div>
    <div className="max-h-56 overflow-y-auto">{filtered.map((item) => <Button key={item} type="button" variant="ghost" onClick={() => { onChange(item); setOpen(false); setSearch(""); }} className="flex h-auto w-full justify-between px-2 py-2 text-left text-sm font-normal">{item}{value === item && <Check className="h-4 w-4 text-primary" />}</Button>)}{!filtered.length && <p className="p-4 text-center text-sm text-muted-foreground">没有匹配选项</p>}</div>
   </PopoverContent>
  </Popover>
 </div>;
}

export function RegionCityPicker({ countryCode, state, city, onStateChange, onCityChange }: {
 countryCode: string; state: string; city: string; onStateChange: (value: string) => void; onCityChange: (value: string) => void;
}) {
 const [states, setStates] = useState<string[]>([]);
 const [cities, setCities] = useState<string[]>([]);
 const [loadingStates, setLoadingStates] = useState(false);
 const [loadingCities, setLoadingCities] = useState(false);
 const [error, setError] = useState("");
 const countryName = countryCode ? isoCountries.getName(countryCode, "en") : undefined;

 useEffect(() => {
  if (!countryName) { setStates([]); setCities([]); return; }
  const controller = new AbortController();
  setLoadingStates(true); setError(""); setStates([]); setCities([]);
  fetch(API + "/countries/states/q?country=" + encodeURIComponent(countryName), { signal: controller.signal })
   .then(async (response) => {
    if (!response.ok) throw new Error("行政区划数据请求失败（HTTP " + response.status + "）");
    const payload = await response.json() as GeoResponse<{ states?: StateRecord[] }>;
    if (payload.error || !Array.isArray(payload.data?.states)) throw new Error(payload.msg || "暂时无法读取省州列表");
    setStates(payload.data.states.map((item) => item.name).filter(Boolean).sort((a, b) => a.localeCompare(b)));
   })
   .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "省州数据加载失败"); })
   .finally(() => { if (!controller.signal.aborted) setLoadingStates(false); });
  return () => controller.abort();
 }, [countryName]);

 useEffect(() => {
  if (!countryName || !state) { setCities([]); return; }
  const controller = new AbortController();
  setLoadingCities(true); setError(""); setCities([]);
  fetch(API + "/countries/state/cities", {
   method: "POST", headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ country: countryName, state }), signal: controller.signal,
  })
   .then(async (response) => {
    if (!response.ok) throw new Error("城市数据请求失败（HTTP " + response.status + "）");
    const payload = await response.json() as GeoResponse<string[]>;
    if (payload.error || !Array.isArray(payload.data)) throw new Error(payload.msg || "暂时无法读取城市列表");
    setCities(payload.data.filter(Boolean).sort((a, b) => a.localeCompare(b)));
   })
   .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "城市数据加载失败"); })
   .finally(() => { if (!controller.signal.aborted) setLoadingCities(false); });
  return () => controller.abort();
 }, [countryName, state]);

 return <div className="space-y-3">
  <div className="grid gap-3 sm:grid-cols-2">
   <SearchablePicker label="省 / 州" value={state} options={states} placeholder={countryCode ? "全部省州（可选）" : "请先选择国家"} disabled={!countryCode || !states.length} loading={loadingStates} onChange={(next) => { onStateChange(next); onCityChange(""); }} />
   <SearchablePicker label="城市" value={city} options={cities} placeholder={state ? "全部城市（可选）" : "请先选择省州"} disabled={!state || !cities.length} loading={loadingCities} onChange={onCityChange} />
  </div>
  {error && <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
  <p className="text-xs text-muted-foreground">省州与城市由免费 CountriesNow 开放数据自动加载；数据覆盖范围因国家而异。</p>
 </div>;
}
