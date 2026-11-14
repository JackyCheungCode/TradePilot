import { useMemo, useState } from "react";
import isoCountries from "i18n-iso-countries";
import zhLocale from "i18n-iso-countries/langs/zh.json";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button, Input, Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/shared/ui/primitives";
isoCountries.registerLocale(zhLocale);
const flag=(code:string)=>String.fromCodePoint(...code.toUpperCase().split("").map(c=>127397+c.charCodeAt(0)));
const specialNames:Record<string,string>={HK:"中国香港",MO:"中国澳门",TW:"中国台湾"};
const countries=Object.keys(isoCountries.getAlpha2Codes()).map(code=>({code,name:specialNames[code]??isoCountries.getName(code,"zh")??code,flag:flag(code)})).sort((a,b)=>a.name.localeCompare(b.name));
export function CountrySelect({value,onChange}:{value:string;onChange:(next:string)=>void}){
 const [search,setSearch]=useState("");
 const selected=useMemo(()=>countries.find(country=>country.code===value),[value]);
 const filtered=countries.filter(country=>country.name.toLowerCase().includes(search.toLowerCase())||country.code.toLowerCase().includes(search.toLowerCase()));
 return <div className="space-y-2"><label className="text-sm font-medium">国家 / 地区</label><Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-between font-normal"><span className="truncate">{selected?selected.flag+" "+selected.name:"搜索并选择一个国家或地区"}</span><ChevronDown className="h-4 w-4 text-muted-foreground"/></Button></PopoverTrigger><PopoverContent align="start" sideOffset={6} className="z-50 w-[min(92vw,390px)] rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg"><div className="relative mb-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input value={search} onChange={event=>setSearch(event.target.value)} placeholder="搜索国家 / 地区" className="pl-9"/></div><div className="max-h-64 overflow-y-auto">{filtered.map(country=><Button key={country.code} type="button" variant="ghost" onClick={()=>{onChange(country.code);setSearch("");}} className="flex h-auto w-full justify-start gap-3 rounded-md px-2 py-2 text-left text-sm font-normal"><span className="text-lg">{country.flag}</span><span className="flex-1">{country.name}</span><span className="text-xs text-muted-foreground">{country.code}</span>{value===country.code&&<Check className="h-4 w-4 text-primary"/>}</Button>)}{!filtered.length&&<p className="p-4 text-center text-sm text-muted-foreground">没有匹配的国家或地区</p>}</div><div className="flex justify-end border-t pt-2"><PopoverClose asChild><Button size="sm">完成</Button></PopoverClose></div></PopoverContent></Popover></div>;
}
