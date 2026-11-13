import { describe, expect, it } from "vitest";
import { errorResponse } from "../src/lib/http";
import { handleHealth } from "../src/routes/health";

describe("Worker API response contracts", () => {
  it("returns the standard health envelope and request id", async () => {
    const request = new Request("https://tradepilot.example/api/v1/health");
    const response = handleHealth(request);
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

  it("preserves a supplied request id in normalized errors", async () => {
    const request = new Request("https://tradepilot.example/api/v1/missing", {
      headers: { "X-Request-Id": "trace-123" },
    });
    const response = errorResponse(request, "NOT_FOUND", "Not found", 404);
    const body = (await response.json()) as {
      error: { code: string; requestId: string };
    };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.requestId).toBe("trace-123");
    expect(response.headers.get("X-Request-Id")).toBe("trace-123");
  });
});
