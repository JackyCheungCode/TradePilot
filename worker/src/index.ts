export interface WorkerEnv {
  ASSETS: Fetcher;
}

function json(data: unknown, status = 200, requestId = crypto.randomUUID()): Response {
  return Response.json(
    { data, meta: { requestId } },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    },
  );
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/v1/health" && request.method === "GET") {
      return json({
        status: "ok",
        service: "tradepilot-api",
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "The requested API endpoint does not exist.",
          },
        },
        404,
      );
    }

    return env.ASSETS.fetch(request);
  },
};
