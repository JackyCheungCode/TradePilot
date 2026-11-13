import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Compass, MapPinned, PanelLeftClose, PanelLeftOpen, Radar, Settings, KeyRound } from "lucide-react";
import { Button } from "@/shared/ui/primitives";

type AppPage = "discovery" | "integrations";
export function AppShell({ children, activePage, onNavigate }: { children: ReactNode; activePage: AppPage; onNavigate: (page: AppPage) => void }) {
 const [collapsed, setCollapsed] = useState(false);
 const [discoveryExpanded, setDiscoveryExpanded] = useState(true);
 const [settingsExpanded, setSettingsExpanded] = useState(true);
 return <div className="flex min-h-screen bg-background text-foreground">
  <aside className={`hidden shrink-0 flex-col border-r bg-card transition-[width] duration-200 md:flex ${collapsed ? "w-[76px]" : "w-64"}`}>
   <div className="flex h-16 items-center gap-3 border-b px-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Radar className="h-5 w-5" /></div>{!collapsed && <div><p className="font-semibold tracking-tight">TradePilot</p><p className="text-[11px] text-muted-foreground">Market intelligence</p></div>}<div className="ml-auto"><Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button></div></div>
   <nav className="flex-1 space-y-3 p-3">
    <div>
     <Button type="button" variant="ghost" onClick={() => setDiscoveryExpanded(!discoveryExpanded)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium ${collapsed ? "justify-center" : "justify-start"}`}><Compass className="h-4 w-4 shrink-0" />{!collapsed && <><span className="flex-1 text-left">潜客发现</span>{discoveryExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</>}</Button>
     {discoveryExpanded && <div className={`space-y-1 ${collapsed ? "" : "ml-4 border-l pl-3"}`}><Button type="button" variant={activePage === "discovery" ? "secondary" : "ghost"} onClick={() => onNavigate("discovery")} className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm ${collapsed ? "justify-center" : "justify-start"}`}><MapPinned className="h-4 w-4 shrink-0" />{!collapsed && <span>地图与本地商家</span>}</Button></div>}
    </div>
    <div>
     <Button type="button" variant="ghost" onClick={() => setSettingsExpanded(!settingsExpanded)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium ${collapsed ? "justify-center" : "justify-start"}`}><Settings className="h-4 w-4 shrink-0" />{!collapsed && <><span className="flex-1 text-left">系统设置</span>{settingsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</>}</Button>
     {settingsExpanded && <div className={`space-y-1 ${collapsed ? "" : "ml-4 border-l pl-3"}`}><Button type="button" variant={activePage === "integrations" ? "secondary" : "ghost"} onClick={() => onNavigate("integrations")} className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm ${collapsed ? "justify-center" : "justify-start"}`}><KeyRound className="h-4 w-4 shrink-0" />{!collapsed && <span>设置与集成</span>}</Button></div>}
    </div>
   </nav><div className="border-t p-4 text-xs text-muted-foreground">{!collapsed ? "单用户工作空间" : "TP"}</div>
  </aside><main className="min-w-0 flex-1">{children}</main>
 </div>;
}
