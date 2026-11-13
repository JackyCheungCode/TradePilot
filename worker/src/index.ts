import { errorResponse } from "./lib/http";
import { handleHealth } from "./routes/health";
import { handleDiscovery } from "./routes/discovery";
import { LeadDiscoveryWorkflow } from "./workflows/lead-discovery";

export interface WorkerEnv {
 ASSETS: { fetch(request: Request): Promise<Response> };
 SUPABASE_URL: string;
 SUPABASE_ANON_KEY: string;
 SUPABASE_SERVICE_ROLE_KEY: string;
 GOOGLE_MAPS_API_KEY?: string;
 OVERPASS_API_URL?: string;
 LEAD_DISCOVERY_WORKFLOW: { create(options: { id: string; params: { runId: string; ownerId: string; input: { countries: string[]; query: string; limitPerCountry: number } } }): Promise<{ id: string }> };
}

export { LeadDiscoveryWorkflow };

export default {
 async fetch(request: Request, env: WorkerEnv, _ctx: unknown): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/v1/health" && request.method === "GET") return handleHealth(request);
  if (url.pathname.startsWith("/api/v1/discovery-runs")) return handleDiscovery(request, env);
  if (url.pathname.startsWith("/api/")) return errorResponse(request,"NOT_FOUND","The requested API endpoint does not exist.",404);
  return env.ASSETS.fetch(request);
 },
};
