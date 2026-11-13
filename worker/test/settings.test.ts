import { afterEach, describe, expect, it, vi } from "vitest";
import { handleSettings } from "../src/routes/settings";

const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "public-anon-key",
};

afterEach(() => vi.unstubAllGlobals());

describe("integration settings API", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await handleSettings(
      new Request("https://tradepilot.example/api/v1/settings/integrations"),
      env,
    );

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("requires all three credentials during initial setup", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    const response = await handleSettings(
      new Request("https://tradepilot.example/api/v1/settings/integrations", {
        method: "POST",
        headers: { Authorization: "Bearer test-session", "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("MISSING_CREDENTIALS");
  });
});
