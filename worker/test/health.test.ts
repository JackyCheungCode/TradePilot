import { describe, expect, it } from "vitest";

import worker, { type WorkerEnv } from "../src/index";

const env: WorkerEnv = {
  ASSETS: { fetch: async () => new Response("asset") },
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  LEAD_DISCOVERY_WORKFLOW: { create: async () => ({ id: "workflow-test" }) },
};

describe("Worker API routes", () => {
  it("returns the standard success envelope and request id", async () => {
    const request = new Request("https://tradepilot.example/api/v1/health");
    const response = await worker.fetch(request, env);

    const body = (await response.json()) as {
      data: { status: string; service: string; timestamp: string };
      meta: { requestId: string };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-Id")).toBe(body.meta.requestId);
    expect(body.data.status).toBe("ok");
    expect(body.data.service).toBe("tradepilot-api");
    expect(Number.isNaN(Date.parse(body.data.timestamp))).toBe(false);
  });

  it("preserves a supplied request id and returns a normalized 404", async () => {
    const request = new Request("https://tradepilot.example/api/v1/missing", {
      headers: { "X-Request-Id": "trace-123" },
    });
    const response = await worker.fetch(request, env);
    const body = (await response.json()) as {
      error: { code: string; requestId: string };
    };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.requestId).toBe("trace-123");
    expect(response.headers.get("X-Request-Id")).toBe("trace-123");
  });
});
