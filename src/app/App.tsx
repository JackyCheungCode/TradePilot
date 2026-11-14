import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { AppShell } from "./layouts/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { MapLocalDiscoveryPage } from "@/features/lead-discovery/presentation/pages/MapLocalDiscoveryPage";
import { DiscoveryTasksPage } from "@/features/lead-discovery/presentation/pages/DiscoveryTasksPage";
import { DiscoveryResultsPage } from "@/features/lead-discovery/presentation/pages/DiscoveryResultsPage";
import { LeadsPage } from "@/features/crm/presentation/pages/LeadsPage";
import { IntegrationsSettingsPage } from "@/features/settings/presentation/pages/IntegrationsSettingsPage";
import { SearchExclusionRulesPage } from "@/features/settings/presentation/pages/SearchExclusionRulesPage";
import { SearchEngineDiscoveryPage } from "@/features/lead-discovery/presentation/pages/SearchEngineDiscoveryPage";
import { FacebookDiscoveryPage } from "@/features/lead-discovery/presentation/pages/FacebookDiscoveryPage";
import { InstagramDiscoveryPage } from "@/features/lead-discovery/presentation/pages/InstagramDiscoveryPage";
import { getSupabaseClient } from "@/shared/lib/supabase";
import { AgentCenterPage } from "@/features/agent-center/presentation/pages/AgentCenterPage";

type AppPage = "agentWorkbench" | "agentMarket" | "agentOrchestration" | "agentConnections" | "agentRuns" | "agentApprovals" | "agentSettings" | "discovery" | "discoveryTasks" | "discoveryResults" | "searchDiscovery" | "facebookDiscovery" | "instagramDiscovery" | "leads" | "integrations" | "searchExclusions";
const ROUTES: Record<AppPage, string> = {
  agentWorkbench: "/agent/workbench", agentMarket: "/agent/market", agentOrchestration: "/agent/orchestration", agentConnections: "/agent/connections", agentRuns: "/agent/runs", agentApprovals: "/agent/approvals", agentSettings: "/agent/settings",
  discovery: "/lead-discovery/map-local-businesses",
  discoveryTasks: "/lead-discovery/tasks",
  discoveryResults: "/lead-discovery/results",
  searchDiscovery: "/lead-discovery/search-engine",
  facebookDiscovery: "/lead-discovery/facebook",
  instagramDiscovery: "/lead-discovery/instagram",
  leads: "/crm/leads",
  integrations: "/settings/integrations",
  searchExclusions: "/settings/search-exclusions",
};
const getPath = () => window.location.pathname;
const getPage = (path: string): AppPage | null => {
  if (path.startsWith("/agent/")) { const key = path.slice(7); const map: Record<string, AppPage> = {workbench:"agentWorkbench",market:"agentMarket",orchestration:"agentOrchestration",connections:"agentConnections",runs:"agentRuns",approvals:"agentApprovals",settings:"agentSettings"}; return map[key] ?? "agentWorkbench"; }
  if (path === ROUTES.discovery || path === "/") return "discovery";
  if (path === ROUTES.discoveryTasks || path.endsWith("/tasks")) return "discoveryTasks";
  if (path === ROUTES.discoveryResults || path.endsWith("/results")) return "discoveryResults";
  if (path === ROUTES.searchDiscovery) return "searchDiscovery";
  if (path === ROUTES.facebookDiscovery) return "facebookDiscovery";
  if (path === ROUTES.instagramDiscovery) return "instagramDiscovery";
  if (path === ROUTES.leads) return "leads";
  if (path === ROUTES.integrations) return "integrations";
  if (path === ROUTES.searchExclusions) return "searchExclusions";
  return null;
};
export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [path, setPath] = useState(getPath);
  const activePage = getPage(path);
  const goTo = useCallback((nextPath: string, replace = false) => {
    if (replace) window.history.replaceState({}, "", nextPath);
    else window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }, []);
  const navigate = useCallback((page: AppPage) => goTo(ROUTES[page]), [goTo]);
  useEffect(() => {
    const onPopState = () => setPath(getPath());
    window.addEventListener("popstate", onPopState);
    const supabase = getSupabaseClient();
    let mounted = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error("读取登录状态失败", error);
      setSession(data.session);
      setCheckingSession(false);
    }).catch((error: unknown) => {
      if (!mounted) return;
      console.error("读取登录状态失败", error);
      setCheckingSession(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "SIGNED_IN" && nextSession && getPath() === "/login") {
        const requestedPath = new URLSearchParams(window.location.search).get("next");
        const destination = requestedPath && getPage(requestedPath) ? requestedPath : ROUTES.discovery;
        window.history.replaceState({}, "", destination);
        setPath(destination);
      }
      if (event === "SIGNED_OUT") {
        window.history.replaceState({}, "", "/login");
        setPath("/login");
      }
    });
    return () => { mounted = false; window.removeEventListener("popstate", onPopState); subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (checkingSession) return;
    if (!session && path !== "/login") {
      const next = getPage(path) ? path : ROUTES.discovery;
      goTo("/login?next=" + encodeURIComponent(next), true);
    } else if (session && path === "/login") {
      const requestedPath = new URLSearchParams(window.location.search).get("next");
      goTo(requestedPath && getPage(requestedPath) ? requestedPath : ROUTES.discovery, true);
    } else if (session && !activePage) goTo(ROUTES.discovery, true);
    else if (session && path === "/") goTo(ROUTES.discovery, true);
  }, [checkingSession, session, path, activePage, goTo]);
  if (checkingSession) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">正在检查登录状态…</div>;
  if (!session || path === "/login") return <><LoginPage /><Toaster richColors position="top-right" /></>;
  return <AppShell activePage={activePage ?? "discovery"} onNavigate={navigate} userEmail={session.user.email ?? ""} onSignOut={() => void getSupabaseClient().auth.signOut()}>
    {activePage && activePage.startsWith("agent") ? <AgentCenterPage section={activePage} /> : activePage === "integrations" ? <IntegrationsSettingsPage /> : activePage === "searchExclusions" ? <SearchExclusionRulesPage /> : activePage === "discoveryTasks" ? <DiscoveryTasksPage /> : activePage === "discoveryResults" ? <DiscoveryResultsPage /> : activePage === "searchDiscovery" ? <SearchEngineDiscoveryPage /> : activePage === "facebookDiscovery" ? <FacebookDiscoveryPage /> : activePage === "instagramDiscovery" ? <InstagramDiscoveryPage /> : activePage === "leads" ? <LeadsPage /> : <MapLocalDiscoveryPage />}
    <Toaster richColors position="top-right" />
  </AppShell>;
}
