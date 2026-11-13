import { Toaster } from "sonner";
import { AppShell } from "./layouts/AppShell";
import { MapLocalDiscoveryPage } from "@/features/lead-discovery/presentation/pages/MapLocalDiscoveryPage";
export function App() {
 return <AppShell><MapLocalDiscoveryPage /><Toaster richColors position="top-right" /></AppShell>;
}
