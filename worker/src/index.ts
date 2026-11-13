import { errorResponse } from "./lib/http";
import { handleHealth } from "./routes/health";
import { handleDiscovery } from "./routes/discovery";

export interface WorkerEnv {
 ASSETS: { fetch(request: Request): Promise<Response> };
 SUPABASE_URL: string;
 SUPABASE_ANON_KEY: string;
 SUPABASE_SERVICE_ROLE_KEY: string;
 GOOGLE_MAPS_API_KEY?: string;
 OVERPASS_API_URL?: string;
}

export default {
 async fetch(request: Request, env: WorkerEnv, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/v1/health" && request.method === "GET") return handleHealth(request);
  if (url.pathname.startsWith("/api/v1/discovery-runs")) return handleDiscovery(request, env, ctx);
  if (url.pathname.startsWith("/api/")) return errorResponse(request,"NOT_FOUND","The requested API endpoint does not exist.",404);
  return env.ASSETS.fetch(request);
 },
};
