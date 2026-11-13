import { useState } from "react";
import { Toaster } from "sonner";
import { AppShell } from "./layouts/AppShell";
import { MapLocalDiscoveryPage } from "@/features/lead-discovery/presentation/pages/MapLocalDiscoveryPage";
import { IntegrationsSettingsPage } from "@/features/settings/presentation/pages/IntegrationsSettingsPage";

export function App() {
 const [activePage, setActivePage] = useState<"discovery" | "integrations">("discovery");
 return <AppShell activePage={activePage} onNavigate={setActivePage}>
  {activePage === "discovery" ? <MapLocalDiscoveryPage /> : <IntegrationsSettingsPage />}
  <Toaster richColors position="top-right" />
 </AppShell>;
}
