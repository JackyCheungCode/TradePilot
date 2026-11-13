import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Compass, KeyRound, LogOut, MapPinned, Menu, PanelLeftClose, PanelLeftOpen, Radar, Settings, X } from "lucide-react";
import { Button } from "@/shared/ui/primitives";

type AppPage = "discovery" | "integrations";
export function AppShell({ children, activePage, onNavigate, userEmail, onSignOut }: { children: ReactNode; activePage: AppPage; onNavigate: (page: AppPage) => void; userEmail: string; onSignOut: () => void }) {
 const [collapsed, setCollapsed] = useState(false);
 const [mobileOpen, setMobileOpen] = useState(false);
 const [discoveryExpanded, setDiscoveryExpanded] = useState(true);
 const [settingsExpanded, setSettingsExpanded] = useState(true);

 const sidebar = <div className="flex h-full min-h-0 flex-col bg-card text-foreground">
  <div className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
   <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Radar className="h-5 w-5" /></div>
   {(!collapsed || mobileOpen) && <div className="min-w-0"><p className="font-semibold tracking-tight">TradePilot</p><p className="text-[11px] text-muted-foreground">Market intelligence</p></div>}
   <div className="ml-auto hidden md:block"><Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button></div>
   <div className="ml-auto md:hidden"><Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="关闭菜单"><X className="h-5 w-5" /></Button></div>
  </div>
  <nav className="flex-1 space-y-3 overflow-y-auto p-3">
   <div>
    <Button type="button" variant="ghost" onClick={() => setDiscoveryExpanded(!discoveryExpanded)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium ${collapsed && !mobileOpen ? "justify-center" : "justify-start"}`}><Compass className="h-4 w-4 shrink-0" />{(!collapsed || mobileOpen) && <><span className="flex-1 text-left">潜客发现</span>{discoveryExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</>}</Button>
    {discoveryExpanded && <div className={`space-y-1 ${collapsed && !mobileOpen ? "" : "ml-4 border-l pl-3"}`}><Button type="button" variant={activePage === "discovery" ? "secondary" : "ghost"} onClick={() => { onNavigate("discovery"); setMobileOpen(false); }} className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm ${collapsed && !mobileOpen ? "justify-center" : "justify-start"}`}><MapPinned className="h-4 w-4 shrink-0" />{(!collapsed || mobileOpen) && <span>地图与本地商家</span>}</Button></div>}
   </div>
   <div>
    <Button type="button" variant="ghost" onClick={() => setSettingsExpanded(!settingsExpanded)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium ${collapsed && !mobileOpen ? "justify-center" : "justify-start"}`}><Settings className="h-4 w-4 shrink-0" />{(!collapsed || mobileOpen) && <><span className="flex-1 text-left">系统设置</span>{settingsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</>}</Button>
    {settingsExpanded && <div className={`space-y-1 ${collapsed && !mobileOpen ? "" : "ml-4 border-l pl-3"}`}><Button type="button" variant={activePage === "integrations" ? "secondary" : "ghost"} onClick={() => { onNavigate("integrations"); setMobileOpen(false); }} className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm ${collapsed && !mobileOpen ? "justify-center" : "justify-start"}`}><KeyRound className="h-4 w-4 shrink-0" />{(!collapsed || mobileOpen) && <span>设置与集成</span>}</Button></div>}
   </div>
  </nav>
  <div className="shrink-0 border-t p-3">{(!collapsed || mobileOpen) && <p className="mb-2 truncate px-2 text-xs text-muted-foreground" title={userEmail}>{userEmail}</p>}<Button type="button" variant="ghost" onClick={onSignOut} className={`flex w-full items-center gap-2 ${collapsed && !mobileOpen ? "justify-center" : "justify-start"}`} aria-label="退出登录"><LogOut className="h-4 w-4" />{(!collapsed || mobileOpen) && <span>退出登录</span>}</Button></div>
 </div>;

 return <div className="flex min-h-screen bg-background text-foreground">
  <aside className={`hidden shrink-0 overflow-hidden border-r transition-[width] duration-200 md:block ${collapsed ? "w-[76px]" : "w-64"}`}>{sidebar}</aside>
  {mobileOpen && <div className="fixed inset-0 z-50 md:hidden"><button type="button" aria-label="关闭导航菜单" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} /><aside className="absolute inset-y-0 left-0 w-[min(84vw,320px)] border-r shadow-xl">{sidebar}</aside></div>}
  <main className="min-w-0 flex-1">
   <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-3 backdrop-blur md:hidden">
    <div className="flex min-w-0 items-center gap-2"><Button type="button" size="icon" variant="ghost" onClick={() => setMobileOpen(true)} aria-label="打开侧边栏菜单"><Menu className="h-5 w-5" /></Button><span className="truncate text-sm font-semibold">TradePilot</span></div>
    <span className="max-w-[45%] truncate text-xs text-muted-foreground">{activePage === "discovery" ? "地图与本地商家" : "设置与集成"}</span>
   </header>
   {children}
  </main>
 </div>;
}
