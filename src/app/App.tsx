import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { AppShell } from "./layouts/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { MapLocalDiscoveryPage } from "@/features/lead-discovery/presentation/pages/MapLocalDiscoveryPage";
import { IntegrationsSettingsPage } from "@/features/settings/presentation/pages/IntegrationsSettingsPage";
import { getSupabaseClient } from "@/shared/lib/supabase";

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activePage, setActivePage] = useState<"discovery" | "integrations">("discovery");

  useEffect(() => {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) setActivePage("discovery");
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checkingSession) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">正在检查登录状态…</div>;
  if (!session) return <><LoginPage /><Toaster richColors position="top-right" /></>;

  return <AppShell activePage={activePage} onNavigate={setActivePage} userEmail={session.user.email ?? ""} onSignOut={() => void getSupabaseClient().auth.signOut()}>
    {activePage === "discovery" ? <MapLocalDiscoveryPage /> : <IntegrationsSettingsPage />}
    <Toaster richColors position="top-right" />
  </AppShell>;
}
