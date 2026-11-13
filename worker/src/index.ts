import { errorResponse } from "./lib/http";
import { handleHealth } from "./routes/health";

export interface WorkerEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/v1/health" && request.method === "GET") {
      return handleHealth(request);
    }

    if (url.pathname.startsWith("/api/")) {
      return errorResponse(
        request,
        "NOT_FOUND",
        "The requested API endpoint does not exist.",
        404,
      );
    }

    return env.ASSETS.fetch(request);
  },
};
