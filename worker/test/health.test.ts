import { describe, expect, it } from "vitest";

import worker, { type WorkerEnv } from "../src/index";

describe("GET /api/v1/health", () => {
  it("returns the standard success envelope and request id", async () => {
    const request = new Request("https://tradepilot.example/api/v1/health");
    const env: WorkerEnv = {
      ASSETS: { fetch: async () => new Response("asset") },
    };
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
});
