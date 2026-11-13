import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { AppShell } from "./layouts/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { MapLocalDiscoveryPage } from "@/features/lead-discovery/presentation/pages/MapLocalDiscoveryPage";
import { IntegrationsSettingsPage } from "@/features/settings/presentation/pages/IntegrationsSettingsPage";
import { getSupabaseClient } from "@/shared/lib/supabase";

type AppPage = "discovery" | "integrations";
const getPath = () => window.location.pathname;

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [path, setPath] = useState(getPath);
  const [activePage, setActivePage] = useState<AppPage>("discovery");

  const goTo = useCallback((nextPath: string, replace = false) => {
    if (replace) window.history.replaceState({}, "", nextPath);
    else window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }, []);

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
      if (event === "SIGNED_IN" && nextSession) {
        setActivePage("discovery");
        window.history.replaceState({}, "", "/");
        setPath("/");
      }
      if (event === "SIGNED_OUT") {
        window.history.replaceState({}, "", "/login");
        setPath("/login");
      }
    });
    return () => {
      mounted = false;
      window.removeEventListener("popstate", onPopState);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (checkingSession) return;
    if (!session && path !== "/login") goTo("/login", true);
    else if (session && path === "/login") goTo("/", true);
  }, [checkingSession, session, path, goTo]);

  if (checkingSession) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">正在检查登录状态…</div>;
  if (!session || path === "/login") return <><LoginPage /><Toaster richColors position="top-right" /></>;

  return <AppShell activePage={activePage} onNavigate={setActivePage} userEmail={session.user.email ?? ""} onSignOut={() => void getSupabaseClient().auth.signOut()}>
    {activePage === "discovery" ? <MapLocalDiscoveryPage /> : <IntegrationsSettingsPage />}
    <Toaster richColors position="top-right" />
  </AppShell>;
}
