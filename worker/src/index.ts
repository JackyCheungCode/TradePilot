import { errorResponse } from "./lib/http";
import { handleHealth } from "./routes/health";
import { handleDiscovery, type DiscoveryRunInput } from "./routes/discovery";
import { handleSettings } from "./routes/settings";
import { handleTranslation } from "./routes/translation";
import { handleSearchExclusions } from "./routes/search-exclusions";
import { LeadDiscoveryWorkflow } from "./workflows/lead-discovery";
import { ContactEnrichmentWorkflow } from "./workflows/contact-enrichment";
import { FacebookDiscoveryWorkflow } from "./workflows/facebook-discovery";
import { handleFacebookDiscovery } from "./routes/facebook-discovery";
import { InstagramDiscoveryWorkflow } from "./workflows/instagram-discovery";
import { handleInstagramDiscovery } from "./routes/instagram-discovery";
import { handleAgentCenter } from "./routes/agent-center";

export interface WorkerEnv {
 ASSETS: { fetch(request: Request): Promise<Response> };
 SUPABASE_URL: string;
 SUPABASE_ANON_KEY: string;
 SUPABASE_SERVICE_ROLE_KEY: string;
 GOOGLE_MAPS_API_KEY?: string;
 DEEPL_API_KEY?: string;
 SERPER_API_KEY?: string;
 SERPAPI_API_KEY?: string;
 APIFY_API_TOKEN?: string;
 CLOUDFLARE_API_TOKEN?: string;
 CLOUDFLARE_ACCOUNT_ID?: string;
 CLOUDFLARE_WORKER_NAME?: string;
 AGENT_ENCRYPTION_KEY?: string;
 AI: { run(model:string,input:Record<string,unknown>): Promise<unknown> };
 OVERPASS_API_URL?: string;
 LEAD_DISCOVERY_WORKFLOW: { create(options: { id: string; params: { runId: string; ownerId: string; input: DiscoveryRunInput } }): Promise<{ id: string }> };
 CONTACT_ENRICHMENT_WORKFLOW: { create(options:{id:string;params:{jobId:string;ownerId:string;recordIds:string[]}}):Promise<{id:string}> };
 FACEBOOK_DISCOVERY_WORKFLOW: { create(options:{id:string;params:{runId:string;ownerId:string;input:import("./routes/facebook-discovery").FacebookInput}}):Promise<{id:string}> };
 INSTAGRAM_DISCOVERY_WORKFLOW: { create(options:{id:string;params:{runId:string;ownerId:string;input:import("./routes/instagram-discovery").InstagramInput}}):Promise<{id:string}> };
}

export { LeadDiscoveryWorkflow, ContactEnrichmentWorkflow, FacebookDiscoveryWorkflow, InstagramDiscoveryWorkflow };

export default {
 async fetch(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  try {
   if (url.pathname === "/api/v1/health" && request.method === "GET") return handleHealth(request);
   if (url.pathname.startsWith("/api/v1/agent/")) return await handleAgentCenter(request, env);
   if (url.pathname === "/api/v1/settings/search-exclusions") return await handleSearchExclusions(request, env);
   if (url.pathname.startsWith("/api/v1/settings/")) return await handleSettings(request, env);
   if (url.pathname.startsWith("/api/v1/discovery/translate")) return await handleTranslation(request, env);
   if (url.pathname === "/api/v1/facebook-discovery-runs" && request.method === "POST") return await handleFacebookDiscovery(request, env);
   if (url.pathname === "/api/v1/instagram-discovery-runs" && request.method === "POST") return await handleInstagramDiscovery(request, env);
   if (url.pathname === "/api/v1/search-discovery-runs" && request.method === "POST") { const { handleSearchDiscovery } = await import("./routes/search-discovery"); return await handleSearchDiscovery(request, env); }
   if (url.pathname.startsWith("/api/v1/discovery-runs") || url.pathname.startsWith("/api/v1/discovery-records") || url.pathname.startsWith("/api/v1/discovery-contact-enrichments") || url.pathname === "/api/v1/leads") return await handleDiscovery(request, env);
   if (url.pathname.startsWith("/api/")) return errorResponse(request,"NOT_FOUND","The requested API endpoint does not exist.",404);
   return env.ASSETS.fetch(request);
  } catch (error) {
   console.error("WORKER_API_UNHANDLED_ERROR", { path: url.pathname, error: String(error).slice(0, 500) });
   if (url.pathname.startsWith("/api/")) {
    return errorResponse(request, "INTERNAL_SERVER_ERROR", "服务暂时不可用，请稍后重试。", 500);
   }
   throw error;
  }
 },
};
