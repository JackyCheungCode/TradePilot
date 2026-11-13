import { afterEach, describe, expect, it, vi } from "vitest";
import { handleSettings } from "../src/routes/settings";

const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "public-anon-key",
  CLOUDFLARE_API_TOKEN: "existing-cloudflare-token",
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

  it("saves only the selected credential", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleSettings(
      new Request("https://tradepilot.example/api/v1/settings/integrations", {
        method: "POST",
        headers: { Authorization: "Bearer test-session", "Content-Type": "application/json" },
        body: JSON.stringify({ googleMapsApiKey: "new-google-key" }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    const authRequest = fetchMock.mock.calls[0];
    expect(authRequest[0]).toBe("https://example.supabase.co/auth/v1/user");
    expect((authRequest[1] as RequestInit).headers).toEqual({ apikey: "public-anon-key", Authorization: "Bearer test-session" });
    const patch = fetchMock.mock.calls[2][1] as RequestInit;
    const payload = JSON.parse(String(patch.body)) as { secrets: Record<string, unknown> };
    expect(Object.keys(payload.secrets)).toEqual(["GOOGLE_MAPS_API_KEY"]);
  });

  it("saves DeepL API key as an isolated Worker secret", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleSettings(
      new Request("https://tradepilot.example/api/v1/settings/integrations", {
        method: "POST",
        headers: { Authorization: "Bearer test-session", "Content-Type": "application/json" },
        body: JSON.stringify({ deeplApiKey: "deepl-test-key" }),
      }),
      env,
    );
    expect(response.status).toBe(200);
    const patch = fetchMock.mock.calls[2][1] as RequestInit;
    const payload = JSON.parse(String(patch.body)) as { secrets: Record<string, unknown> };
    expect(Object.keys(payload.secrets)).toEqual(["DEEPL_API_KEY"]);
  });

  it("tests the DeepL usage endpoint without exposing the key", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(Response.json({ character_count: 1200, character_limit: 500000 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleSettings(
      new Request("https://tradepilot.example/api/v1/settings/integrations/test", {
        method: "POST", headers: { Authorization: "Bearer test-session", "Content-Type": "application/json" },
        body: JSON.stringify({ service: "deepl" }),
      }),
      { ...env, DEEPL_API_KEY: "free-key:fx" },
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ ok: true, service: "deepl" });
    expect(fetchMock.mock.calls[1][0]).toBe("https://api-free.deepl.com/v2/usage");
  });

  it("rejects attempts to save multiple credentials in one request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    const response = await handleSettings(
      new Request("https://tradepilot.example/api/v1/settings/integrations", {
        method: "POST",
        headers: { Authorization: "Bearer test-session", "Content-Type": "application/json" },
        body: JSON.stringify({ supabaseServiceRoleKey: "service-key", googleMapsApiKey: "maps-key" }),
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("ONE_KEY_AT_A_TIME");
  });

  it("tests only the requested service", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleSettings(
      new Request("https://tradepilot.example/api/v1/settings/integrations/test", {
        method: "POST",
        headers: { Authorization: "Bearer test-session", "Content-Type": "application/json" },
        body: JSON.stringify({ service: "supabase" }),
      }),
      { ...env, SUPABASE_SERVICE_ROLE_KEY: "service-role-key" },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((await response.json()).data.service).toBe("supabase");
  });
});
